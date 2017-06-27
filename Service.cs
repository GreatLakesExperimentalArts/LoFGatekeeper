namespace LoFGatekeeper
{
	using APIology.ServiceProvider;
	using Autofac;
	using Controllers;
	using Microsoft.AspNetCore.Builder;
	using Microsoft.AspNetCore.Hosting;
	using Microsoft.Extensions.Configuration;
	using Microsoft.Extensions.DependencyInjection;
	using Raven.Client.Embedded;
	using Serilog;
	using System;
	using System.Reflection;
	using Topshelf;

	public class Service : AspNetCoreServiceProvider<Service, Configuration>
	{
		public static void Main() => Run();

		public override bool Start(HostControl hostControl)
		{
			if (!base.Start(hostControl))
				return false;

			return true;
		}

		public override bool Stop(HostControl hostControl)
		{
			if (!base.Stop(hostControl))
				return false;

			return true;
		}

		public override IConfigurationBuilder BuildConfiguration(IConfigurationBuilder configuration)
		{
			return configuration
				.AddJsonFile("config.json", false, true)
				.AddJsonFile("config.overrides.json", true, true);
		}

		public override void BuildLogger(LoggerConfiguration logging)
		{
			logging
				.Enrich.WithMachineName()
				.Enrich.FromLogContext()
				.WriteTo.LiterateConsole()
				.WriteTo.Async(a => a
					.Seq("http://localhost:5341/"))
				.WriteTo.Async(a => a
					.RollingFile(
						pathFormat: "logs/log-{Date}.txt",
						buffered: true,
						flushToDiskInterval: TimeSpan.FromMilliseconds(500)
					));
		}

		public override void BuildDependencyContainer(ContainerBuilder builder)
		{
			var store = new EmbeddableDocumentStore {
				UseEmbeddedHttpServer = true,
				DefaultDatabase = "AttendeeData"
			};
			store.Configuration.Port = 54001;
			store.Initialize();

			//store.RegisterListener(new Raven.Client.Listeners.IDocumentStoreListener)

			builder.RegisterInstance(store)
				.OwnedByLifetimeScope()
				.SingleInstance();

			base.BuildDependencyContainer(builder);
		}

		public override void ConfigureAspNetCore(IServiceCollection services)
		{
			services.AddMvc()
				.AddApplicationPart(typeof(Service).GetTypeInfo().Assembly);
		}

		public override void BuildAspNetCoreDependencySubcontainer(ContainerBuilder builder)
		{
			builder.RegisterInstance(LazyContainer.Value.Resolve<EmbeddableDocumentStore>())
				.ExternallyOwned()
				.SingleInstance();
		}

		public override void BuildAspNetCoreApp(IApplicationBuilder app, IHostingEnvironment env)
		{
			if (env.IsDevelopment())
			{
				app.UseDeveloperExceptionPage();
				app.UseBrowserLink();
			}
			else
			{
				app.UseExceptionHandler("/Error");
			}

			app.UseMvc();
			app.UseFileServer();

			/*app.UseWebSockets(new WebSocketOptions {
				ReceiveBufferSize = 1024 * 4
			});

			app.Use(async (context, next) => {
				if (context.Request.Path == "/ws")
				{
					var ws = await context.WebSockets.AcceptWebSocketAsync();

					Func<HttpContext, WebSocket, Task> task = async (ctxInner, webSocket) => {
						var buffer = new byte[1024 * 4];
						WebSocketReceiveResult result = null;

						while (result?.CloseStatus.HasValue != true)
						{
							result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
							if (result.EndOfMessage) {
								await webSocket.SendAsync(new ArraySegment<byte>(buffer, 0, result.Count), result.MessageType, result.EndOfMessage, CancellationToken.None);
							}
						}

						await webSocket.CloseAsync(result.CloseStatus.Value, result.CloseStatusDescription, CancellationToken.None);
					};

					await task(context, ws);
				} else {
					await next();
				}
			});*/
		}
	}
}
