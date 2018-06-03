namespace LoFGatekeeper.Importers.GSheetsAPI.VolunteerShifts
{
	using System;
	using System.Collections;
	using System.Collections.Generic;
	using System.Globalization;
	using System.IO;
	using System.Linq;
	using System.Threading;

	using Newtonsoft.Json;

	using Google.Apis.Auth.OAuth2;
	using Google.Apis.Sheets.v4;
	using Google.Apis.Services;
	using Google.Apis.Util.Store;

	class Program
	{
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

				var spreadsheet = service.Spreadsheets
					.Values
					.Get(spreadsheetId, "Gate Shift Roster!A2:G");

				spreadsheet.DateTimeRenderOption = SpreadsheetsResource.ValuesResource.GetRequest.DateTimeRenderOptionEnum.FORMATTEDSTRING;
				spreadsheet.ValueRenderOption = SpreadsheetsResource.ValuesResource.GetRequest.ValueRenderOptionEnum.UNFORMATTEDVALUE;

				var values = spreadsheet.Execute().Values;
				var enUS = new CultureInfo("en-US");

				List<IList<object>> ilists = new List<IList<object>>();
				foreach (var item in values) {
					DateTime temp;
					if (DateTime.TryParseExact((string) item[0], "dddd, MMMM d", enUS, DateTimeStyles.AssumeLocal, out temp)) {
						continue;
					}
					if ((string) item[0] == "Task" || (string) item[3] == "TBD") {
						continue;
					}
					ilists.Add(item);
				}

				Directory.SetCurrentDirectory(Path.Combine("..", "..", "data"));

				using (var db = new LiteDB.LiteDatabase(@"LoFData.db"))
				{

					var shifts = ilists.Select(item => new ScheduledVolunteerShift {
							Task = $"{item[0]}",
							Begins = DateTime.ParseExact($"{item[1]}", "MM-dd-yyyy HH:mm", enUS).ToUniversalTime(),
							Ends = DateTime.ParseExact($"{item[2]}", "MM-dd-yyyy HH:mm", enUS).ToUniversalTime(),
							PreferredName = $"{item[3]}".ToLowerInvariant(),
							VolunteerId = (string) item[item.Count - 1],
							BurnerName = item.Count == 7 ? ((string) item[5]).ToLowerInvariant() : null
						}).ToList();

					// variable isolation
					{
						var collection = db.GetCollection<ScheduledVolunteerShift>("volunteerShifts");
						collection.Delete(row => true);
						collection.InsertBulk(shifts);
					}

					var volunteers = shifts.GroupBy(arg => arg.VolunteerId)
						.Select(arg => new Volunteer {
							Id = arg.Key,
							ScheduledRefList = arg.Select(inner => inner.Id).ToArray(),
							PreferredName = arg.Select(inner => inner.PreferredName).First(),
							BurnerName = arg.Select(inner => inner.BurnerName).First()
						});

					// variable isolation
					{
						var collection = db.GetCollection<Volunteer>("volunteers");
						collection.Delete(row => true);

						var attendees = db.GetCollection<Attendee>("attendees");

						foreach(var volunteer in volunteers) {
							var attendee = attendees.FindById(volunteer.Id);

							if (!string.IsNullOrWhiteSpace(volunteer.BurnerName)) {
								attendee.BurnerName = volunteer.BurnerName;
							}
							try
							{
								if (!string.IsNullOrWhiteSpace(volunteer.PreferredName) && attendee.Name.FirstName != volunteer.PreferredName) {
									attendee.Name.NickName = volunteer.PreferredName;
								}
							} catch {
								Console.WriteLine(JsonConvert.SerializeObject(volunteer, Formatting.Indented));
								Console.WriteLine(JsonConvert.SerializeObject(attendee, Formatting.Indented));
							}
							attendees.Update(attendee);
						}
						collection.InsertBulk(volunteers);
					}

					Console.WriteLine(JsonConvert.SerializeObject(volunteers, Formatting.Indented));
				}
			}

			Console.WriteLine();
		}
    }
}
