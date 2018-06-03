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
				.Find(i => i.Status == "paid")
				.ToList();
		}
	}
}
