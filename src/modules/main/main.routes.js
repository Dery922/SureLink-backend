// src/routes/mainRoutes.js
import { Router } from "express";
import { authMiddleware } from "../auth/auth.validation.middleware.js";
import { upload } from "../../middleware/uploadMiddlware.js";
import {
  getMarketplaceProviders,
  getProviderServices,
} from "../../controllers/authController.js";
import {
  saveProviderServices,
  uploadGalleryImages,
  getGalleryByUserId,
  getProviderById,
  deleteProviderService,
  deleteProviderGallery,
  updateUserProfile,
} from "../../controllers/mainController.js";
import { getAllProviders } from "../../controllers/providersController.js";
import User from "../../models/User.js"

const router = Router();



// IMPORTANT: More specific routes should come FIRST
router.get("/get/all/categories/providers", getAllProviders);
router.get("/get/all/providers", getMarketplaceProviders);
router.get("/get/provider/:id", getProviderById);
router.get("/provider/services/:id", authMiddleware, getProviderServices);

// Then less specific routes
router.post("/save/services", authMiddleware, saveProviderServices);
router.post(
  "/provider/gallery/upload",
  authMiddleware,
  upload.array("images", 10),
  uploadGalleryImages,
);
router.get("/gallery/user/:userId", authMiddleware, getGalleryByUserId);
router.delete("/provider/services/:id", authMiddleware, deleteProviderService);
router.delete(
  "/provider/gallery/:imageId",
  authMiddleware,
  deleteProviderGallery,
);

router.put("/users/profile/update", authMiddleware, updateUserProfile);


router.get("/search", async (req, res) => {
  try {
    const { keyword, tags } = req.query;

    console.log("📥 Incoming search parameters:", { keyword, tags });

    const baseProviderFilter = {
      type: "provider",
      "onboarding.completed": true,
      "provider_profile.open_for_work": true
    };

    const searchClauses = [];

    // 1. ADVANCED KEYWORD TEXT LOGIC
    if (keyword && keyword.trim() !== "") {
      const cleanKeyword = keyword.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

      let stemWord = cleanKeyword;
      if (cleanKeyword.toLowerCase().endsWith("er")) stemWord = cleanKeyword.slice(0, -2);
      if (cleanKeyword.toLowerCase().endsWith("ers")) stemWord = cleanKeyword.slice(0, -3);
      if (cleanKeyword.toLowerCase().endsWith("ing")) stemWord = cleanKeyword.slice(0, -3);

      const looseRegex = new RegExp(stemWord, 'i');

      searchClauses.push({
        $or: [
          { "name.full": looseRegex },
          { "name.display": looseRegex },
          { "provider_profile.category": looseRegex },
          { "provider_profile.secondaryCategories": looseRegex },
          { "provider_profile.bio": looseRegex },
          { "provider_profile.service_area": looseRegex },
          { "business_profile.businessName": looseRegex }
        ]
      });
    }

    // 2. STABLE TAG PARSING & MATCHING LOGIC
    if (tags) {
      let tagList = [];

      // Ensure we parse tags to an array regardless of format safely
      if (typeof tags === 'string') {
        tagList = tags.split(",").map(t => t.trim());
      } else if (Array.isArray(tags)) {
        tagList = tags.map(t => String(t).trim());
      }

      if (tagList.length > 0) {
        // Create case-insensitive regex objects for every tag selected
        const tagRegexes = tagList.map(tag => new RegExp(`^${tag}$`, 'i'));

        // Look for users where primary OR secondary categories match any of our chosen tags
        searchClauses.push({
          $or: [
            { "provider_profile.category": { $in: tagRegexes } },
            { "provider_profile.secondaryCategories": { $in: tagRegexes } }
          ]
        });
      }
    }

    // Build operational structure
    let finalQuery = { ...baseProviderFilter };
    if (searchClauses.length > 0) {
      finalQuery.$and = searchClauses;
    }

    console.log("📋 Executing Database Query:", JSON.stringify(finalQuery, null, 2));

    const searchResults = await User.find(finalQuery)
      .select('-__v -security -audit')
      .limit(50);

    console.log(`✅ Search complete. Found ${searchResults.length} matches.`);

    return res.status(200).json({
      success: true,
      data: searchResults,
      total: searchResults.length
    });

  } catch (error) {
    console.error("❌ Search Controller Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});




export default router;
