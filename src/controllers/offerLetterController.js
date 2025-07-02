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

      // Compute gross salary
      const grossSalary = SALARY_COMPONENTS.reduce(
        (sum, k) => sum + (Number(salaryBreakup[k]) || 0),
        0
      );

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
        grossSalary,
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

      // 5. Compose the offer letter with real address
      const letter = `
Subject: Welcome Aboard – Offer of Employment

Dear ${candidateName},

We’re thrilled to have you on board!

After getting to know you during your recent interview, we were truly inspired by your passion, potential, and the energy you bring. It gives us great pleasure to officially offer you the position of ${position} at ${company.name}.

We believe you will be a valuable addition to our growing team, and we’re excited about what we can build together. This isn’t just a job – it’s a journey, and we’re looking forward to seeing you thrive with us.

Your monthly gross salary will be PKR ${grossSalary}, paid through online bank transfer at the end of each month.

If you accept this offer, your anticipated start date will be ${startDate}, and we look forward to welcoming you in person at our ${address} by ${reportingTime || "9:00 AM"}.

In this role, you’ll be working 45 hours per week, from Monday to Friday – a full week of opportunities to grow, collaborate, and contribute.

To move forward, please confirm your acceptance of this offer by ${confirmationDeadlineDate}. On your first day, we kindly ask that you bring:
- All original educational and professional certificates
- Original CNIC with a photocopy
- Two recent passport-sized photographs

By accepting this offer, you also agree to the terms set forth in our Employment Contract and Non-Disclosure Agreement (NDA), which we will share with you separately.

We’re truly excited to have you join us. Your future teammates are just as eager to welcome you, support you, and learn from you as you are to begin this new chapter. Let’s make great things happen together!

Warm regards,

Human Resource Department

Signature
      `.trim();

      return res.json({ letter, grossSalary });
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
      if (!candidateEmail || !letter) {
        return res
          .status(400)
          .json({ error: "Missing candidateEmail or letter." });
      }

      await transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
        to: candidateEmail,
        subject: "Your Offer Letter",
        text: letter,
        html: `<pre style="white-space:pre-wrap;">${letter}</pre>`,
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("Email send error:", err);
      return res.status(500).json({ error: "Failed to send offer letter." });
    }
  },
};
