namespace LoFGatekeeper
{
	using BinaryFog.NameParser;
	using Newtonsoft.Json;
	using System;
	using System.Collections.Generic;

	public class VehicleInfo
	{
		public string PermitNo { get; set; }
		public string State { get; set;}
		public string LicNo { get; set; }
		public string Description { get; set; }
	}

	public class Attendee : IEqualityComparer<Attendee>
	{
		public string Id { get; set; }
		public ParsedFullName Name { get; set; }
		public string BurnerName { get; set; }
		public DateTime DOB { get; set; }
		public string EmailAddress { get; set; }
		public string Phone { get; set; }
		public string Status { get; set; }
		public string Department { get; set; }
		public string ThemeCamp { get; set; }
		public string Wristband { get; set; }

		public List<VehicleInfo> CarCampVehicleInfo { get; set; } = new List<VehicleInfo>();

		public string[] RemovedWristbands { get; set; }

		[JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
		public string[] Parents { get; set; }

		private DateTime? _permittedEntryDate;

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

		[JsonIgnore]
		public DateTime LastModified { get; set; }

		public DateTime? ArrivalDate { get; set; }

        public bool Equals(Attendee x, Attendee y)
        {
            return x.Id == y.Id;
        }

        public int GetHashCode(Attendee obj)
        {
            return obj.Id.GetHashCode();
        }
    }
}
