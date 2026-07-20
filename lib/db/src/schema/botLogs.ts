import mongoose, { type Document, type Model } from "mongoose";

export interface IBotLog extends Document {
  botId: mongoose.Types.ObjectId;
  level: string;
  message: string;
  createdAt: Date;
}

const botLogSchema = new mongoose.Schema<IBotLog>(
  {
    botId: { type: mongoose.Schema.Types.ObjectId, ref: "Bot", required: true },
    level: { type: String, default: "info" },
    message: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

botLogSchema.index({ botId: 1, createdAt: 1 });

export const BotLog: Model<IBotLog> =
  (mongoose.models.BotLog as Model<IBotLog>) ??
  mongoose.model<IBotLog>("BotLog", botLogSchema);
