// Per-file logger tag derived automatically from the calling file name.
// Run: npm run build && node examples/module-logger.js

const { setupLogging, moduleLogger } = require("crisplogs");

setupLogging({ level: "INFO" });

const logger = moduleLogger();

logger.info("Server ready");
logger.warning("Example warning from module-logger.js");
