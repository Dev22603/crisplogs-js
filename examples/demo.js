const { setupLogging, getLogger } = require("../dist");

console.log("=== 1. Colored (default) ===\n");
const log1 = setupLogging({ name: "demo" });
log1.debug("Loading configuration...");
log1.info("Server started on port 8000");
log1.warning("Disk usage at 85%");
log1.error("Failed to connect to database");
log1.critical("System is shutting down");

console.log("\n=== 2. Short Fixed Box ===\n");
const log2 = setupLogging({ style: "short-fixed", name: "demo-fixed" });
log2.info("Server started on port 8000");
log2.error("Connection refused");

console.log("\n=== 3. Short Dynamic Box ===\n");
const log3 = setupLogging({ style: "short-dynamic", name: "demo-dynamic" });
log3.info("Short message");
log3.warning("A slightly longer warning message for comparison");

console.log("\n=== 4. Long Boxed (with extras) ===\n");
const log4 = setupLogging({ style: "long-boxed", width: 90, name: "demo-long" });
log4.info("User logged in successfully", { userId: 42, action: "login" });
log4.error("Payment processing failed after multiple retries to the upstream gateway service", { orderId: 9912, retries: 3 });

console.log("\n=== 5. Plain (no colors) ===\n");
const log5 = setupLogging({ colored: false, name: "demo-plain" });
log5.info("Plain text output for CI or piped environments");
log5.error("Errors look the same without color");

console.log("\n=== 6. Plain + Boxed ===\n");
const log6 = setupLogging({ colored: false, style: "short-dynamic", name: "demo-plain-box" });
log6.info("Boxed but no colors");
log6.warning("Great for log files");

console.log("\n=== 7. Custom Colors ===\n");
const log7 = setupLogging({
  name: "demo-colors",
  logColors: {
    DEBUG: "dim_white",
    INFO: "bold_green",
    WARNING: "bold_yellow",
    ERROR: "bold_red,bg_white",
    CRITICAL: "bold_white,bg_red",
  },
});
log7.debug("Dim debug");
log7.info("Bold green info");
log7.warning("Bold yellow warning");
log7.error("Bold red on white background");
log7.critical("White on red background");

console.log("\n=== 8. Custom Date Format ===\n");
const log8 = setupLogging({ datefmt: "%H:%M:%S", name: "demo-date" });
log8.info("Short timestamp");

console.log("\n=== 9. Level Filtering (level: WARNING) ===\n");
const log9 = setupLogging({ level: "WARNING", name: "demo-filter" });
log9.debug("You will NOT see this");
log9.info("You will NOT see this either");
log9.warning("This is visible");
log9.error("This is also visible");

console.log("\n=== 10. getLogger ===\n");
setupLogging({ name: "" }); // configure root
const child = getLogger("myapp.db");
child.info("Message from a child logger inheriting root config");
