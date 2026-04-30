namespace WorkerService1
{
    public class ShopifySettings
    {
        public string ConnectionString { get; set; } = string.Empty;
        public string AccessToken { get; set; } = string.Empty;
        public string StoreUrl { get; set; } = string.Empty;
        public string ApiVersion { get; set; } = "2024-10";
        public string LocationId { get; set; } = string.Empty;
        public string Almacen { get; set; } = "01";
        public string Empresa { get; set; } = "001000";
        public string Agencia { get; set; } = "001";
        public string DbName { get; set; } = string.Empty;
        public string AlertEmails { get; set; } = string.Empty;
        public string ServiceName { get; set; } = "ERPWorker";
        public string SmtpUser { get; set; } = string.Empty;
        public string SmtpPass { get; set; } = string.Empty;

        // ERP defaults
        public string DefaultClientCode { get; set; } = "CLI001";
        public string DefaultVendedor { get; set; } = "VEND01";
        public int DefaultTipoPrecio { get; set; } = 1;
        public string DefaultEstacion { get; set; } = "SPY";
        public string DefaultUemisor { get; set; } = "ISYNC";
        public double DefaultImpuestoPct { get; set; } = 0;
    }
}
