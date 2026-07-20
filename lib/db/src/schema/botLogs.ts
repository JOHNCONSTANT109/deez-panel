import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { botsTable } from "./bots";

export const botLogsTable = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull().references(() => botsTable.id, { onDelete: "cascade" }),
  level: text("level").notNull().default("info"), // info | warn | error | debug
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBotLogSchema = createInsertSchema(botLogsTable).omit({ id: true, createdAt: true });
export type InsertBotLog = z.infer<typeof insertBotLogSchema>;
export type BotLog = typeof botLogsTable.$inferSelect;
