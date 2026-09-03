import jwt from "jsonwebtoken";



export function socketAuthMiddleware(socket, next) {
    console.log("🟡 SOCKET AUTH MIDDLEWARE HIT");

    try {
        console.log("🔍 Socket handshake auth:", socket.handshake.auth);

        const token = socket.handshake.auth?.token;

        if (!token) {
            console.error("🚨 SOCKET AUTH: No token provided");

            return next(new Error("Authentication token required."));
        }

        console.log("🔑 Socket token received");

        const secretKey =
            process.env.JWT_SECRET ||
            "fallback_temporary_local_secret_key";

        const decoded = jwt.verify(token, secretKey);

        console.log(
            "🔓 DECODED SOCKET JWT PAYLOAD:",
            decoded
        );

        const activeUserId = decoded.id || decoded.userId;

        if (!activeUserId || activeUserId === "undefined") {
            console.error(
                "🚨 SOCKET AUTH: Invalid user identity"
            );

            return next(
                new Error("Malformed authentication context.")
            );
        }

        socket.user = {
            id: String(activeUserId).trim(),
        };

        console.log(
            "✅ SOCKET AUTHENTICATED USER:",
            socket.user.id
        );

        next();
    } catch (error) {
        console.error(
            "❌ SOCKET AUTH FAILURE:",
            error.message
        );

        next(new Error("Invalid or expired token."));
    }
}