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
		public class ImportFile
		{
			public List<Result> Results { get; set; }

			public class Result
			{
				public int Id { get; set; }
				public string FirstName { get; set; }
				public string LastName { get; set; }
				public DateTime DOB { get; set; }
				public string Email { get; set; }
				public string Status { get; set; }
			}
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
					.Get(spreadsheetId, "E2:F")
					.Execute()
					.Values;

				foreach (var item in values) {
					items.Add(new Hashtable {
						{ "Department", departments[values.IndexOf(item)] },
						{ "Registration Number", (string) item[1] },
						{ "Entry Date Requested", $"{item[0]}/2018" }
					});
				}
			}

			{
				String spreadsheetId = "1NfLJLqW6Uy7eyhLjmSM8V4kAjmyNjM7B_IYO7Ca_zIc";

				var values = service.Spreadsheets.Values
					.Get(spreadsheetId, "A2:D")
					.Execute()
					.Values;

				foreach (var item in values) {
					items.AddRange($"{item[3]}"
						.Split("\n")
						.Select(row => new Hashtable($"Department: {item[1]}, {row}"
							.Split(',')
							.Select(col => col.Trim().Split(": "))
							.ToDictionary(col => col[0], col => col[1])
						)));
				}
			}

			{
				String spreadsheetId = "1J4UcJKYBPzQfh7jKnxXRo7EniuDPCob_XVIp3qtQLs0";

				var values = service.Spreadsheets
					.Values
					.Get(spreadsheetId, "A3:E")
					.Execute()
					.Values;

				foreach (var item in values) {
					if (item.Count == 5) {
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
							{ "EmailAddress", (string) item[4] }
						});
					}
				}
			}

			Console.WriteLine($"{items.Count} items");

			Directory.SetCurrentDirectory(Path.Combine("..", "..", "data"));

			using (var db = new LiteDB.LiteDatabase(@"LoFData.db"))
			{
				var collection = db.GetCollection<Attendee>("attendees");

				foreach (var item in items) {
					Attendee attendee = null;

					if (item.ContainsKey("Registration Number")) {
						attendee = collection.FindOne(a => a.Id == (string)item["Registration Number"]);
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
					} else if (item.ContainsKey("DOB")) {
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

					var output = new {
						camp = (string) item["Camp"],
						department = (string) item["Department"],
						name = (attendee != null)
							? $"{attendee.Name.FirstName} {attendee.Name.LastName}"
							: (item.ContainsKey("ComboName"))
								? item["ComboName"]
								: (!item.ContainsKey("Registration Number"))
									? $"{item["First Name"]} {item["Last Name"]}"
									: "",
						dob = (attendee != null)
							? attendee.DOB.ToString("MM/dd/yyyy")
							: (item.ContainsKey("DOB") && (string)item["DOB"] != "1/1/1901")
								? item["DOB"]
								: "",
						entryDate = entryDate.ToString("MM/dd/yyyy"),
						registration = (attendee != null)
							? attendee.Id
							: (item.ContainsKey("Registration Number"))
								? item["Registration Number"]
								: ""
					};

					Console.WriteLine(String.Format("| {0,40} | {1,34} | {2,10} | {3,10} | {4,5} | {5,38} |",
						$"{output.department}{(output.camp ?? "").Substring(0, Math.Min(40, (output.camp ?? "").Length))}",
						output.name,
						output.dob,
						output.entryDate,
						(attendee != null)
							? (output.department != null || entryDate.CompareTo(new DateTime(2018, 06, 12)) >= 0)
								? ""
								: "DEPT?"
							: "ERROR",
						output.registration
					));

					// TODO: Add EE data for attendee
				}
			}

			Console.WriteLine();
		}
    }
}
