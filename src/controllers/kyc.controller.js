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
 * POST /kyc/approve { kycId } (admin)
 */
export async function approveKyc(req, res) {
  const { kycId } = req.body;
  if (!kycId) {
    throw new ValidationError("kycId is required");
  }
  const result = await kycService.approveKyc(kycId);
  res.status(200).json({ status: "success", data: result });
}

/**
 * POST /kyc/reject { kycId, reason } (admin)
 */
export async function rejectKyc(req, res) {
  const { kycId, reason } = req.body;
  if (!kycId) {
    throw new ValidationError("kycId is required");
  }
  const result = await kycService.rejectKyc(kycId, reason);
  res.status(200).json({ status: "success", data: result });
}
