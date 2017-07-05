namespace LoFGatekeeper
{
	using APIology.ServiceProvider;
	using Autofac;
	using LiteDB;
	using Microsoft.AspNetCore.Builder;
	using Microsoft.AspNetCore.Hosting;
	using Microsoft.Extensions.Configuration;
	using Microsoft.Extensions.DependencyInjection;
	using NameParser;
	using Serilog;
	using System;
	using System.IO;
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

		public class HumanNameProxy
		{
			public string FullName { get; set; }
		}

		public override void BuildDependencyContainer(ContainerBuilder builder)
		{
			string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
			Directory.SetCurrentDirectory(exeDir);

			BsonMapper.Global.RegisterType(
				name => name.FullName,
				bson => {
					if (bson.IsString)
						return new HumanName(bson.AsString);

					var proxy = BsonMapper.Global.ToObject<HumanNameProxy>(bson.AsDocument);
					return new HumanName(proxy.FullName);
				}
			);

			builder.Register(context => new LiteDatabase(@"LoFData.db"))
				.OwnedByLifetimeScope()
				.SingleInstance();

			base.BuildDependencyContainer(builder);
		}

		public override void ConfigureAspNetCore(IServiceCollection services)
		{
			services.AddCors();
			services.AddMvc()
				.AddApplicationPart(typeof(Service).GetTypeInfo().Assembly);
		}

		public override void BuildAspNetCoreDependencySubcontainer(ContainerBuilder builder)
		{
			builder.RegisterInstance(LazyContainer.Value.Resolve<LiteDatabase>())
				.ExternallyOwned()
				.SingleInstance();
		}

		public override void BuildAspNetCoreApp(IApplicationBuilder app, IHostingEnvironment env)
		{
			app.UseCors(builder => 
				builder.AllowAnyOrigin()
					.AllowAnyHeader()
					.AllowAnyMethod());
			
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
