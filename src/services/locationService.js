// backend/services/locationService.js

import iplocation from "iplocation";
import axios from "axios";

class LocationService {
  constructor() {
    // Initialize with default location (Accra, Ghana)
    this.defaultLocation = {
      coordinates: [-0.186, 5.603],
      lat: 5.603,
      lng: -0.186,
      city: "Accra",
      region: "Greater Accra",
      country: "Ghana",
      countryCode: "GH",
      accuracy: "default",
      source: "default",
    };
  }

  // ✅ Method 1: Using iplocation (primary)
  async getLocationFromIP(ip) {
    try {
      // Clean IP address (remove IPv6 prefix if present)
      const cleanIp = ip?.includes("::ffff:") ? ip.split("::ffff:")[1] : ip;

      if (!cleanIp || cleanIp === "::1" || cleanIp === "127.0.0.1") {
        console.log("📍 Localhost IP detected, using default location");
        return null;
      }

      const result = await iplocation(cleanIp);

      if (result && result.latitude && result.longitude) {
        return {
          coordinates: [
            parseFloat(result.longitude),
            parseFloat(result.latitude),
          ],
          lat: parseFloat(result.latitude),
          lng: parseFloat(result.longitude),
          city: result.city || "",
          region: result.region || "",
          country: result.country || "",
          countryCode: result.country_code || "",
          postal: result.postal_code || "",
          accuracy: "ip-based",
          source: "iplocation",
        };
      }
      return null;
    } catch (error) {
      console.error("iplocation lookup failed:", error.message);
      return null;
    }
  }

  // ✅ Method 2: Using ipapi.co (fallback 1)
  async getLocationFromIPAPI(ip) {
    try {
      const cleanIp = ip?.includes("::ffff:") ? ip.split("::ffff:")[1] : ip;

      if (!cleanIp || cleanIp === "::1" || cleanIp === "127.0.0.1") {
        return null;
      }

      const response = await axios.get(`https://ipapi.co/${cleanIp}/json/`, {
        timeout: 5000,
      });

      const data = response.data;

      if (data && data.latitude && data.longitude && !data.error) {
        return {
          coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)],
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
          city: data.city || "",
          region: data.region || "",
          country: data.country_name || "",
          countryCode: data.country_code || "",
          postal: data.postal || "",
          accuracy: "ip-api",
          source: "ipapi.co",
        };
      }
      return null;
    } catch (error) {
      console.error("ipapi.co failed:", error.message);
      return null;
    }
  }

  // ✅ Method 3: Using ipinfo.io (fallback 2)
  async getLocationFromIpInfo(ip) {
    try {
      const cleanIp = ip?.includes("::ffff:") ? ip.split("::ffff:")[1] : ip;

      if (!cleanIp || cleanIp === "::1" || cleanIp === "127.0.0.1") {
        return null;
      }

      // You can add your ipinfo.io token if you have one
      const token = process.env.IPINFO_TOKEN || "";
      const url = token
        ? `https://ipinfo.io/${cleanIp}/json?token=${token}`
        : `https://ipinfo.io/${cleanIp}/json`;

      const response = await axios.get(url, {
        timeout: 5000,
      });

      const data = response.data;

      if (data && data.loc) {
        const [lat, lng] = data.loc.split(",").map(Number);
        return {
          coordinates: [lng, lat],
          lat: lat,
          lng: lng,
          city: data.city || "",
          region: data.region || "",
          country: data.country || "",
          countryCode: data.country || "",
          postal: data.postal || "",
          accuracy: "ip-info",
          source: "ipinfo.io",
        };
      }
      return null;
    } catch (error) {
      console.error("ipinfo.io failed:", error.message);
      return null;
    }
  }

  // ✅ Method 4: Using ip-api.com (fallback 3 - free, no API key)
  async getLocationFromIPAPICom(ip) {
    try {
      const cleanIp = ip?.includes("::ffff:") ? ip.split("::ffff:")[1] : ip;

      if (!cleanIp || cleanIp === "::1" || cleanIp === "127.0.0.1") {
        return null;
      }

      const response = await axios.get(`http://ip-api.com/json/${cleanIp}`, {
        timeout: 5000,
      });

      const data = response.data;

      if (data && data.status === "success" && data.lat && data.lon) {
        return {
          coordinates: [parseFloat(data.lon), parseFloat(data.lat)],
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lon),
          city: data.city || "",
          region: data.regionName || "",
          country: data.country || "",
          countryCode: data.countryCode || "",
          postal: data.zip || "",
          accuracy: "ip-api-com",
          source: "ip-api.com",
        };
      }
      return null;
    } catch (error) {
      console.error("ip-api.com failed:", error.message);
      return null;
    }
  }

  // ✅ Main method with fallbacks
  async getLocation(ip) {
    try {
      // If no IP provided, return default
      if (!ip) {
        console.warn("No IP provided, using default location");
        return { ...this.defaultLocation };
      }

      // Clean IP address
      const cleanIp = ip?.includes("::ffff:") ? ip.split("::ffff:")[1] : ip;

      // Skip location lookup for localhost
      if (
        cleanIp === "::1" ||
        cleanIp === "127.0.0.1" ||
        cleanIp === "localhost"
      ) {
        console.log("📍 Localhost detected, using default location");
        return { ...this.defaultLocation };
      }

      console.log(`🔍 Looking up location for IP: ${cleanIp}`);

      // 1. Try iplocation first (primary)
      try {
        const location = await this.getLocationFromIP(cleanIp);
        if (location) {
          console.log(`✅ Location found via iplocation for IP: ${cleanIp}`);
          return location;
        }
      } catch (e) {
        console.warn("iplocation failed:", e.message);
      }

      // 2. Try ip-api.com (fallback 1)
      try {
        const location = await this.getLocationFromIPAPICom(cleanIp);
        if (location) {
          console.log(`✅ Location found via ip-api.com for IP: ${cleanIp}`);
          return location;
        }
      } catch (e) {
        console.warn("ip-api.com failed:", e.message);
      }

      // 3. Try ipapi.co (fallback 2)
      try {
        const location = await this.getLocationFromIPAPI(cleanIp);
        if (location) {
          console.log(`✅ Location found via ipapi.co for IP: ${cleanIp}`);
          return location;
        }
      } catch (e) {
        console.warn("ipapi.co failed:", e.message);
      }

      // 4. Try ipinfo.io (fallback 3)
      try {
        const location = await this.getLocationFromIpInfo(cleanIp);
        if (location) {
          console.log(`✅ Location found via ipinfo.io for IP: ${cleanIp}`);
          return location;
        }
      } catch (e) {
        console.warn("ipinfo.io failed:", e.message);
      }

      // 5. Return default location if all fail
      console.warn(
        `⚠️ All location services failed for IP: ${cleanIp}, using default`,
      );
      return { ...this.defaultLocation };
    } catch (error) {
      console.error("❌ Location service error:", error.message);
      return { ...this.defaultLocation };
    }
  }

  // ✅ Reverse geocoding: Get address from coordinates
  async getAddressFromCoords(coordinates) {
    try {
      if (
        !coordinates ||
        !Array.isArray(coordinates) ||
        coordinates.length !== 2
      ) {
        console.warn("Invalid coordinates provided to getAddressFromCoords");
        return null;
      }

      const [lng, lat] = coordinates;

      // Validate coordinates
      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        console.warn("Invalid coordinate values:", { lat, lng });
        return null;
      }

      // Use OpenStreetMap Nominatim (free, no API key needed)
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "SureLinkApp/1.0", // Required by Nominatim
          },
          timeout: 5000,
        },
      );

      if (response.data && response.data.address) {
        const address = response.data.address;
        return {
          street: address.road || address.street || address.highway || "",
          area:
            address.suburb ||
            address.neighbourhood ||
            address.quarter ||
            address.hamlet ||
            "",
          city:
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            "",
          state: address.state || address.region || "",
          country: address.country || "",
          postal: address.postcode || "",
          display_name: response.data.display_name || "",
        };
      }
      return null;
    } catch (error) {
      console.error("Reverse geocoding failed:", error.message);
      return null;
    }
  }

  // ✅ Get location from frontend (if provided)
  getLocationFromFrontend(frontendLocation) {
    if (!frontendLocation) return null;

    try {
      // If frontend sent coordinates
      if (
        frontendLocation.coordinates &&
        Array.isArray(frontendLocation.coordinates)
      ) {
        const [lng, lat] = frontendLocation.coordinates;
        if (!isNaN(lat) && !isNaN(lng)) {
          return {
            coordinates: [lng, lat],
            lat: lat,
            lng: lng,
            accuracy: frontendLocation.accuracy || "frontend",
            source: "frontend",
            city: frontendLocation.city || "",
            region: frontendLocation.region || "",
            country: frontendLocation.country || "",
          };
        }
      }

      // If frontend sent lat/lng directly
      if (frontendLocation.lat && frontendLocation.lng) {
        const lat = parseFloat(frontendLocation.lat);
        const lng = parseFloat(frontendLocation.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          return {
            coordinates: [lng, lat],
            lat: lat,
            lng: lng,
            accuracy: frontendLocation.accuracy || "frontend",
            source: "frontend",
            city: frontendLocation.city || "",
            region: frontendLocation.region || "",
            country: frontendLocation.country || "",
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Failed to parse frontend location:", error.message);
      return null;
    }
  }
}

// ✅ Export a singleton instance
export default new LocationService();
