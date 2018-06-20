namespace LoFGatekeeper.Hubs
{
	using System;
	using System.Collections.Generic;
	using System.Linq;
	using System.Threading.Tasks;
	using System.Security.Cryptography;
	using System.Text;
	using Controllers;
	using Microsoft.AspNetCore.SignalR;
	using Newtonsoft.Json;
	using Newtonsoft.Json.Linq;
	using JsonDiffPatchDotNet;
	using LiteDB;
	using Serilog;

	internal class AttendeeHubContext
	{
		public LiteDatabase Database { get; set; }

		public ILogger Logger { get ;set; }

		public AttendeeHubContext(LiteDatabase database, ILogger logger)
		{
			Database = database;
			Logger = logger;
		}
	}

	internal class AttendeeHub : Hub
	{
		private AttendeeHubContext AttendeeHubContext { get; set; }

		private ILogger Logger { get; set; }
		private LiteDatabase Database { get; set; }

		public AttendeeHub(AttendeeHubContext context)
		{
			AttendeeHubContext = context ?? throw new ArgumentNullException(nameof(context));
			Database = context.Database;
			Logger = context.Logger;
		}

		#region Add
		public class AddRequest
		{
			public Attendee Attendee { get; set; }
			public string Reason { get; set; }
			public string[] Parents { get; set; }
		}

		public async Task Add(AddRequest request)
		{
			var collection = Database.GetCollection<Attendee>("attendees");

			var attendee = new Attendee();
			attendee.Name = new BinaryFog.NameParser.ParsedFullName {
				FirstName = request.Attendee.Name.FirstName,
				LastName = request.Attendee.Name.LastName
			};

			attendee.DOB = request.Attendee.DOB;
			attendee.Parents = request.Parents;
			attendee.ArrivalDate = DateTime.Now;
			attendee.Status = "paid";

			using (var hash = MD5.Create()) {
				var next = collection.FindAll().Max(a => Int32.Parse(a.Id.Split('-')[0])) + 1;
				var uniq = hash.ComputeHash(Encoding.UTF8.GetBytes($"{next} {attendee.EmailAddress}"));
				var utag = BitConverter.ToString(uniq)
					.Replace("-", string.Empty)
					.ToLower();

				attendee.Id = $"{next}-{utag}";
			}

			collection.Insert(attendee);
			Logger.Information(JsonConvert.SerializeObject(attendee, Formatting.Indented));

			await Clients.All.SendAsync("Add", attendee);
		}
		#endregion

		#region Fetch
		public class FetchRequest
		{
			public string Id { get; set; }
		}

		public async Task Fetch(DeleteRequest request)
		{
			var collection = Database.GetCollection<Attendee>("attendees");
			var attendee = collection.FindOne(a => a.Id == request.Id);
			await Clients.All.SendAsync("Update", attendee);
		}
		#endregion

		#region Delete
		public class DeleteRequest
		{
			public string Id { get; set; }
		}

		public async Task Delete(DeleteRequest request)
		{
			var collection = Database.GetCollection<Attendee>("attendees");
			collection.Delete(a => a.Id == request.Id);
			await Clients.All.SendAsync("Delete", request);
		}
		#endregion

		#region Update
	    public async Task Update(Attendee request)
		{
			var collection = Database.GetCollection<Attendee>("attendees");
			var id = request.Id;
			var attendee = collection.Find(x => x.Id == id)
				.SingleOrDefault();

			if (attendee == null)
			{
				await Clients.Caller.SendAsync("UpdateFailed", request);
				return;
			}

			if (attendee.RemovedWristbands == null) {
				attendee.RemovedWristbands = new string[] {};
			}

			if (string.IsNullOrEmpty(request.Wristband) && string.IsNullOrEmpty(attendee.Wristband)) {
				request.Wristband = attendee.Wristband;
			}

			if (attendee.ArrivalDate != null) {
				if (string.IsNullOrEmpty(request.Wristband) &&
					(request.RemovedWristbands.Length == 0 || request.ArrivalDate < DateTime.Parse("06/08/2018"))) {
					request.ArrivalDate = null;
				}
			}

			foreach (var prop in attendee.GetType().GetProperties()) {
				var type = prop.PropertyType;
				if (type == typeof(DateTime) || (
					type.IsGenericType &&
					type.GetGenericTypeDefinition() == typeof(Nullable<>) &&
					Nullable.GetUnderlyingType(type) == typeof(DateTime)
				)) {
					var src = prop.GetValue(request) as DateTime?;
					var dst = prop.GetValue(attendee) as DateTime?;
					if (src?.ToUniversalTime() == dst?.ToUniversalTime()) {
						prop.SetValue(request, dst);
					}
				}
			}

			if (!string.IsNullOrEmpty(request.Wristband) && request.ArrivalDate == null) {
				request.ArrivalDate = DateTime.UtcNow;
			}

			var patcher = new JsonDiffPatch();
			var current = JObject.FromObject(attendee) as JToken;
			var updates = JObject.FromObject(request);
			var patches = patcher.Diff(current, updates);

			current = patcher.Patch(current, patches);
			JsonConvert.PopulateObject(current.ToString(), attendee);

			var removed = new List<string>();
			removed.AddRange(attendee.RemovedWristbands != null
				? attendee.RemovedWristbands
				: new string[] {});
			attendee.RemovedWristbands = removed
				.Except(new[] { attendee.Wristband })
				.Distinct()
				.ToArray();

			Logger.Information(JsonConvert.SerializeObject(new {
				attendee.Id,
				patches
			}, Formatting.Indented));

			collection.Update(attendee);
			await Clients.All.SendAsync("Update", attendee);
	    }
		#endregion
	}
}
