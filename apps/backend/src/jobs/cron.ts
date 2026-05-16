import cron from "node-cron";
import { logger } from "@/config/logger.js";
import { checkCourierDelays, checkPendingSettlements, checkPendingRefunds } from "./claim-check.job.js";

export const initCronJobs = () => {
  logger.info("Initializing Cron Jobs...");

  // Run everyday at 1:00 AM
  cron.schedule("0 1 * * *", async () => {
    logger.info("Running daily claim checks...");
    try {
      await checkCourierDelays();
      await checkPendingSettlements();
      await checkPendingRefunds();
      logger.info("Daily claim checks completed.");
    } catch (error) {
      logger.error(error, "Error running daily claim checks");
    }
  });
};
