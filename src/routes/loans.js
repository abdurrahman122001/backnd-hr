const express = require('express');
const router = express.Router();
const Employee = require('../models/Employees');
const LoanDetail = require('../models/LoanDetail');

// Get all employees
router.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json({ employees });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// Get loan details for employee
router.get('/loan/:employeeId', async (req, res) => {
  try {
    const loan = await LoanDetail.findOne({ employee: req.params.employeeId });
    res.json(loan);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch loan" });
  }
});

// Save or update loan details (new schema)
router.post('/loan/:employeeId', async (req, res) => {
  try {
    const {
      type,
      loanAmount,
      loanTerm,
      markupType,
      markupValue,
      scheduleStartMonth,
      monthlyInstallment,
      totalMarkup,
      totalToBePaid,
      outstandingPrincipal,
      outstandingMarkup,
      paymentSchedule
    } = req.body;

    let loan = await LoanDetail.findOne({ employee: req.params.employeeId });

    if (loan) {
      // Update all fields
      loan.type = type;
      loan.loanAmount = loanAmount;
      loan.loanTerm = loanTerm;
      loan.markupType = markupType;
      loan.markupValue = markupValue;
      loan.scheduleStartMonth = scheduleStartMonth;
      loan.monthlyInstallment = monthlyInstallment;
      loan.totalMarkup = totalMarkup;
      loan.totalToBePaid = totalToBePaid;
      loan.outstandingPrincipal = outstandingPrincipal;
      loan.outstandingMarkup = outstandingMarkup;
      loan.paymentSchedule = paymentSchedule;
      await loan.save();
    } else {
      loan = await LoanDetail.create({
        employee: req.params.employeeId,
        type,
        loanAmount,
        loanTerm,
        markupType,
        markupValue,
        scheduleStartMonth,
        monthlyInstallment,
        totalMarkup,
        totalToBePaid,
        outstandingPrincipal,
        outstandingMarkup,
        paymentSchedule
      });
    }
    res.json(loan);
  } catch (err) {
    res.status(500).json({ error: "Failed to save loan", details: err.message });
  }
});

module.exports = router;
