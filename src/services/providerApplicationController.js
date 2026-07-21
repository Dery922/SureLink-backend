import { submitProviderOnboarding } from "./providerApplicationService.js";
import { successResponse } from "./apiResponse.js";

// Maps multer field names to human-readable document labels.
const DOC_LABELS = {
  ghana_card_front: { type: "ghana_card", label: "Ghana Card (Front)" },
  ghana_card_back: { type: "ghana_card", label: "Ghana Card (Back)" },
  business_cert: { type: "business_cert", label: "Business Registration" },
  selfie: { type: "selfie", label: "Verification Selfie" },
};

// Turns multer's req.files map into the Verification documents[] shape, storing
// the private relative disk path as the url (served later via signed links).
function buildDocuments(files) {
  const docs = [];
  for (const [field, meta] of Object.entries(DOC_LABELS)) {
    const file = files?.[field]?.[0];
    if (file) docs.push({ type: meta.type, label: meta.label, url: file.path });
  }
  return docs;
}

/**
 * Authenticated provider onboarding submission.
 *
 * Identity comes from `req.user` (set by `authenticateUser`), profile fields
 * from `req.body`, and documents from `req.files` (multer).
 */
export async function onboardAsProvider(req, res, next) {
  try {
    const documents = buildDocuments(req.files);
    const result = await submitProviderOnboarding({ user: req.user, body: req.body, documents });

    return res.status(201).json(
      successResponse({ message: "Application submitted for review", data: result }),
    );
  } catch (err) {
    return next(err);
  }
}
