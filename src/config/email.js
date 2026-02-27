/**
 * Email configuration for KYC notifications.
 * Set EMAIL_USER, EMAIL_PASSWORD (or app password) to enable sending.
 */
export const emailConfig = {
  enabled:
    !!process.env.EMAIL_USER &&
    !!process.env.EMAIL_PASSWORD,
  service: process.env.EMAIL_SERVICE || "gmail",
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
};

export const emailTemplates = {
  kycApproved: (userName = "User") => ({
    subject: "KYC Verification Approved",
    text: `Hello,\n\nYour KYC verification has been approved. You can now use all services.\n\nThank you.`,
    html: `<p>Hello${userName !== "User" ? ` ${userName}` : ""},</p><p>Your KYC verification has been <strong>approved</strong>. You can now use all services.</p><p>Thank you.</p>`,
  }),
  kycRejected: (reason = "Please contact support.") => ({
    subject: "KYC Verification Update",
    text: `Hello,\n\nYour KYC verification was not approved. Reason: ${reason}\n\nYou may resubmit your documents. Thank you.`,
    html: `<p>Hello,</p><p>Your KYC verification was not approved.</p><p><strong>Reason:</strong> ${reason}</p><p>You may resubmit your documents. Thank you.</p>`,
  }),
};
