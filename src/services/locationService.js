// backend/services/locationService.js

import iplocation from "iplocation";
import axios from "axios";

class LocationService {
  constructor() {
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

  isPrivateIP(ip) {
    if (!ip) return true;
    const cleanIp = ip.trim();
    return (
      cleanIp === "::1" ||
      cleanIp === "127.0.0.1" ||
      cleanIp === "localhost" ||
      cleanIp === "0.0.0.0" ||
      cleanIp.startsWith("10.") ||
      cleanIp.startsWith("192.168.") ||
      cleanIp.startsWith("172.16.") ||
      cleanIp.startsWith("172.17.") ||
      cleanIp.startsWith("172.18.") ||
      cleanIp.startsWith("172.19.") ||
      cleanIp.startsWith("172.2") ||
      cleanIp.startsWith("172.3") ||
      cleanIp.startsWith("169.254.") // Link-local
    );
  }

  cleanIPAddress(ip) {
    if (!ip) return "";
    let clean = ip.trim();

    // Handle IPv6 mapped IPv4
    if (clean.includes("::ffff:")) {
      clean = clean.split("::ffff:")[1];
    }

    // Handle multiple IPs from proxy
    if (clean.includes(",")) {
      clean = clean.split(",")[0].trim();
    }

    // Remove port if present
    if (clean.includes(":")) {
      clean = clean.split(":")[0];
    }

    return clean;
  }

  async getLocationFromIP(ip) {
    try {
      const cleanIp = this.cleanIPAddress(ip);
      console.log(`🔍 Attempting iplocation for: ${cleanIp}`);

      if (this.isPrivateIP(cleanIp)) {
        console.log(`⚠️ Private IP detected: ${cleanIp}`);
        return null;
      }

      const result = await iplocation(cleanIp);
      console.log(`✅ iplocation result:`, result);

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

  async getLocationFromIPAPI(ip) {
    try {
      const cleanIp = this.cleanIPAddress(ip);
      if (this.isPrivateIP(cleanIp)) return null;

      const response = await axios.get(`https://ipapi.co/${cleanIp}/json/`, {
        timeout: 5000,
        headers: { "User-Agent": "nodejs-location-service" },
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

  async getLocationFromIpInfo(ip) {
    try {
      const cleanIp = this.cleanIPAddress(ip);
      if (this.isPrivateIP(cleanIp)) return null;

      const token = process.env.IPINFO_TOKEN || "";
      const url = token
        ? `https://ipinfo.io/${cleanIp}/json?token=${token}`
        : `https://ipinfo.io/${cleanIp}/json`;

      const response = await axios.get(url, { timeout: 5000 });
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

  async getLocationFromIPAPICom(ip) {
    try {
      const cleanIp = this.cleanIPAddress(ip);
      if (this.isPrivateIP(cleanIp)) return null;

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

  async getLocation(ip) {
    try {
      const cleanIp = this.cleanIPAddress(ip);

      if (!cleanIp) {
        console.log("⚠️ Empty IP provided. Using default fallback.");
        return { ...this.defaultLocation };
      }

      if (this.isPrivateIP(cleanIp)) {
        console.log(
          `📍 Internal/Private IP detected (${cleanIp}). Using default fallback.`,
        );
        return { ...this.defaultLocation };
      }

      console.log(`🔍 Routing Location Lookups for Public IP: ${cleanIp}`);

      // Try all methods in sequence
      const methods = [
        this.getLocationFromIP.bind(this),
        this.getLocationFromIPAPICom.bind(this),
        this.getLocationFromIPAPI.bind(this),
        this.getLocationFromIpInfo.bind(this),
      ];

      for (const method of methods) {
        try {
          const location = await method(cleanIp);
          if (location) {
            console.log(`✅ Location found using ${location.source}`);
            return location;
          }
        } catch (e) {
          console.warn(`Method failed:`, e.message);
        }
      }

      console.warn(
        `⚠️ All external APIs failed for IP: ${cleanIp}. Using default fallback.`,
      );
      return { ...this.defaultLocation };
    } catch (error) {
      console.error("❌ Master Location Router Error:", error.message);
      return { ...this.defaultLocation };
    }
  }

  async getAddressFromCoords(coordinates) {
    try {
      if (
        !coordinates ||
        !Array.isArray(coordinates) ||
        coordinates.length !== 2
      ) {
        return null;
      }

      const [lng, lat] = coordinates;
      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return null;
      }

      // ✅ FIXED: Correct Nominatim URL
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          timeout: 5000,
          headers: {
            "User-Agent": "SureLink-Marketplace/1.0",
          },
        },
      );

      const data = response.data;
      if (data && data.address) {
        return {
          street: data.address.road || data.address.suburb || "",
          area: data.address.neighbourhood || data.address.county || "",
          city:
            data.address.city ||
            data.address.town ||
            data.address.village ||
            "Accra",
          region: data.address.state || data.address.region || "",
          country: data.address.country || "Ghana",
        };
      }
      return null;
    } catch (error) {
      console.error("Nominatim Reverse Geocoding failed:", error.message);
      return null;
    }
  }
}

export default new LocationService();
