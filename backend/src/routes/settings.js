const router = require("express").Router();
const Settings = require("../models/Settings");

async function getSettings() {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  return settings;
}

router.get("/", async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) { next(err); }
});

router.put("/", async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    res.json(settings);
  } catch (err) { next(err); }
});

module.exports = router;
