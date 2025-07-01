const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const EmployeeSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // PERSONAL DETAILS
    name: { type: String, required: true }, // Full Name
    fatherOrHusbandName: { type: String },
    dateOfBirth: { type: String }, // Could be Date, but matching your frontend
    gender: { type: String },
    nationality: { type: String },
    maritalStatus: { type: String, enum: ["Single", "Married"] },
    religion: { type: String },
    cnic: { type: String, trim: true, default: "" }, // CNIC Number
    cnicIssueDate: { type: String },
    cnicExpiryDate: { type: String },
    photographUrl: { type: String },      // Upload Photograph
    cvUrl: { type: String },              // Upload CV
    latestQualification: { type: String },
    fieldOfQualification: { type: String },
    phone: { type: String },              // Mobile Number
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      validate: {
        validator: (v) => typeof v === "string" && v.trim() !== "",
        message: "Email cannot be empty",
      },
    },                                   // Personal Email Address
    companyEmail: { type: String, default: "" }, // Office Email Address
    permanentAddress: { type: String },
    presentAddress: { type: String },

    // BANK DETAILS
    bankName: { type: String },
    bankAccountNumber: { type: String },

    // NOMINEE DETAILS
    nomineeName: { type: String },
    nomineeCnic: { type: String },
    nomineeRelation: { type: String },      // Relationship with Nominee
    nomineeNo: { type: String },            // Nominee Number

    // EMERGENCY CONTACT DETAILS
    emergencyContactName: { type: String },
    emergencyContactRelation: { type: String },
    emergencyContactNumber: { type: String },

    // (OPTIONAL) If you want to keep emergencyNo separately
    emergencyNo: { type: String }, // If used

    rt: { type: String, default: "15:15" }, // Reporting Time

    // EMPLOYMENT DETAILS
    department: { type: String },
    designation: { type: String },
    joiningDate: { type: String },
    shifts: [{ type: Schema.Types.ObjectId, ref: "Shift" }],

    // LEAVE ENTITLEMENT
    leaveEntitlement: {
      total: { type: Number, default: 22 },
      usedPaid: { type: Number, default: 0 },
      usedUnpaid: { type: Number, default: 0 },
    },

    // COMPENSATION DETAILS
    compensation: {
      basic: { type: Number, default: 0 },
      dearnessAllowance: { type: Number, default: 0 },
      houseRentAllowance: { type: Number, default: 0 },
      conveyanceAllowance: { type: Number, default: 0 },
      medicalAllowance: { type: Number, default: 0 },
      utilityAllowance: { type: Number, default: 0 },
      overtimeComp: { type: Number, default: 0 },
      dislocationAllowance: { type: Number, default: 0 },
      leaveEncashment: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      arrears: { type: Number, default: 0 },
      autoAllowance: { type: Number, default: 0 },
      incentive: { type: Number, default: 0 },
      fuelAllowance: { type: Number, default: 0 },
      others: { type: Number, default: 0 },
      grossSalary: { type: Number, default: 0 },
    },

    // DEDUCTIONS
    deductions: {
      leaveDeductions: { type: Number, default: 0 },
      lateDeductions: { type: Number, default: 0 },
      eobi: { type: Number, default: 0 },
      sessi: { type: Number, default: 0 },
      providentFund: { type: Number, default: 0 },
      gratuityFund: { type: Number, default: 0 },
      loanDeductions: {
        vehicleLoan: { type: Number, default: 0 },
        otherLoans: { type: Number, default: 0 },
      },
      advanceSalary: { type: Number, default: 0 },
      medicalInsurance: { type: Number, default: 0 },
      lifeInsurance: { type: Number, default: 0 },
      penalties: { type: Number, default: 0 },
      others: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
    },

    // User link (for future use)
    userAccount: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // NDA/Contract
    ndaGenerated: { type: Boolean, default: false },
    ndaPath: { type: String },
    contractPath: { type: String },
  },
  {
    timestamps: true,
  }
);

// Index for unique emails
EmployeeSchema.index(
  { email: 1 },
  {
    unique: true,
    sparse: true,
  }
);

module.exports = model("Employee", EmployeeSchema);
