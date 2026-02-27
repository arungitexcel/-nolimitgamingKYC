import { kycService } from "../services/kyc.service.js";
import { ValidationError } from "../utils/errors.js";

/**
 * POST /kyc/submit – multipart body: userId, documentType, fullName, dateOfBirth, idNumber + file fields.
 * req.files from multer (memory storage).
 */
export async function submitKyc(req, res) {
  const fields = {
    userId: req.body.userId,
    documentType: req.body.documentType,
    fullName: req.body.fullName,
    dateOfBirth: req.body.dateOfBirth,
    idNumber: req.body.idNumber,
  };
  const files = req.files || {};
  const result = await kycService.submitKyc(fields, files);
  res.status(201).json({ status: "success", data: result });
}

/**
 * GET /kyc/status?userId=... or ?kycId=...
 */
export async function getKycStatus(req, res) {
  const query = {
    userId: req.query.userId,
    kycId: req.query.kycId,
  };
  const data = await kycService.getKycStatus(query);
  res.status(200).json({ status: "success", data });
}

/**
 * GET /kyc/review?status=... (admin)
 */
export async function reviewKyc(req, res) {
  const list = await kycService.listForReview({
    status: req.query.status,
  });
  res.status(200).json({ status: "success", data: list });
}

/**
 * GET /kyc/review/:kycId (admin) – single KYC details including file paths
 */
export async function getKycDetails(req, res) {
  const { kycId } = req.params;
  if (!kycId) {
    throw new ValidationError("kycId is required");
  }
  const data = await kycService.getKycForReview(kycId);
  res.status(200).json({ status: "success", data });
}

/**
 * GET /kyc/document/:kycId/:filename (admin) – stream document file
 */
export async function getDocument(req, res, next) {
  const { kycId, filename } = req.params;
  if (!kycId || !filename) {
    throw new ValidationError("kycId and filename are required");
  }
  const { fullPath, contentType } = await kycService.getDocumentPath(
    kycId,
    filename
  );
  res.setHeader("Content-Type", contentType);
  res.sendFile(fullPath, (err) => {
    if (err) next(err);
  });
}

/**
 * POST /kyc/approve { kycId, reviewedBy?, notifyEmail? } (admin)
 */
export async function approveKyc(req, res) {
  const { kycId, reviewedBy, notifyEmail } = req.body;
  if (!kycId) {
    throw new ValidationError("kycId is required");
  }
  const result = await kycService.approveKyc(kycId, reviewedBy, notifyEmail);
  res.status(200).json({ status: "success", data: result });
}

/**
 * POST /kyc/reject { kycId, reason, reviewedBy?, notifyEmail? } (admin)
 */
export async function rejectKyc(req, res) {
  const { kycId, reason, reviewedBy, notifyEmail } = req.body;
  if (!kycId) {
    throw new ValidationError("kycId is required");
  }
  const result = await kycService.rejectKyc(
    kycId,
    reason,
    reviewedBy,
    notifyEmail
  );
  res.status(200).json({ status: "success", data: result });
}
