import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const root = process.cwd();
  const asset = name === "xpanel.zip" ? path.join(root, "xpanel", "xpanel.zip")
    : name === "xpanel.zip.sha256" ? path.join(root, "xpanel", "xpanel.zip.sha256") : null;
  if (!asset) return new Response(null, { status: 404 });
  try {
    const body = await readFile(asset);
    return new Response(new Uint8Array(body), { headers: {
      "Content-Type": name === "xpanel.zip.sha256" ? "text/plain; charset=utf-8" : "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Unable to read XPanel bundle", error);
    return Response.json({ error: "حزمة XPanel غير متوفرة في هذه النسخة." }, { status: 404 });
  }
}
