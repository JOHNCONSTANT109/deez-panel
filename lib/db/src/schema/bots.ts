import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botsTable = pgTable("bots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("discord"),
  token: text("token"),
  status: text("status").notNull().default("offline"),
  prefix: text("prefix").notNull().default("!"),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  serverCount: integer("server_count"),
  userCount: integer("user_count"),
  uptimeSeconds: integer("uptime_seconds"),
  entryFile: text("entry_file"),
  repoUrl: text("repo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBotSchema = createInsertSchema(botsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBot = z.infer<typeof insertBotSchema>;
export type Bot = typeof botsTable.$inferSelect;
