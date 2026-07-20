import mongoose from "mongoose";

export { isValidObjectId } from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn(
    "[db] MONGODB_URI is not set — database queries will fail until it is configured.",
  );
} else {
  mongoose
    .connect(uri, { bufferCommands: true })
    .then(() => console.log("[db] MongoDB connected"))
    .catch((err) => console.error("[db] MongoDB connection error:", err));
}

export { mongoose };
export * from "./schema/index.js";
