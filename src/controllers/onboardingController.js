// backend/controllers/onboardingController.js

const Employee = require("../models/Employees");
const SalarySlip = require("../models/SalarySlip");
const { sendEmail } = require("../services/mailService");

// Make sure these are the salary fields you want to save. Adjust as needed!
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
  async requestCnicAndCv(req, res) {
    try {
      const {
        candidateName,
        candidateEmail,
        position,
        department, // department name as string
        startDate,
        reportingTime,
        confirmationDeadlineDate,
        salaryBreakup = {},
        shifts = []
      } = req.body;

      // Validate required fields
      if (
        !candidateName ||
        !candidateEmail ||
        !position ||
        !department ||
        !startDate ||
        !reportingTime ||
        !confirmationDeadlineDate
      ) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      // Compute gross salary
      const grossSalary = SALARY_COMPONENTS.reduce(
        (sum, key) => sum + (Number(salaryBreakup[key]) || 0),
        0
      );

      // Create or update Employee
      const employee = await Employee.findOneAndUpdate(
        { email: candidateEmail },
        {
          name: candidateName,
          email: candidateEmail,
          designation: position,
          department: department, // department name (not id)
          joiningDate: startDate,
          reportingTime,
          confirmationDeadlineDate,
          salaryBreakup,
          shifts,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Create SalarySlip record
      const slipData = {
        employee: employee._id,
        candidateName,
        candidateEmail,
        position,
        department,
        startDate,
        reportingTime,
        confirmationDeadlineDate,
        grossSalary,
        shifts,
        salaryBreakup: {},
      };
      SALARY_COMPONENTS.forEach(
        (k) => (slipData.salaryBreakup[k] = Number(salaryBreakup[k]) || 0)
      );

      await SalarySlip.create(slipData);

      // Send request email
      const html = `
        <div>
          <p>Dear ${candidateName},</p>
          <p>kindly Send these required Documents:</p>
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
