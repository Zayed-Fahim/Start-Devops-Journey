const http = require('node:http');

const PORT = Number(process.env.PORT) || 5000;
const TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS) || 3000;
const request = http.request(
  {
    host: '127.0.0.1',
    port: PORT,
    path: '/readyz',
    method: 'GET',
    timeout: TIMEOUT_MS,
  },
  (res) => {
    res.resume();
    res.on('end', () => {
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
  },
);
request.on('error', (error) => {
  console.error(`healthcheck: ${error.message}`);
  process.exit(1);
});
request.on('timeout', () => {
  request.destroy();
  console.error(`healthcheck: timed out after ${TIMEOUT_MS}ms`);
  process.exit(1);
});
request.end();
