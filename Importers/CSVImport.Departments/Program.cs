namespace LoFGatekeeper.CSVImport.Departments
{
	using CsvHelper;
	using CsvHelper.Configuration;
	using NameParser;
	using Raven.Client.Document;
	using System;
	using System.IO;
	using MoreLinq;

	public sealed class AttendeeClassMap : CsvClassMap<Attendee>
	{
		public AttendeeClassMap()
		{
			Map(m => m.Department).Name("Department");
			Map(m => m.Name)
				.ConvertUsing(row => new HumanName(
					row.GetField("Name")
				));
			Map(m => m.DOB).ConvertUsing(row => {
				DateTime.TryParse(row.GetField("DOB"), out DateTime date);
				return date;
			});
			Map(m => m.Wristband).Name("Wristband");
			Map(m => m.RemovedWristbands).ConvertUsing(row => {
				var field = row.GetField("Replaced");
				return !string.IsNullOrEmpty(field) ? field.Split(',') : null;
			});
			Map(m => m.BurnerName).Name("Burner Name");
			Map(m => m.PermittedEntryDate).ConvertUsing(row => {
				DateTime.TryParse(row.GetField("Permitted"), out DateTime date);
				return date;
			});
			Map(m => m.ArrivalDate).ConvertUsing(row => {
				DateTime.TryParse(row.GetField("Arrival"), out DateTime date);
				return date;
			});
			Map(m => m.Parents).ConvertUsing(row => {
				var field = row.GetField("Replaced");
				return !string.IsNullOrEmpty(field) ? field.Split(',') : null;
			});
			Map(m => m.Id).Name("Registration");
		}
	}

	class Program
    {
		static void Main(string[] args)
		{
			using (var store = new DocumentStore { Url = "http://localhost:54001" })
			{
				store.Initialize();
				using (var csv = new CsvReader(File.OpenText(@"..\LoFGatekeeper\LoFData.Departments.csv")))
				{
					csv.Configuration.RegisterClassMap<AttendeeClassMap>();
					foreach (var batch in csv.GetRecords<Attendee>().Batch(30))
					{
						using (var session = store.OpenSession("AttendeeData"))
						{
							foreach (var record in batch)
							{
								if (!string.IsNullOrEmpty(record.Id) && record.Id != "#N/A")
								{
									var attendee = session.Load<Attendee>(record.Id);
									if (attendee == null)
									{
										attendee = new Attendee {
											Id = record.Id,
											Name = record.Name,
											BurnerName = record.BurnerName,
											DOB = record.DOB,
											Department = record.Department,
											ThemeCamp = record.ThemeCamp
										};
									}

									attendee.BurnerName = record.BurnerName;
									attendee.Department = record.Department;
									attendee.PermittedEntryDate = record.PermittedEntryDate;
									attendee.Wristband = record.Wristband;
									attendee.RemovedWristbands = record.RemovedWristbands;
									attendee.Parents = record.Parents;
									attendee.ArrivalDate = record.ArrivalDate;
									session.Store(attendee);
								}
							}
							session.SaveChanges();
						}
					}
				}
			}
		}
    }
}