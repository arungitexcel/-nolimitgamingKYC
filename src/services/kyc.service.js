import fs from "fs/promises";
import path from "path";
import { KycSubmission, DOCUMENT_TYPES } from "../models/KycSubmission.js";
import { uploadConfig } from "../config/upload.js";
import {
  ValidationError,
  NotFoundError,
} from "../utils/errors.js";

/** Required file keys per document type (selfie always required) */
const REQUIRED_FILES_BY_DOC_TYPE = {
  passport: ["passport", "selfie"],
  drivers_license: ["driver_front", "driver_back", "selfie"],
  aadhaar: ["aadhaar_front", "selfie"],
  pan: ["pan_front", "selfie"],
};

function getExtension(mimetype) {
  const map = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
  };
  return map[mimetype] || ".bin";
}

function validateMime(mimetype) {
  if (!uploadConfig.allowedMimeTypes.includes(mimetype)) {
    throw new ValidationError(
      `Invalid file type: ${mimetype}. Allowed: ${uploadConfig.allowedMimeTypes.join(", ")}`
    );
  }
}

/**
 * Submit KYC: validate, create doc, write files to upload/{userId}/{kycId}/, update filePaths.
 * @param {{ userId: string, documentType: string, fullName: string, dateOfBirth: string, idNumber: string }} fields
 * @param {Record<string, { buffer: Buffer, mimetype: string }[]>} files - multer file arrays by field name
 */
async function submitKyc(fields, files) {
  const { userId, documentType, fullName, dateOfBirth, idNumber } = fields;

  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new ValidationError("userId is required");
  }
  if (!DOCUMENT_TYPES.includes(documentType)) {
    throw new ValidationError(
      `documentType must be one of: ${DOCUMENT_TYPES.join(", ")}`
    );
  }
  if (!fullName || !fullName.trim()) {
    throw new ValidationError("fullName is required");
  }
  if (!dateOfBirth || !dateOfBirth.trim()) {
    throw new ValidationError("dateOfBirth is required");
  }
  if (!idNumber || !idNumber.trim()) {
    throw new ValidationError("idNumber is required");
  }

  const requiredKeys = REQUIRED_FILES_BY_DOC_TYPE[documentType];
  if (!requiredKeys) {
    throw new ValidationError("Invalid documentType");
  }

  for (const key of requiredKeys) {
    const arr = files?.[key];
    if (!arr || !Array.isArray(arr) || arr.length === 0 || !arr[0].buffer) {
      throw new ValidationError(`Required file missing: ${key}`);
    }
    validateMime(arr[0].mimetype);
  }

  const doc = await KycSubmission.create({
    userId: userId.trim(),
    documentType,
    fullName: fullName.trim(),
    dateOfBirth: dateOfBirth.trim(),
    idNumber: idNumber.trim(),
    status: "submitted",
    filePaths: {},
  });
  const kycId = doc._id.toString();
  const userIdDir = userId.trim().replace(/[/\\]/g, "_");
  const dirPath = path.join(
    uploadConfig.rootPath,
    userIdDir,
    kycId
  );
  await fs.mkdir(dirPath, { recursive: true });

  const filePaths = {};
  for (const key of requiredKeys) {
    const file = files[key][0];
    const ext = getExtension(file.mimetype);
    const filename = `${key}${ext}`;
    const filePath = path.join(dirPath, filename);
    await fs.writeFile(filePath, file.buffer);
    filePaths[key] = path.join(userIdDir, kycId, filename);
  }

  doc.filePaths = filePaths;
  await doc.save();

  return {
    kycId: doc._id.toString(),
    status: doc.status,
    documentType: doc.documentType,
  };
}

/**
 * Get KYC status by userId (latest) or by kycId.
 * @param {{ userId?: string, kycId?: string }} query
 */
async function getKycStatus(query) {
  const { userId, kycId } = query;
  if (kycId) {
    const doc = await KycSubmission.findById(kycId).lean();
    if (!doc) {
      throw new NotFoundError("KYC submission not found");
    }
    return {
      kycId: doc._id.toString(),
      userId: doc.userId,
      status: doc.status,
      documentType: doc.documentType,
      fullName: doc.fullName,
      dateOfBirth: doc.dateOfBirth,
      idNumber: doc.idNumber,
      rejectionReason: doc.rejectionReason ?? undefined,
      reviewedAt: doc.reviewedAt ?? undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
  if (userId) {
    const doc = await KycSubmission.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();
    if (!doc) {
      throw new NotFoundError("No KYC submission found for this user");
    }
    return {
      kycId: doc._id.toString(),
      userId: doc.userId,
      status: doc.status,
      documentType: doc.documentType,
      fullName: doc.fullName,
      dateOfBirth: doc.dateOfBirth,
      idNumber: doc.idNumber,
      rejectionReason: doc.rejectionReason ?? undefined,
      reviewedAt: doc.reviewedAt ?? undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
  throw new ValidationError("Either userId or kycId is required");
}

/**
 * List submissions for admin review (optional status filter).
 * @param {{ status?: string }} options
 */
async function listForReview(options = {}) {
  const filter = options.status ? { status: options.status } : {};
  const list = await KycSubmission.find(filter)
    .sort({ createdAt: -1 })
    .select("_id userId documentType status fullName createdAt")
    .lean();
  return list.map((doc) => ({
    kycId: doc._id.toString(),
    userId: doc.userId,
    documentType: doc.documentType,
    status: doc.status,
    fullName: doc.fullName,
    createdAt: doc.createdAt,
  }));
}

/**
 * Approve a KYC submission (admin).
 * @param {string} kycId
 * @param {string} [reviewedBy] - optional admin identifier
 */
async function approveKyc(kycId, reviewedBy = null) {
  const doc = await KycSubmission.findByIdAndUpdate(
    kycId,
    {
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: reviewedBy ?? undefined,
      rejectionReason: null,
    },
    { new: true }
  );
  if (!doc) {
    throw new NotFoundError("KYC submission not found");
  }
  return { kycId: doc._id.toString(), status: doc.status };
}

/**
 * Reject a KYC submission (admin).
 * @param {string} kycId
 * @param {string} reason
 * @param {string} [reviewedBy]
 */
async function rejectKyc(kycId, reason, reviewedBy = null) {
  if (!reason || !String(reason).trim()) {
    throw new ValidationError("Rejection reason is required");
  }
  const doc = await KycSubmission.findByIdAndUpdate(
    kycId,
    {
      status: "rejected",
      rejectionReason: String(reason).trim(),
      reviewedAt: new Date(),
      reviewedBy: reviewedBy ?? undefined,
    },
    { new: true }
  );
  if (!doc) {
    throw new NotFoundError("KYC submission not found");
  }
  return { kycId: doc._id.toString(), status: doc.status };
}

export const kycService = {
  submitKyc,
  getKycStatus,
  listForReview,
  approveKyc,
  rejectKyc,
};
