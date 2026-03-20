const mongoose = require("mongoose");

const axisPositionSchema = new mongoose.Schema(
  { axis: String, value: String },
  { _id: false }
);

const productionEntrySchema = new mongoose.Schema(
  {
    machineId: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },
    machineName: { type: String, required: true },
    operatorName: { type: String, required: true },
    // The actual timestamp when the photo was taken (passed by client)
    capturedAt: { type: Date, default: Date.now },
    // AI-extracted CNC data
    partsCount: { type: Number, default: null },
    programNumber: { type: String, default: null },
    cycleTime: { type: String, default: null },
    axisPositions: { type: [axisPositionSchema], default: [] },
    spindleSpeed: { type: String, default: null },
    feedRate: { type: String, default: null },
    machineMode: { type: String, default: null },
    warnings: { type: String, default: null },
    displayReadable: { type: Boolean, default: false },
    // Raw JSON string of full OCR result (for audit)
    ocrData: { type: String, default: null },
    // Base64 image (optional — large, use cloud storage for prod)
    captureImage: { type: String, default: null },
  },
  { timestamps: true } // createdAt = server-side record creation time
);

// Index for fast per-employee-per-interval queries
productionEntrySchema.index({ machineId: 1, capturedAt: -1 });
productionEntrySchema.index({ operatorName: 1, capturedAt: -1 });

module.exports = mongoose.model("ProductionEntry", productionEntrySchema);
