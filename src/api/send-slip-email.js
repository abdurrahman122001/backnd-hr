// backend/src/api/sendSlipEmail.js
const nodemailer = require("nodemailer");

// ---- Helper: format numbers with commas
const formatNum = (num) =>
  num !== undefined && num !== null && num !== ""
    ? Number(num).toLocaleString()
    : "-";

// ---- Helper: convert number to words (add your own lib if needed)
const toWords = (num) => {
  // Use your library here. This is placeholder:
  return num !== undefined && num !== null
    ? String(num)
    : "Zero";
};

// ---- Field Definitions (same as your frontend)
const compFields = [
  ["Basic Salary", "basic"],
  ["Dearness Allowance", "dearnessAllowance"],
  ["House Rent Allowance", "houseRentAllowance"],
  ["Conveyance Allowance", "conveyanceAllowance"],
  ["Medical Allowance", "medicalAllowance"],
  ["Utility Allowance", "utilityAllowance"],
  ["Overtime Compensation", "overtimeComp"],
  ["Dislocation Allowance", "dislocationAllowance"],
  ["Leave Encashment", "leaveEncashment"],
  ["Bonus", "bonus"],
  ["Arrears", "arrears"],
  ["Auto Allowance", "autoAllowance"],
  ["Incentive", "incentive"],
  ["Fuel Allowance", "fuelAllowance"],
  ["Other Allowances", "othersAllowances"],
  ["Gross Salary", "grossSalary"],
];
const dedFields = [
  ["Leave Deductions", "leaveDeductions"],
  ["Late Deductions", "lateDeductions"],
  ["EOBI Deduction", "eobiDeduction"],
  ["SESSI Deduction", "sessiDeduction"],
  ["Provident Fund Deduction", "providentFundDeduction"],
  ["Gratuity Fund Deduction", "gratuityFundDeduction"],
  ["Vehicle Loan Deduction", "loanDeductions.vehicleLoan"],
  ["Other Loan Deductions", "loanDeductions.otherLoans"],
  ["Advance Salary Deductions", "advanceSalaryDeductions"],
  ["Medical Insurance", "medicalInsurance"],
  ["Life Insurance", "lifeInsurance"],
  ["Penalties", "penalties"],
  ["Other Deductions", "othersDeductions"],
  ["Tax Deduction", "taxDeduction"],
];
const loanFields = [
  ["PF Loan Amount", "pfLoanAmount"],
  ["PF Loan Paid", "pfLoanPaid"],
  ["PF Loan Balance Principal", "pfLoanBalancePrincipal"],
  ["PF Loan Balance Markup", "pfLoanBalanceMarkup"],
  ["Vehicle Loan Amount", "vehicleLoanAmount"],
  ["Vehicle Loan Paid", "vehicleLoanPaid"],
  ["Vehicle Loan Balance Principal", "vehicleLoanBalancePrincipal"],
  ["Vehicle Loan Balance Markup", "vehicleLoanBalanceMarkup"],
  ["Other Loan Amount", "otherLoanAmount"],
  ["Other Loan Paid", "otherLoanPaid"],
  ["Other Loan Balance Principal", "otherLoanBalancePrincipal"],
  ["Other Loan Balance Markup", "otherLoanBalanceMarkup"],
];
const pfFields = [
  ["Provident Fund Balance BF", "providentFundBalanceBF"],
  ["Provident Fund Contribution", "providentFundContribution"],
  ["Provident Fund Withdrawal", "providentFundWithdrawal"],
  ["Provident Fund Profit", "providentFundProfit"],
  ["Provident Fund Balance", "providentFundBalance"],
];
const leavesFields = [
  ["Casual Entitled", "leavesCasualEntitled"],
  ["Casual Availed YTD", "leavesCasualAvailedYTD"],
  ["Casual Availed MTH", "leavesCasualAvailedMTH"],
  ["Casual Balance", "leavesCasualBalance"],
  ["Sick Entitled", "leavesSickEntitled"],
  ["Sick Availed YTD", "leavesSickAvailedYTD"],
  ["Sick Availed MTH", "leavesSickAvailedMTH"],
  ["Sick Balance", "leavesSickBalance"],
  ["Annual Entitled", "leavesAnnualEntitled"],
  ["Annual Availed YTD", "leavesAnnualAvailedYTD"],
  ["Annual Availed MTH", "leavesAnnualAvailedMTH"],
  ["Annual Balance", "leavesAnnualBalance"],
  ["WOP Entitled", "leavesWOPEntitled"],
  ["WOP Availed YTD", "leavesWOPAvailedYTD"],
  ["WOP Availed MTH", "leavesWOPAvailedMTH"],
  ["WOP Balance", "leavesWOPBalance"],
  ["Other Entitled", "leavesOtherEntitled"],
  ["Other Availed YTD", "leavesOtherAvailedYTD"],
  ["Other Availed MTH", "leavesOtherAvailedMTH"],
  ["Other Balance", "leavesOtherBalance"],
];

// ---- Helper to handle dot notation fields
function getValue(obj, key) {
  if (!key.includes(".")) return obj?.[key];
  const keys = key.split(".");
  return keys.reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

// ---- Table row builder
function buildRows(fields, data, valueColor = "#0e7490") {
  return fields
    .map(
      ([label, key]) => {
        const val = getValue(data, key);
        return `<tr>
          <td style="padding:4px 0;color:#475569;">${label}</td>
          <td style="padding:4px 0;text-align:right;color:${valueColor};font-weight:500;">${formatNum(val)}</td>
        </tr>`;
      }
    )
    .join("");
}

// ---- Main HTML builder
function buildSalarySlipHtml({ slip, employee, company }) {
  const totalAllowances = compFields.reduce((sum, [, key]) => sum + (Number(getValue(slip, key)) || 0), 0);
  const totalDeductions = dedFields.reduce((sum, [, key]) => sum + (Number(getValue(slip, key)) || 0), 0);
  const netPay = totalAllowances - totalDeductions;

  const salaryRows = buildRows(compFields, slip, "#172554");
  const deductionRows = buildRows(dedFields, slip, "#b91c1c");
  const loanRows = buildRows(loanFields, slip, "#172554");
  const providentRows = buildRows(pfFields, slip, "#172554");
  const leaveRows = buildRows(leavesFields, slip, "#172554");

  return `
<div style="font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;padding:32px;">
  <div style="max-width:800px;margin:auto;background:#fff;border-radius:16px;box-shadow:0 4px 32px #e0e7ef;padding:38px 32px;">
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:20px;border-bottom:2px solid #e2e8f0;padding-bottom:18px;margin-bottom:28px;">
      <img src="https://i.imgur.com/rx7YbcM.png" width="52" height="52" style="border-radius:10px;object-fit:contain;border:1.5px solid #e2e8f0;" alt="Logo" />
      <div>
        <div style="font-size:1.18rem;font-weight:700;color:#172554;">${company?.name || ""}</div>
        <div style="font-size:1rem;color:#64748b;">${company?.address || ""}</div>
      </div>
      <div style="margin-left:auto;text-align:right;">
        <div style="font-size:1.03rem;font-weight:600;color:#172554;">
          Pay slip – ${slip.createdAt ? new Date(slip.createdAt).toLocaleString("default", { month: "long", year: "numeric" }) : "-"}
        </div>
        <div style="font-size:0.91rem;color:#64748b;margin-top:2px;">
          Generated: ${slip.createdAt ? new Date(slip.createdAt).toLocaleString() : "-"}<br/>
          Printed: ${new Date().toLocaleString()}
        </div>
      </div>
    </div>
    <!-- Employee Info -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem 1.7rem;margin-bottom:28px;">
      <div><span style="color:#64748b;">Name:</span> <b style="color:#172554;">${employee?.name || "-"}</b></div>
      <div><span style="color:#64748b;">Department:</span> ${employee?.department || "-"}</div>
      <div><span style="color:#64748b;">Designation:</span> ${employee?.designation || "-"}</div>
      <div><span style="color:#64748b;">Joining Date:</span> ${employee?.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : "-"}</div>
      <div><span style="color:#64748b;">Email:</span> <a href="mailto:${employee?.email}" style="color:#2563eb;text-decoration:none;">${employee?.email || "-"}</a></div>
      <div><span style="color:#64748b;">Phone:</span> ${employee?.phone || "-"}</div>
      <div><span style="color:#64748b;">Marital Status:</span> ${employee?.maritalStatus || "-"}</div>
      <div><span style="color:#64748b;">Qualification:</span> ${employee?.latestQualification || "-"}</div>
      <div><span style="color:#64748b;">CNIC:</span> ${employee?.cnic || "-"}</div>
      <div><span style="color:#64748b;">Bank Name:</span> ${employee?.bankName || "-"}</div>
      <div><span style="color:#64748b;">Bank Account #:</span> ${employee?.bankAccountNumber || "-"}</div>
      <div><span style="color:#64748b;">Present Address:</span> ${employee?.presentAddress || "-"}</div>
      <div><span style="color:#64748b;">Permanent Address:</span> ${employee?.permanentAddress || "-"}</div>
      <div><span style="color:#64748b;">Gender:</span> ${employee?.gender || "-"}</div>
      <div><span style="color:#64748b;">Religion:</span> ${employee?.religion || "-"}</div>
      <div><span style="color:#64748b;">Date of Birth:</span> ${employee?.dateOfBirth || "-"}</div>
      <div><span style="color:#64748b;">Nominee Name:</span> ${employee?.nomineeName || "-"}</div>
      <div><span style="color:#64748b;">Nominee Relation:</span> ${employee?.nomineeRelation || "-"}</div>
      <div><span style="color:#64748b;">Nominee CNIC:</span> ${employee?.nomineeCnic || "-"}</div>
      <div><span style="color:#64748b;">Nominee Emergency #:</span> ${employee?.nomineeEmergencyNo || "-"}</div>
      <div><span style="color:#64748b;">Zakat Exempted:</span> ${employee?.zakatExempted || "-"}</div>
    </div>
    <!-- Allowances & Deductions (two columns) -->
    <div style="display:flex;gap:2%;margin-bottom:28px;">
      <div style="flex:1;border:1.5px solid #e0e7ef;border-radius:8px;background:#fff;padding:18px; width: 100%; ">
        <div style="color:#172554;font-weight:700;font-size:1rem;margin-bottom:7px;">Salary & Allowances</div>
        <table width="100%" style="font-size:0.98rem;">
          <tbody>
            ${salaryRows}
            <tr>
              <td style="padding-top:8px;font-weight:700;color:#2563eb;">Total</td>
              <td style="padding-top:8px;text-align:right;font-weight:700;color:#2563eb;">${formatNum(totalAllowances)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="flex:1;border:1.5px solid #e0e7ef;border-radius:8px;background:#fff;padding:18px; width: 100%; ">
        <div style="color:#172554;font-weight:700;font-size:1rem;margin-bottom:7px;">Deductions</div>
        <table width="100%" style="font-size:0.98rem;">
          <tbody>
            ${deductionRows}
            <tr>
              <td style="padding-top:8px;font-weight:700;color:#b91c1c;">Total</td>
              <td style="padding-top:8px;text-align:right;font-weight:700;color:#b91c1c;">${formatNum(totalDeductions)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <!-- Loan/Provident/Leaves (3 cols) -->
    <div style="display:flex;gap:2.2%;margin-bottom:24px;">
      <div style="flex:1;border:1.5px solid #e0e7ef;border-radius:8px;background:#f8fafc;padding:16px 14px 10px 14px; width: 100%; ">
        <div style="color:#172554;font-weight:700;font-size:0.98rem;margin-bottom:5px;">Loan Details</div>
        <table width="100%" style="font-size:0.97rem;">
          <tbody>
            ${loanRows}
          </tbody>
        </table>
      </div>
      <div style="flex:1;border:1.5px solid #e0e7ef;border-radius:8px;background:#f8fafc;padding:16px 14px 10px 14px; width: 100%; ">
        <div style="color:#172554;font-weight:700;font-size:0.98rem;margin-bottom:5px;">Provident Fund</div>
        <table width="100%" style="font-size:0.97rem;">
          <tbody>
            ${providentRows}
          </tbody>
        </table>
      </div>
      <div style="flex:1;border:1.5px solid #e0e7ef;border-radius:8px;background:#f8fafc;padding:16px 14px 10px 14px; width: 100%; ">
        <div style="color:#172554;font-weight:700;font-size:0.98rem;margin-bottom:5px;">Leave Records</div>
        <table width="100%" style="font-size:0.97rem;">
          <tbody>
            ${leaveRows}
          </tbody>
        </table>
      </div>
    </div>
    <!-- Net Salary -->
    <div style="margin: 28px 0 8px 0; background: #f1f5f9; padding: 18px 26px; border-radius: 10px;">
      <div style="font-weight:700;font-size:1.07rem;color:#172554;">Net Salary</div>
      <div style="font-size:1.18rem;color:#2563eb;font-weight:700;margin-top:3px;">Rs. ${formatNum(netPay)}</div>
      <div style="font-size:0.99rem;color:#334155;margin-top:3px;"><b>Amount in words:</b> Rupees ${toWords(netPay)} Only</div>
      <div style="font-size:0.97rem;color:#64748b;margin-top:3px;"><b>Mode of Payment:</b> Online Transfer</div>
    </div>
    <div style="font-size:0.83rem;color:#64748b;margin-top:15px;text-align:center;">
      This is a system-generated slip. For any queries, contact HR.
    </div>
  </div>
</div>
  `;
}

// ---- EXPORT ROUTE HANDLER
module.exports = async function sendSlipEmail(req, res) {
  try {
    const { slip, employee, company, email } = req.body;

    const html = buildSalarySlipHtml({ slip, employee, company });

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: process.env.MAIL_ENCRYPTION === "ssl",
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || "HR System"}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: email,
      subject: `Salary Slip - ${employee?.name || ""} - ${company?.name || "Your Company"}`,
      html,
    });

    res.json({ success: true, message: "Email sent!" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to send email", error: err.message });
  }
};
