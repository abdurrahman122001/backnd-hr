const mongoose = require('mongoose');

const paymentScheduleSchema = new mongoose.Schema({
  installmentNo: Number,
  month: String,
  year: Number,
  dueDate: Date,
  installmentAmount: Number,
  markupPercentage: Number,
  markupAmount: Number,
});

const loanDetailSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  type: { type: String, default: "Personal Loan" },
  loanAmount: Number,
  loanTerm: Number,
  markupType: { type: String, enum: ['fixed', 'fluctuating'], default: 'fixed' },
  markupValue: Number, // For 'fixed' only
  fluctuationRange: {
    min: Number, // for 'fluctuating'
    max: Number,
  },
  scheduleStartMonth: Number,
  monthlyInstallment: Number,
  totalMarkup: Number,
  totalToBePaid: Number,
  outstandingPrincipal: Number,
  outstandingMarkup: Number,
  paymentSchedule: [paymentScheduleSchema],
}, { timestamps: true });

module.exports = mongoose.model('LoanDetail', loanDetailSchema);
