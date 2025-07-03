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

// IMAP Config
const imap = new Imap(require("./config/imapConfig"));

// Company Info (edit .env or set as needed)
const COMPANY_NAME = process.env.COMPANY_NAME || "Mavens Advisors";
const COMPANY_EMAIL = process.env.COMPANY_EMAIL || "hr@mavensadvisors.com";
const COMPANY_CONTACT = process.env.COMPANY_CONTACT || "+1 (111) 111-1111";

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

// Send complete profile link (uses employeeName and companyName)
async function sendCompleteProfileLink(id, to, employeeName, companyName) {
  const link = `${process.env.FRONTEND_BASE_URL}/complete-profile/${id}`;
  const subject = "🙌 Thank You! Help Me Finalize Your Profile 🚀";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto;">
      <p>Dear <strong>${employeeName || "Employee"}</strong>,</p>
      <p>Thank you so much for sharing your CNIC and CV earlier — your cooperation means the world to me! 💙</p>
      <p>
        As your HR AI Agent, I’ve been busy building a smarter, more connected system to support you better. 
        From payroll to perks, records to recognition — it all starts with having the right information in the right place.
      </p>
      <p>
        To complete your employee profile and keep our records up to date, I kindly request you to take a moment to fill out a short form:
      </p>
      <p>
        📝 <strong>
          <a href="${link}" style="color: #0057b7; text-decoration: underline;">
            Click here to complete your profile
          </a>
        </strong>
      </p>
      <p>This will help me ensure:</p>
      <ul>
        <li>✅ Your salary info is processed correctly</li>
        <li>✅ Your benefits and contact details are accurate</li>
        <li>✅ You’re ready for future updates, promotions, and recognitions 🎉</li>
      </ul>
      <p>
        It’ll only take a few minutes — and as always, your data will be handled with strict confidentiality and care.
      </p>
      <p>
        Let’s make our workplace even more organized, connected, and ready for what’s next. Thank you again for being such an important part of the <strong>${companyName}</strong> family.
        I’m here to make things smoother for you — now and always.
      </p>
      <p>
        Warmly,<br/>
        <strong>Your HR AI Agent 🤖</strong><br/>
        Here for You. Powered by Trust.<br/>
        <span style="color: #888;">${COMPANY_EMAIL} | ${COMPANY_CONTACT}</span>
      </p>
    </div>
  `;
  await sendEmail({ to, subject, html });
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
      // Prepare fields to update (excluding name)
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
        // name intentionally omitted here!
      };

      let extractedName = "";

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
            // do NOT assign name!
          });

          // Save extracted name for use below (only for new)
          extractedName = cnic.name || "";
        } catch (error) {
          console.log("CNIC extraction failed:", error);
        }
        // (OPTIONAL: CV parsing can be added here)
      }

      if (emp) {
        // Only update other fields, preserve name
        await Employee.updateOne(
          { email: fromAddr },
          {
            ...data,
            email: fromAddr,
            owner: emp.owner || "6838b0b708e8629ffab534ee",
            // name not included: so it is NOT updated!
          }
        );
      } else {
        // New employee: use extracted name if available
        emp = await Employee.create({
          ...data,
          email: fromAddr,
          owner: "6838b0b708e8629ffab534ee",
          name: extractedName,
        });
      }

      // Always re-fetch after upsert for fresh info
      emp = await Employee.findOne({ email: fromAddr });

      // Send profile completion link with employee name and company name
      await sendCompleteProfileLink(emp._id, fromAddr, emp.name, COMPANY_NAME);
    }

    // Always re-fetch for up-to-date info (after upsert)
    emp = await Employee.findOne({ email: fromAddr });
    if (emp) await ensureDocsGenerated(emp);

    // --- Email classification/replies ---
    let label;
    if (/\baccept(?:ed|ance)?\b/i.test(bodyText)) {
      label = "offer_acceptance";
    } else if (/\bapprove\b/i.test(bodyText) || /\breject\b/i.test(bodyText)) {
      label = "approval_response";
    } else {
      label = await classifyEmail(bodyText);
    }

    // Simple reply flows
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
