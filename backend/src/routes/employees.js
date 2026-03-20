const router = require("express").Router();
const Employee = require("../models/Employee");

router.get("/", async (req, res, next) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json(emp);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const emp = new Employee(req.body);
    await emp.save();
    res.status(201).json(emp);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json(emp);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const emp = await Employee.findByIdAndDelete(req.params.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json({ message: "Employee deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
