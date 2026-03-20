const mongoose = require("mongoose");

const machineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", default: null },
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    status: { type: String, enum: ["active", "idle", "maintenance"], default: "idle" },
    lastUpdate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Machine", machineSchema);
