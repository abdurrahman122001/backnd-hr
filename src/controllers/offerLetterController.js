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

// Util for formatting dates (e.g., 12 July 2025)
function formatDateDMY(dateInput) {
  if (!dateInput) return "";
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) return "";
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString("default", { month: "long" });
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
}

// Util for formatting time (e.g., 9:00 AM)
function formatTime12hr(timeStr) {
  if (!timeStr) return "";
  let [hour, min] = (timeStr.split(":").length >= 2)
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

// Util for number formatting (e.g., 1000000 -> 1,000,000)
function formatNumberWithCommas(x) {
  return Number(x).toLocaleString('en-PK');
}

module.exports = {
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
        departmentId,
      } = req.body;

      // Validate required fields
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

      // Format dates/times
      const formattedStartDate = formatDateDMY(startDate);
      const formattedDeadline = formatDateDMY(confirmationDeadlineDate);
      const formattedTime = formatTime12hr(reportingTime);

      // Compute gross salary
      const grossSalaryRaw = SALARY_COMPONENTS.reduce(
        (sum, k) => sum + (Number(salaryBreakup[k]) || 0),
        0
      );
      const grossSalary = formatNumberWithCommas(grossSalaryRaw);

      // 1. CREATE EMPLOYEE RECORD
      const employee = await Employee.create({
        name: candidateName,
        email: candidateEmail,
        designation: position,
        startDate,
        department: departmentId || null,
        owner: req.user._id,
        createdBy: req.user._id,
      });

      // 2. CREATE SALARY SLIP RECORD
      const slipData = {
        employee: employee._id,
        candidateName,
        candidateEmail,
        position,
        startDate,
        reportingTime,
        confirmationDeadlineDate,
        grossSalary: grossSalaryRaw,
        owner: req.user._id,
        createdBy: req.user._id,
      };
      SALARY_COMPONENTS.forEach(
        (k) => (slipData[k] = Number(salaryBreakup[k]) || 0)
      );
      await SalarySlip.create(slipData);

      // 3. Get company info by owner (force ObjectId type)
      let ownerId = req.user._id;
      if (!(ownerId instanceof mongoose.Types.ObjectId)) {
        ownerId = new mongoose.Types.ObjectId(ownerId);
      }
      const company = await CompanyProfile.findOne({ owner: ownerId });

      if (!company) {
        return res.status(404).json({ error: "Company profile not found." });
      }

      // 4. Always use only the address field
      let address = company.address;
      if (!address || typeof address !== "string" || !address.trim()) {
        address = "GULSHAN-E-MAYMAR, KARACHI";
        console.warn("Company address is missing for owner:", req.user._id);
      }

      // 5. Compose the offer letter body (NO subject in body)
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

Regards,
Human Resource Department
Nash Technologies Pvt. Ltd.

T         +92 (0)21 137 448 824   
E         hr@mavensadvisor.com
W         https://mavensadvisor.com/

Nash Technologies Pvt Ltd
Midway Commercial, Bahria Town Karachi
Karachi, Pakistan

      `.trim();

      // Return only the body (no subject), grossSalaryRaw as number
      return res.json({ letter, grossSalary: grossSalaryRaw });
    } catch (err) {
      console.error("Offer gen error:", err?.response?.data || err);
      return res
        .status(500)
        .json({ error: "Failed to generate offer letter." });
    }
  },

async sendOfferLetter(req, res) {
  try {
    const { candidateEmail, letter } = req.body;
    const candidateName = /Dear\s+(.+?),/i.exec(letter)?.[1] || "Candidate";
    if (!candidateEmail || !letter) {
      return res
        .status(400)
        .json({ error: "Missing candidateEmail or letter." });
    }

    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: candidateEmail,
      subject: "Welcome Aboard – Offer of Employment",
      text: letter,
      html: `
        <div style="font-family: Arial, sans-serif; font-size: 16px; color: #222; line-height: 1.7; white-space: pre-wrap; text-align: left;">
          <p style="margin: 0 0 18px 0; text-align: left;">Dear ${candidateName},</p>
          ${letter
            .replace(/^Dear .+?,\s*\n?/i, '') // Remove redundant greeting
            .replace(/\n/g, "<br>")
          }
        </div>
      `,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Email send error:", err);
    return res.status(500).json({ error: "Failed to send offer letter." });
  }
},
};
