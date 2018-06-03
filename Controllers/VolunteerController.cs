namespace LoFGatekeeper.Controllers
{
	using LiteDB;
	using Microsoft.AspNetCore.Mvc;
	using System.Collections.Generic;
	using System.Linq;
	using System;

	[Route("api/[controller]")]
	public class VolunteerController : Controller
	{
		private LiteDatabase db { get; set; }

		public VolunteerController(LiteDatabase liteDBInstance)
		{
			db = liteDBInstance;
		}

		[HttpGet]
		public dynamic Get()
		{
			return db.GetCollection<ScheduledVolunteerShift>("volunteerShifts")
				.FindAll()
				.ToList();
		}
	}
}
