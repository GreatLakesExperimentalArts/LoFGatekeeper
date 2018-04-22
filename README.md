# LoFGatekeeper
Lakes of Fire Gate Entry (Will-Call) System

TECHNICAL:
- Frontend:
	- Typescript and LESS enabled
	- React 15.6.1
	- Redux 3.7.1
	- SignalR Client 1.0.0-preview2-final
	- Webpack HMR enabled, full working in windows.
- Backend
	- Container: Docker
	- Framework: ASP.NET Core 2.1.0-preview2-final
	- IoC:       Autofac 4.6.2
	- Logging:   Serilog 2.6.0
	- Service:   Topshelf 4.1.0

COMPLETED:
- Will-call table fully functional with multiple client machines able to connect
- Docker image compiles and runs on target workstation
- webpack HMR works when using Vvisual Studio debugging

2018 MVP TODO:
- Under-13 Manaual Entry
- Operational status display board
	- Recent checkins
	- Population totals
	- current volunteers with hours
- Volunteer schedule display
- Volunteer check-in

2018 Stratch TODO:
- incident log

FUTURE:
- implement login layer... MFA (RFID & Wristband)
- implement security layer on SignalR communications