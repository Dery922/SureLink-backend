import mongoose from "mongoose";

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";



export const createConversation = async (req, res) => {
    try {
        const { recipientId } = req.body;

        const initiatorId = req.user?._id || req.user?.id;

        // --------------------------------
        // 1. Validate recipient
        // --------------------------------

        if (!recipientId) {
            return res.status(400).json({
                success: false,
                message: "Recipient ID is required.",
            });
        }

        // --------------------------------
        // 2. Validate IDs
        // --------------------------------

        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipient ID.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(initiatorId)) {
            return res.status(401).json({
                success: false,
                message: "Invalid authenticated user ID.",
            });
        }

        // --------------------------------
        // 3. Prevent self conversation
        // --------------------------------

        if (String(initiatorId) === String(recipientId)) {
            return res.status(400).json({
                success: false,
                message: "You cannot start a conversation with yourself.",
            });
        }

        // --------------------------------
        // 4. Check existing conversation
        // --------------------------------

        let conversation = await Conversation.findOne({
            participants: {
                $all: [initiatorId, recipientId],
            },
        });

        // --------------------------------
        // 5. Create if it doesn't exist
        // --------------------------------

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [
                    initiatorId,
                    recipientId,
                ],
                createdBy: initiatorId,
            });
        }

        // --------------------------------
        // 6. Return conversation
        // --------------------------------

        return res.status(200).json({
            success: true,
            message: "Conversation ready.",
            data: {
                conversation,
            },
        });

    } catch (error) {
        console.error(
            "❌ CREATE CONVERSATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to create conversation.",
        });
    }
};

export const getUserConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        const conversations = await Conversation.find({
            participants: userId,
        })
            .populate(
                "participants",
                "_id firstName lastName name avatar profileImage type role"
            )
            .populate(
                "lastMessage",
                "_id senderId content createdAt"
            )
            .sort({
                lastMessageAt: -1,
                updatedAt: -1,
            });

        return res.status(200).json({
            success: true,
            data: {
                conversations,
            },
        });

    } catch (error) {
        console.error(
            "❌ Failed to fetch conversations:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch conversations.",
        });
    }
};



// ============================================================
// GET CONVERSATION MESSAGES
// ============================================================

export const getConversationMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user?.id;

        console.log(
            "📥 GET CONVERSATION MESSAGES:",
            {
                userId,
                conversationId,
            }
        );

        // --------------------------------------------------------
        // 1. Validate authenticated user
        // --------------------------------------------------------

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated.",
            });
        }

        // --------------------------------------------------------
        // 2. Validate conversation ID
        // --------------------------------------------------------

        if (
            !conversationId ||
            !mongoose.Types.ObjectId.isValid(
                conversationId
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversation ID.",
            });
        }

        // --------------------------------------------------------
        // 3. Find conversation
        // --------------------------------------------------------

        const conversation =
            await Conversation.findById(
                conversationId
            );

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found.",
            });
        }

        // --------------------------------------------------------
        // 4. Verify user is a participant
        // --------------------------------------------------------

        const isParticipant =
            conversation.participants.some(
                (participantId) =>
                    String(participantId) ===
                    String(userId)
            );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not a participant in this conversation.",
            });
        }

        // --------------------------------------------------------
        // 5. Fetch messages
        // --------------------------------------------------------

        const messages =
            await Message.find({
                conversationId,
            })
                .sort({
                    createdAt: 1,
                })
                .lean();

        console.log(
            `💬 Found ${messages.length} messages`
        );

        // --------------------------------------------------------
        // 6. Return messages
        // --------------------------------------------------------

        return res.status(200).json({
            success: true,
            data: {
                messages,
            },
        });

    } catch (error) {

        console.error(
            "❌ GET CONVERSATION MESSAGES ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch conversation messages.",
        });
    }
};
