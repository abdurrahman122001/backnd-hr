const express = require("express");
const Employee = require("../models/Employees");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// List ALL personal fields as in your Employee schema
const personalFields = [
  // Required
  "name",
  "email",

  // Personal & ID
  "fatherOrHusbandName",
  "dateOfBirth",
  "gender",
  "nationality",
  "maritalStatus",
  "religion",
  "cnic",
  "cnicIssueDate",
  "cnicExpiryDate",
  "photographUrl",
  "cvUrl",
  "latestQualification",
  "phone",
  "companyEmail",
  "permanentAddress",
  "presentAddress",

  // Bank & Nominee
  "bankName",
  "bankAccountNumber",
  "nomineeName",
  "nomineeCnic",
  "nomineeRelation",
  "nomineeNo",

  // Emergency
  "emergencyContactName",
  "emergencyContactRelation",
  "emergencyContactNumber",
  "emergencyNo",

  // Employment info (if you want)
  "department",
  "designation",
  "joiningDate",
  "rt",
];

// GET /api/employees/:id/complete
router.get("/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const selectFields = personalFields.join(" ");
    const emp = await Employee.findById(id).select(selectFields);
    if (!emp) {
      return res
        .status(404)
        .json({ success: false, error: "Employee not found" });
    }
    // Build result with all personal fields (send "" if not set)
    const data = { _id: emp._id.toString() };
    personalFields.forEach((field) => {
      data[field] = emp[field] !== undefined && emp[field] !== null ? emp[field] : "";
    });
    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ GET /api/employees/:id/complete error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT /api/employees/:id/complete
router.put("/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const emp = await Employee.findById(id);
    if (!emp) {
      return res
        .status(404)
        .json({ success: false, error: "Employee not found" });
    }
    // Only update fields present (and not null/undefined)
    personalFields.forEach((field) => {
      if (
        Object.prototype.hasOwnProperty.call(req.body, field) &&
        req.body[field] !== undefined &&
        req.body[field] !== null
      ) {
        emp[field] = req.body[field];
      }
    });
    // Ensure owner is always set (hardcoded fallback)
    if (!emp.owner) {
      emp.owner = "6838b0b708e8629ffab534ee";
    }
    await emp.save();
    return res.json({ success: true, data: { _id: emp._id.toString() } });
  } catch (err) {
    console.error("❌ PUT /api/employees/:id/complete error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
