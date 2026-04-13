// Basic usage with default colored output (no box).
// Run: node examples/basic.js

const { setupLogging } = require("crisplogs");

const logger = setupLogging();

logger.debug("Loading configuration...");
logger.info("Server started on port 8000");
logger.warning("Disk usage at 85%");
logger.error("Failed to connect to database");
logger.critical("System is shutting down");
