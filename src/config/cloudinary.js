import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// 🚀 FORCE HOISTED ENVIRONMENT SYNC: Load variables before parsing the config block!
dotenv.config();

console.log("=== Cloudinary Environment Init Check ===");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key Exists:", !!process.env.CLOUDINARY_API_KEY);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
