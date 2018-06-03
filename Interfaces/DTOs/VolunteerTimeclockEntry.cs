namespace LoFGatekeeper
{
	using System;

	public class VolunteerTimeclockEntry
	{
		public Guid Id { get; set; } = Guid.NewGuid();

		public string VolunteerId { get; set; }

		public DateTime In { get; set; }

		public DateTime? Out { get; set; }
	}
}
