// Use named loggers to identify which part of your app emitted a log.
// Run: node examples/named-loggers.js

const { setupLogging, getLogger } = require("crisplogs");

// Configure the root logger once at startup
setupLogging();

// Retrieve child loggers anywhere in your app — they inherit root config
const dbLogger = getLogger("app.db");
const httpLogger = getLogger("app.http");
const cacheLogger = getLogger("app.cache");

dbLogger.info("Connected to PostgreSQL");
httpLogger.info("Listening on port 3000");
cacheLogger.warning("Redis connection pool is low");
httpLogger.error("GET /api/users returned 500");
