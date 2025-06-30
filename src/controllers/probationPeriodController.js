const ProbationPeriod = require("../models/ProbationPeriod");

// CREATE
exports.createProbationPeriod = async (req, res) => {
  try {
    const { days } = req.body;
    const probation = new ProbationPeriod({
      days,
      owner: req.user._id, // assumes requireAuth populates req.user
    });
    await probation.save();
    res.status(201).json({ status: "success", data: probation });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

// READ ALL (for current owner/user)
exports.getProbationPeriods = async (req, res) => {
  try {
    const list = await ProbationPeriod.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ status: "success", data: list });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// READ ONE
exports.getProbationPeriod = async (req, res) => {
  try {
    const probation = await ProbationPeriod.findOne({ _id: req.params.id, owner: req.user._id });
    if (!probation)
      return res.status(404).json({ status: "error", message: "Not found" });
    res.json({ status: "success", data: probation });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// UPDATE
exports.updateProbationPeriod = async (req, res) => {
  try {
    const { days } = req.body;
    const probation = await ProbationPeriod.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { days },
      { new: true }
    );
    if (!probation)
      return res.status(404).json({ status: "error", message: "Not found" });
    res.json({ status: "success", data: probation });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

// DELETE
exports.deleteProbationPeriod = async (req, res) => {
  try {
    const probation = await ProbationPeriod.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!probation)
      return res.status(404).json({ status: "error", message: "Not found" });
    res.json({ status: "success", message: "Probation period deleted." });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
