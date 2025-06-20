require("dotenv").config();
const CompanyProfile = require("../models/CompanyProfile");
const SalarySlip     = require("../models/SalarySlip");
const Employee       = require("../models/Employees"); // <- correct to your path/model name
const { OpenAI }     = require("openai");
const nodemailer     = require("nodemailer");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST,
  port:   Number(process.env.MAIL_PORT),
  secure: process.env.MAIL_PORT === "465",
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
});

// List all salary fields
const SALARY_COMPONENTS = [
  "basic","dearnessAllowance","houseRentAllowance","conveyanceAllowance",
  "medicalAllowance","utilityAllowance","overtimeComp","dislocationAllowance",
  "leaveEncashment","bonus","arrears","autoAllowance","incentive",
  "fuelAllowance","othersAllowances",
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
        // if you POST departmentId from frontend
        departmentId,
      } = req.body;

      // Validate candidate info
      if (!candidateName || !candidateEmail || !position || !startDate || !reportingTime || !confirmationDeadlineDate) {
        return res.status(400).json({ error: "Missing required candidate or date fields." });
      }
      if (!req.user || !req.user._id) {
        return res.status(400).json({ error: "No user context found." });
      }

      // Compute gross salary from provided fields (default missing to 0)
      const grossSalary = SALARY_COMPONENTS.reduce((sum, k) => sum + (Number(salaryBreakup[k]) || 0), 0);

      // 1. CREATE EMPLOYEE RECORD
      // You can check if employee already exists, but here we always create
      const employee = await Employee.create({
        name: candidateName,
        email: candidateEmail,
        designation: position,
        startDate,
        department: departmentId || null, // departmentId if present, else null
        owner: req.user._id, // Set owner!
        createdBy: req.user._id, // if you want audit trail
      });

      // 2. CREATE SALARY SLIP RECORD (with link to employee)
      const slipData = {
        employee: employee._id, // ObjectId reference
        candidateName,
        candidateEmail,
        position,
        startDate,
        reportingTime,
        confirmationDeadlineDate,
        grossSalary,
        owner: req.user._id, // Set owner!
        createdBy: req.user._id,
      };
      // add all salary fields, defaulting to 0
      SALARY_COMPONENTS.forEach((k) => slipData[k] = Number(salaryBreakup[k]) || 0);

      await SalarySlip.create(slipData);

      // 3. Get company info for the letter
      const company = await CompanyProfile.findOne({ owner: req.user._id });
      if (!company) {
        return res.status(404).json({ error: "Company profile not found." });
      }

      // 4. Compose OpenAI prompt (ONLY SHOW GROSS)
      const prompt = `
Generate an offer letter for the following info. DO NOT show any salary breakup, just mention gross salary only.

Company: ${company.name}
Address: ${company.address}

Candidate: ${candidateName}
Position: ${position}
Gross Salary (monthly): PKR ${grossSalary}
Start Date: ${startDate}
Reporting Time: ${reportingTime}
Confirmation Deadline: ${confirmationDeadlineDate}

---
Subject: Welcome Aboard – Offer of Employment

Dear ${candidateName},

We’re thrilled to have you join us as ${position} at ${company.name} with a gross monthly salary of PKR ${grossSalary}. Please join us on ${startDate} at ${reportingTime}.

Warm regards,

Human Resource Department
      `.trim();

      const aiRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });
      const letter = aiRes.choices[0].message.content.trim();

      return res.json({ letter, grossSalary });
    } catch (err) {
      console.error("Offer gen error:", err);
      return res.status(500).json({ error: "Failed to generate offer letter." });
    }
  },

  async sendOfferLetter(req, res) {
    try {
      const { candidateEmail, letter } = req.body;
      if (!candidateEmail || !letter) {
        return res.status(400).json({ error: "Missing candidateEmail or letter." });
      }

      await transporter.sendMail({
        from:    `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
        to:      candidateEmail,
        subject: "Your Offer Letter",
        text:    letter,
        html:    `<pre style="white-space:pre-wrap;">${letter}</pre>`,
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("Email send error:", err);
      return res.status(500).json({ error: "Failed to send offer letter." });
    }
  },
};
