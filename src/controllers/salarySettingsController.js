// // backend/src/controllers/salarySettingsController.js
// const SalarySettings = require("../models/SalarySettings");

// /**
//  * GET /salary-settings
//  * Always returns an object with exactly two arrays,
//  * even if the user has only ever selected one field.
//  */
// exports.getForLoggedInUser = async (req, res) => {
//   try {
//     const owner = req.user._id;

//     // Fetch only the two arrays, as a plain JS object
//     const doc = await SalarySettings.findOne({ owner })
//       .lean()
//       .select("enabledSalaryFields enabledDeductionFields");

//     if (doc) {
//       return res.json({
//         enabledSalaryFields: doc.enabledSalaryFields,
//         enabledDeductionFields: doc.enabledDeductionFields,
//       });
//     }

//     // No settings yet → return empty arrays
//     return res.json({
//       enabledSalaryFields: [],
//       enabledDeductionFields: [],
//     });
//   } catch (error) {
//     console.error("SalarySettings GET error:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// };

// /**
//  * POST /salary-settings
//  * Upserts the two arrays for the user.
//  * Returns exactly those same arrays in the response.
//  */
// exports.updateForLoggedInUser = async (req, res) => {
//   try {
//     const owner = req.user._id;
//     const { enabledSalaryFields, enabledDeductionFields } = req.body;

//     // Validate payload
//     if (
//       !Array.isArray(enabledSalaryFields) ||
//       !Array.isArray(enabledDeductionFields)
//     ) {
//       return res.status(400).json({ error: "Invalid payload" });
//     }

//     // Upsert in one atomic operation:
//     // - $setOnInsert sets owner/createdAt only on first insert
//     // - $set updates the arrays and updatedAt every time
//     const doc = await SalarySettings.findOneAndUpdate(
//       { owner },
//       {
//         $setOnInsert: { owner, createdAt: new Date() },
//         $set: {
//           enabledSalaryFields,
//           enabledDeductionFields,
//           updatedAt: new Date(),
//         },
//       },
//       {
//         upsert: true,
//         new: true,
//         lean: true,
//         select: "enabledSalaryFields enabledDeductionFields",
//       }
//     );

//     return res.json({
//       enabledSalaryFields: doc.enabledSalaryFields,
//       enabledDeductionFields: doc.enabledDeductionFields,
//     });
//   } catch (error) {
//     console.error("SalarySettings POST error:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// };
const SalarySettings = require("../models/SalarySettings");

// GET /salary-settings
exports.getForLoggedInUser = async (req, res) => {
  try {
    const owner = req.user._id;
    const doc = await SalarySettings.findOne({ owner })
      .lean()
      .select("enabledPersonalFields enabledEmploymentFields enabledSalaryFields enabledDeductionFields");
    return res.json({
      enabledPersonalFields: doc?.enabledPersonalFields || [],
      enabledEmploymentFields: doc?.enabledEmploymentFields || [],
      enabledSalaryFields: doc?.enabledSalaryFields || [],
      enabledDeductionFields: doc?.enabledDeductionFields || [],
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /salary-settings
exports.updateForLoggedInUser = async (req, res) => {
  try {
    const owner = req.user._id;
    const {
      enabledPersonalFields,
      enabledEmploymentFields,
      enabledSalaryFields,
      enabledDeductionFields
    } = req.body;
    if (
      !Array.isArray(enabledPersonalFields) ||
      !Array.isArray(enabledEmploymentFields) ||
      !Array.isArray(enabledSalaryFields) ||
      !Array.isArray(enabledDeductionFields)
    ) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const doc = await SalarySettings.findOneAndUpdate(
      { owner },
      {
        $setOnInsert: { owner, createdAt: new Date() },
        $set: {
          enabledPersonalFields,
          enabledEmploymentFields,
          enabledSalaryFields,
          enabledDeductionFields,
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        lean: true,
        select: "enabledPersonalFields enabledEmploymentFields enabledSalaryFields enabledDeductionFields",
      }
    );
    return res.json({
      enabledPersonalFields: doc.enabledPersonalFields,
      enabledEmploymentFields: doc.enabledEmploymentFields,
      enabledSalaryFields: doc.enabledSalaryFields,
      enabledDeductionFields: doc.enabledDeductionFields,
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};
