const router = require("express").Router();
const ProductionEntry = require("../models/ProductionEntry");

// GET all entries (with filters + pagination)
router.get("/", async (req, res, next) => {
  try {
    const { machineId, operatorName, limit = 100, page = 1, from, to } = req.query;
    const filter = {};
    if (machineId) filter.machineId = machineId;
    if (operatorName) filter.operatorName = operatorName;
    if (from || to) {
      filter.capturedAt = {};
      if (from) filter.capturedAt.$gte = new Date(from);
      if (to) filter.capturedAt.$lte = new Date(to);
    }
    const entries = await ProductionEntry.find(filter)
      .sort({ capturedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await ProductionEntry.countDocuments(filter);
    res.json({ entries, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
});

// GET stats summary
router.get("/stats", async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalEntries, todayEntries, totalPartsResult] = await Promise.all([
      ProductionEntry.countDocuments(),
      ProductionEntry.countDocuments({ capturedAt: { $gte: today } }),
      ProductionEntry.aggregate([{ $group: { _id: null, total: { $sum: "$partsCount" } } }]),
    ]);

    res.json({
      totalEntries,
      todayEntries,
      totalParts: totalPartsResult[0]?.total || 0,
    });
  } catch (err) { next(err); }
});

// GET per-machine counts for a given interval (minutes)
router.get("/interval-counts", async (req, res, next) => {
  try {
    const intervalMinutes = parseInt(req.query.intervalMinutes) || 60;
    const since = new Date(Date.now() - intervalMinutes * 60 * 1000);
    const counts = await ProductionEntry.aggregate([
      { $match: { capturedAt: { $gte: since } } },
      {
        $group: {
          _id: { machineId: "$machineId", operatorName: "$operatorName" },
          captures: { $sum: 1 },
          totalParts: { $sum: "$partsCount" },
        },
      },
    ]);
    res.json(counts);
  } catch (err) { next(err); }
});

// GET single entry
router.get("/:id", async (req, res, next) => {
  try {
    const entry = await ProductionEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json(entry);
  } catch (err) { next(err); }
});

// POST create entry
router.post("/", async (req, res, next) => {
  try {
    const body = { ...req.body };
    // Ensure capturedAt is a Date
    if (body.capturedAt) body.capturedAt = new Date(body.capturedAt);
    const entry = new ProductionEntry(body);
    await entry.save();
    res.status(201).json(entry);
  } catch (err) { next(err); }
});

// DELETE entry
router.delete("/:id", async (req, res, next) => {
  try {
    const entry = await ProductionEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.json({ message: "Entry deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
