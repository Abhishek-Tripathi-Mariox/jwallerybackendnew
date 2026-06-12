const ContactSubmissionService = require("../services/ContactSubmissionService");
const NotificationService = require("../services/NotificationService");

const VALID_INTERESTS = [
  "general",
  "product",
  "support",
  "order",
  "wholesale",
  "feedback",
  "other",
  // Live page also surfaces marketing categories — keep these accepted so the
  // existing public form on swarnaz.com doesn't 400 if we mirror it.
  "email-marketing",
  "sms-marketing",
];

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ""));

module.exports = () => {
  /** Public — submit the contact form. */
  const submit = async (req, res, next) => {
    console.log("ContactController => submit");
    const {
      fullName = "",
      email,
      countryCode = "+91",
      mobileNumber,
      interest = "general",
      message = "",
      consent = false,
    } = req.body;

    if (!isEmail(email)) {
      req.statusCode = 400;
      throw new Error("Please enter a valid email address");
    }
    const cleanMobile = String(mobileNumber || "").replace(/\D/g, "");
    if (cleanMobile.length < 7 || cleanMobile.length > 15) {
      req.statusCode = 400;
      throw new Error("Please enter a valid mobile number");
    }

    const submission = await ContactSubmissionService().create({
      fullName: String(fullName || "").trim(),
      email: String(email).trim().toLowerCase(),
      countryCode: String(countryCode || "+91").trim(),
      mobileNumber: cleanMobile,
      interest: VALID_INTERESTS.includes(String(interest))
        ? String(interest)
        : "other",
      message: String(message || "").trim(),
      consent: !!consent,
      ip: req.ip,
      userAgent: req.headers["user-agent"] || "",
    });

    // Fire-and-forget broadcast so admins see a new lead in their bell.
    // Safe to swallow errors — submission is already saved.
    try {
      await NotificationService().createBroadcast({
        type: "system",
        title: "New contact form submission",
        message: `${submission.fullName || submission.email} • ${
          submission.interest || "general"
        }`,
        link: "/contact-submissions",
      });
    } catch (err) {
      console.error("Contact notify failed:", err.message);
    }

    // Don't leak admin-only fields back to the public form.
    req.rData = { _id: submission._id, createdAt: submission.createdAt };
    req.msg = "success";
    next();
  };

  /** Admin — list submissions with optional status filter. */
  const adminList = async (req, res, next) => {
    console.log("ContactController => adminList");
    const { page, limit, status } = req.query;
    req.rData = await ContactSubmissionService().list({
      page: page || 1,
      limit: limit || 20,
      status,
    });
    req.msg = "success";
    next();
  };

  /** Admin — change status / add note. */
  const adminUpdate = async (req, res, next) => {
    console.log("ContactController => adminUpdate");
    const { status, adminNotes } = req.body;
    const updated = await ContactSubmissionService().setStatus(
      req.params.id,
      status,
      adminNotes,
    );
    req.rData = updated;
    req.msg = "success";
    next();
  };

  const adminDelete = async (req, res, next) => {
    console.log("ContactController => adminDelete");
    await ContactSubmissionService().remove(req.params.id);
    req.rData = null;
    req.msg = "success";
    next();
  };

  return { submit, adminList, adminUpdate, adminDelete };
};
