import { Server } from "socket.io";

import { initializeChatSocket } from "./chat.handler.js";

import { socketAuthMiddleware } from "./socketAuth.js";

export function initializeSocket(server) {

    console.log("🟡 SOCKET Index hit");

    const io = new Server(server, {

        cors: {
            origin:
                process.env.FRONTEND_URL ||
                "http://localhost:3000",

            credentials: true,
        },

    });

    // ==============================
    // SOCKET AUTHENTICATION
    // ==============================

    io.use(socketAuthMiddleware);

    // ==============================
    // CONNECTION
    // ==============================

    io.on("connection", (socket) => {

        console.log(
            "🔌 Authenticated socket connected:",
            socket.id
        );

        console.log(
            "👤 Authenticated user:",
            socket.user.id
        );

        // Initialize events for THIS socket
        initializeChatSocket(socket, io);

        // ==============================
        // PRIVATE USER ROOM
        // ==============================

        const userRoom =
            `user:${socket.user.id}`;

        socket.join(userRoom);

        console.log(
            `🏠 User ${socket.user.id} joined private room: ${userRoom}`
        );

        console.log(
            "🏠 Current rooms:",
            Array.from(socket.rooms)
        );

        // ==============================
        // DISCONNECT
        // ==============================

        socket.on("disconnect", (reason) => {

            console.log(
                "❌ Socket disconnected:",
                socket.id,
                "Reason:",
                reason
            );

        });

    });

    return io;
}