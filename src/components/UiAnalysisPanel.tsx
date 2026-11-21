import { CheckCircle2, Download, ExternalLink, FileArchive, Search } from "lucide-react";

const releaseUrl = "https://github.com/emre1393/xtreamui_mirror/releases/tag/latest";

const archives = [
  {
    name: "release_22f.zip",
    role: "اللوحة الأساسية",
    count: "524",
    summary: "صفحات الدخول والإدارة، القوالب المشتركة، والأصول المحلية من CSS وJavaScript.",
  },
  {
    name: "newstuff.zip",
    role: "الإضافات والاستبدالات",
    count: "255",
    summary: "245 صورة للأعلام و10 ملفات PHP مشتركة مع الحزمة الأساسية، 9 منها مختلفة في المحتوى.",
  },
];

const layers = [
  {
    label: "القوائم والسمات",
    paths: "admin/header.php · admin/header_sidebar.php",
    description: "قالب للتنقّل العلوي وآخر للجانبي، وملفات CSS منفصلة للوضع الفاتح والداكن.",
  },
  {
    label: "الإحصاءات",
    paths: "admin/dashboard.php → admin/api.php",
    description: "طلبات دورية لمؤشرات الخوادم، وطلب مستقل لبيانات الرسم التاريخي في ApexCharts.",
  },
  {
    label: "الجداول والفلترة",
    paths: "admin/streams.php · admin/users.php → admin/table_search.php",
    description: "يرسل DataTables معاملات البحث والفلترة إلى PHP، ويتلقى نتيجة مقسّمة إلى صفحات بصيغة JSON.",
  },
  {
    label: "الهوية والترجمة",
    paths: "admin/assets/images/ · admin/assets/css/ · admin/lang/en.php",
    description: "الصور والأنماط مستقلة عن التثبيت. يوجد ملف لغة إنجليزي واحد، وبعض العبارات مكتوبة مباشرة في الصفحات.",
  },
];

export default function UiAnalysisPanel({ report }: { report: string | null }) {
  function downloadReport() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([report], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ui-analysis.md";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section aria-labelledby="ui-analysis-title" className="space-y-6 animate-fadeIn">
      <div className="rounded-2xl border border-slate-800 bg-linear-to-bl from-slate-900 to-emerald-950/35 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Search className="size-3.5" aria-hidden="true" />
              فحص ساكن للأرشيفات
            </div>
            <h2 id="ui-analysis-title" className="text-2xl font-bold text-white sm:text-3xl">تحليل ملفات واجهة لوحة الإدارة</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              واجهة متعددة الصفحات يولّدها PHP. حلّلنا كلا الأرشيفين بحسب ترتيب نسخهما في المثبّت لتحديد مصادر التصميم والبيانات، دون تشغيل محتوياتهما.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadReport}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download className="size-4" aria-hidden="true" />
            تنزيل <bdi>ui-analysis.md</bdi>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {archives.map((archive) => (
          <article key={archive.name} className="min-w-0 space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">{archive.role}</p>
                <h3 className="mt-1 break-all font-mono text-base font-semibold text-white"><bdi>{archive.name}</bdi></h3>
              </div>
              <FileArchive className="size-5 shrink-0 text-emerald-400" aria-hidden="true" />
            </div>
            <p className="text-sm leading-relaxed text-slate-300">{archive.summary}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800 pt-3 text-xs">
              <span className="text-slate-300"><b className="text-white">{archive.count}</b> ملفًا تحت <bdi className="font-mono">admin/</bdi></span>
              <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="size-3.5" aria-hidden="true" /> بصمة مطابقة للإصدار</span>
            </div>
          </article>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-white">من أين يبدأ تعديل الواجهة؟</h3>
        <dl className="divide-y divide-slate-800">
          {layers.map((layer) => (
            <div key={layer.label} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-sm font-semibold text-slate-100">{layer.label}</dt>
              <dd className="min-w-0 space-y-1">
                <code dir="ltr" className="block break-all text-start text-xs text-emerald-300">{layer.paths}</code>
                <p className="text-sm leading-relaxed text-slate-400">{layer.description}</p>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <details className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-white">قراءة التقرير الكامل</summary>
        {report ? (
          <pre className="mt-4 max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-4 font-sans text-sm leading-relaxed text-slate-300">
            {report}
          </pre>
        ) : (
          <p className="mt-4 text-sm text-slate-400">ملف التقرير غير متوفر في هذه النسخة.</p>
        )}
      </details>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-slate-400">
        <a href={releaseUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-emerald-300 hover:underline">
          صفحة الإصدار المصدر <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
        <span>• مطابقة البصمات لا تُعد ضمانًا لأمان التشغيل. الأرشيفات ليست جزءًا من المعاينة.</span>
      </p>
    </section>
  );
}
