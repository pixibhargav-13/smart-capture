const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    captureIntervalMinutes: { type: Number, default: 60, min: 1 },
    companyName: { type: String, default: "4BitX Smart Capture" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
