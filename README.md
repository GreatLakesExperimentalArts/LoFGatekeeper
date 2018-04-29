# LoFGatekeeper
Lakes of Fire Gate Entry (Will-Call) System

TECHNICAL:
- Frontend:
	- Typescript and LESS enabled
	- React 15.6.1
	- Redux 3.7.1
	- SignalR Client 1.0.0-preview2-final
	- Webpack Hot Module Reloading
- Backend
	- Container: Docker
	- Framework: ASP.NET Core 2.1.0-preview2-final
	- Database:  LiteDB
	- IoC:       Autofac 4.6.2
	- Logging:   Serilog 2.6.0
	- Service:   Topshelf 4.1.0

COMPLETED:
- Will-call table is fully functional with multiple client machines able to connect
- Docker image compiles and runs on server which will be used
- webpack HMR works both when using Visual Studio debugging or `yarn start`

2018 MVP TODO:
- Under-13 Manual Entry
- Operational status display board
	- Recent checkins
	- Population totals
	- current volunteers with hours
- Volunteer schedule display
- Volunteer check-in

2018 Stretch TODO:
- incident log

FUTURE:
- implement login layer... MFA (RFID & Wristband)
- implement security layer on SignalR communications