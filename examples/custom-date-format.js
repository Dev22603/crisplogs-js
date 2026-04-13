// Customize the timestamp format using strftime tokens.
// Run: node examples/custom-date-format.js

const { setupLogging } = require("crisplogs");

// Time only
console.log("=== Time Only ===\n");
const short = setupLogging({ datefmt: "%H:%M:%S", name: "short-ts" });
short.info("Short timestamp");

// Full date + time with seconds (default format made explicit)
console.log("\n=== Full Date + Time ===\n");
const full = setupLogging({ datefmt: "%Y-%m-%d %H:%M:%S", name: "full-ts" });
full.info("Full date and time with seconds");

// European date format
console.log("\n=== European Format ===\n");
const eu = setupLogging({ datefmt: "%d/%m/%Y %H:%M:%S", name: "eu-ts" });
eu.info("European date format");

// 12-hour clock
console.log("\n=== 12-Hour Clock ===\n");
const ampm = setupLogging({ datefmt: "%I:%M:%S %p", name: "ampm-ts" });
ampm.info("12-hour timestamp");
