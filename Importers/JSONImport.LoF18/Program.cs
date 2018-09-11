namespace LoFGatekeeper.Importers.JSONImport.LoF18
{
	using LiteDB;
	using System;
	using System.Linq;
	using System.Security.Cryptography;
	using System.Text;
	using Interfaces;
	using BinaryFog.NameParser;
	using System.Collections.Generic;
	using System.IO;
	using AutoMapper;
	using Newtonsoft.Json;

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

		private static void Main(string[] args)
		{
			Directory.SetCurrentDirectory(Path.Combine("..", "..", "data"));

			using (var db = new LiteDatabase(@"LoFData.db"))
			{
				var collection = db.GetCollection<Attendee>("attendees");

				var data = JsonConvert.DeserializeObject<List<ImportFile.Result>>(File.ReadAllText(@"import.json"), new JsonSerializerSettings {
					MissingMemberHandling = MissingMemberHandling.Ignore,
					NullValueHandling = NullValueHandling.Ignore
				});

				Mapper.Initialize(cfg => {
					cfg.CreateMap<ImportFile.Result, Attendee>()
						.ForMember(dest => dest.Name, map => map.ResolveUsing(
							mem => new ParsedFullName {
								FirstName = (mem.FirstName ?? "").Trim().ToLowerInvariant(),
								LastName = (mem.LastName ?? "").Trim().ToLowerInvariant()
							}
						))
						.ForMember(dest => dest.EmailAddress, map => map.ResolveUsing(mem => mem.Email))
						.ForMember(dest => dest.Id, map => map.ResolveUsing(mem => {
							using (var hash = MD5.Create()) {
								var uniq = hash.ComputeHash(Encoding.UTF8.GetBytes($"{mem.Id} {mem.Email}"));
								var utag = BitConverter.ToString(uniq)
									.Replace("-", string.Empty)
									.ToLower();

								return $"{mem.Id}-{utag}";
							}
						}));
				});

				var test = Mapper.Map<List<Attendee>>(data.Where(mem => mem.Status == "paid").ToList());

				collection.InsertBulk(test);
			}
		}
    }
}
