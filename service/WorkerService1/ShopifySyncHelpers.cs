using System.Globalization;

namespace WorkerService1
{
    internal static class ShopifySyncHelpers
    {
        /// <summary>
        /// Parses a Shopify ISO 8601 date string to UTC DateTime.
        /// Handles "2024-01-15T10:30:00-05:00" and "2024-01-15T15:30:00Z".
        /// </summary>
        public static DateTime ParseShopifyUtc(string shopifyDateString)
        {
            if (DateTimeOffset.TryParse(shopifyDateString, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var dto))
                return dto.UtcDateTime;

            if (DateTime.TryParse(shopifyDateString, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dt))
                return dt;

            return DateTime.UtcNow;
        }
    }
}
