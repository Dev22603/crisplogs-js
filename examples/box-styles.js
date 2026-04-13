// All three box styles compared side-by-side.
// Run: node examples/box-styles.js

const { setupLogging } = require("crisplogs");

// --- Short Fixed Box (left border, fixed width) ---
console.log("=== Short Fixed Box ===\n");
const fixed = setupLogging({ style: "short-fixed", name: "fixed" });
fixed.info("Server started on port 8000");
fixed.error("Connection refused");

// --- Short Dynamic Box (full border, width fits content) ---
console.log("\n=== Short Dynamic Box ===\n");
const dynamic = setupLogging({ style: "short-dynamic", name: "dynamic" });
dynamic.info("Short message");
dynamic.warning("A slightly longer warning message for comparison");

// --- Long Boxed (left border, word-wrapped, supports extra fields) ---
console.log("\n=== Long Boxed ===\n");
const long = setupLogging({ style: "long-boxed", width: 90, name: "long" });
long.info("User logged in successfully", { userId: 42, action: "login" });
long.error(
  "Payment processing failed after multiple retries to the upstream gateway service",
  { orderId: 9912, retries: 3 },
);
