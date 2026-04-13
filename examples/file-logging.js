// Write logs to a file with ANSI codes automatically stripped.
// Demonstrates separate console/file log levels.
// Run: node examples/file-logging.js
// Then inspect the created log file: cat logs/crisplogs-example.log

const fs = require("fs");
const path = require("path");
const { setupLogging } = require("crisplogs");

// Ensure logs directory exists
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_FILE = path.join(logsDir, "crisplogs-example.log");

const logger = setupLogging({
  level: "DEBUG",
  file: LOG_FILE,
  fileLevel: "WARNING", // only WARNING+ goes to the file
});

logger.debug("This goes to console only");
logger.info("This also goes to console only");
logger.warning("This goes to both console and file");
logger.error("This goes to both console and file");

console.log(`\nLog file created at: ${LOG_FILE}`);
console.log(`File contains only WARNING and above (plain text, ANSI codes stripped).\n`);
