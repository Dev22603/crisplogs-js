// Override the default color for each log level.
// Run: node examples/custom-colors.js

const { setupLogging } = require("crisplogs");

const logger = setupLogging({
  logColors: {
    DEBUG: "dim_white",
    INFO: "bold_green",
    WARNING: "bold_yellow",
    ERROR: "bold_red,bg_white",
    CRITICAL: "bold_white,bg_red",
  },
});

logger.debug("Dim debug");
logger.info("Bold green info");
logger.warning("Bold yellow warning");
logger.error("Bold red on white background");
logger.critical("White on red background");
