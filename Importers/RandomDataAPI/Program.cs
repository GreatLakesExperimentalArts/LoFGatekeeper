using System.Collections.Generic;
using System.IO;
using AutoMapper;
using Flurl.Http;
using Newtonsoft.Json;

namespace LoFGatekeeper.RandomData
{
	using LiteDB;
	using System;
	using Interfaces;
	using BinaryFog.NameParser;

	class Program
	{
		public class ImportFile
		{
			public List<Result> Results { get; set; }

			public class Result
			{
				public ImportName Name { get; set; }
				public DateTime DOB { get; set; }
				public string Email { get; set; }

				public class ImportName
				{
					public string First { get; set; }
					public string Last { get; set; }
				}
			}
		}

		private static void Main(string[] args)
		{
			Directory.SetCurrentDirectory(@"..\..\..\");

			using (var db = new LiteDatabase(@"..\..\LoFData.db"))
			{
				var collection = db.GetCollection<Attendee>("attendees");

				// "https://randomuser.me/api/?results=2000".GetJsonAsync<ImportFile>();

				var data = JsonConvert.DeserializeObject<ImportFile>(File.ReadAllText(@"random.json"), new JsonSerializerSettings {
					MissingMemberHandling = MissingMemberHandling.Ignore
				});

				Mapper.Initialize(cfg => {
					cfg.CreateMap<ImportFile.Result.ImportName, ParsedFullName>()
						.ConvertUsing(v => new ParsedFullName { FirstName = v.First, LastName = v.Last });

					cfg.CreateMap<ImportFile.Result, Attendee>()
						.ForMember(dest => dest.EmailAddress, map => map.ResolveUsing(mem => mem.Email))
						.ForMember(dest => dest.Id, map => map.ResolveUsing(mem => Guid.NewGuid().ToString()));
				});

				var test = Mapper.Map<List<Attendee>>(data.Results);

				collection.InsertBulk(test);
			}
		}
    }
}