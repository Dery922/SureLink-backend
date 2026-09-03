import express from "express";

import { authMiddleware } from "./auth/auth.validation.middleware.js";
import { createConversation, getConversationMessages, getUserConversations } from "../controllers/chatController.js";

const router = express.Router();
router.post(
    "/conversations",
    authMiddleware,
    createConversation
);
router.get("/conversations", authMiddleware, getUserConversations);

router.get("/conversations/:conversationId/messages", authMiddleware, getConversationMessages);
export default router;