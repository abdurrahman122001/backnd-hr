const fs = require('fs');
const path = require('path');
const mjml = require('mjml');
const Handlebars = require('handlebars');
const nodemailer = require('nodemailer');

// Helper: format number with commas
const formatNum = (num) => num !== undefined && num !== null && num !== "" ? Number(num).toLocaleString() : "-";

// Helper: to words (replace with your lib if needed)
const toWords = (num) => typeof num === "number" ? String(num) : num || "Zero";

// Helper: build array of {label, value} for Handlebars #each
function makeRows(fields, data) {
  return fields.map(([label, key]) => ({
    label,
    value: formatNum(key.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : '', data))
  }));
}
module.exports = async function sendSlipEmail(req, res) {
  try {
    // --- Get data from request
    const { slip, employee, company, email } = req.body;

    const profileFields = [
  ["Name", "name"],
  ["Department", "department"],
  ["Designation", "designation"],
  ["Joining Date", "joiningDate"],
  ["Email", "email"],
  ["Phone", "phone"],
  ["Marital Status", "maritalStatus"],
  ["Latest Qualification", "latestQualification"],
  ["CNIC", "cnic"],
  ["Bank Name", "bankName"],
  ["Bank Account Number", "bankAccountNumber"],
  ["Present Address", "presentAddress"],
  ["Permanent Address", "permanentAddress"],
  ["Gender", "gender"],
  ["Religion", "religion"],
  ["Date of Birth", "dateOfBirth"],
  ["Photograph URL", "photographUrl"],
  ["Nominee Name", "nomineeName"],
  ["Nominee Relation", "nomineeRelation"],
  ["Nominee CNIC", "nomineeCnic"],
  ["Nominee Emergency No", "nomineeEmergencyNo"],
  ["Zakat Exempted", "zakatExempted"],
];
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
  // ["Gross Salary", "grossSalary"],
];
const dedFields = [
  ["Leave Deductions", "leaveDeductions"],
  ["Late Deductions", "lateDeductions"],
  ["Eobi Deduction", "eobiDeduction"],
  ["Sessi Deduction", "sessiDeduction"],
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


    const salaryRows = makeRows(compFields, slip);
    const deductionRows = makeRows(dedFields, slip);
    const loanRows = makeRows(loanFields, slip);
    const providentRows = makeRows(pfFields, slip);
    const leaveRows = makeRows(leavesFields, slip);
    const salaryTotal = salaryRows.reduce((sum, row) => sum + (parseFloat(row.value.replace(/,/g, "")) || 0), 0);
    const deductionTotal = deductionRows.reduce((sum, row) => sum + (parseFloat(row.value.replace(/,/g, "")) || 0), 0);
    const netSalary = salaryTotal - deductionTotal;
    const netSalaryWords = toWords(netSalary);

    // --- Read the MJML template
    const mjmlPath = path.join(__dirname, './salary-slip.mjml');
    const mjmlSource = fs.readFileSync(mjmlPath, 'utf8');
    const template = Handlebars.compile(mjmlSource);

       // --- Prepare variables for the template
    const now = new Date();
    const slipCreatedAt = slip.createdAt ? new Date(slip.createdAt).toLocaleString() : "-";
    const slipMonthYear = slip.createdAt ? new Date(slip.createdAt).toLocaleString("default", { month: "long", year: "numeric" }) : "-";
    const currentDate = now.toLocaleString();

    // --- Render MJML template
    const mjmlFilled = template({
      employee,
      company,
      slipMonthYear,
      slipCreatedAt,
      currentDate,
      salaryRows,
      deductionRows,
      loanRows,
      providentRows,
      leaveRows,
      salaryTotal: formatNum(salaryTotal),
      deductionTotal: formatNum(deductionTotal),
      netSalary: formatNum(netSalary),
      netSalaryWords,
    });

    // --- Convert MJML to HTML
    const { html, errors } = mjml(mjmlFilled, { validationLevel: 'soft' });
    if (errors && errors.length) {
      console.error('MJML errors:', errors);
      throw new Error('MJML rendering error');
    }

    // --- Setup nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: process.env.MAIL_ENCRYPTION === "ssl",
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    // --- Send the email
    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || "HR System"}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: email,
      subject: `Salary Slip - ${employee?.name || ""} - ${company?.name || "Your Company"}`,
      html,
    });

    res.json({ success: true, message: "Email sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: err.message
    });
  }
};