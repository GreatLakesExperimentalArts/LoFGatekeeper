namespace LoFGatekeeper.Hubs
{
	using System;
	using System.Linq;
	using System.Threading.Tasks;
	using Microsoft.AspNetCore.SignalR;
	using LiteDB;
	using Serilog;
    using Newtonsoft.Json;

    internal class VolunteerHubContext
	{
		public LiteDatabase Database { get; set; }

		public ILogger Logger { get ;set; }

		public VolunteerHubContext(LiteDatabase database, ILogger logger)
		{
			Database = database;
			Logger = logger;
		}
	}

	internal class VolunteerHub : Hub
	{
		private VolunteerHubContext VolunteerHubContext { get; set; }

		private ILogger Logger { get; set; }

		private LiteCollection<VolunteerTimeclockEntry> Collection { get; set; }

		public VolunteerHub(VolunteerHubContext context)
		{
			VolunteerHubContext = context ?? throw new ArgumentNullException(nameof(context));
			Collection = context.Database.GetCollection<VolunteerTimeclockEntry>("volunteerHours");
			Logger = context.Logger;
		}

		public async Task GetActive()
		{
			await Clients.Caller.SendAsync("ActiveVolunteers",
				Collection.Find(item => item.Out == null)
					.Select(item => new[] {
						item.Id.ToString(),
						item.VolunteerId,
						item.In.ToString("s")
					})
					.ToArray()
			);
		}

		public async Task BeginShiftFor(VolunteerTimeclockEntry request)
		{
			var found = Collection.FindOne(a => a.Id == request.Id && a.Out == null);
			if (found != null) {
				return;
			}

			Collection.Insert(request);
			await Clients.All.SendAsync("VolunteerStartShift", request);
		}

		public async Task EndShiftFor(VolunteerTimeclockEntry request)
		{
			var found = Collection.FindOne(a => a.Id == request.Id);

			Logger.Information(JsonConvert.SerializeObject(Collection.FindAll()));

			if (found == null) {
				Logger.Information($"Could not end shift {request.Id}");
				return;
			}

			found.Out = DateTime.Now;
			Collection.Update(found);

			await Clients.All.SendAsync("VolunteerEndedShift", found);
		}
	}
}