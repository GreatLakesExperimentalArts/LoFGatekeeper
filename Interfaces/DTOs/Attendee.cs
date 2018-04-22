namespace LoFGatekeeper
{
	using Interfaces;
	using BinaryFog.NameParser;
	using Newtonsoft.Json;
	using System;

	public class Attendee : IAttendee
	{
		public string Id { get; set; }
		public ParsedFullName Name { get; set; }
		public string BurnerName { get; set; }
		public DateTime DOB { get; set; }
		public string EmailAddress { get; set; }
		public string Phone { get; set; }
		public string Department { get; set; }
		public string ThemeCamp { get; set; }
		public string Wristband { get; set; }
		public string[] RemovedWristbands { get; set; }

		[JsonProperty("parents", NullValueHandling = NullValueHandling.Ignore)]
		public string[] Parents { get; set; }

		private DateTime? _permittedEntryDate;
		private DateTime? _arrivalDate;

		public DateTime? PermittedEntryDate
		{
			get => _permittedEntryDate;
			set
			{
				if (value.GetValueOrDefault() == DateTime.MinValue)
					return;

				_permittedEntryDate = value;
			}
		}

		public DateTime? ArrivalDate
		{
			get => _arrivalDate;
			set {
				if (value.GetValueOrDefault() == DateTime.MinValue)
					return;

				_arrivalDate = value;
			}
		}
	}
}
