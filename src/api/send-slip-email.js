// sendSlipEmail.js
const nodemailer = require("nodemailer");
const numberToWords = require("number-to-words");

// Helper to format numbers as currency
const formatCurrency = (val) =>
  val !== undefined && val !== null && !isNaN(val)
    ? `Rs. ${Number(val).toLocaleString()}`
    : "-";

    // Field Label Maps
const ALLOWANCES_LABELS = {
  basic: "Basic Pay",
  dearnessAllowance: "Dearness Allowance",
  conveyanceAllowance: "Conveyance Allowance",
  houseRentAllowance: "House Rent Allowance",
  medicalAllowance: "Medical Allowance",
  utilityAllowance: "Utility Allowance",
  overtimeComp: "Overtime Compensation",
  dislocationAllowance: "Dislocation Allowance",
  leaveEncashment: "Leave Encashment",
  bonus: "Bonus",
  arrears: "Arrears",
  autoAllowance: "Auto Allowance",
  incentive: "Incentive",
  fuelAllowance: "Fuel Allowance",
  othersAllowances: "Other Allowances",
};

const DEDUCTIONS_LABELS = {
  leaveDeductions: "Leave Deduction",
  lateDeductions: "Late Deduction",
  eobiDeduction: "EOBI Deduction",
  sessiDeduction: "SESSI Deduction",
  providentFundDeduction: "Provident Fund Deduction",
  gratuityFundDeduction: "Gratuity Fund Deduction",
  vehicleLoanDeduction: "Vehicle Loan Deduction",
  otherLoanDeductions: "Other Loan Deduction",
  advanceSalaryDeduction: "Advance Salary Deduction",
  medicalInsurance: "Medical Insurance",
  lifeInsurance: "Life Insurance",
  penalties: "Penalties",
  othersDeductions: "Other Deduction",
  taxDeduction: "Tax Deduction",
};

const PROFILE_LABELS = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  presentAddress: "Present Address",
  permanentAddress: "Permanent Address",
  cnic: "CNIC",
  gender: "Gender",
  department: "Department",
  designation: "Designation",
  bankAccountNumber: "Bank Account Number",
  bankName: "Bank Name",
  latestQualification: "Latest Qualification",
  joiningDate: "Joining Date",
  maritalStatus: "Marital Status",
  dateOfBirth: "Date of Birth",
  religion: "Religion",
  nomineeName: "Nominee Name",
  nomineeRelation: "Nominee Relation",
  nomineeCnic: "Nominee CNIC",
  nomineeEmergencyNo: "Nominee Emergency No",
};


function buildSalarySlipHtml({
  employee,
  compensation,
  deductions,
  labels,
  netSalary,
  monthYear,
}) {
  // Amount in words
  const amountInWords = netSalary > 0
    ? `${numberToWords.toWords(netSalary).replace(/,/g, "")} Rupees Only`
        .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())
    : "-";

function renderEmployeeTable(empObj, labelObj) {
  const fields = Object.keys(empObj);
  const colCount = 3;
  const rows = Math.ceil(fields.length / colCount);
  let html = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed; box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1); background-color: #fff; padding: 2rem; border: 1px solid #dbeafe; border-radius: 1rem;">`;
  for (let i = 0; i < rows; i++) {
    html += "<tr>";
    for (let j = 0; j < colCount; j++) {
      const idx = i + rows * j;
      const key = fields[idx];
      if (key) {
        html += `
        <td style="vertical-align:top; min-width:200px; word-break:break-word; overflow-wrap:break-word; border-bottom:1px solid #e5e7eb; padding-top: 15px; padding-bottom:15px; padding-right:12px;">
          <label style="font-size:0.95rem; font-weight:500; color:#6b7280;">${labelObj[key] || PROFILE_LABELS[key] || key}</label>
          <p style="color:#111827; margin:2px 0 0 0;">
            ${empObj[key] !== null && empObj[key] !== undefined && empObj[key] !== "" ? empObj[key] : "-"}
          </p>
        </td>
      `;
      } else {
        html += "<td></td>";
      }
    }
    html += "</tr>";
  }
  html += "</table>";
  return html;
}

function renderSalaryTable(compObj, labelObj = {}) {
  let total = 0;
  const rows = Object.keys(compObj).map((key) => {
    const value = Number(compObj[key]) || 0;
    total += value;
    return `
      <div style="display: flex; justify-content: space-between; padding: 4px 0;">
        <span style="color: #334155;">${labelObj[key] || ALLOWANCES_LABELS[key] || key}</span>
        <span style="font-weight: 500; margin-left: auto;">${value !== 0 ? value.toLocaleString() : "-"}</span>
      </div>
    `;
  });
  return {
    html: rows.join(""),
    total,
  };
}

function renderDeductionsTable(dedObj, labelObj = {}) {
  let total = 0;
  const rows = Object.keys(dedObj).map((key) => {
    const value = Number(dedObj[key]) || 0;
    total += value;
    return `
      <div style="display: flex; justify-content: space-between; padding: 4px 0;">
        <span style="color: #334155;">${labelObj[key] || DEDUCTIONS_LABELS[key] || key}</span>
        <span style="font-weight: 500; margin-left: auto;">${value !== 0 ? value.toLocaleString() : "-"}</span>
      </div>
    `;
  });
  return {
    html: rows.join(""),
    total,
  };
}


  // Prepare HTML parts
  const { html: earningsHtml, total: totalEarnings } = renderSalaryTable(
    compensation || {},
    labels?.compensation || {}
  );
  const { html: deductionsHtml, total: totalDeductions } = renderDeductionsTable(
    deductions || {},
    labels?.deductions || {}
  );
  const employeeTable = renderEmployeeTable(
    employee || {},
    labels?.employee || {}
  );

  // The rest is **your existing HTML**...
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Pay Slip - MAVENS ADVISOR Pvt Ltd.</title>
    <meta name="viewport" content="width=900", initial-scale=1.0">
  </head>
  <body style="min-height:100vh; background-color:#eff6ff; margin:0; padding:16px; font-family:'Segoe UI',Arial,sans-serif; box-sizing: border-box;">
    <div style="max-width:900px; min-width: 900px; margin:0 auto;background:#fff;border-radius:16px;overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);  width:100%;">
      <!-- Header -->
      <div style="background:#dbeafe; padding:24px 32px; border-bottom:1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed; word-break:break-word; ">
          <tr>
            <td style="word-break:break-word; overflow-wrap:break-word; vertical-align:top;">
              <h1 style="font-size:25px; font-weight:700; color:#1d4ed8; margin:0; letter-spacing:0.5px; line-height:1.1;">
                MAVENS ADVISOR PVT LTD.
              </h1>
              <p style="color:#334155; font-weight:600; margin:8px 0 0 0;">GULSHAN-E-MAYMAR, KARACHI</p>
            </td>
            <td align="right" style="vertical-align:top;">
              <div style="display:inline-block; text-align:right;">
                <h2 style="font-size:1.25rem; font-weight:bold; color:#0f172a; margin:0 0 4px 0;">Pay Slip</h2>
                <p style="color:#334155; margin:0 0 2px 0; font-size:1rem;">${monthYear}</p>
                <p style="font-size:0.85rem; color:#64748b; margin:4px 0 0 0;">Generated:<br/>${new Date().toLocaleString()}</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
      <!-- Employee Information -->
      <div style="padding:32px;">
        <h3 style="font-size:22px; font-weight:700; color:#1d4ed8; margin-bottom:16px; border-bottom:1px solid #bfdbfe; padding-bottom:8px;">Employee Information</h3>
        ${employeeTable}
      </div>
      <!-- Salary Details -->
      <div style="padding:0 32px 32px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed; word-break:break-word;">
          <tr>
            <!-- Earnings -->
            <td valign="top" width="50%" style="padding-right:16px; min-width:220px; word-break:break-word; overflow-wrap:break-word;">
              <h3 style="font-size:22px; font-weight:700; color:#1d4ed8; margin-bottom:16px; border-bottom:1px solid #bfdbfe; padding-bottom:8px;">
                Salary &amp; Allowances
              </h3>
              <div style="background:#eff6ff; border-radius:12px; padding:16px;">
                <div>${earningsHtml}</div>
                <div style="border-top:1px solid #bfdbfe; padding-top:8px; margin-top:12px;">
                  <div style="display:flex; justify-content:space-between; font-weight:700; color:#1d4ed8;">
                    <span>Total Salary Allowances</span>
                    <span style="margin-left: auto;">${formatCurrency(totalEarnings)}</span>
                  </div>
                </div>
              </div>
            </td>
            <!-- Deductions -->
            <td valign="top" width="50%" style="padding-left:16px; min-width:220px; word-break:break-word; overflow-wrap:break-word;">
              <h3 style="font-size:22px; font-weight:700; color:#1d4ed8; margin-bottom:16px; border-bottom:1px solid #bfdbfe; padding-bottom:8px;">
                Deductions
              </h3>
              <div style="background:#eff6ff; border-radius:12px; padding:16px;">
                <div>${deductionsHtml}</div>
                <div style="border-top:1px solid #bfdbfe; padding-top:8px; margin-top:12px;">
                  <div style="display:flex; justify-content:space-between; font-weight:700; color:#991b1b;">
                    <span>Total Deductions</span>
                    <span style="margin-left: auto;">${formatCurrency(totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </div>
      <!-- Net Salary -->
      <div style="background:#f1f5f9; padding:24px 32px;">
        <table style="width:100%; color:#0f172a; font-size:1.05rem; border-collapse:collapse;">
          <tbody>
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:8px 8px; font-weight:600; word-break:break-word; overflow-wrap:break-word;">
                <h3 style="font-size:1.125rem; font-weight:bold; color:#1d4ed8; margin:0;">Net Salary</h3>
              </td>
              <td style="padding:8px 8px; text-align:right; font-weight:600; word-break:break-word; overflow-wrap:break-word;">
                <p style="font-size:1.125rem; color:#334155; margin:0;">${formatCurrency(netSalary)}</p>
              </td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:8px 8px; font-weight:600; word-break:break-word; overflow-wrap:break-word;">
                <h3 style="font-size:1.125rem; font-weight:bold; color:#1d4ed8; margin:0;">Amount in Words</h3>
              </td>
              <td style="padding:8px 8px; text-align:right; font-weight:600;">
                <p style="font-size:1.125rem; color:#334155; margin:0;">${amountInWords}</p>
              </td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:8px 8px; font-weight:600; word-break:break-word; overflow-wrap:break-word;">
                <h3 style="font-size:1.125rem; font-weight:bold; color:#1d4ed8; margin:0;">Mode Of Payment</h3>
              </td>
              <td style="padding:8px 8px; text-align:right; font-weight:600; word-break:break-word; overflow-wrap:break-word;">
                <p style="font-size:1.125rem; color:#334155; margin:0;">Bank Transfer</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="padding:24px 24px 24px 24px; margin-bottom:12px; border-bottom-left-radius:16px; border-bottom-right-radius:16px; border-top:1px solid #f1f5f9; background:#f8fafc;">
        <!-- Empty bottom block (matches original) -->
      </div>
      <!-- Footer -->
      <div style="text-align:center; color:#6b7280; font-size:0.95rem; padding:16px 0; border-top:1px solid #e5e7eb;">
        <p style="margin:0;">This is a computer generated pay slip and does not require signature.</p>
      </div>
    </div>
  </body>
  </html>`;
}

module.exports = async function sendSlipEmail(req, res) {
  try {
    const {
      employee,
      compensation,
      deductions,
      labels,
      monthYear,
      email,
    } = req.body;

    // Backend net salary calculation
    const totalEarnings = Object.values(compensation || {}).reduce(
      (sum, v) => sum + (typeof v === "number" ? v : Number(v) || 0),
      0
    );
    const totalDeductions = Object.values(deductions || {}).reduce(
      (sum, v) => sum + (typeof v === "number" ? v : Number(v) || 0),
      0
    );
    const netSalary = totalEarnings - totalDeductions;

    const html = buildSalarySlipHtml({
      employee,
      compensation,
      deductions,
      labels,
      netSalary,
      monthYear,
    });

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
      subject: `Salary Slip${employee?.name ? " - " + employee.name : ""}`,
      html,
    });

    res.json({ success: true, message: "Email sent!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to send email", error: err.message });
  }
};

