import { emailConfig, emailTemplates } from "../config/email.js";

/**
 * Send KYC status change notification (email when configured and email provided, webhook when configured).
 * @param {string} userId - User identifier
 * @param {string} status - "approved" | "rejected"
 * @param {{ email?: string, reason?: string, fullName?: string, kycId?: string }} data
 */
export async function notifyKycStatusChange(userId, status, data = {}) {
  const payload = {
    userId,
    status,
    timestamp: new Date().toISOString(),
    kycId: data.kycId,
    fullName: data.fullName,
    ...(data.reason && { reason: data.reason }),
  };

  const results = { email: null, webhook: null };

  if (status === "approved" && data.email && emailConfig.enabled) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        service: emailConfig.service,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password,
        },
      });
      const template = emailTemplates.kycApproved(data.fullName);
      await transporter.sendMail({
        from: emailConfig.from,
        to: data.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      results.email = "sent";
    } catch (err) {
      results.email = err?.message || "failed";
    }
  }

  if (status === "rejected" && data.email && emailConfig.enabled) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        service: emailConfig.service,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password,
        },
      });
      const template = emailTemplates.kycRejected(data.reason);
      await transporter.sendMail({
        from: emailConfig.from,
        to: data.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      results.email = "sent";
    } catch (err) {
      results.email = err?.message || "failed";
    }
  }

  const webhookUrl = process.env.KYC_WEBHOOK_URL;
  if (webhookUrl && webhookUrl.trim()) {
    try {
      const axios = (await import("axios")).default;
      await axios.post(webhookUrl.trim(), payload, {
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      });
      results.webhook = "sent";
    } catch (err) {
      results.webhook = err?.message || "failed";
    }
  }

  return results;
}
