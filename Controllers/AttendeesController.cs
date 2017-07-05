namespace LoFGatekeeper.Controllers
{
	using LiteDB;
	using Microsoft.AspNetCore.Mvc;
	using System.Collections.Generic;
	using System.Linq;
	using System;

	[Route("api/[controller]")]
	public class AttendeesController : Controller
	{
		private LiteDatabase db { get; set; }

		public AttendeesController(LiteDatabase liteDBInstance)
		{
			db = liteDBInstance;
		}

		internal class EmptyStringsLast : IComparer<string>
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
			return db.GetCollection<Attendee>("attendees")
				.FindAll()
				.OrderBy(a => a.Wristband, new EmptyStringsLast())
				.ThenBy(a => a.Department, new EmptyStringsLast())
				.ThenBy(a => a.Name.Last)
				.ThenBy(a => a.Name.First)
				.ToList();
		}

		public class SetWristbandDto
		{
			public string Wristband { get; set; }
			public string[] RemovedWristbands { get; set; }
			public string Date { get; set; }
		}

		[HttpPost("{id}/setWristband")]
		public IActionResult SetWristband(string id, [FromBody] SetWristbandDto dto)
		{
			var collection = db.GetCollection<Attendee>("attendees");
			var attendee = collection.Find(x => x.Id == id)
				.SingleOrDefault();

			if (attendee == null)
				return NotFound();

			attendee.Wristband = dto.Wristband;

			if (dto.RemovedWristbands != null)
			{
				var removed = new List<string>();
				removed.AddRange(dto.RemovedWristbands);
				attendee.RemovedWristbands = removed
					.Except(new[] { dto.Wristband })
					.Distinct()
					.ToArray();
			}

			/*if (attendee.ArrivalDate == DateTime.MinValue)
			{
				attendee.ArrivalDate = DateTime.Parse(dto.Date);
			}*/

			collection.Update(attendee);

			return Ok();
		}
	}
}
