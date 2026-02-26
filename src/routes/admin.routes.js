/**
 * Admin API key management.
 * All routes require X-Admin-Key to match the master ADMIN_API_KEY (env).
 */
import { Router } from "express";
import { requireMasterAdminKey } from "../middleware/adminAuth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as apiKeyController from "../controllers/apiKey.controller.js";

const router = Router();

router.use(requireMasterAdminKey);

router.post("/api-keys", asyncHandler(apiKeyController.createApiKey));
router.get("/api-keys", asyncHandler(apiKeyController.listApiKeys));
router.delete("/api-keys/:id", asyncHandler(apiKeyController.revokeApiKey));

export default router;
