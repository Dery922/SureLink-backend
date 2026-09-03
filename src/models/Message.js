import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
            index: true,
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model(
    "Message",
    messageSchema
);

export default Message;