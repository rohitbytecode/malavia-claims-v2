import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.MONGO_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    });
    logger.info("MongoDB connected");

    mongoose.connection.on("disconnected", () => 
      logger.warn("MongoDB disconnected")
    );
    mongoose.connection.on("reconnected", () =>
      logger.info("MongoDB reconnected")
    );
    mongoose.connection.on("error", (err) =>
      logger.error({ err }, "MongoDB connection error")
    );
  } catch (error) {
    logger.error(error);

    process.exit(1);
  }
};
