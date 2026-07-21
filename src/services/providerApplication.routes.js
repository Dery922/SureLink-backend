import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { onboardAsProvider } from "./providerApplicationController.js";
import { authenticateUser } from "../middleware/authenticateUser.js";

const router = Router();

const UPLOAD_ROOT = path.resolve("uploads/verifications");
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

// Each application gets its own folder so files can't collide or be guessed by
// reference. The folder id is minted per-request and shared across its files.
const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (!req._uploadDir) {
      req._uploadDir = path.join(UPLOAD_ROOT, crypto.randomUUID());
      fs.mkdirSync(req._uploadDir, { recursive: true });
    }
    cb(null, req._uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${file.fieldname}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 4 }, // 5MB each, 4 docs max
  fileFilter(req, file, cb) {
    cb(null, ALLOWED.has(file.mimetype));
  },
});

// Throttle onboarding submissions per IP (belt-and-braces alongside auth).
const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many submissions. Try again later." },
});

const acceptDocs = upload.fields([
  { name: "ghana_card_front", maxCount: 1 },
  { name: "ghana_card_back", maxCount: 1 },
  { name: "business_cert", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
]);

// Authenticated onboarding: the signed-up user (from the session token) is
// upgraded to a provider and a verification record is created. `authenticateUser`
// runs before multer so unauthenticated uploads are rejected before any file is
// written to disk.
router.post("/onboarding", applyLimiter, authenticateUser, acceptDocs, onboardAsProvider);

export default router;
