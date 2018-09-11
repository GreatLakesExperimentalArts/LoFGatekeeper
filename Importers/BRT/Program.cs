namespace LoFGatekeeper.BRTImport
{
	using LiteDB;
	using BinaryFog.NameParser;
	using System;
	using System.Linq;
	using System.Xml;
	using LoFGatekeeper.Interfaces;

	class Program
	{
		static void Main(string[] args)
		{
			using (var db = new LiteDatabase(@"LoFData.db"))
			{
				var collection = db.GetCollection<Attendee>("attendees");

				using (var reader = new XmlTextReader(@"..\..\brt_ticket_export.xml"))
				//using (var session = store.OpenSession("AttendeeData"))
				{
					// store.Initialize();
					Console.WriteLine();

					var attendee = (Attendee)null;

					while (reader.Read())
					{
						switch (reader.NodeType)
						{
							case XmlNodeType.Element:
								switch (reader.Name)
								{
									case "ticket":
										attendee = new Attendee();
										break;
									case "user_email":
										reader.Read();
										attendee.EmailAddress = reader.Value;
										break;
									case "assigned_name":
										reader.Read();

										var raw = reader.Value.Trim();
										var dob = DateTime.MinValue;

										var name = string.Join(" ", raw.Split(' ')
											.TakeWhile(value => !DateTime.TryParse(value, out dob))
										);

										attendee.DOB = dob;
										//attendee.Name = NameParser.;
										break;
								}
								break;
							case XmlNodeType.EndElement:
								switch (reader.Name)
								{
									case "ticket":
										collection.Insert(attendee);
										break;
								}
								break;
						}
					}

					//session.SaveChanges();
				}
			}
		}
    }
}