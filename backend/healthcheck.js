/**
 * One-shot container healthcheck.
 *
 * Usage (from a Dockerfile HEALTHCHECK or a Compose healthcheck):
 *
 *     test: ["CMD", "node", "healthcheck.js"]
 *
 * WHAT A HEALTHCHECK COMMAND MUST DO: run, decide, and EXIT.
 * Exit code 0 = healthy, anything else = unhealthy. Docker runs this command
 * inside the container on every interval and reads only the exit status.
 *
 * The previous version of this file started an HTTP server on port 3002 and
 * kept listening forever. As a healthcheck command that never exits, Docker
 * killed it at the `timeout` every single time and recorded a failure, so the
 * container could only ever go `starting` -> `unhealthy` -- and, because it
 * also opened a second listener, every check leaked another process. A
 * healthcheck must be a short-lived probe, not a service.
 *
 * It probes /readyz (readiness) rather than /healthz, because for the purpose
 * of "should this container be in service" the answer must include whether the
 * database is reachable. Note the consequence, deliberately accepted: with
 * Compose's `restart: unless-stopped`, a container marked unhealthy is NOT
 * restarted -- Compose has no such action -- so this is a status signal and a
 * `depends_on: service_healthy` gate, nothing more. In Kubernetes you would
 * wire this to a readinessProbe and point the livenessProbe at /healthz, so
 * that a database outage removes the pod from the load balancer instead of
 * restarting it.
 */

const http = require("node:http");

const PORT = Number(process.env.PORT) || 3001;
const TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS) || 3000;

const request = http.request(
  {
    // 127.0.0.1, not "localhost": on a dual-stack container localhost can
    // resolve to ::1 first, and if the server bound to IPv4 only the probe
    // fails with ECONNREFUSED while the service is perfectly healthy.
    host: "127.0.0.1",
    port: PORT,
    path: "/readyz",
    method: "GET",
    timeout: TIMEOUT_MS,
  },
  (res) => {
    // Drain the body. Without this the response stream stays paused and the
    // socket is never released.
    res.resume();
    res.on("end", () => {
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
  }
);

request.on("error", (error) => {
  console.error(`healthcheck: ${error.message}`);
  process.exit(1);
});

request.on("timeout", () => {
  // `timeout` fires but does NOT abort the request on its own — without an
  // explicit destroy the socket lingers and the process hangs past the
  // healthcheck's own timeout.
  request.destroy();
  console.error(`healthcheck: timed out after ${TIMEOUT_MS}ms`);
  process.exit(1);
});

request.end();
