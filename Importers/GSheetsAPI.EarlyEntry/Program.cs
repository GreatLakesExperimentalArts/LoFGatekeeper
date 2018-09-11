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
    using BinaryFog.NameParser;

	using Data = Google.Apis.Sheets.v4.Data;

    class Program
	{
		public class Result
		{
			public string Id { get; set; }
			public string FirstName { get; set; }
			public string LastName { get; set; }
			public DateTime? DOB { get; set; }
			public DateTime EntryDate { get; set; }
			public string Camp { get; set; }
			public string Department { get; set; }
			public string Status { get; set; }
			public string EmailAddress { get; set; }
		}

		static string[] Scopes = { SheetsService.Scope.Spreadsheets };

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

			String spreadsheetId = "1sOtWKPPJKgJo4m6RSg7V5kResfP00eph-cUBuKCrPf8";

			var sheet = service.Spreadsheets
				.Values
				.Get(spreadsheetId, "Early Entry Master List!A2:I")
				.Execute();

			List<Attendee> items = new List<Attendee>();

			{
				foreach (var raw in sheet.Values) {
					var item = new List<string>(raw.Cast<string>());
					if (item.Count < 9) {
						item.AddRange(
							Enumerable.Range(raw.Count, 9 - raw.Count).Select(n => "")
						);
					}

					var name = $"{item[2]} {item[3]}"
						.Trim()
						.ToLowerInvariant();
					name = Regex.Replace(name, @"\s", " ");
					name = Regex.Replace(name, @"(( )\?|\?( ))", @"$2""$3");
					name = Regex.Replace(name, @"\?", "'");

					DateTime dob;
					if (!DateTime.TryParse(item[4], out dob)) {
						dob = DateTime.MinValue;
					}

					DateTime entry;
					if (!DateTime.TryParse(item[7], out entry)) {
						entry = new DateTime(2018, 06, 13);
					}

					var parsedName = BinaryFog.NameParser.FullNameParser.Parse(name)
						.Results.OrderByDescending(r => r.Score)
						.FirstOrDefault();

					if (parsedName == null) {
						parsedName = new ParsedFullName {
							LastName = name
						};
					}

					Attendee attendee;
					if (item[8] != "TRUE") {
						items.Add(attendee = new Attendee {
							Department = item[0],
							ThemeCamp = item[1],
							Name = parsedName,
							DOB = dob,
							PermittedEntryDate = entry,
							EmailAddress = Regex
								.Replace(item[6], @"\s", "")
								.Trim()
								.ToLowerInvariant(),
							Id = Regex
								.Replace(item[5], @"\s", "")
								.Trim(),
							Index = sheet.Values.IndexOf(raw)
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

				var all = collection.FindAll()
					.Where(a => a.Name != null)
					.ToList();

				Data.ValueRange requestBody = new Data.ValueRange();
				requestBody.MajorDimension = "COLUMNS";

				foreach (var request in items) {
					try
					{
						Func<string, string[]> splitAndRemoveSuffixes = (string r) => {
							return Regex.Split(r, @"\s+")
								.Where(s => !Regex.IsMatch(s, "^i+$"))
								.ToArray();
						};

						var attendee = all.FirstOrDefault(a =>
								a.Id == request.Id ||
								(
									splitAndRemoveSuffixes(a.Name.FirstName ?? "")
										.Intersect(
											splitAndRemoveSuffixes(request.Name.FirstName ?? "")
										).Any() &&
									splitAndRemoveSuffixes(a.Name.LastName ?? "")
										.Intersect(
											splitAndRemoveSuffixes(request.Name.LastName ?? "")
										).Any() &&
									a.DOB.ToString("YYYYMMDD") == request.DOB.ToString("YYYYMMDD")
								) ||
								(
									splitAndRemoveSuffixes(a.Name.LastName ?? "")
										.Intersect(
											splitAndRemoveSuffixes(request.Name.LastName ?? "")
										).Any() &&
									a.DOB.ToString("YYYYMMDD") == request.DOB.ToString("YYYYMMDD") &&
									a.EmailAddress.ToLowerInvariant() == request.EmailAddress
								)
							);

						if (attendee == null) {
							request.Status = "notfound";
							continue;
						}

						request.Status = attendee.Status;
						request.Attached = attendee;
					}
					catch (Exception ex) { Console.WriteLine(ex); request.Status = "error"; continue; }
				}

				foreach (var group in items.ToList().GroupBy(i => i.Id)) {
					if (group.Count() > 1) {
						foreach (var item in group.Skip(1)) {
							items.Remove(item);
						}

						group.First().Status = "duplicates";
						continue;
					}

					var request = group.First();
					var attendee = request.Attached;
					attendee.ThemeCamp = request.ThemeCamp;
					attendee.Department = request.Department;
					attendee.PermittedEntryDate = request.PermittedEntryDate;
					collection.Update(attendee);
				}

				foreach (var result in items) {
					var ent = (!string.IsNullOrWhiteSpace(result.Department) ? result.Department : result.ThemeCamp);
					var suffix = result.Name.Suffix != null ? $" {result.Name.Suffix}" : "";

					Console.WriteLine(String.Format("{0,40}\t{1,34}\t{2,10}\t{3,10}\t{4,32}\t{5,10}\t{6}",
						ent.Substring(0, Math.Min(40, ent.Length)),
						$"{result?.Name.FirstName} {result?.Name.LastName}{suffix}",
						result.DOB.ToString("MM/dd/yyyy"),
						result.PermittedEntryDate?.ToString("MM/dd/yyyy"),
						result.Id,
						result.Status,
						result.EmailAddress
					));
				}

				Console.WriteLine();
				var daily = items
					.OrderBy(r => r.PermittedEntryDate)
					.GroupBy(r => r.PermittedEntryDate ?? new DateTime(2018, 06, 13));

				Console.WriteLine("DATE   : POP+ POP= ");

				var poptot = 0;
				foreach (var day in daily) {
					Console.WriteLine(String.Format("{0}: {1,4} {2,5}",
						day.Key.ToString("ddd dd"),
						day.Count(),
						poptot += day.Count()
					));
				}
			}
		}
    }
}
