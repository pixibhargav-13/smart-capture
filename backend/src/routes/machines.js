const router = require("express").Router();
const Machine = require("../models/Machine");
const Employee = require("../models/Employee");

router.get("/", async (req, res, next) => {
  try {
    const machines = await Machine.find()
      .populate("operatorId", "name email")
      .populate("locationId", "name")
      .sort({ createdAt: -1 });
    res.json(machines);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const machine = await Machine.findById(req.params.id)
      .populate("operatorId", "name email")
      .populate("locationId", "name");
    if (!machine) return res.status(404).json({ error: "Machine not found" });
    res.json(machine);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const machine = new Machine(req.body);
    await machine.save();
    if (machine.operatorId) {
      await Employee.findByIdAndUpdate(machine.operatorId, {
        $addToSet: { assignedMachines: machine._id },
      });
    }
    res.status(201).json(machine);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const old = await Machine.findById(req.params.id);
    if (!old) return res.status(404).json({ error: "Machine not found" });

    // Normalize empty strings to null for ObjectId fields
    if (req.body.operatorId === "" || req.body.operatorId === undefined) req.body.operatorId = null;
    if (req.body.locationId === "" || req.body.locationId === undefined) req.body.locationId = null;

    const oldOpId = old.operatorId ? String(old.operatorId) : null;
    const newOpId = req.body.operatorId ? String(req.body.operatorId) : null;

    if (oldOpId !== newOpId) {
      if (oldOpId) {
        await Employee.findByIdAndUpdate(oldOpId, { $pull: { assignedMachines: old._id } });
      }
      if (newOpId) {
        await Employee.findByIdAndUpdate(newOpId, { $addToSet: { assignedMachines: old._id } });
      }
    }

    const machine = await Machine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(machine);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const machine = await Machine.findByIdAndDelete(req.params.id);
    if (!machine) return res.status(404).json({ error: "Machine not found" });
    await Employee.updateMany({ assignedMachines: machine._id }, { $pull: { assignedMachines: machine._id } });
    res.json({ message: "Machine deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
