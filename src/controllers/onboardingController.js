// backend/controllers/onboardingController.js

const Employee = require("../models/Employees");
const SalarySlip = require("../models/SalarySlip");
const { sendEmail } = require("../services/mailService");

// You can fetch company info from env/config for reuse
const COMPANY_NAME = process.env.COMPANY_NAME || "Mavens Advisors";
const COMPANY_EMAIL = process.env.COMPANY_EMAIL || "info@mavensadvisors.com";
const COMPANY_CONTACT = process.env.COMPANY_CONTACT || "+1-234-567-8900";

const SALARY_COMPONENTS = [
  "basic",
  "dearnessAllowance",
  "houseRentAllowance",
  "conveyanceAllowance",
  "medicalAllowance",
  "utilityAllowance",
  "overtimeCompensation",
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
  async requestCnicAndCv(req, res) {
    try {
      const {
        candidateName,
        candidateEmail,
        position,
        department,
        startDate,
        reportingTime,
        salaryBreakup = {},
        shifts = [],
      } = req.body;

      if (
        !candidateName ||
        !candidateEmail ||
        !position ||
        !department ||
        !startDate ||
        !reportingTime
      ) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      // Build SalarySlip data object with root fields
      let slipData = {
        employee: null, // to be set below
        candidateName,
        candidateEmail,
        position,
        department,
        startDate,
        reportingTime,
        shifts,
        grossSalary: 0,
      };

      // Fill all components (with default 0 if not present)
      SALARY_COMPONENTS.forEach((field) => {
        if (field === "overtimeCompensation") {
          slipData[field] = Number(
            salaryBreakup.overtimeCompensation ||
            salaryBreakup.overtimeComp ||
            0
          );
        } else {
          slipData[field] = Number(salaryBreakup[field] || 0);
        }
      });

      // Calculate gross salary
      slipData.grossSalary = SALARY_COMPONENTS.reduce(
        (sum, field) => sum + (Number(slipData[field]) || 0),
        0
      );

      // Save/update employee
      const employee = await Employee.findOneAndUpdate(
        { email: candidateEmail },
        {
          name: candidateName,
          email: candidateEmail,
          designation: position,
          department,
          joiningDate: startDate,
          reportingTime,
          salaryBreakup: slipData, // for record keeping
          shifts,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      slipData.employee = employee._id;

      // Save salary slip as flat fields
      await SalarySlip.create(slipData);

      // Branded, friendly onboarding email (Arial font, CNIC & CV only)
      const subject = "🚀 Hello from Your New HR AI Agent – Let’s Get You Officially Onboarded!";

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto;">
          <p>Dear <strong>${candidateName}</strong>,</p>
          <p>Welcome to the beginning of something amazing! 🌟</p>
          <p>
            I’m your new HR AI Agent — here to make your onboarding experience smooth, seamless, and just a little more exciting!
            While I might be powered by algorithms and data, my goal is simple: to help you feel connected, supported, and ready to thrive at <strong>${COMPANY_NAME}</strong>.
          </p>
          <p>
            As the first step to complete your profile, please reply with the following documents:
          </p>
          <ul>
            <li>✅ <strong>Copy of your CNIC</strong> (front & back, JPG or PNG format)</li>
            <li>✅ <strong>Your latest CV/Resume</strong> (PDF)</li>
          </ul>
          <p>
            <em>🎯 Your data is safe with me — always encrypted, confidential, and used only to make your experience better.</em>
          </p>
          <p>
            The sooner I get your info, the sooner I can start helping you settle in, track your progress, and celebrate your milestones!
          </p>
          <p>
            If you have any questions or feel stuck, I’m just a message away.
          </p>
          <p>
            Can’t wait to be part of your journey at <strong>${COMPANY_NAME}</strong>!
          </p>
          <p>
            With excitement,<br/>
            <strong>Your HR AI Agent 🤖</strong><br/>
            Powered by People. Driven by Purpose.<br/>
            <span style="color: #888;">${COMPANY_EMAIL} | ${COMPANY_CONTACT}</span>
          </p>
        </div>
      `;

      await sendEmail({
        to: candidateEmail,
        subject,
        html,
      });

      return res.json({ success: true, message: "Request sent for CNIC and CV." });
    } catch (err) {
      console.error("Error requesting CNIC & CV:", err);
      return res.status(500).json({ error: "Failed to send CNIC/CV request." });
    }
  }
};
