const express = require("express");
const client = require("prom-client");
const app = express();
const port = process.env.PORT || 3000;
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const requests = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"]
});
register.registerMetric(requests);
app.use((req, res, next) => {
  res.on("finish", () => requests.inc({
    method: req.method,
    route: req.route?.path || req.path,
    status_code: res.statusCode
  }));
  next();
});
app.get("/", (_req, res) => res.json({
  service: "eks-devops-demo",
  version: process.env.APP_VERSION || "dev",
  message: "Application is running on Amazon EKS"
}));
app.get("/health", (_req, res) => res.status(200).json({status: "UP"}));
app.get("/ready", (_req, res) => res.status(200).json({status: "READY"}));
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
app.listen(port, "0.0.0.0", () => console.log(`Server listening on ${port}`));
