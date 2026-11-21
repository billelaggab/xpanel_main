import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { Snapshot } from "../../xpanel/web/model";

export const xpanelWorkspaces = pgTable("xpanel_workspaces", {
  id: text("id").primaryKey(),
  snapshot: jsonb("snapshot").$type<Snapshot>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
