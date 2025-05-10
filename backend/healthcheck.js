const http = require("http");
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");

// Get environment variables
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://mongodb:27017";
const DB_NAME = process.env.MONGO_DB_NAME || "yourdbname";

// Health check configuration
const TIMEOUT_MS = 5000;
const HEALTHCHECK_PORT = process.env.HEALTHCHECK_PORT || 3002;

// 1. Database Health Check
async function checkDatabase() {
  try {
    // Method 1: Using Mongoose (if you use it)
    if (mongoose.connection.readyState === 1) {
      // Test with a simple query
      await mongoose.connection.db.admin().ping();
      return true;
    }

    // Method 2: Direct MongoDB driver connection
    const client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: TIMEOUT_MS,
      serverSelectionTimeoutMS: TIMEOUT_MS,
    });

    await client.connect();
    const db = client.db(DB_NAME);
    await db.command({ ping: 1 });
    await client.close();
    return true;
  } catch (error) {
    console.error("Database health check failed:", error.message);
    return false;
  }
}

// 2. HTTP Server Health Check
async function checkHttpServer() {
  return new Promise((resolve) => {
    const options = {
      hostname: "localhost",
      port: PORT,
      path: "/health",
      method: "GET",
      timeout: TIMEOUT_MS,
    };

    const req = http.request(options, (res) => {
      res.on("data", () => {});
      res.on("end", () => {
        resolve(res.statusCode === 200);
      });
    });

    req.on("error", () => {
      resolve(false);
    });

    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// 3. Memory Usage Check
function checkMemoryUsage() {
  const maxMemory = process.env.MAX_MEMORY_MB
    ? parseInt(process.env.MAX_MEMORY_MB) * 1024 * 1024
    : 500 * 1024 * 1024;
  const usedMemory = process.memoryUsage().rss;
  return usedMemory < maxMemory;
}

// Main health check function
async function performHealthChecks() {
  const checks = {
    database: await checkDatabase(),
    httpServer: await checkHttpServer(),
    memory: checkMemoryUsage(),
  };

  const isHealthy = Object.values(checks).every(Boolean);
  return {
    status: isHealthy ? "healthy" : "unhealthy",
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  };
}

// Create a simple HTTP server for health checks
if (process.env.NODE_ENV !== "test") {
  const server = http.createServer(async (req, res) => {
    if (req.url === "/health") {
      try {
        const healthStatus = await performHealthChecks();
        const statusCode = healthStatus.status === "healthy" ? 200 : 503;

        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(healthStatus, null, 2));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Health check failed",
            details: error.message,
          })
        );
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(HEALTHCHECK_PORT, () => {
    console.log(`Health check server running on port ${HEALTHCHECK_PORT}`);
  });
}

module.exports = {
  checkDatabase,
  checkHttpServer,
  checkMemoryUsage,
  performHealthChecks,
};
