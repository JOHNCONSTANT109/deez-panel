import mongoose, { type Document, type Model } from "mongoose";

export interface IBot extends Document {
  name: string;
  type: string;
  token?: string | null;
  status: string;
  prefix: string;
  description?: string | null;
  avatarUrl?: string | null;
  serverCount?: number | null;
  userCount?: number | null;
  uptimeSeconds?: number | null;
  entryFile?: string | null;
  repoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const botSchema = new mongoose.Schema<IBot>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true, default: "discord" },
    token: { type: String, default: null },
    status: { type: String, default: "offline" },
    prefix: { type: String, default: "!" },
    description: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    serverCount: { type: Number, default: null },
    userCount: { type: Number, default: null },
    uptimeSeconds: { type: Number, default: null },
    entryFile: { type: String, default: null },
    repoUrl: { type: String, default: null },
  },
  { timestamps: true },
);

export const Bot: Model<IBot> =
  (mongoose.models.Bot as Model<IBot>) ??
  mongoose.model<IBot>("Bot", botSchema);
