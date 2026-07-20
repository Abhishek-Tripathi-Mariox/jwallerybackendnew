const SystemConfigService = require("../services/SystemConfigService");

// Pulls the named component out of a Geocoding API address_components entry
// (e.g. "locality" -> city, "administrative_area_level_1" -> state).
const findComponent = (components, type) => {
  const match = (components || []).find((c) => c.types?.includes(type));
  return match ? match.long_name : "";
};

/**
 * Reverse-geocodes a lat/lng into address fields via Google's Geocoding API,
 * using the same key saved in the admin panel's Google Maps config. Called
 * server-side (not from the mobile client) so an IP-restricted key works
 * regardless of how the client-facing Maps SDK key is restricted, and so
 * the key is never exposed to the app for direct REST use.
 *
 * Best-effort — returns null (never throws) if unconfigured or the call
 * fails, so callers can fall back to manual address entry.
 */
const reverseGeocode = async (latitude, longitude) => {
  try {
    const raw = await SystemConfigService().getRawConfig("google_maps");
    if (!raw || !raw.apiKey) {
      console.warn("Google Maps not configured — skipping reverse geocode");
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${raw.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results?.length) {
      console.error("Google Geocoding API error:", data.status, data.error_message);
      return null;
    }

    const components = data.results[0].address_components;
    return {
      formattedAddress: data.results[0].formatted_address || "",
      city: findComponent(components, "locality") || findComponent(components, "administrative_area_level_2"),
      state: findComponent(components, "administrative_area_level_1"),
      pincode: findComponent(components, "postal_code"),
      country: findComponent(components, "country"),
    };
  } catch (error) {
    console.error("Reverse geocode failed:", error.message);
    return null;
  }
};

module.exports = { reverseGeocode };
