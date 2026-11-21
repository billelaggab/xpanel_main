import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import ReportViewer from "@/components/ReportViewer";

export const metadata: Metadata = { title: "التوثيق التقني — XPanel" };
export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const [report, script, analysis] = await Promise.all([
    readFile(path.join(process.cwd(), "report.md"), "utf-8").catch(() => "# لم يتم العثور على ملف report.md"),
    readFile(path.join(process.cwd(), "install.py"), "utf-8").catch(() => "# لم يتم العثور على ملف install.py"),
    readFile(path.join(process.cwd(), "ui-analysis.md"), "utf-8").catch(() => null),
  ]);
  return <><div className="flex justify-center border-b border-slate-800 bg-slate-950 p-2"><Link className="rounded-md px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-slate-900" href="/xpanel">العودة إلى XPanel</Link></div><ReportViewer markdownContent={report} scriptContent={script} uiAnalysisContent={analysis} /></>;
}
