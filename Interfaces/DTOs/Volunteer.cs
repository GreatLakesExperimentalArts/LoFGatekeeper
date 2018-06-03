namespace LoFGatekeeper
{
	using Newtonsoft.Json;
	using System;

	public class Volunteer
	{
		public string Id { get; set; }

		public Guid[] ScheduledRefList { get; set; }

		public Guid[] TimeclockRefList { get; set; }

		[JsonIgnore]
		public string PreferredName {get; set;}

		[JsonIgnore]
		public string BurnerName {get; set;}
	}

	public class ScheduledVolunteerShift
	{
		public Guid Id { get; set; } = Guid.NewGuid();

		public string VolunteerId { get; set; }

		public DateTime Begins { get; set; }

		public DateTime Ends { get; set; }

		public string Task { get; set; }

		[JsonIgnore]
		public string PreferredName {get; set;}

		[JsonIgnore]
		public string BurnerName {get; set;}

		[JsonIgnore]
		public bool Found { get; set; }
	}
}
