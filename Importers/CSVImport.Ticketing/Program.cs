namespace LoFGatekeeper.CSVImport
{
	using CsvHelper;
	using CsvHelper.Configuration;
	using Interfaces;
	using NameParser;
	using Newtonsoft.Json;
	using Raven.Client.Document;
	using System;
	using System.IO;

	public class Attendee : IAttendee
	{
		public string Id { get; set; }
		public HumanName Name { get; set; }
		public DateTime DOB { get; set; }
		public string EmailAddress { get; set; }
		public string[] Parents { get; set; }
	}

	public sealed class AttendeeClassMap : CsvClassMap<Attendee>
	{
		public AttendeeClassMap()
		{
			Map(m => m.Name)
				.ConvertUsing(row => new HumanName(
					$"{row.GetField<string>("First Name")} {row.GetField<string>("Last Name")}"
				));
			Map(m => m.DOB).ConvertUsing(row => {
				DateTime.TryParse(row.GetField<string>("DOB"), out DateTime date);
				return date;
			});
			Map(m => m.EmailAddress).Name("Email");
			Map(m => m.Id).Name("Registration");
			Map(m => m.Parents).ConvertUsing(row => {
				var field = row.GetField("Parents");
				return !string.IsNullOrEmpty(field) ? field.Split(',') : null;
			});
		}
	}

	class Program
    {
		static void Main(string[] args)
		{
			using (var store = new DocumentStore { Url = "http://localhost:54001" })
			{
				store.Initialize();

				var session = store.OpenSession("AttendeeData");
				using (var csv = new CsvReader(File.OpenText(@"LoFData.Attendees.csv")))
				{
					csv.Configuration.RegisterClassMap<AttendeeClassMap>();

					int i = 0;
					foreach (var record in csv.GetRecords<Attendee>())
					{
						var attendee = session.Load<Attendee>(record.Id);
						if (attendee == null) {
							attendee = new Attendee { };
						}

						attendee.Id = record.Id;
						attendee.Name = record.Name;
						attendee.DOB = record.DOB;
						attendee.EmailAddress = record.EmailAddress;
						attendee.Parents = record.Parents;

						session.Store(attendee);

						if (i++ % 25 == 0)
						{
							session.SaveChanges();
							session = store.OpenSession("AttendeeData");
						}
					}
					session.SaveChanges();
				}

				session.Dispose();
				session = null;
			}
		}
    }
}