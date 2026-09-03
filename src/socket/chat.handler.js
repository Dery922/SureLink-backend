import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

export function initializeChatSocket(socket, io) {

    console.log(
        "💬 Initializing chat handlers for socket:",
        socket.id
    );

    // ============================================================
    // JOIN CONVERSATION
    // ============================================================

    socket.on(
        "conversation:join",
        async ({ conversationId }) => {

            console.log(
                "📥 conversation:join RECEIVED:",
                {
                    socketId: socket.id,
                    userId: socket.user?.id,
                    conversationId,
                }
            );

            try {

                // --------------------------------
                // 1. Authenticate socket
                // --------------------------------

                if (!socket.user?.id) {

                    return socket.emit(
                        "conversation:error",
                        {
                            message:
                                "Socket is not authenticated.",
                        }
                    );

                }

                // --------------------------------
                // 2. Validate conversation ID
                // --------------------------------

                if (
                    !conversationId ||
                    !mongoose.Types.ObjectId.isValid(
                        conversationId
                    )
                ) {

                    return socket.emit(
                        "conversation:error",
                        {
                            message:
                                "Invalid conversation ID.",
                        }
                    );

                }

                // --------------------------------
                // 3. Find conversation
                // --------------------------------

                const conversation =
                    await Conversation.findById(
                        conversationId
                    );

                if (!conversation) {

                    return socket.emit(
                        "conversation:error",
                        {
                            message:
                                "Conversation not found.",
                        }
                    );

                }

                // --------------------------------
                // 4. Verify participant
                // --------------------------------

                const isParticipant =
                    conversation.participants.some(
                        (participantId) =>
                            String(participantId) ===
                            String(socket.user.id)
                    );

                if (!isParticipant) {

                    return socket.emit(
                        "conversation:error",
                        {
                            message:
                                "You are not a participant in this conversation.",
                        }
                    );

                }

                // --------------------------------
                // 5. Join room
                // --------------------------------

                const roomName =
                    `conversation:${conversationId}`;

                socket.join(roomName);

                console.log(
                    `🏠 User ${socket.user.id} joined ${roomName}`
                );

                console.log(
                    "🏠 Socket rooms:",
                    Array.from(socket.rooms)
                );

                // --------------------------------
                // 6. Confirm join
                // --------------------------------

                socket.emit(
                    "conversation:joined",
                    {
                        conversationId,
                        room: roomName,
                    }
                );

            } catch (error) {

                console.error(
                    "❌ conversation:join error:",
                    error
                );

                socket.emit(
                    "conversation:error",
                    {
                        message:
                            "Failed to join conversation.",
                    }
                );

            }
        }
    );


    // ============================================================
    // SEND MESSAGE
    // ============================================================

    socket.on(
        "message:send",
        async ({ conversationId, content }) => {

            try {

                console.log(
                    "📨 message:send RECEIVED:",
                    {
                        socketId: socket.id,
                        userId: socket.user?.id,
                        conversationId,
                        content,
                    }
                );

                // --------------------------------
                // 1. Authenticate sender
                // --------------------------------

                const senderId =
                    socket.user?.id;

                if (!senderId) {

                    return socket.emit(
                        "message:error",
                        {
                            message:
                                "Socket is not authenticated.",
                        }
                    );

                }

                // --------------------------------
                // 2. Validate conversation ID
                // --------------------------------

                if (
                    !conversationId ||
                    !mongoose.Types.ObjectId.isValid(
                        conversationId
                    )
                ) {

                    return socket.emit(
                        "message:error",
                        {
                            message:
                                "Invalid conversation ID.",
                        }
                    );

                }

                // --------------------------------
                // 3. Validate content
                // --------------------------------

                if (
                    !content ||
                    !content.trim()
                ) {

                    return socket.emit(
                        "message:error",
                        {
                            message:
                                "Message content cannot be empty.",
                        }
                    );

                }

                // --------------------------------
                // 4. Find conversation
                // --------------------------------

                const conversation =
                    await Conversation.findById(
                        conversationId
                    );

                if (!conversation) {

                    return socket.emit(
                        "message:error",
                        {
                            message:
                                "Conversation not found.",
                        }
                    );

                }

                // --------------------------------
                // 5. Verify participant
                // --------------------------------

                const isParticipant =
                    conversation.participants.some(
                        (participantId) =>
                            String(participantId) ===
                            String(senderId)
                    );

                if (!isParticipant) {

                    return socket.emit(
                        "message:error",
                        {
                            message:
                                "You are not a participant in this conversation.",
                        }
                    );

                }

                // --------------------------------
                // 6. Save message
                // --------------------------------

                const message =
                    await Message.create({
                        conversationId,
                        senderId,
                        content: content.trim(),
                    });

                console.log(
                    "💾 Message saved:",
                    message._id
                );

                // --------------------------------
                // 7. Update conversation
                // --------------------------------

                conversation.lastMessage =
                    message._id;

                conversation.lastMessageAt =
                    message.createdAt;

                await conversation.save();

                // --------------------------------
                // 8. Broadcast message
                // --------------------------------

                const roomName =
                    `conversation:${conversationId}`;

                /*
                 * socket.server is the Socket.IO server
                 * associated with this socket.
                 */

                socket.server
                    .to(roomName)
                    .emit(
                        "message:new",
                        {
                            message,
                        }
                    );

            } catch (error) {

                console.error(
                    "❌ message:send error:",
                    error
                );

                socket.emit(
                    "message:error",
                    {
                        message:
                            "Failed to send message.",
                    }
                );

            }
        }
    );


    // ============================================================
    // DISCONNECT
    // ============================================================

    socket.on(
        "disconnect",
        (reason) => {

            console.log(
                "❌ Chat socket disconnected:",
                socket.id,
                "Reason:",
                reason
            );

        }
    );

}

