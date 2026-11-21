import type { Metadata } from "next";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { xpanelWorkspaces } from "@/db/schema";
import Panel from "../../../xpanel/web/Panel";
import { sampleSnapshot } from "../../../xpanel/web/model";
import "@fontsource-variable/cairo";
import "../../../xpanel/web/panel.css";

export const metadata: Metadata = {
  title: "XPanel — لوحة إدارة البث",
  description: "لوحة عربية لإدارة سجل القنوات والمشتركين والخوادم ومتابعة نشاط المشاهدة.",
};

export const dynamic = "force-dynamic";

export default async function XPanelPage() {
  const today = new Date();
  let snapshot = sampleSnapshot(today);
  const space = (await cookies()).get("xpanel_workspace")?.value;
  if (space && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(space)) {
    try {
      const [row] = await db.select({ snapshot: xpanelWorkspaces.snapshot }).from(xpanelWorkspaces).where(eq(xpanelWorkspaces.id, space));
      if (row) snapshot = row.snapshot;
    } catch (error) {
      console.error("XPanel initial workspace unavailable", error);
    }
  }
  return <Panel initial={snapshot} today={today.toISOString()} endpoint="/api/xpanel" demo />;
}
