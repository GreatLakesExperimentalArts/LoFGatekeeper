namespace LoFGatekeeper
{
    using Autofac;
    using Autofac.Extensions.DependencyInjection;
    using Hubs;
	using LiteDB;
	using Microsoft.AspNetCore.Builder;
	using Microsoft.AspNetCore.Hosting;
    using Microsoft.AspNetCore.Hosting.Server.Features;
    using Microsoft.AspNetCore.SignalR;
	using Microsoft.AspNetCore.SpaServices.Webpack;
	using Microsoft.Extensions.Configuration;
	using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Logging;
    using Serilog;
    using System;
    using System.IO;
    using System.Linq;
    using System.Reflection;

	public class Service
    {
		public static string EnvironmentName { get; protected set; }

		public IHostingEnvironment Environment { get; private set; }

		public static Serilog.ILogger Logger { get; private set; }

		public static void Main() {
			Logger = new LoggerConfiguration()
				.Enrich.WithMachineName()
				.Enrich.FromLogContext()
				.WriteTo.LiterateConsole()
				.WriteTo.Async(a => a
					.RollingFile(
						pathFormat: "data/logs/log-{Date}.txt",
						buffered: true
					))
				.CreateLogger();

			try
			{
				var sep = Path.DirectorySeparatorChar;
				DirectoryInfo info = new DirectoryInfo(Directory.GetCurrentDirectory());

				try
				{
					while (new FileInfo($@"{info.FullName}{sep}ClientApp{sep}boot-client.tsx").Exists == false) {
						info = info.Parent;
					};
				}
				catch
				{
					info = new DirectoryInfo(Directory.GetCurrentDirectory());
				}

				Logger.Information($@"Application current directory set to {info.FullName}");

				Directory.SetCurrentDirectory(info.FullName);

				Logger.Debug("Building web server configuration");

				var host = new WebHostBuilder()
					.UseKestrel(options => {
						options.AddServerHeader = false;
						options.ListenAnyIP(443, listen => {
							listen.UseHttps("data/certs/certfile.pfx", "");
						});
					})
					.UseContentRoot(Directory.GetCurrentDirectory())
					.UseStartup<Startup>()
					.UseSerilog(Logger)
					.Build();

				Logger.Debug("Starting web server");
				host.Run();
			}
			catch(Exception e) {
				Logger.Fatal("Unknown exception in web server caused failure", e);
			}
			finally {
				Log.CloseAndFlush();
			}
		}
	}

	public class Startup
	{
		private static ILifetimeScope Container { get; set; }

		public Startup(IHostingEnvironment env)
		{
		}

		public IServiceProvider ConfigureServices(IServiceCollection services)
		{
			string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);

			services.AddLogging();
			services.AddMvc()
				.AddApplicationPart(typeof(Service).GetTypeInfo().Assembly)
				.AddControllersAsServices();
			services.AddCors();
			services.AddSignalR();

			var builder = new ContainerBuilder();

			builder.Register(ctx => {
					return new ConfigurationBuilder()
						.AddEnvironmentVariables()
						.AddJsonFile($@"{exeDir}/config.json", false, true)
						.AddJsonFile($@"{exeDir}/config.overrides.json", true, true);
				})
				.SingleInstance()
				.PropertiesAutowired(PropertyWiringOptions.PreserveSetValues)
				.AutoActivate()
				.AsImplementedInterfaces()
				.AsSelf();

			builder.Populate(services);

			builder.RegisterInstance(Service.Logger)
				.As<Serilog.ILogger>()
				.ExternallyOwned()
				.SingleInstance();

			builder.Register(context => new LiteDatabase("data/LoFData.db"))
				.OwnedByLifetimeScope()
				.SingleInstance();

			builder.RegisterType<AttendeeHubContext>()
				.PropertiesAutowired()
				.SingleInstance();

			builder.RegisterType<VolunteerHubContext>()
				.PropertiesAutowired()
				.SingleInstance();

			builder.RegisterAssemblyTypes(typeof(Service).GetTypeInfo().Assembly)
				.Where(t => typeof(Hub).IsAssignableFrom(t))
				.ExternallyOwned();

			Container = builder.Build();

			return new AutofacServiceProvider(Container);
		}

		public void Configure(IApplicationBuilder app, IHostingEnvironment env, ILoggerFactory loggerFactory, IApplicationLifetime appLifetime)
		{
			loggerFactory.AddSerilog(Service.Logger);

			app.UseCors(builder =>
				builder.AllowAnyOrigin()
					.AllowAnyHeader()
					.AllowAnyMethod());

			if (env.IsDevelopment())
			{
				Service.Logger.Information("Using Webpack Middleware");

				app.UseDeveloperExceptionPage();

				app.UseWebpackDevMiddleware(new WebpackDevMiddlewareOptions {
					HotModuleReplacement = true,
					ReactHotModuleReplacement = true
				});
			} else {
				app.UseExceptionHandler("/Error");
			}

			app.UseStaticFiles();

			app.UseSignalR(routes => {
				routes.MapHub<AttendeeHub>("/hubs/attendee");
				routes.MapHub<VolunteerHub>("/hubs/volunteer");
			});

			app.UseMvc(routes => {
				routes.MapRoute(
					name: "default",
					template: "{controller=Home}/{action=Index}/{id?}");

				routes.MapSpaFallbackRoute(
					name: "spa-fallback",
					defaults: new { controller = "Home", action = "Index" });
			});

			appLifetime.ApplicationStopped.Register(() => Container.Dispose());
		}
	}
}
