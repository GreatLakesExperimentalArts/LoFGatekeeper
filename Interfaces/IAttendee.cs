using System;
using BinaryFog.NameParser;

namespace LoFGatekeeper.Interfaces
{
    public interface IAttendee
	{
		string Id { get; set; }
		ParsedFullName Name { get; set; }
		DateTime DOB { get; set; }
	}
}
