// backend/controllers/onboardingController.js

const Employee = require("../models/Employees");
const SalarySlip = require("../models/SalarySlip");
const { sendEmail } = require("../services/mailService");

const SALARY_COMPONENTS = [
  "basic",
  "dearnessAllowance",
  "houseRentAllowance",
  "conveyanceAllowance",
  "medicalAllowance",
  "utilityAllowance",
  "overtimeCompensation", // Backend model field!
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
          salaryBreakup: slipData, // For record keeping, not required by your SalarySlip schema
          shifts,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      slipData.employee = employee._id;

      // Save salary slip as flat fields
      await SalarySlip.create(slipData);

      // Email logic
      const html = `
        <div>
          <p>Dear ${candidateName},</p>
          <p>Kindly send these required documents:</p>
          <ul>
            <li>Your CNIC (front and back, only JPG or PNG format)</li>
            <li>Your latest CV/Resume (PDF)</li>
          </ul>
          <p>Once we receive these documents, we’ll proceed with the next steps.</p>
          <p>Best regards,<br/>HR Team</p>
        </div>
      `;
      await sendEmail({
        to: candidateEmail,
        subject: "Next Step: Please Send Your CNIC & CV",
        html,
      });

      return res.json({ success: true, message: "Request sent for CNIC and CV." });
    } catch (err) {
      console.error("Error requesting CNIC & CV:", err);
      return res.status(500).json({ error: "Failed to send CNIC/CV request." });
    }
  }
};
