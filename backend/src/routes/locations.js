const router = require("express").Router();
const Location = require("../models/Location");

router.get("/", async (req, res, next) => {
  try {
    const locations = await Location.find().sort({ name: 1 });
    res.json(locations);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const loc = await Location.findById(req.params.id);
    if (!loc) return res.status(404).json({ error: "Location not found" });
    res.json(loc);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const loc = new Location(req.body);
    await loc.save();
    res.status(201).json(loc);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const loc = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!loc) return res.status(404).json({ error: "Location not found" });
    res.json(loc);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const loc = await Location.findByIdAndDelete(req.params.id);
    if (!loc) return res.status(404).json({ error: "Location not found" });
    res.json({ message: "Location deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
