using WorkerService1;

IHost host = Host.CreateDefaultBuilder(args)
    .UseWindowsService(options =>
    {
        options.ServiceName = "ERPWorker";
    })
    .ConfigureServices((hostContext, services) =>
    {
        // Bind ShopifySettings from appsettings.json section
        services.Configure<ShopifySettings>(
            hostContext.Configuration.GetSection("ShopifySettings"));

        services.AddHostedService<Worker>();
    })
    .ConfigureLogging(logging =>
    {
        logging.ClearProviders();
        logging.AddConsole();
    })
    .Build();

host.Run();
