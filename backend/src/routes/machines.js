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
    if (req.body.operatorId && String(old.operatorId) !== String(req.body.operatorId)) {
      if (old.operatorId) {
        await Employee.findByIdAndUpdate(old.operatorId, { $pull: { assignedMachines: old._id } });
      }
      await Employee.findByIdAndUpdate(req.body.operatorId, { $addToSet: { assignedMachines: old._id } });
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
