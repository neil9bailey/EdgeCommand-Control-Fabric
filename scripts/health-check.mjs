import http from "node:http";
import https from "node:https";

const targets = [
  ["api-gateway", process.env.API_BASE || "http://localhost:3101/health"],
  ["web-console", process.env.WEB_BASE || "http://localhost:5174"],
];

let failed = false;

function check(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;
    const request = client.request(parsed, { method: "GET", timeout: 5000 }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode >= 200 && response.statusCode < 400));
    });
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
    request.end();
  });
}

for (const [name, url] of targets) {
  const ok = await check(url);
  console.log(`${name}: ${ok ? "ok" : "unavailable"} (${url})`);
  if (!ok) failed = true;
}

process.exit(failed ? 1 : 0);
