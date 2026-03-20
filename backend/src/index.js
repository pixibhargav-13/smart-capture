const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/smart-capture";

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "20mb" }));
app.use(morgan("dev"));

// Routes
app.use("/api/employees", require("./routes/employees"));
app.use("/api/machines", require("./routes/machines"));
app.use("/api/locations", require("./routes/locations"));
app.use("/api/production", require("./routes/production"));
app.use("/api/settings", require("./routes/settings"));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// Connect to MongoDB and start server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
