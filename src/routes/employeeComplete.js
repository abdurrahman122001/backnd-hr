const express = require("express");
const Employee = require("../models/Employees");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /api/employees/:id/complete
router.get("/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const emp = await Employee.findById(id).select(
      "name email cnic dateOfBirth fatherOrHusbandName phone nationality"
    );
    if (!emp) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }
    return res.json({
      success: true,
      data: {
        _id: emp._id.toString(),
        name: emp.name,
        email: emp.email,
        cnic: emp.cnic,
        dateOfBirth: emp.dateOfBirth || "",
        fatherOrHusbandName: emp.fatherOrHusbandName || "",
        phone: emp.phone || "",
        nationality: emp.nationality || "",
      },
    });
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
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    // Only update fields if present (and not null/undefined)
    const updatableFields = [
      "photographUrl",
      "gender",
      "maritalStatus",
      "religion",
      "latestQualification",
      "presentAddress",
      "permanentAddress",
      "bankName",
      "bankAccountNumber",
      "nomineeName",
      "nomineeRelation",
      "nomineeCnic",
      "nomineeEmergencyNo",
      "department",
      "designation",
      "joiningDate",
      "name",
      "email",
      "cnic",
      "dateOfBirth",
      "fatherOrHusbandName",
      "nationality",
      "phone",
    ];

    updatableFields.forEach((field) => {
      if (
        Object.prototype.hasOwnProperty.call(req.body, field) &&
        req.body[field] !== undefined &&
        req.body[field] !== null
      ) {
        emp[field] = req.body[field];
      }
    });

    // Fix: Ensure owner is always set (hardcoded fallback)
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
