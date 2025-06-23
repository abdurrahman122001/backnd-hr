// src/controllers/settingsController.js

const Settings = require('../models/Settings');

exports.getSettings = async (req, res) => {
  const s = await Settings.findOne({ owner: req.user._id }).lean();
  res.json({
    timezone: s?.timezone || 'UTC',
    useSystemTimezone: s?.useSystemTimezone ?? true,
    allowEmployeesMultipleShifts: s?.allowEmployeesMultipleShifts ?? false,
  });
};

// UPDATE settings, including new field
exports.updateSettings = async (req, res) => {
  const { timezone, useSystemTimezone, allowEmployeesMultipleShifts } = req.body;
  const s = await Settings.findOneAndUpdate(
    { owner: req.user._id },
    { timezone, useSystemTimezone, allowEmployeesMultipleShifts },
    { upsert: true, new: true }
  ).lean();
  res.json({
    timezone: s.timezone,
    useSystemTimezone: s.useSystemTimezone,
    allowEmployeesMultipleShifts: s.allowEmployeesMultipleShifts,
  });
};
