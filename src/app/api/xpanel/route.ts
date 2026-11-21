import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { xpanelWorkspaces } from "@/db/schema";
import { categories, channelStatuses, qualities, plans, sampleSnapshot, serverStatuses, subscriberStatuses, type Entity, type Item, type Snapshot } from "../../../../xpanel/web/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookieName = "xpanel_workspace";
const tokenPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const entities = ["channels", "subscribers", "servers"] as const;

class Invalid extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function readSpace(req: NextRequest) {
  const value = req.cookies.get(cookieName)?.value;
  return value && tokenPattern.test(value) ? value : null;
}
function send(req: NextRequest, data: unknown, status = 200, newSpace?: string) {
  const res = NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
  if (newSpace) res.cookies.set(cookieName, newSpace, {
    httpOnly: true, sameSite: "strict", secure: (req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? req.nextUrl.protocol).startsWith("https"),
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
function object(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Invalid("البيانات غير صالحة.");
  return data as Record<string, unknown>;
}
function text(data: Record<string, unknown>, key: string, max = 100) {
  const raw = data[key];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw new Invalid("تحقق من الحقول المطلوبة وأطوالها.");
  return value;
}
function choice<T extends string>(data: Record<string, unknown>, key: string, options: Record<T, string>): T {
  const value = text(data, key);
  if (!Object.prototype.hasOwnProperty.call(options, value)) throw new Invalid("أحد الخيارات غير صالح.");
  return value as T;
}
function number(data: Record<string, unknown>, key: string, max: number, integer = false) {
  const value = data[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) {
    throw new Invalid("أدخل قيمة رقمية ضمن النطاق المسموح.");
  }
  return value;
}
function buildItem(entity: Entity, raw: unknown, prior?: Item): Item {
  const data = object(raw);
  const shared = { id: prior?.id ?? randomUUID(), name: text(data, "name", 80), createdAt: prior?.createdAt ?? new Date().toISOString() };
  if (entity === "channels") {
    const status = choice(data, "status", channelStatuses);
    const viewers = number(data, "viewers", 10_000_000, true);
    return { ...shared, category: choice(data, "category", categories), quality: choice(data, "quality", qualities), status, viewers: status === "live" ? viewers : 0 };
  }
  if (entity === "subscribers") {
    const email = text(data, "email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Invalid("البريد الإلكتروني غير صالح.");
    return { ...shared, email, plan: choice(data, "plan", plans), status: choice(data, "status", subscriberStatuses) };
  }
  return { ...shared, region: text(data, "region", 80), status: choice(data, "status", serverStatuses), load: number(data, "load", 100, true), traffic: number(data, "traffic", 1000) };
}
function update(data: Snapshot, input: Record<string, unknown>): Snapshot {
  const entity = input.entity;
  const action = input.action;
  if (!entities.some((key) => key === entity) || (action !== "create" && action !== "update" && action !== "delete")) throw new Invalid("العملية غير صالحة.");
  const key = entity as Entity;
  const items: Item[] = data[key];
  const prior = items.find((row) => row.id === input.id);
  if (action !== "create" && !prior) throw new Invalid("لم يعد هذا السجل موجودًا.", 404);
  if (action === "create" && items.length >= 1000) throw new Invalid("بلغت مساحة العمل الحد الأقصى لهذا النوع.", 409);
  const entry = action === "delete" ? null : buildItem(key, input.data, action === "update" ? prior : undefined);
  if (entry && "email" in entry && data.subscribers.some((row) => row.id !== entry.id && row.email === entry.email)) throw new Invalid("البريد الإلكتروني مسجل بالفعل.", 409);
  const rows = entry ? action === "create" ? [entry, ...items] : items.map((row) => row.id === prior?.id ? entry : row) : items.filter((row) => row.id !== prior?.id);
  const next = { ...data, [key]: rows } as Snapshot;
  if (key === "channels") {
    const date = new Date().toISOString().slice(0, 10);
    const audience = next.channels.reduce((n, c) => n + (c.status === "live" ? c.viewers : 0), 0);
    next.history = [...next.history.filter((point) => point.date !== date).slice(-29), { date, audience }];
  }
  return next;
}

export async function GET(req: NextRequest) {
  const space = readSpace(req);
  try {
    if (!space) return send(req, sampleSnapshot(), 200, randomUUID());
    const [row] = await db.select({ snapshot: xpanelWorkspaces.snapshot }).from(xpanelWorkspaces).where(eq(xpanelWorkspaces.id, space));
    return send(req, row?.snapshot ?? sampleSnapshot());
  } catch (error) {
    console.error("XPanel workspace read failed", error);
    return send(req, { error: "لا يمكن قراءة مساحة العمل الآن." }, 503);
  }
}

export async function POST(req: NextRequest) {
  if (!req.headers.get("content-type")?.startsWith("application/json") || req.headers.get("x-xpanel-request") !== "workspace" || req.headers.get("sec-fetch-site") === "cross-site") {
    return send(req, { error: "الطلب غير مسموح." }, 403);
  }
  const space = readSpace(req);
  if (!space) return send(req, { error: "افتح مساحة العمل مجددًا قبل الحفظ." }, 409);
  try {
    const body = await req.text();
    if (body.length > 4096) throw new Invalid("حجم الطلب أكبر من المسموح.", 413);
    let input: unknown;
    try { input = JSON.parse(body); } catch { throw new Invalid("صيغة الطلب غير صالحة."); }
    const data = object(input);
    const snapshot = await db.transaction(async (tx) => {
      await tx.insert(xpanelWorkspaces).values({ id: space, snapshot: sampleSnapshot() }).onConflictDoNothing();
      const [row] = await tx.select({ snapshot: xpanelWorkspaces.snapshot }).from(xpanelWorkspaces).where(eq(xpanelWorkspaces.id, space)).for("update");
      if (!row) throw new Invalid("مساحة العمل غير متاحة.", 409);
      const next = update(row.snapshot, data);
      await tx.update(xpanelWorkspaces).set({ snapshot: next, updatedAt: new Date() }).where(eq(xpanelWorkspaces.id, space));
      return next;
    });
    return send(req, snapshot);
  } catch (error) {
    if (error instanceof Invalid) return send(req, { error: error.message }, error.status);
    console.error("XPanel workspace write failed", error);
    return send(req, { error: "تعذر حفظ التغييرات. حاول مجددًا." }, 503);
  }
}
