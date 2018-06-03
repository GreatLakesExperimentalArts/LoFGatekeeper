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
    using System.Globalization;
    using BinaryFog.NameParser;
    using System.Text;
    using System.Security.Cryptography;

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
			public Attendee Attendee { get; set; }
			public string EmailAddress { get; set; }
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

				var values = service.Spreadsheets
					.Values
					.Get(spreadsheetId, "BPT Import Data!A2:D")
					.Execute()
					.Values;

				Directory.SetCurrentDirectory(Path.Combine("..", "..", "data"));

				using (var db = new LiteDB.LiteDatabase(@"LoFData.db"))
				{
					var collection = db.GetCollection<Attendee>("attendees");
					var pos = collection.FindAll()
						.Select(row => row.Id.Split('-').First())
						.Select(id => int.Parse(id))
						.Max() + 1;

					foreach (var item in values) {
						var bptentry = new Attendee {
							Name = new ParsedFullName() {
								FirstName = ((string) item[0]).ToLowerInvariant(),
								LastName = ((string) item[1]).ToLowerInvariant()
							},
							EmailAddress = (string) item[2],
							DOB = DateTime.ParseExact((string) item[3], "M/d/yy", new CultureInfo("en-US"))
						};

						var attendee = collection.FindOne(att =>
							att.Name.FirstName != null &&
							Regex.Replace(att.Name.LastName, @"\W", "") == Regex.Replace(bptentry.Name.LastName, @"\W", "") &&
							att.DOB == bptentry.DOB);

						if (attendee != null) {
							bptentry.Id = attendee.Id;
							attendee.Status = "paid";
							attendee.Name.FirstName = bptentry.Name.FirstName;
							attendee.Name.LastName = bptentry.Name.LastName;

							collection.Update(attendee);
						} else {
							using (var hash = MD5.Create()) {
								var rown = pos++;
								var uniq = hash.ComputeHash(Encoding.UTF8.GetBytes($"{rown} {bptentry.EmailAddress}"));
								var utag = BitConverter.ToString(uniq)
									.Replace("-", string.Empty)
									.ToLower();

								bptentry.Id = $"{rown}-{utag}";
							}
							bptentry.Status = "paid";

							collection.Insert(bptentry);
						}

						Console.WriteLine($@"
SYS:	{attendee?.Id}	{attendee?.Name.FirstName}	{attendee?.Name.LastName}	{attendee?.DOB.ToString("MM/dd/yyyy")}	{attendee?.EmailAddress}	{attendee?.Status}
BPT:	{bptentry?.Id}	{bptentry?.Name.FirstName}	{bptentry?.Name.LastName}	{bptentry?.DOB.ToString("MM/dd/yyyy")}	{bptentry?.EmailAddress}");
					}
				}
			}

			Console.WriteLine();
		}
    }
}
