require("dotenv").config();

const Imap = require("imap");
const { simpleParser } = require("mailparser");
const mongoose = require("mongoose");

const { sendEmail } = require("./services/mailService");
const Employee = require("./models/Employees");
const {
  generateAndSaveNda,
  generateAndSaveContract,
  generateAndSaveSalaryCertificate,
} = require("./services/ndaService");

// Offline CNIC OCR parser (no AI required)
const { extractCNICUsingOCR } = require("./services/deepseekService");

// OPTIONAL: AI-based CV parsing (commented for pure offline)
// const { extractTextUsingAI } = require("./services/deepseekService");
// const { analyzeLeavePolicy } = require("./services/deepseekService");
// const { generateHRReply, generateRejectionReply } = require("./services/draftReply");

// IMAP Config
const imap = new Imap(require("./config/imapConfig"));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Email parser
function parseStream(stream) {
  return new Promise((resolve, reject) => {
    simpleParser(stream, (err, parsed) => {
      if (err) reject(err);
      else resolve(parsed);
    });
  });
}

// (Simplified) Leave/classification logic
async function classifyEmail(text) {
  if (!text) return "hr_related";
  if (
    /\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/.test(text) ||
    /\b(today|tomorrow)\b/i.test(text)
  ) {
    return "leave_request";
  }
  return "hr_related";
}

// Send complete profile link
async function sendCompleteProfileLink(id, to) {
  const link = `${process.env.FRONTEND_BASE_URL}/complete-profile/${id}`;
  const html = `
    <div>
      <p>Please complete your profile by visiting:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Route element: <code>&lt;CompleteProfile /&gt;</code></p>
    </div>
  `;
  await sendEmail({ to, subject: "Complete Your Profile", html });
}

// NDA/contract generator
async function ensureDocsGenerated(emp) {
  if (!emp) return;
  let updated = false;
  if (emp.name && emp.cnic) {
    const ndaPath = await generateAndSaveNda(emp);
    if (ndaPath && emp.ndaPath !== ndaPath) {
      emp.ndaPath = ndaPath;
      emp.ndaGenerated = true;
      updated = true;
    }
    const contractPath = await generateAndSaveContract(emp);
    if (contractPath && emp.contractPath !== contractPath) {
      emp.contractPath = contractPath;
      emp.contractGenerated = true;
      updated = true;
    }
    const salaryCertPath = await generateAndSaveSalaryCertificate(emp);
    if (salaryCertPath && emp.salaryCertificatePath !== salaryCertPath) {
      emp.salaryCertificatePath = salaryCertPath;
      emp.salaryCertificateGenerated = true;
      updated = true;
    }
    if (updated) await emp.save();
  }
}

// Main email processor
async function processMessage(stream) {
  try {
    const parsed = await parseStream(stream);
    if (
      !parsed.from ||
      !parsed.from.value ||
      !parsed.from.value[0] ||
      !parsed.from.value[0].address
    ) {
      console.warn("Email missing from address");
      return;
    }

    const fromAddr = parsed.from.value[0].address.toLowerCase();
    const bodyText = (parsed.text || "").trim();

    // Upsert employee if attachments are present
    let emp = await Employee.findOne({ email: fromAddr });
    if (parsed.attachments?.length) {
      // Base fields
      const data = {
        cnic: "",
        dateOfBirth: "",
        gender: "",
        nationality: "",
        cnicIssueDate: "",
        cnicExpiryDate: "",
        phone: "",
        fatherOrHusbandName: "",
        skills: [],
        education: [],
        experience: [],
        name: "",
      };

      for (const att of parsed.attachments) {
        const fname = (att.filename || "").toLowerCase();
        if (!/\.(png|jpe?g)$/i.test(fname)) continue; // Only image files for CNIC
        const buf = att.content;

        // --- OFFLINE CNIC OCR PARSER ---
        try {
          const cnic = await extractCNICUsingOCR(buf);
          Object.assign(data, {
            cnic: cnic.cnic || data.cnic,
            dateOfBirth: cnic.dateOfBirth || data.dateOfBirth,
            gender: cnic.gender || data.gender,
            nationality: cnic.nationality || data.nationality,
            cnicIssueDate: cnic.dateOfIssue || data.cnicIssueDate,
            cnicExpiryDate: cnic.dateOfExpiry || data.cnicExpiryDate,
            fatherOrHusbandName: cnic.fatherOrHusbandName || data.fatherOrHusbandName,
            name: cnic.name || data.name,
          });
        } catch (error) {
          console.log("CNIC extraction failed:", error);
        }

        // --- (OPTIONAL) CV Extraction via AI ---
        /*
        try {
          const cv = JSON.parse(await extractTextUsingAI(buf, "CV"));
          Object.assign(data, {
            phone: cv.phone || data.phone,
            fatherOrHusbandName: cv.fatherOrHusbandName || data.fatherOrHusbandName,
          });
          data.skills.push(...(cv.skills || []));
          data.education.push(...(cv.education || []));
          data.experience.push(...(cv.experience || []));
        } catch (error) {
          // Not a CV, ignore error
        }
        */
      }

      emp = await Employee.findOneAndUpdate(
        { email: fromAddr },
        {
          ...data,
          email: fromAddr,
          owner: "6838b0b708e8629ffab534ee", // always set owner!
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Send profile completion link
      await sendCompleteProfileLink(emp._id, fromAddr);
    }

    // Always re-fetch for up-to-date info (after upsert)
    emp = await Employee.findOne({ email: fromAddr });
    if (emp) await ensureDocsGenerated(emp);

    // --- Email classification/replies (you can customize or remove) ---
    let label;
    if (/\baccept(?:ed|ance)?\b/i.test(bodyText)) {
      label = "offer_acceptance";
    } else if (/\bapprove\b/i.test(bodyText) || /\breject\b/i.test(bodyText)) {
      label = "approval_response";
    } else {
      label = await classifyEmail(bodyText);
    }

    // Very simple reply flows (customize for your logic)
    if (label === "offer_acceptance") {
      await sendEmail({
        to: fromAddr,
        subject: "Next Steps",
        html: emp
          ? "Thank you for accepting our offer! 🎉 Please send your updated CV & CNIC."
          : "Thank you for accepting! 🎉 Please send your CV & CNIC to get started.",
      });
    } else if (label === "approval_response") {
      await sendEmail({
        to: fromAddr,
        subject: "Approval/Decision Recorded",
        html: "Thank you for your response. Your approval/rejection has been recorded.",
      });
    } else if (label === "leave_request") {
      await sendEmail({
        to: fromAddr,
        subject: "Leave Request Received",
        html: "Your leave request has been received and will be reviewed.",
      });
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }
}

// IMAP polling
function checkLatest() {
  imap.search(["UNSEEN"], (err, uids) => {
    if (err) {
      console.error("IMAP search error:", err);
      return;
    }
    if (!uids?.length) return;

    const fetcher = imap.fetch(uids, { bodies: [""], markSeen: true });
    fetcher.on("message", (msg) => {
      msg.on("body", (stream) => {
        processMessage(stream).catch((error) => {
          console.error("Error processing message stream:", error);
        });
      });
      msg.on("error", (error) => {
        console.error("Message stream error:", error);
      });
    });
    fetcher.once("error", (error) => {
      console.error("Fetch error:", error);
    });
    fetcher.once("end", () => console.log("Done processing new messages"));
  });
}

// Start everything
function startWatcher() {
  imap.once("ready", () => {
    imap.openBox("INBOX", false, (err) => {
      if (err) {
        console.error("IMAP openBox error:", err);
        return;
      }
      console.log("Watching for new emails...");
      imap.on("mail", checkLatest);
      checkLatest();
    });
  });

  imap.on("error", (err) => {
    console.error("IMAP connection error:", err);
  });

  imap.on("end", () => {
    console.log("IMAP connection ended");
  });

  imap.connect();

  process.on("SIGINT", () => {
    imap.end();
    mongoose.connection.close();
    process.exit();
  });
}

module.exports = { startWatcher };