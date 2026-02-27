/**
 * KYC routes – users submit docs; admin lists/reviews/approves/rejects and can view/download documents.
 */
import { Router } from "express";
import multer from "multer";
import { uploadConfig, uploadFieldNames } from "../config/upload.js";
import { ValidationError } from "../utils/errors.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAdminKey } from "../middleware/adminAuth.js";
import * as kycController from "../controllers/kyc.controller.js";

const router = Router();

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError(`Invalid file type: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: uploadConfig.maxFileSize },
  fileFilter,
}).fields([
  { name: uploadFieldNames.passport, maxCount: 1 },
  { name: uploadFieldNames.driver_front, maxCount: 1 },
  { name: uploadFieldNames.driver_back, maxCount: 1 },
  { name: uploadFieldNames.aadhaar_front, maxCount: 1 },
  { name: uploadFieldNames.aadhaar_back, maxCount: 1 },
  { name: uploadFieldNames.pan_front, maxCount: 1 },
  { name: uploadFieldNames.selfie, maxCount: 1 },
]);

router.post(
  "/submit",
  upload,
  asyncHandler(kycController.submitKyc)
);

router.get("/status", asyncHandler(kycController.getKycStatus));

// Admin-only: require X-Admin-Key header (env: ADMIN_API_KEY)
router.get(
  "/review",
  requireAdminKey,
  asyncHandler(kycController.reviewKyc)
);
router.get(
  "/review/:kycId",
  requireAdminKey,
  asyncHandler(kycController.getKycDetails)
);
router.get(
  "/document/:kycId/:filename",
  requireAdminKey,
  asyncHandler(kycController.getDocument)
);
router.post(
  "/approve",
  requireAdminKey,
  asyncHandler(kycController.approveKyc)
);
router.post(
  "/reject",
  requireAdminKey,
  asyncHandler(kycController.rejectKyc)
);

export default router;
