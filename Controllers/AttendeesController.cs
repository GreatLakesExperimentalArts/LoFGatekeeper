namespace LoFGatekeeper.Controllers
{
	using Microsoft.AspNetCore.Mvc;
	using Raven.Client.Embedded;
	using System.Collections.Generic;
	using System.Linq;
	using System;

	[Route("api/[controller]")]
	public class AttendeesController : Controller
	{
		private EmbeddableDocumentStore Store { get; set; }

		public AttendeesController(EmbeddableDocumentStore store)
		{
			Store = store;
		}

		private class EmptyStringsLast : IComparer<string>
		{
			public int Compare(string a, string b)
			{
				return string.CompareOrdinal(
					string.IsNullOrWhiteSpace(a) ? "ZZZZ" : a,
					string.IsNullOrWhiteSpace(b) ? "ZZZZ" : b);
			}
		}

		[HttpGet]
		public dynamic Get()
		{
			var all = new List<Attendee>();
			using (var session = Store.OpenSession("AttendeeData"))
			{
				var i = 0;
				var chunk = null as List<Attendee>;
				var query = session.Query<Attendee>();

				do
				{
					chunk = query.Skip(i++ * 128).ToList();
					all.AddRange(chunk);
				}
				while (chunk.Count >= 128);

				all = all
					.OrderBy(a => a.Wristband, new EmptyStringsLast())
					.ThenBy(a => a.Department, new EmptyStringsLast())
					.ThenBy(a => a.Name.Last)
					.ThenBy(a => a.Name.First)
					.ToList();

				return new {
					attendees = all
				};
			}
		}

		public class SetWristbandDto
		{
			public string Wristband { get; set; }
			public string Date { get; set; }
		}

		[HttpPost("{id}/setWristband")]
		public IActionResult SetWristband(string id, [FromBody] SetWristbandDto dto)
		{
			using (var session = Store.OpenSession("AttendeeData"))
			{
				var attendee = session.Load<Attendee>(id);
				if (string.IsNullOrWhiteSpace(dto.Wristband) && !string.IsNullOrWhiteSpace(attendee.Wristband))
				{
					var removed = new List<string>();
					if (attendee.RemovedWristbands != null)
					{
						removed.AddRange(attendee.RemovedWristbands);
					}
					removed.Add(attendee.Wristband);
					attendee.RemovedWristbands = removed.ToArray();
				}
				attendee.Wristband = dto.Wristband;
				if (attendee.ArrivalDate == DateTime.MinValue)
				{
					attendee.ArrivalDate = DateTime.Parse(dto.Date);
				}
				session.Store(attendee);
				session.SaveChanges();
			}

			return Ok();
		}
	}
}
