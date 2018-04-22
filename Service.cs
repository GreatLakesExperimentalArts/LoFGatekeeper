namespace LoFGatekeeper
{
	using APIology.ServiceProvider;
	using Autofac;
	using Hubs;
	using LiteDB;
	using Microsoft.AspNetCore.Builder;
	using Microsoft.AspNetCore.Hosting;
	using Microsoft.AspNetCore.SignalR;
	using Microsoft.AspNetCore.SpaServices.Webpack;
	using Microsoft.Extensions.Configuration;
	using Microsoft.Extensions.DependencyInjection;
	using Serilog;
	using System.IO;
	using System.Reflection;
	using Topshelf;

	public class Service : AspNetCoreServiceProvider<Service, Configuration>
	{
		public static void Main() {
			Run();
		}

		public override bool Start(HostControl hostControl)
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
			string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);

			return configuration
				.AddEnvironmentVariables()
				.AddJsonFile($@"{exeDir}/config.json", false, true)
				.AddJsonFile($@"{exeDir}/config.overrides.json", true, true);
		}

		public override void BuildLogger(LoggerConfiguration logging)
		{
			logging
				.Enrich.WithMachineName()
				.Enrich.FromLogContext()
				.WriteTo.LiterateConsole()
				.WriteTo.Async(a => a
					.RollingFile(
						pathFormat: "data/logs/log-{Date}.txt",
						buffered: true
					));
		}

		public override void BuildDependencyContainer(ContainerBuilder builder)
		{
			string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
			builder.Register(context => new LiteDatabase("data/LoFData.db"))
				.OwnedByLifetimeScope()
				.SingleInstance();

			base.BuildDependencyContainer(builder);
		}

		public override void ConfigureAspNetCore(IServiceCollection services)
		{
			services.AddCors();
			services.AddMvc()
				.AddApplicationPart(typeof(Service).GetTypeInfo().Assembly)
				.AddControllersAsServices();
			services.AddSignalR();
		}

		public override void BuildAspNetCoreDependencySubcontainer(ContainerBuilder builder)
		{
			builder.RegisterInstance(Logger)
				.As<ILogger>()
				.ExternallyOwned()
				.SingleInstance();

			builder.RegisterInstance(LazyContainer.Value.Resolve<LiteDatabase>())
				.ExternallyOwned()
				.SingleInstance();

			builder.RegisterType<AttendeeHubContext>()
				.As<IAttendeeHubContext>()
				.PropertiesAutowired()
				.SingleInstance();

			builder.RegisterAssemblyTypes(typeof(Service).GetTypeInfo().Assembly)
				.Where(t => typeof(Hub).IsAssignableFrom(t))
				.ExternallyOwned();
		}

		public override void BuildAspNetCoreApp(IApplicationBuilder app, IHostingEnvironment env)
		{
			app.UseCors(builder =>
				builder.AllowAnyOrigin()
					.AllowAnyHeader()
					.AllowAnyMethod());

			if (env.IsDevelopment())
			{
				Logger.Information("Using Webpack Middleware");

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
			});

			app.UseMvc(routes => {
				routes.MapRoute(
					name: "default",
					template: "{controller=Home}/{action=Index}/{id?}");

				routes.MapSpaFallbackRoute(
					name: "spa-fallback",
					defaults: new { controller = "Home", action = "Index" });
			});
		}
	}
}
