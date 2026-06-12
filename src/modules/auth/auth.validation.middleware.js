import { AppError } from "../../utils/errors.js";
import Session from "../../models/Session.js";
import { SessionFactory } from "../../factories/sessionFactory.js";
import jwt from "jsonwebtoken"


function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

export function validateRequestOtp(req, res, next) {
  const { identifier, fullName, type } = req.body || {};

  if (isBlank(identifier)) {
    return next(
      new AppError(
        "Email or phone is required",
        400,
        "VALIDATION_ERROR"
      )
    );
  }

  const isEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

  const isPhone = /^(\+?233|0)\d{9}$/.test(identifier);

  if (!isEmail && !isPhone) {
    return next(
      new AppError(
        "Invalid email or phone format",
        400,
        "VALIDATION_ERROR"
      )
    );
  }

  return next();
}



export function validateVerifyOtp(req, res, next) {
  // 1. Accept either 'identifier' (from emails/phones) or fallback to 'phone'
  const identifier = req.body.identifier || req.body.phone;
  const { otp } = req.body || {};

  if (isBlank(identifier) || isBlank(otp)) {
    return next(new AppError("Identifier (Email/Phone) and OTP are required", 400, "VALIDATION_ERROR"));
  }

  // 2. Validate format patterns for the identifier
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isPhone = /^(\+?233|0)\d{9}$/.test(identifier);

  if (!isEmail && !isPhone) {
    return next(new AppError("Invalid email or phone format for verification", 400, "VALIDATION_ERROR"));
  }

  // 3. Validate OTP numeric string constraint
  if (!/^\d{6}$/.test(String(otp))) {
    return next(new AppError("OTP must be a 6-digit code", 400, "VALIDATION_ERROR"));
  }

  // 4. Overwrite req.body.identifier to make sure it's clean for the controller
  req.body.identifier = String(identifier).trim().toLowerCase();

  return next();
}


export function validateSessionTokenRequest(req, res, next) {
  const { session_token: sessionToken } = req.body || {};

  if (isBlank(sessionToken)) {
    return next(new AppError("session_token is required", 400, "VALIDATION_ERROR"));
  }

  if (!/^[a-f0-9]{64}$/i.test(String(sessionToken))) {
    return next(new AppError("session_token format is invalid", 400, "VALIDATION_ERROR"));
  }

  return next();
}



export async function sessionAuth(req, res, next) {
  try {
    const { session_token } = req.body;

    const cleanToken = SessionFactory.ensureSessionTokenShape(session_token);
    const tokenHash = SessionFactory.hashToken(cleanToken);

    const session = await Session.findOne({
      "payload.token_hash": tokenHash,
      "payload.expires_at": { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({ message: "Invalid session token" });
    }

    req.user = {
      id: session.payload.user_id
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Session auth failed" });
  }
}



export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1]; // Safeguard array index extraction

  try {
    const secretKey = process.env.JWT_SECRET || "fallback_temporary_local_secret_key";
    const decoded = jwt.verify(token, secretKey);
    
    console.log("🔓 DECODED MIDDLEWARE TOKEN PAYLOAD:", decoded);

    // Extract ID using a fallback chain to be safe against historical signatures
    const activeUserId = decoded.id || decoded.userId;

    if (!activeUserId || activeUserId === "undefined") {
      console.error("🚨 REJECTED: Decoded payload identity evaluates to undefined.");
      return res.status(401).json({ success: false, message: "Malformed session token context." });
    }
    
    // Assign to req.user format required by selectRole controller
    req.user = { id: String(activeUserId).trim() }; 
    
    next();
  } catch (error) {
    console.error("❌ MIDDLEWARE FAILURE:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}



// export function authMiddleware(req, res, next) {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({ success: false, message: "Access denied. No token provided." });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     // 🚨 Use the identical secret mapping fallback safeguard here
//     const secretKey = process.env.JWT_SECRET || "fallback_temporary_local_secret_key";
    
//     const decoded = jwt.verify(token, secretKey);
//       console.log("🔓 DECODED MIDDLEWARE TOKEN PAYLOAD:", decoded);
//     const cleanId = String(decoded.id || decoded.userId).trim(); 


//        if (!cleanId || cleanId === "undefined") {
//       console.error("🚨 REJECTED: Token payload 'id' value is explicitly undefined.");
//       return res.status(401).json({ success: false, message: "Malformed session token context." });
//     }
    
  
//     req.user = { id: cleanId }; 
     
     
    
//     next();
//   } catch (error) {
//     console.error("❌ JWT VERIFICATION ERROR:", error.message);
//     return res.status(401).json({ success: false, message: "Invalid or expired token." });
//   }
// }

