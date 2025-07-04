require("dotenv").config();
const mongoose = require("mongoose");
const CompanyProfile = require("../models/CompanyProfile");
const SalarySlip = require("../models/SalarySlip");
const Employee = require("../models/Employees");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: process.env.MAIL_PORT === "465",
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
});

const SALARY_COMPONENTS = [
  "basic",
  "dearnessAllowance",
  "houseRentAllowance",
  "conveyanceAllowance",
  "medicalAllowance",
  "utilityAllowance",
  "overtimeComp",
  "dislocationAllowance",
  "leaveEncashment",
  "bonus",
  "arrears",
  "autoAllowance",
  "incentive",
  "fuelAllowance",
  "othersAllowances",
];

function formatDateDMY(dateInput) {
  if (!dateInput) return "";
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) return "";
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString("default", { month: "long" });
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
}
function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, min] =
    timeStr.split(":").length >= 2
      ? [parseInt(timeStr.split(":")[0], 10), timeStr.split(":")[1]]
      : [parseInt(timeStr, 10), "00"];
  let suffix = "AM";
  if (hour >= 12) {
    suffix = "PM";
    if (hour > 12) hour -= 12;
  }
  if (hour === 0) hour = 12;
  return `${hour}:${min.padStart(2, "0")} ${suffix}`;
}
function formatNumberWithCommas(x) {
  return Number(x).toLocaleString("en-PK");
}

// --- Signature Block (Comic Sans, links styled) ---
const EMAIL_SIGNATURE = `
  <div style="font-family: 'Comic Sans MS', Comic Sans, cursive; font-size: 17px; margin-top:28px; margin-bottom:12px; line-height:1.6;">
    Regards,<br><br>
    <span style="font-weight:bold;">Human Resource Department</span><br>
    <span style="font-style: italic;">Mavens Advisor</span><br><br>
    <div>
      <b>T</b> &nbsp; +44 7451 285285<br>
      <b>E</b> &nbsp; <a href="mailto:HR@mavensadvisor.com" style="color:#0057b7; text-decoration:underline;">HR@mavensadvisor.com</a><br>
      <b>W</b> &nbsp; <a href="https://www.mavensadvisor.com" style="color:#0057b7; text-decoration:underline;">www.mavensadvisor.com</a>
    </div>
    <br>
    Mavens Advisor LLC<br>
    East Grand Boulevard, Detroit<br>
    Michigan, United States
  </div>
`;

// --- Disclaimer Block (monospace) ---
const EMAIL_DISCLAIMER = `
  <div style="margin-top:28px;">
    <div style="background:#f4f4f4; border-radius:7px; font-family:monospace; font-size:13px; color:#333; white-space:pre; padding:18px 12px; overflow-x:auto;">
*********************************************************************************

The information contained in this email (including any attachments) is intended only for the personal and confidential use of the recipient(s) named above. If you are not an intended recipient of this message, please notify the sender by replying to this message and then delete the message and any copies from your system. Any use, dissemination, distribution, or reproduction of this message by unintended recipients is not authorized and may be unlawful.

*********************************************************************************
    </div>
  </div>
`;

module.exports = {
  // Only generates letter (NO DB WRITE)
  async generateOfferLetter(req, res) {
    try {
      const {
        candidateName,
        candidateEmail,
        position,
        salaryBreakup = {},
        startDate,
        reportingTime,
        confirmationDeadlineDate,
        department, // DEPARTMENT NAME should be sent from frontend
      } = req.body;

      if (
        !candidateName ||
        !candidateEmail ||
        !position ||
        !startDate ||
        !reportingTime ||
        !confirmationDeadlineDate
      ) {
        return res
          .status(400)
          .json({ error: "Missing required candidate or date fields." });
      }
      if (!req.user || !req.user._id) {
        return res.status(400).json({ error: "No user context found." });
      }

      let ownerId = req.user._id;
      if (!(ownerId instanceof mongoose.Types.ObjectId)) {
        ownerId = new mongoose.Types.ObjectId(ownerId);
      }
      const company = await CompanyProfile.findOne({ owner: ownerId });

      if (!company) {
        return res.status(404).json({ error: "Company profile not found." });
      }

      let address = company.address;
      if (!address || typeof address !== "string" || !address.trim()) {
        address = "GULSHAN-E-MAYMAR, KARACHI";
      }

      const formattedStartDate = formatDateDMY(startDate);
      const formattedDeadline = formatDateDMY(confirmationDeadlineDate);
      const formattedTime = formatTime12hr(reportingTime);

      const grossSalaryRaw = SALARY_COMPONENTS.reduce(
        (sum, k) => sum + (Number(salaryBreakup[k]) || 0),
        0
      );
      const grossSalary = formatNumberWithCommas(grossSalaryRaw);

      // --- TEXT VERSION (for .text and editing) ---
      const letter = `
Dear ${candidateName},

We’re thrilled to have you on board!

After getting to know you during your recent interview, we were truly inspired by your passion, potential, and the energy you bring. It gives us great pleasure to officially offer you the position of ${position} at ${company.name}.

We believe you will be a valuable addition to our growing team, and we’re excited about what we can build together. This isn’t just a job – it’s a journey, and we’re looking forward to seeing you thrive with us.

Your monthly gross salary will be PKR ${grossSalary}, paid through online bank transfer at the end of each month.

If you accept this offer, your anticipated start date will be ${formattedStartDate}, and we look forward to welcoming you in person at our ${address} by ${formattedTime}.

In this role, you’ll be working 45 hours per week, from Monday to Friday – a full week of opportunities to grow, collaborate, and contribute.

To move forward, please confirm your acceptance of this offer by ${formattedDeadline}. On your first day, we kindly ask that you bring:

- All original educational and professional certificates
- Original CNIC with a photocopy
- Two recent passport-sized photographs

By accepting this offer, you also agree to the terms set forth in our Employment Contract and Non-Disclosure Agreement (NDA), which we will share with you separately.

We’re truly excited to have you join us. Your future teammates are just as eager to welcome you, support you, and learn from you as you are to begin this new chapter. Let’s make great things happen together!

    `.trim();

      return res.json({
        letter,
        grossSalary: grossSalaryRaw,
        salaryBreakup,
        position,
        candidateName,
        candidateEmail,
        startDate,
        reportingTime,
        confirmationDeadlineDate,
        department,
      });
    } catch (err) {
      console.error("Offer gen error:", err?.response?.data || err);
      return res
        .status(500)
        .json({ error: "Failed to generate offer letter." });
    }
  },

  // Actually sends the letter and CREATES Employee & SalarySlip
  async sendOfferLetter(req, res) {
    try {
      const {
        candidateEmail,
        letter,
        salaryBreakup,
        position,
        candidateName,
        startDate,
        reportingTime,
        confirmationDeadlineDate,
        department, // <-- department name (string)
      } = req.body;
      const candidate =
        candidateName || /Dear\s+(.+?),/i.exec(letter)?.[1] || "Candidate";

      if (
        !candidateEmail ||
        !letter ||
        !salaryBreakup ||
        !position ||
        !candidate ||
        !startDate ||
        !reportingTime ||
        !confirmationDeadlineDate
      ) {
        return res
          .status(400)
          .json({ error: "Missing required fields for sending offer." });
      }

      // Create Employee (department as name, not ObjectId)
      const employee = await Employee.create({
        name: candidate,
        email: candidateEmail,
        designation: position,
        startDate,
        department: department || null, // Store department NAME here!
        owner: req.user?._id,
        createdBy: req.user?._id,
      });

      // Create SalarySlip
      const grossSalaryRaw = SALARY_COMPONENTS.reduce(
        (sum, k) => sum + (Number(salaryBreakup[k]) || 0),
        0
      );
      const slipData = {
        employee: employee._id,
        candidateName: candidate,
        candidateEmail,
        position,
        startDate,
        reportingTime,
        confirmationDeadlineDate,
        grossSalary: grossSalaryRaw,
        owner: req.user?._id,
        createdBy: req.user?._id,
      };
      SALARY_COMPONENTS.forEach(
        (k) => (slipData[k] = Number(salaryBreakup[k]) || 0)
      );
      await SalarySlip.create(slipData);

      // --- HTML Email Render ---
      // (Main body = Arial, signature = Comic Sans, disclaimer = monospace)
      const lines = letter.split("\n");
      let htmlBody = "";
      let inList = false;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // If line is a bullet
        if (/^(\-|\*|•)\s+/.test(line)) {
          if (!inList) {
            htmlBody += "<ul style='margin:0 0 1em 2em;padding:0;'>";
            inList = true;
          }
          htmlBody += `<li style="margin-bottom:4px;">${line.replace(
            /^(\-|\*|•)\s+/,
            ""
          )}</li>`;
        } else if (line === "") {
          continue;
        } else {
          if (inList) {
            htmlBody += "</ul>";
            inList = false;
          }
          htmlBody += `<p style="margin:0 0 1em 0;">${line}</p>`;
        }
      }
      if (inList) htmlBody += "</ul>";

      const html = `
      <div style="font-family: Arial, Helvetica, 'Segoe UI', system-ui, sans-serif; font-size: 17px; color: #222; line-height: 1.7; text-align: left; margin:0; padding:0; max-width:600px;">
        ${htmlBody}
        ${EMAIL_SIGNATURE}
        ${EMAIL_DISCLAIMER}
      </div>
      `;

      await transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
        to: candidateEmail,
        subject: "Welcome Aboard – Offer of Employment",
        text: letter + "\n\n" + // add signature/disclaimer in text version too
`Regards,

Human Resource Department
Mavens Advisor

T          +44 7451 285285  
E          HR@mavensadvisor.com  
W         www.mavensadvisor.com

Mavens Advisor LLC  
East Grand Boulevard, Detroit  
Michigan, United States

*********************************************************************************

The information contained in this email (including any attachments) is intended only for the personal and confidential use of the recipient(s) named above. If you are not an intended recipient of this message, please notify the sender by replying to this message and then delete the message and any copies from your system. Any use, dissemination, distribution, or reproduction of this message by unintended recipients is not authorized and may be unlawful.

*********************************************************************************
`,
        html: html,
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("Email send error:", err);
      return res.status(500).json({ error: "Failed to send offer letter." });
    }
  },
};
