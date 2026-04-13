// Set a minimum log level to filter out noise.
// Run: node examples/level-filtering.js

const { setupLogging } = require("crisplogs");

const logger = setupLogging({ level: "WARNING" });

logger.debug("You will NOT see this");
logger.info("You will NOT see this either");
logger.warning("This is visible");
logger.error("This is also visible");
logger.critical("This is also visible");
