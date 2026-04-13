// Attach structured context to log messages using the extra parameter.
// Extra fields appear in "long-boxed" style as [key=value ...].
// Run: node examples/extra-fields.js

const { setupLogging } = require("crisplogs");

const logger = setupLogging({ style: "long-boxed", width: 100 });

logger.info("User signed up", { userId: 101, plan: "pro" });
logger.info("Order placed", { orderId: 5523, items: 3, total: "$149.99" });
logger.warning("Rate limit approaching", { endpoint: "/api/search", usage: "92%" });
logger.error("Payment failed", { orderId: 5524, gateway: "stripe", code: "card_declined" });
