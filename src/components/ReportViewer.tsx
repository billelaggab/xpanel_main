"use client";

import React, { useState } from "react";
import {
  Server,
  Layers,
  Database,
  KeyRound,
  Zap,
  ShieldAlert,
  ArrowRightLeft,
  FileText,
  Copy,
  Check,
  Cpu,
  Radio,
  Eye,
  Lock,
  Terminal,
  Activity,
  HardDrive,
  Download,
  PackageX,
  FileCode,
  RefreshCcw,
} from "lucide-react";
import UiAnalysisPanel from "@/components/UiAnalysisPanel";

interface ReportViewerProps {
  markdownContent: string;
  scriptContent: string;
  uiAnalysisContent: string | null;
}

export default function ReportViewer({ markdownContent, scriptContent, uiAnalysisContent }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "ui-analysis"
    | "architecture"
    | "code"
    | "mysql"
    | "crypto"
    | "performance"
    | "security"
    | "deprecated"
    | "script"
    | "modern"
    | "raw"
  >("overview");
  const [copied, setCopied] = useState(false);

  // Interactive XOR Cipher Tool State
  const defaultPayload =
    '{"host":"127.0.0.1","db_user":"user_iptvpro","db_pass":"mYSecr3tP@ss!","db_name":"xtream_iptvpro","server_id":"1","db_port":"7999","pconnect":"0"}';
  const [cipherInput, setCipherInput] = useState(defaultPayload);
  const [cipherKey, setCipherKey] = useState("5709650b0d7806074842c6de575025b1");
  const [cipherMode, setCipherMode] = useState<"encrypt" | "decrypt">("encrypt");

  // Compute XOR output
  const runXOR = (input: string, key: string, mode: "encrypt" | "decrypt") => {
    try {
      if (!input || !key) return "";
      if (mode === "encrypt") {
        let xored = "";
        for (let i = 0; i < input.length; i++) {
          const charCode = input.charCodeAt(i) ^ key.charCodeAt(i % key.length);
          xored += String.fromCharCode(charCode);
        }
        return btoa(xored);
      } else {
        const decoded = atob(input);
        let result = "";
        for (let i = 0; i < decoded.length; i++) {
          const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
          result += String.fromCharCode(charCode);
        }
        return result;
      }
    } catch {
      return "خطأ: نص غير صالح للفك أو الترميز";
    }
  };

  const cipherResult = runXOR(cipherInput, cipherKey, cipherMode);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([scriptContent], { type: "text/x-python;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "install.py";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-wide">
                  تحليل مشروع Xtream UI Mirror
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  تقرير تقني شامل
                </span>
              </div>
              <p className="text-xs text-slate-400">
                تشريح معماري وهندسي وأمني لسكربت تثبيت وتوزيع بث الـ IPTV
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="نسخ التقرير الكامل"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "تم النسخ!" : "نسخ report.md"}</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
              title="تحميل ملف report.md"
            >
              <Download className="w-4 h-4" />
              <span>تحميل التقرير</span>
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
          <nav className="flex space-x-1 space-x-reverse border-t border-slate-800/80 pt-2 pb-1 text-sm font-medium">
            {[
              { id: "overview", label: "نظرة عامة والملخص", icon: Eye },
              { id: "ui-analysis", label: "تحليل ملفات الواجهة", icon: FileText },
              { id: "architecture", label: "المعمارية (MAIN / LB)", icon: Layers },
              { id: "code", label: "تشريح الدوال البرمجية", icon: Terminal },
              { id: "mysql", label: "ضبط MySQL الخارق", icon: Database },
              { id: "crypto", label: "تشفير XOR ومحاكي الفك", icon: KeyRound },
              { id: "performance", label: "هندسة الأداء (tmpfs/Nginx)", icon: Zap },
              { id: "security", label: "التقييم الأمني والثغرات", icon: ShieldAlert },
              { id: "deprecated", label: "المكتبات غير المدعومة (EOL)", icon: PackageX },
              { id: "script", label: "الكود المحدّث install.py", icon: FileCode },
              { id: "modern", label: "المقارنة مع 2026", icon: ArrowRightLeft },
              { id: "raw", label: "محتوى report.md الكامل", icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition text-xs sm:text-sm ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "ui-analysis" && <UiAnalysisPanel report={uiAnalysisContent} />}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 sm:p-8">
              <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <span>دراسة هندسية متخصصة</span>
                  <span>•</span>
                  <span>IPTV Streaming Infrastructure</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  تحليل سكربت التثبيت التلقائي لمنصة Xtream UI (Xtream Codes Mirror)
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-4xl">
                  هذا الكود هو سكربت أتمتة تشغيلية (Deployment Script) مكتوب بلغة بايثون 2.7 وموجه لخوادم أوبونتو 16.04 و 18.04. وظيفته الأساسية هي إعداد بيئة بث وإدارة قنوات فضائية وتدفقات IPTV كاملة بنقرة واحدة، من خلال توليد وإعداد خادم الويب Nginx، ومحرك التقطيع FFmpeg، ومزود قاعدة بيانات MySQL المعدل، وربط عقد موازنة الأحمال الطرفية.
                </p>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      <span>لغة السكربت</span>
                    </div>
                    <div className="text-lg font-bold text-white mt-1">Python 2.7</div>
                    <div className="text-[11px] text-amber-400 mt-0.5">EOL (منتهي الصلاحية)</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-emerald-400" />
                      <span>أدوار الخوادم</span>
                    </div>
                    <div className="text-lg font-bold text-white mt-1">MAIN & LB</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">رئيسي وموزعات حمولة</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>منفذ قاعدة البيانات</span>
                    </div>
                    <div className="text-lg font-bold text-white mt-1">Port 7999</div>
                    <div className="text-[11px] text-emerald-400 mt-0.5">10,000 اتصال متزامن</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تخزين البث المباشر</span>
                    </div>
                    <div className="text-lg font-bold text-white mt-1">tmpfs RAM (90%)</div>
                    <div className="text-[11px] text-blue-400 mt-0.5">حماية NVMe من التلف</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">الخلفية والأصل التاريخي</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  بعد إغلاق منظومة <strong>Xtream Codes</strong> الأصلية في سبتمبر 2019، أنشأ مجتمع البث مشروع <strong>Xtream UI</strong> كمرآة بديلة (Mirror/Fork) معتمدة على النسخة 22F. يهدف هذا السكربت إلى نشر النسخة وتخطي قيود التحقق من التراخيص الرسمية عبر ملف <code className="text-emerald-400">/etc/hosts</code>.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">مبدأ معالجة وتدفق الفيديو</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تعتمد المنظومة على Nginx و FFmpeg لتقطيع الفيديو وبثه بصيغ MPEG-TS و HLS. لتجنب إتلاف أقراص التخزين الصلبة من دورات الكتابة المستمرة، يتم توجيه مسار شرائح الفيديو إلى ذاكرة الرام عبر <strong>tmpfs</strong> بزمن تأخير متناهي الصغر.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">التعمية والتمويه الأمني</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  يستخدم السكربت تعمية XOR بمفتاح ثابت لبيانات الاتصال، ويقوم بتمويه واجهة الدخول عبر رمز سري <code className="text-emerald-400">/8080/{`{code}`}</code>، ويعيد توجيه المتصفحات العادية التي تزور الصفحة الرئيسية مباشرة إلى موقع <code className="text-blue-400">google.com</code> للتخفي عن الماسحات.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ARCHITECTURE */}
        {activeTab === "architecture" && (
          <div className="space-y-8 animate-fadeIn">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">المعمارية الموزعة: الخادم الرئيسي مقابل خوادم التوزيع</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  تعتمد المنظومة على معمارية رئيسي/فرعي (Master/Worker) تتيح توزيع قنوات البث وملايين المشاهدين على خوادم متعددة حول العالم.
                </p>
              </div>

              {/* Topology Visualizer */}
              <div className="p-6 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs overflow-x-auto text-emerald-400 leading-relaxed">
                <pre>{`
               [ مشرفو النظام والوكلاء (Admins & Resellers) ]
                                    │
                                    ▼ منفذ 8080/AccessCode
       ┌─────────────────────────────────────────────────────────────┐
       │             خادم التحكم المركزي (MAIN SERVER)              │
       │                                                             │
       │  • واجهة الإدارة Xtream UI Panel (PHP)                     │
       │  • قاعدة بيانات MySQL المخصصة (منفذ 7999)                  │
       │  • إدارة الاشتراكات، الصلاحيات، والتشفير                    │
       │  • توجيه العملاء إلى الخوادم الأقل حملاً                     │
       └─────────────────────────────┬───────────────────────────────┘
                                     │
                   ┌─────────────────┴─────────────────┐
                   │ استعلامات SQL مشفرة عبر المنفذ 7999  │
                   ▼                                   ▼
 ┌───────────────────────────────────┐   ┌───────────────────────────────────┐
 │   خادم التوزيع 1 (Load Balancer)   │   │   خادم التوزيع 2 (Load Balancer)   │
 │                                   │   │                                   │
 │ • لا قاعدة بيانات محلية           │   │ • لا قاعدة بيانات محلية           │
 │ • معالجة الفيديو (FFmpeg)          │   │ • معالجة الفيديو (FFmpeg)          │
 │ • كاش الرام المؤقت (tmpfs RAM)     │   │ • كاش الرام المؤقت (tmpfs RAM)     │
 │ • بث HLS / MPEG-TS عبر Nginx      │   │ • بث HLS / MPEG-TS عبر Nginx      │
 └─────────────────┬─────────────────┘   └─────────────────┬─────────────────┘
                   │                                       │
                   ▼                                       ▼
        [ مستخدمو أوروبا والشرق الأوسط ]              [ مستخدمو الأمريكيتين ]
                `}</pre>
              </div>

              {/* Role Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 px-4">المعيار</th>
                      <th className="py-3 px-4 text-emerald-400">الخادم الرئيسي (MAIN)</th>
                      <th className="py-3 px-4 text-blue-400">خادم موازنة الحمل (LB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">قاعدة البيانات</td>
                      <td className="py-3 px-4">يستضيف قاعدة بيانات MySQL المركزية على المنفذ 7999</td>
                      <td className="py-3 px-4">لا يستضيف قاعدة؛ يتصل بقاعدة الخادم الرئيسي عن بعد</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">لوحة الإدارة</td>
                      <td className="py-3 px-4">مثبتة بالكامل (واجهة ويب PHP + وصول للمشرفين والوكلاء)</td>
                      <td className="py-3 px-4">غير مثبتة؛ لا توجد واجهة مستخدم إدارية</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">ملف التثبيت</td>
                      <td className="py-3 px-4"><code>main.tar.gz</code> + <code>release_22f.zip</code></td>
                      <td className="py-3 px-4"><code>LB.tar.gz</code> فقط</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">حزم النظام</td>
                      <td className="py-3 px-4">تثبيت 14 حزمة تشمل <code>mysql-server</code> و <code>libjemalloc1</code></td>
                      <td className="py-3 px-4">تخطي آخر 3 حزم (لا حاجة لمزود MySQL محلي)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">الوظيفة الأساسية</td>
                      <td className="py-3 px-4">إدارة المشتركين، المصادقة، وتنسيق تدفق البيانات</td>
                      <td className="py-3 px-4">سحب البث الحي، إعادة الترميز عبر FFmpeg، وبث القنوات للعملاء</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CODE BREAKDOWN */}
        {activeTab === "code" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h2 className="text-xl font-bold text-white">التشريح البرمجي للدوال خطوة بخطوة</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                تفصيل وظائف الدوال الست الأساسية ومسار تنفيذ كل دالة أثناء مرحلة التنصيب.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Function 1 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-emerald-400">prepare(rType="MAIN")</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">الخطوة 1</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    تنظيف أقفال الحزم (APT/dpkg locks)، إزالة تعارض <code className="text-amber-400">libcurl4</code> وتثبيت <code className="text-emerald-400">libcurl3</code>، تنزيل وتثبيت مكتبة <code className="text-blue-400">libpng12</code> القديمة لمعالجة شعارات القنوات، وإنشاء مستخدم نظام معزول بدون شل:
                  </p>
                  <pre className="p-2.5 rounded bg-slate-900 text-[11px] text-slate-300 font-mono overflow-x-auto">
                    adduser --system --shell /bin/false --group xtreamcodes
                  </pre>
                </div>

                {/* Function 2 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-emerald-400">install(rType="MAIN")</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">الخطوة 2</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    تنزيل ملف الأرشيف المضغوط إما <code className="text-emerald-400">main.tar.gz</code> أو <code className="text-blue-400">LB.tar.gz</code> من GitHub Mirror، فك الحزمة داخل <code className="text-slate-200">/home/xtreamcodes/</code>، وإلغاء سمة القفل غير القابل للتعديل عن ملف GeoIP إن وجد.
                  </p>
                </div>

                {/* Function 3 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-emerald-400">installadminpanel()</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">الخطوة 3 (MAIN فقط)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    تنزيل حزمة واجهة لوحة التحكم <code className="text-emerald-400">release_22f.zip</code> وفكها، ثم تنزيل ملف التحديثات الإضافية <code className="text-blue-400">newstuff.zip</code> ودمجه، وتعديل ملكية الملفات لصالح المستخدم <code className="text-slate-200">xtreamcodes:xtreamcodes</code>.
                  </p>
                </div>

                {/* Function 4 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-emerald-400">mysql(rUsername, rPassword)</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">الخطوة 4 (MAIN فقط)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    كتابة ملف إعدادات MySQL المخصص المنقول عبر Base64، إعادة تشغيل الخدمة مع ربطها بمكتبة <code className="text-amber-400">libjemalloc</code>، إنشاء قاعدة <code className="text-emerald-400">xtream_iptvpro</code>، استيراد هيكل الجداول، وإضافة حساب المدير وحسابات الاتصال عن بُعد.
                  </p>
                </div>

                {/* Function 5 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-emerald-400">encrypt(...)</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">الخطوة 5</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    توليد ملف الإعدادات المشفر <code className="text-emerald-400">config</code> باستخدام عملية XOR مع المفتاح السري الثابت المشترك ثم ترميز Base64، وهو ما تعتمد عليه ثنائيات النظام للاتصال بقاعدة البيانات.
                  </p>
                </div>

                {/* Function 6 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-emerald-400">configure() & start()</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">الخطوة 6 و 7</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    تركيب أقراص الرام tmpfs، منح صلاحية iptables لمستخدم الخدمة، ضبط قواعد Nginx لإعادة توجيه البث، تمويه الصفحة الرئيسية إلى Google، حظر فحص التراخيص عبر hosts، وتفعيل الخدمة عند إقلاع النظام.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MYSQL CONFIG */}
        {activeTab === "mysql" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white">إعدادات MySQL الفائقة (Base64 Decoded)</h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    الإعدادات الدقيقة التي تم فك ترميزها من المتغير <code className="text-emerald-400">rMySQLCnf</code> لتحمل ضغط آلاف تدفقات الـ IPTV.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  Port: 7999 | Max Conns: 10,000
                </div>
              </div>

              {/* Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    <span>تخزين الذاكرة (Buffer Pool)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    تم ضبط <code className="text-white">innodb_buffer_pool_size = 8G</code> مقسمة على 8 instances لضمان استقرار الجداول داخل الرام دون التوجه للقرص الصلب.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    <span>الكتابة الفائقة (Async Flush)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    تم ضبط <code className="text-white">innodb_flush_log_at_trx_commit = 0</code> لمزامنة السجلات مرة في الثانية، مما يزيد سرعة الإدخال والكتابة بدرجة خيالية.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    <span>حقن Jemalloc المتقدم</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    تحميل <code className="text-white">LD_PRELOAD=.../libjemalloc.so.1</code> لمنع تسرب الذاكرة وتجزؤ الصفحات تحت الضغط العالي.
                  </p>
                </div>
              </div>

              {/* Code Viewer */}
              <div className="mt-4">
                <div className="text-xs text-slate-400 mb-2 font-mono flex items-center justify-between">
                  <span>المحتوى المفكوك لملف /etc/mysql/my.cnf:</span>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-96 leading-relaxed">
{`# Xtream Codes

[client]
port            = 3306

[mysqld_safe]
nice            = 0

[mysqld]
default-authentication-plugin=mysql_native_password
user            = mysql
port            = 7999
basedir         = /usr
datadir         = /var/lib/mysql
tmpdir          = /tmp

lc-messages-dir = /usr/share/mysql
skip-external-locking
skip-name-resolve=1

bind-address            = *

key_buffer_size = 128M
myisam_sort_buffer_size = 4M
max_allowed_packet      = 64M
myisam-recover-options = BACKUP
max_length_for_sort_data = 8192
query_cache_limit = 0
query_cache_size = 0
query_cache_type = 0

expire_logs_days = 10
max_binlog_size = 100M
transaction_isolation = READ-COMMITTED
max_connections  = 10000
open_files_limit = 10240
innodb_open_files =10240
max_connect_errors = 4096
table_open_cache = 4096
table_definition_cache = 4096
tmp_table_size = 1G
max_heap_table_size = 1G
max_execution_time = 0
back_log = 4096

innodb_buffer_pool_size = 8G
innodb_buffer_pool_instances = 8
innodb_read_io_threads = 64
innodb_write_io_threads = 64
innodb_thread_concurrency = 0
innodb_flush_log_at_trx_commit = 0
innodb_flush_method = O_DIRECT
performance_schema = 0
innodb-file-per-table = 1
innodb_io_capacity = 10000
innodb_table_locks = 0
innodb_lock_wait_timeout = 0
innodb_deadlock_detect = 0
innodb_log_file_size = 1G

sql-mode="NO_ENGINE_SUBSTITUTION"`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CRYPTO & SIMULATOR */}
        {activeTab === "crypto" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">تحليل خوارزمية التعمية (XOR Obfuscation) ومحاكي الفك التفاعلي</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  تستخدم منصة Xtream Codes / Xtream UI خوارزمية تشفير متماثلة بدائية مبنية على XOR الدورية مع ترميز Base64 لتخزين إعدادات الاتصال بقاعدة البيانات في ملف <code className="text-emerald-400">/home/xtreamcodes/iptv_xtream_codes/config</code>.
                </p>
              </div>

              {/* Math Explanation */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="text-sm font-semibold text-emerald-400">المعادلة الرياضية للتشفير والفك:</div>
                <div className="text-xs sm:text-sm font-mono text-slate-300 bg-slate-900 p-3 rounded-lg text-left dir-ltr">
                  Ciphertext[i] = Plaintext[i] ⊕ Key[i mod 32]
                </div>
                <p className="text-xs text-slate-400">
                  نظراً لأن عملية XOR ذاتية الانعكاس ($A \oplus B \oplus B = A$)، فإن تشفير النص وفك تشفيره يتمان بنفس الدالة وبنفس المفتاح تماماً. المفتاح الثابت المستخدم في جميع نسخ النظام هو:
                </p>
                <div className="text-xs font-mono text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20 text-left dir-ltr select-all">
                  5709650b0d7806074842c6de575025b1
                </div>
              </div>

              {/* Interactive Tool */}
              <div className="p-5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-white text-sm">محاكي التشفير والفك المباشر في المتصفح</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                    <button
                      onClick={() => {
                        setCipherMode("encrypt");
                        setCipherInput(defaultPayload);
                      }}
                      className={`px-3 py-1 rounded transition ${
                        cipherMode === "encrypt" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      تشفير (Plaintext ➔ Base64 XOR)
                    </button>
                    <button
                      onClick={() => {
                        setCipherMode("decrypt");
                        setCipherInput(runXOR(defaultPayload, cipherKey, "encrypt"));
                      }}
                      className={`px-3 py-1 rounded transition ${
                        cipherMode === "decrypt" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      فك التشفير (Base64 XOR ➔ Plaintext)
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {cipherMode === "encrypt" ? "النص الأصلي (JSON Payload):" : "النص المشفر بـ Base64 (من ملف config):"}
                    </label>
                    <textarea
                      rows={3}
                      value={cipherInput}
                      onChange={(e) => setCipherInput(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      المفتاح السري (XOR Secret Key):
                    </label>
                    <input
                      type="text"
                      value={cipherKey}
                      onChange={(e) => setCipherKey(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-emerald-400">
                        {cipherMode === "encrypt" ? "الناتج المشفر (محتوى ملف config النهائي):" : "الناتج بعد فك التشفير (JSON الواضح):"}
                      </label>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 break-all dir-ltr text-left select-all min-h-[48px]">
                      {cipherResult}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PERFORMANCE & RAM DISK */}
        {activeTab === "performance" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">هندسة الأداء الفائقة: RAM Disks وقواعد Nginx</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  كيف استطاعت المنظومة تشغيل آلاف القنوات التلفزيونية المتزامنة على خوادم تجارية دون إتلاف العتاد.
                </p>
              </div>

              {/* tmpfs Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <HardDrive className="w-5 h-5" />
                  <span>تخزين الذاكرة العشوائية tmpfs في ملف /etc/fstab:</span>
                </div>
                <pre className="p-3 rounded-lg bg-slate-900 text-xs font-mono text-slate-200 overflow-x-auto text-left dir-ltr">
{`tmpfs /home/xtreamcodes/iptv_xtream_codes/streams tmpfs defaults,noatime,nosuid,nodev,noexec,mode=1777,size=90% 0 0
tmpfs /home/xtreamcodes/iptv_xtream_codes/tmp tmpfs defaults,noatime,nosuid,nodev,noexec,mode=1777,size=3G 0 0`}
                </pre>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-white block mb-1">سرعة إدخال وإخراج قصوى</span>
                    <span className="text-slate-400">قراءة وكتابة بسرعة الذاكرة العشوائية بمعدل أكثر من 10 جيجابايت/ثانية بزمن استجابة شبه معدوم.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-white block mb-1">حماية أقراص التخزين SSD</span>
                    <span className="text-slate-400">تقطيع البث الحي يولد آلاف الملفات المؤقتة في الدقيقة، وكتابتها على القرص الصلب تدمره في أشهر وجيزة.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-white block mb-1">أمان النظام (nosuid, noexec)</span>
                    <span className="text-slate-400">خيارات الحماية تمنع تنفيذ أي ملفات ضارة أو رفع صلاحيات المستخدم من داخل مجلدات البث المؤقتة.</span>
                  </div>
                </div>
              </div>

              {/* Nginx Rewrite Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <ArrowRightLeft className="w-5 h-5" />
                  <span>قواعد توجيه الروابط في Nginx (Stream URL Rewriting):</span>
                </div>
                <pre className="p-3 rounded-lg bg-slate-900 text-xs font-mono text-slate-200 overflow-x-auto text-left dir-ltr">
{`rewrite ^/(.*)/(.*)/(\\d+)\\.(.*)$ /streaming/clients_live.php?username=$1&password=$2&stream=$3&extension=$4 break;
rewrite ^/(.*)/(.*)/(\\d+)$ /streaming/clients_live.php?username=$1&password=$2&stream=$3&extension=ts break;`}
                </pre>
                <p className="text-xs text-slate-300 leading-relaxed">
                  تسمح هذه القواعد لجميع تطبيقات وأجهزة الاستقبال بطلب القنوات عبر الروابط المألوفة مثل:
                  <br />
                  <code className="text-emerald-400 bg-slate-900 px-2 py-0.5 rounded text-[11px] inline-block mt-1 dir-ltr text-left">
                    http://server:8080/user123/pass456/1080.m3u8
                  </code>
                  <br />
                  حيث يتم فك التوجيه داخلياً لتمرير الطلب إلى معالج المصادقة PHP للتحقق من صلاحية الحساب ثم تدفق الفيديو دون إعادة توجيه ظاهرة للعميل.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SECURITY */}
        {activeTab === "security" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">التقييم الأمني الشامل والثغرات المكتشفة</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  تحليل نقاط الضعف والمخاطر التصميمية في سكربت التثبيت ومنظومة Xtream UI.
                </p>
              </div>

              <div className="space-y-4">
                {/* Vulnerability 1 */}
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <ShieldAlert className="w-4 h-4" />
                      <span>مفتاح التشفير ثابت ومكشوف في الكود المصدري (Hardcoded Secret Key)</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">خطورة حرجة</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    المفتاح <code className="text-rose-300">5709650b0d7806074842c6de575025b1</code> ثابت ومعلوم للجميع. أي مستخدم يملك وصولاً لملف <code className="text-slate-200">config</code> يستطيع استخراج كلمة مرور ومضيف قاعدة البيانات خلال ثوانٍ.
                  </p>
                </div>

                {/* Vulnerability 2 */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <ShieldAlert className="w-4 h-4" />
                      <span>فتح منفذ قاعدة البيانات 7999 لكافة عناوين الإنترنت (% Wildcard Grant)</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">خطورة عالية</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    أمر <code className="text-amber-300">GRANT ... TO 'user_iptvpro'@'%'</code> يعرض خادم MySQL للهجمات المباشرة من أي مكان في العالم بدلاً من قصر الوصول على عناوين خوادم الـ LB المصرح لها.
                  </p>
                </div>

                {/* Vulnerability 3 */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                      <ShieldAlert className="w-4 h-4" />
                      <span>الاعتماد على بيئات تقنية منتهية الصلاحية (EOL Tech Debt)</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">خطورة متوسطة</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    يعتمد المشروع على <strong>Python 2.7</strong> و <strong>Ubuntu 16.04/18.04</strong> ومكتبات قديمة مثل <code className="text-slate-200">libpng12-0</code> و <code className="text-slate-200">mcrypt</code> التي لم تعد تتلقى أي تحديثات أمنية لمعالجة ثغرات الثغرات المعروفة (CVEs).
                  </p>
                </div>

                {/* Vulnerability 4 */}
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                      <ShieldAlert className="w-4 h-4" />
                      <span>المخاطرة باتساق البيانات (Non-ACID Flush Settings)</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">مخاطر تشغيلية</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    تعطيل <code className="text-purple-300">innodb_flush_log_at_trx_commit</code> وتعطيل كشف التعليق <code className="text-purple-300">innodb_deadlock_detect</code> يهدد بتلف قاعدة البيانات أو فقدان آخر عمليات المشتركين عند انقطاع الكهرباء المفاجئ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: DEPRECATED LIBRARIES & PACKAGES */}
        {activeTab === "deprecated" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-2">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>تحليل الديون التقنية وانتهاء الصلاحية (EOL)</span>
                </div>
                <h2 className="text-xl font-bold text-white">المكتبات والتبعيات التي أصبحت غير مدعومة حالياً</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  تفصيل شامل لجميع الحزم واللغات والمكتبات الواردة في السكربت التي تم إيقاف دعمها رسمياً ومخاطرها وبدائلها الحديثة.
                </p>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-rose-400">Python 2.7</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">EOL: 2020</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    أوقفت مؤسسة بايثون دعم Python 2 نهائياً في 1 يناير 2020. حُذفت حزمها من مستودعات التوزيعات الحديثة ولا تتلقى أي ترقيعات أمنية.
                  </p>
                  <div className="text-[11px] text-emerald-400 font-medium">البديل: Python 3.11+ / 3.12+</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-rose-400">libcurl3</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">مهجورة</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    أزيلت من التوزيعات الحديثة واستبدلت بـ libcurl4. السكربت يفرض حذف libcurl4 ليعمل كود Xtream Codes القديم، مما يكسر حزم النظام الحديثة.
                  </p>
                  <div className="text-[11px] text-emerald-400 font-medium">البديل: libcurl4 الحديثة</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-rose-400">mcrypt (PHP)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">أزيلت في PHP 7.2</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    توقفت صيانة مكتبة mcrypt منذ عام 2007، واعتُبرت غير آمنة ومتروكة، وأزيلت رسمياً من نواة PHP بدءاً من الإصدار 7.2.
                  </p>
                  <div className="text-[11px] text-emerald-400 font-medium">البديل: OpenSSL أو Libsodium</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-rose-400">libpng12-0</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">ثغرات حرجة</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    أزيلت منذ 2016 من Ubuntu وتتضمن ثغرات فيض ذاكرة خطيرة (Buffer Overflow). يضطر السكربت لتنزيل حزمة .deb عتيقة يدوياً.
                  </p>
                  <div className="text-[11px] text-emerald-400 font-medium">البديل: libpng16 القياسية</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-rose-400">Ubuntu 16.04 / 18.04</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">EOL: 2021/2023</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    كلا الإصدارين انتهت فترة دعمهما القياسي ولا تصدر لهما تحديثات أمنية مجانية، ولا يمكن للسكربت العمل على 22.04 أو 24.04.
                  </p>
                  <div className="text-[11px] text-emerald-400 font-medium">البديل: Ubuntu 22.04/24.04 LTS أو Docker</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-rose-400">mysql_native_password</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">معطل في MySQL 8.4</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    تم إيقافه واعتباره قديماً في MySQL 8.0 وأصبح معطلاً/محذوفاً افتراضياً في MySQL 8.4 LTS لاستبداله بتجزئة SHA-256.
                  </p>
                  <div className="text-[11px] text-emerald-400 font-medium">البديل: caching_sha2_password</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-rose-400">urllib2 & izip</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">محذوفة في Py3</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    وحدات قياسية خاصة ببايثون 2 فقط؛ في بايثون 3 تم دمج urllib2 في urllib.request، وأصبحت zip() هي المكرر التلقائي.
                  </p>
                  <div className="text-[11px] text-emerald-400 font-medium">البديل: urllib.request / requests / zip()</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-rose-400">libjemalloc1</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">استبدلت</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    الجيل الأول من مكتبة تخصيص الذاكرة؛ تم استبدالها في جميع الأنظمة الحديثة بحزمة libjemalloc2 مع تحسينات جوهرية.
                  </p>
                  <div className="text-[11px] text-emerald-400 font-medium">البديل: libjemalloc2</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-rose-400">GeoLite2 Direct Link</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">متوقفة 2019</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    أوقفت شركة MaxMind روابط التحميل المباشرة بدون ترخيص في ديسمبر 2019 بسبب لوائح حماية البيانات (GDPR)، والروابط القديمة معطلة.
                  </p>
                  <div className="text-[11px] text-emerald-400 font-medium">البديل: MaxMind API Key أو DB-IP</div>
                </div>
              </div>

              {/* Comprehensive Table */}
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-right text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 px-4">المكون / المكتبة</th>
                      <th className="py-3 px-4">التصنيف</th>
                      <th className="py-3 px-4">تاريخ انتهاء الدعم (EOL)</th>
                      <th className="py-3 px-4">سبب عدم الدعم والمخاطر</th>
                      <th className="py-3 px-4 text-emerald-400">البديل الحديث المعتمد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-3 px-4 font-mono font-bold text-white">Python 2.7</td>
                      <td className="py-3 px-4">لغة البرمجة</td>
                      <td className="py-3 px-4 text-rose-400">يناير 2020</td>
                      <td className="py-3 px-4">توقف التحديثات الأمنية، عدم التوافق مع التوزيعات الحديثة</td>
                      <td className="py-3 px-4 text-emerald-400">Python 3.12+</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-bold text-white">libcurl3</td>
                      <td className="py-3 px-4">بروتوكولات الشبكة</td>
                      <td className="py-3 px-4 text-amber-400">مهجورة (Ubuntu 18+)</td>
                      <td className="py-3 px-4">حذف libcurl4 لتركيبها يكسر برامج النظام الحديثة مثل git و curl</td>
                      <td className="py-3 px-4 text-emerald-400">libcurl4</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-bold text-white">mcrypt</td>
                      <td className="py-3 px-4">تشفير PHP</td>
                      <td className="py-3 px-4 text-rose-400">محذوفة (PHP 7.2)</td>
                      <td className="py-3 px-4">مكتبة متروكة منذ 2007 ومليئة بالثغرات غير المرقّعة</td>
                      <td className="py-3 px-4 text-emerald-400">OpenSSL / Libsodium</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-bold text-white">libpng12-0</td>
                      <td className="py-3 px-4">معالجة الصور</td>
                      <td className="py-3 px-4 text-rose-400">أزيلت عام 2016</td>
                      <td className="py-3 px-4">ثغرات فيض الذاكرة (Buffer Overflow) CVE-2015-8126</td>
                      <td className="py-3 px-4 text-emerald-400">libpng16-16</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-bold text-white">Ubuntu 16.04 / 18.04</td>
                      <td className="py-3 px-4">نظام التشغيل</td>
                      <td className="py-3 px-4 text-rose-400">2021 / 2023</td>
                      <td className="py-3 px-4">خروج من الدعم القياسي وغياب التحديثات الأمنية للنواة</td>
                      <td className="py-3 px-4 text-emerald-400">Ubuntu 24.04 LTS / Debian 12</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-bold text-white">nscd</td>
                      <td className="py-3 px-4">كاش DNS</td>
                      <td className="py-3 px-4 text-amber-400">غير مستحسن</td>
                      <td className="py-3 px-4">مشاكل عدم اتساق الذاكرة وتعليق استعلامات النطاقات</td>
                      <td className="py-3 px-4 text-emerald-400">systemd-resolved</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: MODERNIZED install.py */}
        {activeTab === "script" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Intro */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>إعادة كتابة كاملة بـ Python 3</span>
              </div>
              <h2 className="text-xl font-bold text-white">الملف الجديد: install.py</h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-4xl">
                تمت إعادة كتابة السكربت مع الحفاظ على <strong className="text-slate-200">نفس البنية الوظيفية حرفياً</strong>: نفس أسماء الدوال
                (<code className="text-emerald-400 mx-1">prepare / install / installadminpanel / mysql / encrypt / configure / start</code>)،
                ونفس تسلسل التنفيذ، ونفس الرسائل والأسئلة التفاعلية، ونفس الملفات الناتجة على القرص —
                مع استبدال كل مكتبة وحزمة وتعليمة إعداد لم تعد مدعومة في إصدارات أوبونتو الحديثة.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">لغة السكربت</div>
                  <div className="text-sm font-bold text-white mt-0.5">Python 3.8+</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">أنظمة التشغيل المدعومة</div>
                  <div className="text-sm font-bold text-white mt-0.5">20.04 / 22.04 / 24.04</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">عدد الحزم في القائمة</div>
                  <div className="text-sm font-bold text-white mt-0.5">20 حزمة (3 للـ MAIN)</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
                  <div className="text-[11px] text-slate-400">توافق مخرج XOR مع الأصل</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">مطابق 100%</div>
                </div>
              </div>
            </div>

            {/* Replacement table */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">جدول الاستبدالات الكامل (الأصلي ➔ الجديد)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 px-3">العنصر الأصلي (غير مدعوم)</th>
                      <th className="py-3 px-3 text-emerald-400">البديل في install.py</th>
                      <th className="py-3 px-3">سبب الاستبدال</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {[
                      ["#!/usr/bin/python (Python 2.7)", "#!/usr/bin/python3", "بايثون 2 انتهت في 2020 وحُذفت من المستودعات"],
                      ["import urllib2", "urllib.request + دالة download()", "urllib2 لم تعد موجودة، مع إعادة محاولة 3 مرات وتحقق من الملف"],
                      ["from itertools import izip", "zip() المدمجة", "izip حُذفت في بايثون 3"],
                      ['.encode("base64")', "base64.b64encode / b64decode", "الفصل بين str و bytes في بايثون 3"],
                      ["random.choice() لكلمات المرور", "secrets.choice()", "كلمات المرور تتطلب مولداً آمناً تشفيرياً CSPRNG"],
                      ["libcurl3 + حذف libcurl4", "libcurl4 / libcurl4t64", "libcurl3 غير موجودة وحذف libcurl4 يكسر curl و git"],
                      ["mcrypt", "openssl", "متروكة منذ 2007 وحُذفت من PHP 7.2"],
                      ["nscd", "systemd-resolved", "nscd مهجور ويعاني من مشاكل اتساق الكاش"],
                      ["libpng12-0 (.deb يدوي)", "libpng16-16 / libpng16-16t64", "ثغرة CVE-2015-8126 وحُذفت الحزمة عام 2016"],
                      ["libgeoip-dev (GeoIP Legacy)", "libmaxminddb-dev (GeoIP2)", "قاعدة Legacy أُوقفت والملف المستخدم أصلاً .mmdb"],
                      ["libjemalloc1 (libjemalloc.so.1)", "libjemalloc2 (libjemalloc.so.2)", "الإصدار الثاني هو المتوفر والمدعوم"],
                      ["python-paramiko", "python3-paramiko", "حزم بايثون 2 حُذفت من المستودعات"],
                      ['os.system("... %s" % input)', "subprocess.run([...]) + shlex.quote()", "سد ثغرة حقن الأوامر عند تمرير مدخلات المستخدم"],
                      ["تعديل /etc/sudoers مباشرة", "/etc/sudoers.d/xtreamcodes + visudo -c", "خطأ نحوي واحد في sudoers يقفل الوصول للجذر"],
                      ["استبدال /lib/systemd/system/mysql.service", "Drop-in في mysql.service.d/", "الملف مملوك للحزمة ويُستعاد عند كل تحديث"],
                      ["GRANT ... IDENTIFIED BY", "CREATE USER ... ; GRANT ... ;", "بناء الجملة حُذف نهائياً في MySQL 8.0"],
                      ["mysql_native_password (افتراضي)", "كتلة مصادقة واعية بالإصدار", "معطلة في MySQL 8.4 ومحذوفة في 9.x"],
                      ["query_cache_limit / size / type", "حُذفت كلياً", "أُزيلت من MySQL 8.0 وتمنع إقلاع mysqld"],
                      ["expire_logs_days = 10", "binlog_expire_logs_seconds = 864000", "حُذفت في MySQL 8.4"],
                      ["innodb_log_file_size = 1G", "innodb_redo_log_capacity = 1G", "حُذفت في MySQL 8.4 (لإصدارات 8.0.30+)"],
                      ["innodb_buffer_pool_instances = 8", "تُحسب ديناميكياً وتُحذف في 8.4+", "حُذفت التعليمة في MySQL 8.4"],
                      ["innodb_buffer_pool_size = 8G ثابتة", "60% من الذاكرة الفعلية (512M–8G)", "القيمة الثابتة تُفشل الإقلاع على VPS صغير"],
                      ["innodb_lock_wait_timeout = 0", "50", "القيمة 0 تُرجع خطأ فورياً عند أي تنافس على الأقفال"],
                      ["Ubuntu 16.04 / 18.04", "Ubuntu 20.04 / 22.04 / 24.04", "خرجتا من الدعم القياسي في 2021 و 2023"],
                      ["service mysql restart", "systemctl daemon-reload + restart", "أمر service مهجور في بيئات systemd"],
                      ["تنزيل GeoLite2.mmdb برابط مباشر", "geoipupdate + MAXMIND_LICENSE_KEY", "MaxMind أوقفت التنزيل المجهول في ديسمبر 2019"],
                      ["unzip -o && cp -rf عبر الصدفة", "zipfile مع testzip() للتحقق من CRC", "يمنع الكتابة الجزئية عند تلف الأرشيف"],
                      ["@reboot في /etc/crontab", "وحدة xtreamcodes.service نظامية", "systemd هو الآلية الرسمية والمدعومة"],
                    ].map(([oldPkg, newPkg, reason]) => (
                      <tr key={oldPkg}>
                        <td className="py-2.5 px-3 font-mono text-rose-300/90 whitespace-nowrap">{oldPkg}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-300">{newPkg}</td>
                        <td className="py-2.5 px-3 text-slate-400">{reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Preserved behaviour */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">ما تم الحفاظ عليه حرفياً (لضمان التوافق مع الثنائيات المغلقة)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    title: "مفتاح تشفير XOR دون تغيير",
                    body: "بقي المفتاح 5709650b0d7806074842c6de575025b1 مطابقاً بتاً ببت، لأن ثنائيات PHP/C داخل main.tar.gz تفك تشفير ملف config بنفسها. تم التحقق أن مخرج encrypt() الجديدة مطابق تماماً لمخرج الدالة الأصلية في بايثون 2.",
                  },
                  {
                    title: "منافذ النظام كما هي",
                    body: "قاعدة البيانات 7999، البث المباشر 8080 و 8443، وتدفقات RTMP على 8880.",
                  },
                  {
                    title: "المسارات والجداول والمستخدمون",
                    body: "/home/xtreamcodes/iptv_xtream_codes/ وقاعدة xtream_iptvpro ومستخدم user_iptvpro دون أي تغيير.",
                  },
                  {
                    title: "نقاط تركيب tmpfs",
                    body: "90% من الذاكرة لمجلد streams و 3G لمجلد tmp، بنفس خيارات الأمان nosuid,nodev,noexec.",
                  },
                  {
                    title: "آليات التمويه",
                    body: "رمز الدخول العشوائي للوحة التحكم، إعادة توجيه wwwdir/index.php إلى Google، وتحييد نطاقات xtream-codes.com في /etc/hosts.",
                  },
                  {
                    title: "بنية الحزم الخاصة بالـ LB",
                    body: "تبقى آخر ثلاث حزم مخصصة للخادم الرئيسي فقط وتُحذف عبر rPackages[:-3] تماماً كما في الأصل.",
                  },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="text-sm font-semibold text-emerald-400">{item.title}</div>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Code viewer */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">الكود المصدري الكامل لملف install.py</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {scriptContent.split("\n").length} سطر • محفوظ في جذر المشروع
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? "تم النسخ!" : "نسخ الكود"}</span>
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل install.py</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800 max-h-[620px] overflow-auto">
                <pre className="text-[11px] font-mono leading-relaxed">
                  <code>
                    {scriptContent.split("\n").map((line, idx) => (
                      <div key={idx} className="flex hover:bg-slate-900/60">
                        <span className="sticky left-0 select-none w-12 shrink-0 px-2 text-left text-slate-600 bg-slate-950 border-l border-slate-800/80">
                          {idx + 1}
                        </span>
                        <span className="px-3 whitespace-pre text-slate-300">{line || " "}</span>
                      </div>
                    ))}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: MODERN COMPARISON */}
        {activeTab === "modern" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">المقارنة الهندسية: منظومة Xtream UI مقابل المعايير الحديثة (2026)</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  كيف تطورت هندسة معالجة وبث الفيديو عبر الإنترنت خلال السنوات الماضية.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 px-4">المحور</th>
                      <th className="py-3 px-4 text-amber-400">منظومة Xtream UI الكلاسيكية</th>
                      <th className="py-3 px-4 text-emerald-400">معايير البث الحديثة (2026)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">بيئة التشغيل والنشر</td>
                      <td className="py-3 px-4">سكربت بايثون 2 ينفذ أوامر Bash مباشرة على بيئة الخادم الخام</td>
                      <td className="py-3 px-4">حاويات مستقلة ومعزولة (Docker & Kubernetes Helm Charts)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">محركات البث المتطورة</td>
                      <td className="py-3 px-4">نسخ Nginx قديمة مع إضافات RTMP المغلقة و PHP-FPM</td>
                      <td className="py-3 px-4">خوادم حديثة مبنية بلغات Go و Rust (مثل SRS, MediaMTX, Flussonic)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">بروتوكولات البث وزمن التأخير</td>
                      <td className="py-3 px-4">MPEG-TS و HLS التقليدي بمهلة تأخير تتراوح بين 10 إلى 20 ثانية</td>
                      <td className="py-3 px-4">Low-Latency HLS (LL-HLS) و WebRTC و CMAF بمهلة أقل من ثانية واحدة</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">أمان السرية والتشفير</td>
                      <td className="py-3 px-4">تعمية XOR متماثلة بدائية ومفتاح ثابت</td>
                      <td className="py-3 px-4">إدارة أسرار عبر HashiCorp Vault وتشفير متبادل mTLS و AES-256-GCM</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-white">المراقبة والاستقرار</td>
                      <td className="py-3 px-4">سكربت بايثون/PHP دوري لمراقبة معرفات العمليات (PID Monitor)</td>
                      <td className="py-3 px-4">أنظمة Prometheus و Grafana و OpenTelemetry مع إعادة تشغيل ذاتي</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: RAW MARKDOWN */}
        {activeTab === "raw" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">ملف التقرير المصدري الكامل (report.md)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    النص الكامل المولد والمحفوظ في جذر المشروع.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? "تم النسخ!" : "نسخ المحتوى"}</span>
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل report.md</span>
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 max-h-[600px] overflow-y-auto">
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
                  {markdownContent}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            تم إعداد التقرير وتوثيق التحليل في ملف <span className="font-mono text-emerald-400">report.md</span>
          </p>
          <p className="text-slate-400">
            Xtream UI Architecture Analysis & Engineering Report
          </p>
        </div>
      </footer>
    </div>
  );
}
