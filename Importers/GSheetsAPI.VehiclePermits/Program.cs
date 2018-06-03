namespace LoFGatekeeper.Importers.GSheetsAPI.EarlyEntry
{
	using System;
	using System.Collections;
	using System.Collections.Generic;
	using System.IO;
	using System.Linq;
	using System.Threading;
	using System.Text.RegularExpressions;

	using Newtonsoft.Json;

	using Google.Apis.Auth.OAuth2;
	using Google.Apis.Sheets.v4;
	using Google.Apis.Sheets.v4.Data;
	using Google.Apis.Services;
	using Google.Apis.Util.Store;

	class Program
	{
		public class Result
		{
			public string Id { get; set; }
			public string FirstName { get; set; }
			public string LastName { get; set; }
			public DateTime? DOB { get; set; }
			public DateTime EntryDate { get; set; }
			public string Camp { get; set;}

			public string Department { get; set; }
			public string Status { get; set; }
		}

		static string[] Scopes = { SheetsService.Scope.SpreadsheetsReadonly };

		private static void Main(string[] args)
		{
			UserCredential credential;

			using (var stream = new FileStream("client_secret.json", FileMode.Open, FileAccess.Read)) {
				string credPath = Environment.GetFolderPath(Environment.SpecialFolder.Personal);
				credPath = Path.Combine(credPath, ".credentials/sheets.googleapis.com-dotnet-import.json");

				credential = GoogleWebAuthorizationBroker.AuthorizeAsync(
					GoogleClientSecrets.Load(stream).Secrets,
					Scopes,
					"user",
					CancellationToken.None,
					new FileDataStore(credPath, true)).Result;
			}

			var service = new SheetsService(new BaseClientService.Initializer {
				HttpClientInitializer = credential,
				ApplicationName = "LoFGatekeeper-Import",
			});

			List<Hashtable> items = new List<Hashtable>();

			{
				String spreadsheetId = "1sOtWKPPJKgJo4m6RSg7V5kResfP00eph-cUBuKCrPf8";

				var departments = service.Spreadsheets.Values
					.Get(spreadsheetId, "A2:A")
					.Execute()
					.Values
					.Select(RowData => (string) RowData[0])
					.ToList();

				var values = service.Spreadsheets
					.Values
					.Get(spreadsheetId, "C2:H")
					.Execute()
					.Values;

				foreach (var item in values) {
					var set = new ArrayList(6);
					set.AddRange(item.ToArray());

					try
					{
						var department = departments[values.IndexOf(item)];
						var registrationId = $"{set[3]}";
						var entryDate = $"{set[2]}/2018".Substring(3);
						var firstName = $"{set[0]}";
						var lastName = $"{set[1]}";
						var dob = "";
						if (set.Count >= 5) {
							dob = $"{set[4]}";
						}

						var email = "";
						if (set.Count == 6) {
							email = $"{set[5]}";
						}

						items.Add(new Hashtable {
							{ "Department", department },
							{ "Registration Number", registrationId },
							{ "Entry Date Requested", entryDate },
							{ "First Name", firstName },
							{ "Last Name", lastName },
							{ "DOB", dob },
							{ "EmailAddress", email }
						});
					}
					catch {
						Console.WriteLine(JsonConvert.SerializeObject(set));
						throw;
					}
				}
			}

			{
				String spreadsheetId = "1J4UcJKYBPzQfh7jKnxXRo7EniuDPCob_XVIp3qtQLs0";

				var values = service.Spreadsheets
					.Values
					.Get(spreadsheetId, "B3:J")
					.Execute()
					.Values;

				foreach (var item in values) {
					if (item.Count >= 5) {
						string rawDob = (string) item[3];
						if (rawDob == "") {
							rawDob = "1/1/1901";
						}

						string[] split = rawDob.Split('/', '-', '.', ' ');
						if (split[2].Length == 2) {
							split[2] = $"19{split[2]}";
						}
						rawDob = $"{split[0]}/{split[1]}/{split[2]}";

						string rawEntry = (string) item[0];
						var exp = new Regex("^(.+)(-Jun)$");
						if (exp.IsMatch(rawEntry)) {
							rawEntry = $"6/{exp.Match(rawEntry).Groups[1].Value}";
						}

						split = rawEntry.Split('/', '-', '.');
						rawEntry = $"{split[0]}/{split[1]}/2018";

						items.Add(new Hashtable {
							{ "Camp", (string) item[1] },
							{ "ComboName", Regex.Replace((string) item[2], @"\s", " ").Trim() },
							{ "DOB", rawDob },
							{ "Entry Date Requested", rawEntry },
							{ "EmailAddress", (string) item[4] },
							// { "Registration Number", item.Count == 9 ? (string) item[8] : null }
						});
					}
				}
			}

			Console.WriteLine($"{items.Count} items");

			Directory.SetCurrentDirectory(Path.Combine("..", "..", "data"));

			using (var db = new LiteDB.LiteDatabase(@"LoFData.db"))
			{
				var collection = db.GetCollection<Attendee>("attendees");
				var results = new List<Result>();

				foreach (var item in items) {
					Attendee attendee = null;

					if (item.ContainsKey("Registration Number") && !string.IsNullOrEmpty((string) item["Registration Number"])) {
						attendee = collection.FindOne(a => a.Id == (string) item["Registration Number"]);

					} else if (item.ContainsKey("ComboName")) {
						var nameParts = Regex.Split($"{item["ComboName"]}".ToLowerInvariant(), @"\s").ToList();

						attendee = collection.FindOne(a =>
							(
								nameParts.Intersect(
									(a.Name.FirstName ?? "").ToLowerInvariant().Split(" ", StringSplitOptions.RemoveEmptyEntries).Concat(
										(a.Name.LastName ?? "").ToLowerInvariant().Split(" ", StringSplitOptions.RemoveEmptyEntries)
									).ToList()
								).Count() >= 2 &&
								(a.EmailAddress == (string)item["EmailAddress"] || a.DOB == DateTime.Parse((string)item["DOB"]))
							) || (
								nameParts.Intersect(
									(a.Name.FirstName ?? "").ToLowerInvariant().Split(" ", StringSplitOptions.RemoveEmptyEntries).Concat(
										(a.Name.LastName ?? "").ToLowerInvariant().Split(" ", StringSplitOptions.RemoveEmptyEntries)
									).ToList()
								).Count() >= 1 &&
								a.EmailAddress == (string)item["EmailAddress"] &&
								a.DOB == DateTime.Parse((string)item["DOB"])
							)
						);
					} else if (item.ContainsKey("DOB") && !string.IsNullOrEmpty((string) item["DOB"])) {
						var nameParts = $"{item["First Name"]} {item["Last Name"]}".Trim().ToLowerInvariant().Split(" ", StringSplitOptions.RemoveEmptyEntries).ToList();

						attendee = collection.FindOne(a =>
							nameParts.Intersect(
								(a.Name.FirstName ?? "").ToLowerInvariant().Split(" ", StringSplitOptions.RemoveEmptyEntries).Concat(
									(a.Name.LastName ?? "").ToLowerInvariant().Split(" ", StringSplitOptions.RemoveEmptyEntries)
								).ToList()
							).Count() >= 2 &&
							a.DOB == DateTime.Parse((string)item["DOB"])
						);
					}

					var entryDate = DateTime.Parse((string) item["Entry Date Requested"]);

					results.Add(new Result {
						Camp = (string) item["Camp"],
						Department = (string) item["Department"],
						FirstName = (attendee != null)
							? attendee.Name.FirstName
							: (item.ContainsKey("ComboName"))
								? ((string) item["ComboName"]).Split(' ').First()
								: (item.ContainsKey("First Name"))
									? (string) item["First Name"]
									: "",
						LastName = (attendee != null)
							? attendee.Name.LastName
							: (item.ContainsKey("ComboName"))
								? ((string) item["ComboName"]).Split(' ').Last()
								: (item.ContainsKey("Last Name"))
									? (string) item["Last Name"]
									: "",
						DOB = (attendee != null)
							? attendee.DOB
							: (item.ContainsKey("DOB") && (string)item["DOB"] != "")
								? DateTime.Parse((string) item["DOB"])
								: (DateTime?) null,
						EntryDate = entryDate,
						Id = (attendee != null)
							? attendee.Id
							: (item.ContainsKey("Registration Number"))
								? (string) item["Registration Number"]
								: "",
						Status = attendee == null ? "" : "FOUND"
					});

					// TODO: Add EE data for attendee
				}

				foreach (var result in results.Where(i => i.Status != "FOUND")) {
					var ent = (result.Department ?? result.Camp);

					Console.WriteLine(String.Format("{0,40}\t{1,34}\t{2,10}\t{3,10}\t{4,5}\t{5,38}\t{6,5}",
						ent.Substring(0, Math.Min(40, ent.Length)),
						$"{result.FirstName} {result.LastName}",
						result.DOB?.ToString("MM/dd/yyyy"),
						result.EntryDate.ToString("MM/dd/yyyy"),
						"",
						result.Id,
						result.Status
					));
				}

				Console.WriteLine();
				var daily = results
					.OrderBy(r => r.EntryDate)
					.GroupBy(r => r.EntryDate.Date);

				Console.WriteLine("DATE   : POP+ POP= ");

				foreach (var day in daily) {
					Console.WriteLine(String.Format("{0}: {1,4} {1,5}",
						day.Key.ToString("ddd dd"),
						day.Count(),
						daily.Where(p => p.Key <= day.Key).Count()
					));
				}
			}

			Console.WriteLine();
		}
    }
}
