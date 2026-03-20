const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: "" },
    assignedMachines: [{ type: mongoose.Schema.Types.ObjectId, ref: "Machine" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);
