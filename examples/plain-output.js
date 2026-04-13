// Disable colors for CI, piped output, or plain terminals.
// Run: node examples/plain-output.js

const { setupLogging } = require("crisplogs");

// Plain text, no box
console.log("=== Plain (no colors, no box) ===\n");
const plain = setupLogging({ colored: false, name: "plain" });
plain.info("Plain text output for CI or piped environments");
plain.error("Errors look the same without color");

// Plain text with a box
console.log("\n=== Plain + Boxed ===\n");
const plainBox = setupLogging({
  colored: false,
  style: "short-dynamic",
  name: "plain-box",
});
plainBox.info("Boxed but no colors");
plainBox.warning("Great for log files");
