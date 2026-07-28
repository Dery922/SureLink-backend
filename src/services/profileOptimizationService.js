// backend/services/profileOptimizationService.js
import Service from "../models/Service.js";

class ProfileOptimizationService {
  async getProviderOptimizationMatrix(user) {
    if (!user || user.type !== "provider") {
      return { score: 100, warnings: [] };
    }

    const warnings = [];
    let scoreCalculation = 100;

    // 🔍 1. PULL ALL SERVICES SPECIFICALLY BELONGING TO DERY
    let activeServices = [];
    try {
      activeServices = await Service.find({
        provider_id: user._id,
      }).lean();
    } catch (err) {
      console.error("Service lookup error:", err);
    }

    // 🚨 2. THIS IS WHAT WE NEED TO TRAP FOR DERY:
    // If the array is empty, it means he has not added any detailed services yet!
    if (!activeServices || activeServices.length === 0) {
      scoreCalculation -= 40; // Drop his score down so the banner shows up!
      warnings.push({
        id: "missing_explicit_services",
        type: "critical",
        title: `Add your detailed ${user.provider_profile?.category || "Painting"} services`,
        message:
          "You haven't listed your specific services yet. Customers looking for precise tasks (like interior painting or room skimming) won't see your profile in search results.",
        actionLabel: "Add Detailed Services",
        targetRoute: "/dashboard/services/manage", // Adjust this to match your service page route
        impactScore: "+40% Visibility Boost",
      });
    }

    return {
      score: scoreCalculation,
      warnings: warnings,
    };
  }
}

export default new ProfileOptimizationService();
