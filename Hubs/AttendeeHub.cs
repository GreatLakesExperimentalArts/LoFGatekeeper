using System.Collections.Generic;

namespace LoFGatekeeper.Hubs
{
	using System;
	using System.Linq;
	using System.Threading.Tasks;
	using System.Security.Cryptography;
	using System.Text;
	using Controllers;
	using Microsoft.AspNetCore.SignalR;
	using LiteDB;
	using Serilog;

	internal interface IAttendeeHubContext
	{
		LiteDatabase Database { get; set; }

		ILogger Logger { get; set; }
	}

	internal class AttendeeHubContext : IAttendeeHubContext
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
		private IAttendeeHubContext AttendeeHubContext { get; set; }

		private ILogger Logger { get; set; }
		private LiteDatabase Database { get; set; }

		public AttendeeHub(IAttendeeHubContext context)
		{
			AttendeeHubContext = context ?? throw new ArgumentNullException(nameof(context));
			Database = context.Database;
			Logger = context.Logger;
		}

		/* public override async Task OnConnectedAsync()
		{
			await Clients.All.SendAsync("ClientConnected");
	    }

	    public override async Task OnDisconnectedAsync(Exception ex)
	    {
		    await Clients.All.SendAsync("ClientDisconnected", "left");
	    } */

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

			request.Attendee.Parents = request.Parents;
			request.Attendee.ArrivalDate = DateTime.Now;

			using (var hash = MD5.Create()) {
				var next = collection.FindAll().Max(a => Int32.Parse(a.Id.Split('-')[0])) + 1;
				var uniq = hash.ComputeHash(Encoding.UTF8.GetBytes($"{next} {request.Attendee.EmailAddress}"));
				var utag = BitConverter.ToString(uniq)
					.Replace("-", string.Empty)
					.ToLower();

				request.Attendee.Id = $"{next}-{utag}";
			}

			collection.Insert(request.Attendee);

			// Logger.Information(Newtonsoft.Json.JsonConvert.SerializeObject(request));
			await Clients.All.SendAsync("Add", request.Attendee);
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
		public class UpdateRequest
		{
			public string id { get; set; }
			public string Wristband { get; set; }
			public string[] RemovedWristbands { get; set; }
			public string Date { get; set; }
		}

		public class UpdateResponse
		{
			public UpdateResponse(Attendee attendee)
			{
				id = attendee.Id;
				Wristband = attendee.Wristband;
				RemovedWristbands = attendee.RemovedWristbands;
				ArrivalDate = attendee.ArrivalDate;
			}

			public string id { get; set; }
			public string Wristband { get; set; }
			public string[] RemovedWristbands { get; set; }
			public DateTime? ArrivalDate { get; set; }
		}

	    public async Task Update(UpdateRequest request)
		{
			var collection = Database.GetCollection<Attendee>("attendees");
			var attendee = collection.Find(x => x.Id == request.id)
				.SingleOrDefault();

			if (attendee == null)
			{
				await Clients.Caller.SendAsync("UpdateFailed", request);
				return;
			}

			attendee.Wristband = request.Wristband;

			if (request.RemovedWristbands != null)
			{
				var removed = new List<string>();
				removed.AddRange(request.RemovedWristbands);
				attendee.RemovedWristbands = removed
					.Except(new[] { request.Wristband })
					.Distinct()
					.ToArray();
			}

			Logger.Information($"Set Attendee {request.id} {request.Wristband} [{string.Join(", ", request.RemovedWristbands)}]");

			if (attendee.ArrivalDate == null)
			{
				attendee.ArrivalDate = DateTime.Parse(request.Date);
			}

			collection.Update(attendee);
			await Clients.All.SendAsync("Update", new UpdateResponse(attendee));
	    }
		#endregion
	}
}
