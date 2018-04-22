using System.Collections.Generic;

namespace LoFGatekeeper.Hubs
{
	using System;
	using System.Linq;
	using System.Threading.Tasks;
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

		public override async Task OnConnectedAsync()
		{
			await Clients.All.SendAsync("ClientConnected");
	    }

	    public override async Task OnDisconnectedAsync(Exception ex)
	    {
		    await Clients.All.SendAsync("ClientDisconnected", "left");
	    }

		public class SetWristbandRequest
		{
			public string id { get; set; }
			public string Wristband { get; set; }
			public string[] RemovedWristbands { get; set; }
			public string Date { get; set; }
		}

		public class SetWristbandResponse
		{
			public SetWristbandResponse(Attendee attendee)
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

	    public async Task Update(SetWristbandRequest request)
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
			await Clients.All.SendAsync("Update", new SetWristbandResponse(attendee));
	    }
	}
}
