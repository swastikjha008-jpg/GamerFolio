import { Router } from "express";
import {
  listConversationsHandler,
  createConversationHandler,
  getConversationHandler,
  listMessagesHandler,
} from "../controllers/message.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  createConversationSchema,
  conversationIdParamSchema,
  messagesQuerySchema,
} from "../validators/message.validators";

// Mounted at /api/conversations. All routes require authentication.
const router = Router();

router.use(authMiddleware);

router.get("/", listConversationsHandler);
router.post("/", validate({ body: createConversationSchema }), createConversationHandler);
router.get("/:id", validate({ params: conversationIdParamSchema }), getConversationHandler);
router.get(
  "/:id/messages",
  validate({ params: conversationIdParamSchema, query: messagesQuerySchema }),
  listMessagesHandler
);

export default router;
