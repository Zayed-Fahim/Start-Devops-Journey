const express = require("express");
const cors = require("cors");

const env = require("./lib/env");
const usersRoutes = require("./routes/users.routes");
const healthRoutes = require("./routes/health.routes");
const notFoundHandler = require("./middleware/notFoundHandler");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Express advertises "X-Powered-By: Express" by default. Free information for
// anyone scanning for framework-specific exploits; no benefit to anyone else.
app.disable("x-powered-by");

// Behind a reverse proxy (nginx, a load balancer) this makes req.ip the real
// client address from X-Forwarded-For instead of the proxy's own IP. Harmless
// locally, necessary the moment anything sits in front of this.
app.set("trust proxy", 1);

/**
 * CORS — enforced by the BROWSER, not by this server.
 *
 * The browser reads the Access-Control-Allow-Origin header and decides whether
 * the calling page is allowed to see the response. So the origin listed here
 * is the address in the user's URL bar (http://localhost:3000), NOT the
 * Docker-internal http://frontend:3000 -- the browser has never heard of
 * Docker DNS.
 *
 * A Next.js SERVER component calling this API is not a browser and is not
 * subject to CORS at all; it can call http://backend:3001 freely regardless of
 * this configuration.
 *
 * Note this is an allowlist, not `origin: "*"`. Wildcard is convenient and
 * wrong: it lets any site on the internet call this API with the user's
 * cookies attached.
 */
app.use(
  cors({
    origin: env.corsOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
    maxAge: 86400, // cache the preflight for a day instead of re-asking
  })
);

// Bound the body size. The default is 100kb, but stating it makes the limit a
// decision rather than an accident, and an oversized body now returns 413
// through the error handler instead of consuming memory.
app.use(express.json({ limit: "100kb" }));

// Liveness and readiness live at the ROOT, not under /api. They describe the
// process, not the product, and an orchestrator probing them should not have
// to know your API's path scheme.
app.use(healthRoutes);

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "User Management API",
    endpoints: {
      users: "/api/users",
      stats: "/api/users/stats",
      liveness: "/healthz",
      readiness: "/readyz",
    },
  });
});

app.use("/api/users", usersRoutes);

// Order is load-bearing: 404 catcher after all routes, error handler last of
// all. Register the error handler earlier and it simply never runs.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
