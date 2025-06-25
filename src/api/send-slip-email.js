// sendSlipEmail.js
const nodemailer = require("nodemailer");
const numberToWords = require('number-to-words');


// Helper for formatting numbers
const formatCurrency = (val) =>
  val && !isNaN(val) ? `Rs. ${Number(val).toLocaleString()}` : "-";

// Helper for date formatting
const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString() : "-";

// --- Build Dynamic HTML ---
function buildSalarySlipHtml({ employee, compensation, deductions, netSalary, monthYear }) {
  const amountInWords = netSalary > 0
  ? `${numberToWords.toWords(netSalary).replace(/,/g, "")} Rupees Only`.replace(/(^\w|\s\w)/g, m => m.toUpperCase())
  : "-";

    
  // Map the compensation/deductions to HTML
  const earningsHtml = Object.entries(compensation || {}).map(([key, val]) => `
    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
      <span style="color: #334155;">${key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</span>
      <span style="font-weight: 500; margin-left: auto;">${formatCurrency(val)}</span>
    </div>
  `).join("");

  const deductionsHtml = Object.entries(deductions || {}).map(([key, val]) => `
    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
      <span style="color: #334155;">${key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</span>
      <span style="font-weight: 500; margin-left: auto;">${formatCurrency(val)}</span>
    </div>
  `).join("");

  // --- The main HTML, just plug the values below ---
  return `
<!DOCTYPE html>
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
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed; word-break:break-word;">
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
          <p style="color:#334155; margin:0 0 2px 0; font-size:1rem;">June 2025</p>
          <p style="font-size:0.85rem; color:#64748b; margin:4px 0 0 0;">Generated:<br/>${new Date().toLocaleString()}</p>
        </div>
      </td>
    </tr>
  </table>
</div>

    <!-- Employee Information -->
    <div style="padding:32px;">
      <h3 style="font-size:22px; font-weight:700; color:#1d4ed8; margin-bottom:16px; border-bottom:1px solid #bfdbfe; padding-bottom:8px;">Employee Information</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed; word-break:break-word;">
        <tr>
          <td  style="width:33%; vertical-align:top; min-width:200px; word-break:break-word; overflow-wrap:break-word;">
            <div style="border-bottom:1px solid #e5e7eb; margin-bottom:12px; padding-bottom:4px;">
              <label style="font-size:0.95rem; font-weight:500; color:#6b7280;">Name</label>
              <p style="color:#111827; font-weight:500; margin:2px 0 0 0;">${employee?.name || "-"}</p>
            </div>
            <div style="border-bottom:1px solid #e5e7eb; margin-bottom:12px; padding-bottom:4px;">
              <label style="font-size:0.95rem; font-weight:500; color:#6b7280;">Designation</label>
              <p style="color:#111827; margin:2px 0 0 0;">${employee?.designation || "-"}</p>
            </div>
            <div style="border-bottom:1px solid #e5e7eb;">
              <label style="font-size:0.95rem; font-weight:500; color:#6b7280;">Department</label>
              <p style="color:#111827; margin:2px 0 0 0;">${employee?.department || "-"}</p>
            </div>
          </td>
          <td  style="width:33%; vertical-align:top; min-width:200px; word-break:break-word; overflow-wrap:break-word;">
            <div style="border-bottom:1px solid #e5e7eb; margin-bottom:12px; padding-bottom:4px;">
              <label style="font-size:0.95rem; font-weight:500; color:#6b7280;">Email</label>
              <p style="color:#111827; font-size:1rem; margin:2px 0 0 0;">${employee?.email || "-"}</p>
            </div>
            <div style="border-bottom:1px solid #e5e7eb; margin-bottom:12px; padding-bottom:4px;">
              <label style="font-size:0.95rem; font-weight:500; color:#6b7280;">Phone</label>
              <p style="color:#111827; margin:2px 0 0 0;">${employee?.phone || "-"}</p>
            </div>
            <div style="border-bottom:1px solid #e5e7eb;">
              <label style="font-size:0.95rem; font-weight:500; color:#6b7280;">Joining Date</label>
              <p style="color:#111827; margin:2px 0 0 0;">${formatDate(employee?.joiningDate)}</p>
            </div>
          </td>
          <td  style="width:33%; vertical-align:top; min-width:200px; word-break:break-word; overflow-wrap:break-word;">
            <div style="border-bottom:1px solid #e5e7eb; margin-bottom:12px; padding-bottom:4px;">
              <label style="font-size:0.95rem; font-weight:500; color:#6b7280;">CNIC</label>
              <p style="color:#111827; margin:2px 0 0 0;">${employee?.cnic || "-"}</p>
            </div>
            <div style="border-bottom:1px solid #e5e7eb; margin-bottom:12px; padding-bottom:4px;">
              <label style="font-size:0.95rem; font-weight:500; color:#6b7280;">Bank Account</label>
              <p style="color:#111827; margin:2px 0 0 0;">${employee?.bankAccountNumber || "-"}</p>
            </div>
            <div style="border-bottom:1px solid #e5e7eb;">
              <label style="font-size:0.95rem; font-weight:500; color:#6b7280;">Bank Name</label>
              <p style="color:#111827; margin:2px 0 0 0;">${employee?.bankName || "-"}</p>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Salary Details (Earnings + Deductions in columns) -->
    <div style="padding:0 32px 32px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed; word-break:break-word;">
        <tr>
          <!-- Earnings -->
          <td  valign="top" width="50%" style="padding-right:16px; min-width:220px; word-break:break-word; overflow-wrap:break-word;">
            <h3 style="font-size:22px; font-weight:700; color:#1d4ed8; margin-bottom:16px; border-bottom:1px solid #bfdbfe; padding-bottom:8px;">
              Salary &amp; Allowance
            </h3>
            <div style="background:#eff6ff; border-radius:12px; padding:16px;">
              <div>${earningsHtml}</div>
              <div style="border-top:1px solid #bfdbfe; padding-top:8px; margin-top:12px;">
                <div style="display:flex; justify-content:space-between; font-weight:700; color:#1d4ed8;">
                  <span>Total Salary Allowance</span>
                  <span style="margin-left: auto;">${formatCurrency(
    Object.values(compensation || {}).reduce((a, b) => Number(a) + Number(b), 0)
  )}</span>
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
                  <span style="margin-left: auto;">${formatCurrency(
    Object.values(deductions || {}).reduce((a, b) => Number(a) + Number(b), 0)
  )}</span>
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
              <p style="font-size:1.125rem; color:#334155; margin:0;">${amountInWords || "-"}</p>
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
</html>
`;
  ;
}

// --- Main Handler ---
module.exports = async function sendSlipEmail(req, res) {
  try {
    const { employee, compensation, deductions, email } = req.body;
    // Calculate totals & words
    const netSalary =
      Object.values(compensation || {}).reduce((a, b) => Number(a) + Number(b), 0) -
      Object.values(deductions || {}).reduce((a, b) => Number(a) + Number(b), 0);

    // Use a library for this in production
    const amountInWords = `${netSalary} Rupees Only`;
    // Month name, etc
    const monthYear = new Date().toLocaleString("default", { month: "long", year: "numeric" });

    const html = buildSalarySlipHtml({
      employee,
      compensation,
      deductions,
      netSalary,
      amountInWords,
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
      subject: `Salary Slip - ${employee?.name || ""}`,
      html,
    });

    res.json({ success: true, message: "Email sent!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to send email", error: err.message });
  }
};
