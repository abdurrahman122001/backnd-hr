const express = require('express');
const router = express.Router();
const { Types } = require('mongoose');

const Employee = require('../models/Employees');
const LoanDetail = require('../models/LoanDetail'); // THE CORRECT MODEL NAME

// 1. Get all employees (useful utility route)
router.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json({ employees });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// 2. Get ALL loan details for ONE employee (array)
router.get('/', async (req, res) => {
  try {
    const { employee } = req.query;

    if (!employee)
      return res.status(400).json({ message: "Employee ID is required" });

    if (!Types.ObjectId.isValid(employee))
      return res.status(400).json({ message: "Invalid employee ID" });

    // Fetch all loans for the employee
    const loans = await LoanDetail.find({ employee }).lean();

    // Current date details
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Format loans for frontend
    const formattedLoans = loans.map((loan) => {
      let paidPrev = 0, paidCurr = 0;
      const schedule = Array.isArray(loan.paymentSchedule) ? loan.paymentSchedule : [];
      for (let payment of schedule) {
        // Accept "dueDate" or "date", "installmentAmount" or "amount"
        const date = payment.dueDate || payment.date;
        if (!date) continue;
        const payDate = new Date(date);
        const payMonth = payDate.getMonth() + 1;
        const payYear = payDate.getFullYear();
        const amount = payment.installmentAmount || payment.amount || 0;

        if (payYear < currentYear || (payYear === currentYear && payMonth < currentMonth)) {
          paidPrev += amount;
        } else if (payYear === currentYear && payMonth === currentMonth) {
          paidCurr += amount;
        }
      }
      return {
        _id: loan._id,
        type: loan.type,
        loanAmount: loan.loanAmount,
        monthlyInstallment: loan.monthlyInstallment,
        totalMarkup: loan.totalMarkup,
        totalToBePaid: loan.totalToBePaid,
        outstandingPrincipal: loan.outstandingPrincipal,
        outstandingMarkup: loan.outstandingMarkup,
        paidPrev,
        paidCurr,
        netBalance: (loan.outstandingPrincipal || 0) + (loan.outstandingMarkup || 0),
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
      };
    });

    res.json({ loans: formattedLoans });
  } catch (err) {
    console.error("Error in /api/loan:", err);
    res.status(500).json({ message: err.message });
  }
});


// 3. Get a single loan detail doc for an employee (if needed)
router.get('/loan/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!Types.ObjectId.isValid(employeeId))
      return res.status(400).json({ message: "Invalid employee ID" });

    const loan = await LoanDetail.findOne({ employee: employeeId });
    res.json(loan);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch loan", details: err.message });
  }
});

// 4. Save or update loan detail for one employee
router.post('/loan/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!Types.ObjectId.isValid(employeeId))
      return res.status(400).json({ message: "Invalid employee ID" });

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

    let loan = await LoanDetail.findOne({ employee: employeeId });

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
        employee: employeeId,
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
