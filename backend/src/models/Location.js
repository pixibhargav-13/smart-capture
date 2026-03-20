const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", locationSchema);
