const mongoose = require("mongoose");

const ProbationPeriodSchema = new mongoose.Schema({
  days: { type: Number, required: true, min: 30 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("ProbationPeriod", ProbationPeriodSchema);
