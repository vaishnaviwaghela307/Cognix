const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const database = require("./config/database");
const webhookController = require("./controllers/webhookController");
const userRoutes = require("./routes/userRoutes");
const testRoutes = require("./routes/testRoutes");
const historyRoutes = require("./routes/historyRoutes");
const clinicalRoutes = require("./routes/clinicalRoutes");
const caregiverRoutes = require("./routes/caregiverRoutes");
const { initializeCronJobs } = require("./services/cronService");
const emailService = require("./services/emailService");

const app = express();

// ==================== CLERK WEBHOOK (MUST BE FIRST) ====================
// This route needs RAW body for signature verification
app.post(
  "/api/webhooks/clerk",
  bodyParser.raw({ type: "application/json" }),
  webhookController.handleClerkWebhook.bind(webhookController)
);

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// ==================== CONNECT TO DATABASE ====================
database.connect();

// ==================== ROUTES ====================

// Health Check
app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "Cognix Backend API",
    version: "2.0.0",
    database: database.isConnected() ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Health endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    database: database.isConnected(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/clinical", clinicalRoutes);
app.use("/api/caregiver", caregiverRoutes);

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 Cognix Backend Server");
  console.log("=".repeat(50));
  console.log(`📍 URL: http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📱 Mobile can connect via: http://YOUR_LOCAL_IP:${PORT}`);
  console.log("=".repeat(50) + "\n");
  
  // Initialize cron jobs for health checks
  // if (process.env.ENABLE_CRON === 'true') {
  //   initializeCronJobs();
  // }
  
  // Verify email service connection
  emailService.testConnection().catch(err => {
    console.error('⚠️ Email service warning:', err.message);
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("\n👋 SIGTERM received. Shutting down gracefully...");
  server.close(async () => {
    await database.disconnect();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("\n👋 SIGINT received. Shutting down gracefully...");
  server.close(async () => {
    await database.disconnect();
    process.exit(0);
  });
});

module.exports = app;
// Force nodemon restart
