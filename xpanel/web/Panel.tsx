"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowLeftRight, Bell, ChartNoAxesCombined, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Ellipsis, FileText, LayoutDashboard, ListFilter, LockKeyhole, LogOut, Menu, Moon, Plus, RefreshCw, Search, Server,
  Settings2, ShieldCheck, Sun, Tv, UsersRound, X, type LucideIcon,
} from "lucide-react";
import {
  categories, channelStatuses, emptySnapshot, plans, qualities, serverStatuses, subscriberStatuses,
  type Channel, type Command, type Entity, type Item, type PanelServer, type Snapshot, type Subscriber, type View,
} from "./model";
import { AudienceChart, ChannelIdentity, DateBadge, Intro, KPIs, LogoMark, ServersCard, Status, formatDate, formatNumber } from "./visuals";

const views: Record<View, { title: string; subtitle: string; icon: LucideIcon }> = {
  overview: { title: "نظرة عامة", subtitle: "تابع أداء منصتك وأدر عمليات البث من مكان واحد.", icon: LayoutDashboard },
  channels: { title: "القنوات", subtitle: "استعرض القنوات ونظّم التصنيفات والجودة وحالة العرض.", icon: Tv },
  subscribers: { title: "المشتركون", subtitle: "أدر حسابات المشتركين وخططهم وحالة الاشتراكات.", icon: UsersRound },
  servers: { title: "الخوادم", subtitle: "سجّل خوادمك وراجع حالتها واستخدام الموارد.", icon: Server },
  analytics: { title: "الإحصاءات", subtitle: "استعرض مؤشرات المشاهدة وسجل النشاط في مساحة العمل.", icon: ChartNoAxesCombined },
  settings: { title: "الإعدادات", subtitle: "خصّص تجربة لوحة التحكم وراجع وضع مساحة العمل.", icon: Settings2 },
};
const menus: [string, View[]][] = [["مساحة العمل", ["overview", "channels", "subscribers", "servers", "analytics"]], ["النظام", ["settings"]]];
const entityLabels: Record<Entity, { single: string; add: string; fresh: string; status: Record<string, string>; columns: string[] }> = {
  channels: { single: "القناة", add: "إضافة قناة", fresh: "أضف قناة إلى سجل البث.", status: channelStatuses, columns: ["اسم القناة", "الجودة", "الحالة", "المشاهدون"] },
  subscribers: { single: "المشترك", add: "إضافة مشترك", fresh: "أضف مشتركًا لإدارة بيانات الاشتراك.", status: subscriberStatuses, columns: ["المشترك", "الخطة", "الحالة", "تاريخ الإضافة"] },
  servers: { single: "الخادم", add: "إضافة خادم", fresh: "أضف خادمًا إلى دليل مساحة العمل.", status: serverStatuses, columns: ["الخادم", "الحالة", "حمل الموارد", "حركة البيانات"] },
};
const entityViews: Entity[] = ["channels", "subscribers", "servers"];
const rowPageSize = 8;
const sidebarReport = "/report";

type Theme = "light" | "dark";
type Editing = { entity: Entity; item?: Item };
type Properties = { initial?: Snapshot; endpoint: string; demo?: boolean; today?: string; csrf?: string; logout?: string; profile?: string };

function Dialog({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className="xp-dialog" aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="xp-dialog-surface">
      <div className="xp-dialog-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="xp-icon-button xp-close" aria-label="إغلاق" onClick={onClose}><X size={19} /></button></div>
      {children}
    </div>
  </dialog>;
}

function Input({ label, name, value, type = "text", max, step, required = true }: { label: string; name: string; value?: string | number; type?: string; max?: number; step?: number; required?: boolean }) {
  return <label className="xp-field"><span>{label}</span><input autoComplete="off" type={type} name={name} defaultValue={value} required={required} maxLength={type === "text" || type === "email" ? max : undefined} min={type === "number" ? 0 : undefined} max={type === "number" ? max : undefined} step={step} dir={type === "email" || type === "number" ? "ltr" : "auto"} /></label>;
}
function Select({ label, name, value, options }: { label: string; name: string; value?: string; options: Record<string, string> }) {
  const id = useId();
  return <div className="xp-field"><label htmlFor={id}>{label}</label><select id={id} name={name} defaultValue={value}>{Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></div>;
}

function Editor({ value, busy, error, onClose, onSubmit }: { value: Editing; busy: boolean; error: string; onClose: () => void; onSubmit: (command: Command) => void }) {
  const [confirm, setConfirm] = useState(false);
  const { entity, item } = value;
  const meta = entityLabels[entity];
  const channel = entity === "channels" ? item as Channel | undefined : undefined;
  const subscriber = entity === "subscribers" ? item as Subscriber | undefined : undefined;
  const server = entity === "servers" ? item as PanelServer | undefined : undefined;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data: Record<string, string | number> = {};
    form.forEach((input, key) => { data[key] = ["viewers", "load", "traffic"].includes(key) ? Number(input) : String(input).trim(); });
    onSubmit({ entity, action: item ? "update" : "create", id: item?.id, data });
  }
  return <Dialog title={item ? `تعديل ${meta.single}` : meta.add} description={item ? item.name : meta.fresh} onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={submit} className="xp-editor">
      <fieldset className="xp-editor-fields" disabled={busy}>
        <Input label="الاسم" name="name" value={item?.name} max={80} />
        {entity === "channels" ? <div className="xp-fields-grid">
          <Select label="التصنيف" name="category" value={channel?.category} options={categories} />
          <Select label="الجودة" name="quality" value={channel?.quality ?? "1080p"} options={qualities} />
          <Select label="الحالة" name="status" value={channel?.status ?? "scheduled"} options={channelStatuses} />
          <Input label="المشاهدون الحاليون" name="viewers" value={channel?.viewers ?? 0} type="number" max={10000000} step={1} />
        </div> : entity === "subscribers" ? <>
          <Input label="البريد الإلكتروني" name="email" value={subscriber?.email} type="email" max={254} />
          <div className="xp-fields-grid"><Select label="الخطة" name="plan" value={subscriber?.plan} options={plans} /><Select label="الحالة" name="status" value={subscriber?.status ?? "active"} options={subscriberStatuses} /></div>
        </> : <>
          <Input label="المنطقة" name="region" value={server?.region} max={80} />
          <div className="xp-fields-grid"><Select label="الحالة" name="status" value={server?.status ?? "online"} options={serverStatuses} /><Input label="حمل الموارد (%)" name="load" value={server?.load ?? 0} type="number" max={100} step={1} /><Input label="حركة البيانات (Gbps)" name="traffic" value={server?.traffic ?? 0} type="number" max={1000} step={0.1} /></div>
        </>}
      </fieldset>
      {error && <p className="xp-error" role="alert">{error}</p>}
      {confirm && item && <div className="xp-delete-confirm"><span>هل تريد حذف هذا السجل نهائيًا؟</span><button type="button" className="xp-button danger" disabled={busy} onClick={() => onSubmit({ entity, action: "delete", id: item.id })}>تأكيد الحذف</button></div>}
      <div className="xp-dialog-actions">{item && !confirm && <button type="button" className="xp-delete" onClick={() => setConfirm(true)} disabled={busy}>حذف السجل</button>}<div className="xp-action-spacer" /><button type="button" className="xp-button quiet" onClick={() => confirm ? setConfirm(false) : onClose()} disabled={busy}>إلغاء</button><button type="submit" className="xp-button primary" disabled={busy || confirm}>{busy ? "جارٍ الحفظ…" : "حفظ التغييرات"}</button></div>
    </form>
  </Dialog>;
}

function RecordsTable({ entity, items, onEdit }: { entity: Entity; items: Item[]; onEdit: (item: Item) => void }) {
  const meta = entityLabels[entity];
  return <div className="xp-table-scroll"><table className="xp-table"><thead><tr>{meta.columns.map((label) => <th key={label}>{label}</th>)}<th className="xp-table-actions">إجراءات</th></tr></thead><tbody>
    {items.map((item) => <tr key={item.id}>
      {entity === "channels" ? (() => { const c = item as Channel; return <><td><ChannelIdentity channel={c} /></td><td><bdi className="xp-quality">{c.quality}</bdi></td><td><Status status={c.status} label={channelStatuses[c.status]} /></td><td><bdi className="xp-numeric">{formatNumber(c.viewers)}</bdi></td></>; })()
        : entity === "subscribers" ? (() => { const sub = item as Subscriber; return <><td><div className="xp-identity"><span className="xp-channel-mark subscriber">{sub.name.slice(0, 1)}</span><div><b><bdi>{sub.name}</bdi></b><small><bdi>{sub.email}</bdi></small></div></div></td><td>{plans[sub.plan]}</td><td><Status status={sub.status} label={subscriberStatuses[sub.status]} /></td><td>{formatDate(sub.createdAt, true)}</td></>; })()
          : (() => { const server = item as PanelServer; return <><td><div className="xp-identity"><span className="xp-channel-mark server"><Server size={17} /></span><div><b><bdi>{server.name}</bdi></b><small>{server.region}</small></div></div></td><td><Status status={server.status} label={serverStatuses[server.status]} /></td><td><bdi className="xp-numeric">{server.load}%</bdi></td><td><bdi className="xp-numeric">{formatNumber(server.traffic)} Gbps</bdi></td></>; })()}
      <td className="xp-table-actions"><button type="button" className="xp-icon-button xp-dots" title={`تعديل ${item.name}`} aria-label={`تعديل ${item.name}`} onClick={() => onEdit(item)}><Ellipsis size={19} /></button></td>
    </tr>)}
  </tbody></table></div>;
}

function downloadFile(filename: string, data: string) {
  const objectUrl = URL.createObjectURL(new Blob(["\ufeff", data], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
function escapeCell(data: string | number) {
  const input = String(data);
  return `"${(/^[=+@\-\s]/.test(input) ? `'${input}` : input).replaceAll('"', '""')}"`;
}

export default function Panel({ initial = emptySnapshot, endpoint, demo = false, today, csrf, logout, profile = "مسؤول النظام" }: Properties) {
  const [data, setData] = useState<Snapshot>(initial);
  const [view, setView] = useState<View>("overview");
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [retry, setRetry] = useState(0);
  const [sidebar, setSidebar] = useState(false);
  const [popover, setPopover] = useState<"notification" | "profile" | null>(null);
  const [seen, setSeen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [globalText, setGlobalText] = useState("");
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [toast, setToast] = useState("");
  const toolbar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { if (localStorage.getItem("xpanel-theme") === "dark") setTheme("dark"); } catch { /* optional */ }
    const applyHash = () => { const name = window.location.hash.slice(1); if (Object.hasOwn(views, name)) setView(name as View); else setView("overview"); };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? "انتهت الجلسة. أعد تحميل الصفحة لتسجيل الدخول." : "تعذر الاتصال بمساحة العمل.");
        setData(await response.json() as Snapshot);
        setNetworkError("");
        setReady(true);
      }).catch((error: Error) => { if (error.name !== "AbortError") { setNetworkError(error.message || "تعذر الاتصال بمساحة العمل."); setReady(false); } });
    return () => controller.abort();
  }, [endpoint, retry]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (!editing) { setGlobalText(""); setSearching(true); } }
      if (event.key === "Escape") { setPopover(null); setSidebar(false); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editing]);
  useEffect(() => {
    if (!popover) return;
    const close = (event: PointerEvent) => { if (event.target instanceof Node && !toolbar.current?.contains(event.target)) setPopover(null); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [popover]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3500); return () => window.clearTimeout(timer); }, [toast]);

  function navigate(next: View) {
    setView(next); setSidebar(false); setPopover(null); setFilterText(""); setFilterStatus("all"); setPage(1);
    window.history.replaceState(null, "", next === "overview" ? `${location.pathname}${location.search}` : `#${next}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function chooseTheme(next: Theme) {
    setTheme(next);
    try { localStorage.setItem("xpanel-theme", next); } catch { /* optional */ }
  }
  function openEditor(entity: Entity, item?: Item) {
    if (!ready) { setToast("مساحة العمل غير جاهزة بعد."); return; }
    setEditError(""); setEditing({ entity, item });
  }
  async function save(command: Command) {
    if (!ready || busy) return;
    setBusy(true); setEditError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json", "X-XPanel-Request": "workspace" };
      if (csrf) headers["X-XPanel-CSRF"] = csrf;
      const res = await fetch(endpoint, { method: "POST", credentials: "same-origin", headers, body: JSON.stringify(command) });
      const answer = await res.json() as Snapshot & { error?: string };
      if (!res.ok) throw new Error(answer.error || "تعذر حفظ التغييرات.");
      setData(answer); setEditing(null);
      setToast(command.action === "delete" ? "تم حذف السجل." : command.action === "create" ? "تمت إضافة السجل." : "تم حفظ التغييرات.");
      if (command.action === "create") { setFilterText(""); setFilterStatus("all"); setPage(1); }
    } catch (error) { setEditError(error instanceof Error ? error.message : "تعذر حفظ التغييرات."); }
    finally { setBusy(false); }
  }

  const currentEntity = entityViews.includes(view as Entity) ? view as Entity : null;
  const alerts = data.servers.filter((server) => server.status !== "online");
  const activeServers = data.servers.filter((s) => s.status !== "offline").length;
  const rows = useMemo(() => {
    if (!currentEntity) return [];
    const query = filterText.trim().toLowerCase();
    return (data[currentEntity] as Item[]).filter((item) => (filterStatus === "all" || item.status === filterStatus) && (!query || Object.values(item).some((value) => typeof value === "string" && value.toLowerCase().includes(query))));
  }, [data, currentEntity, filterText, filterStatus]);
  const endPage = Math.max(1, Math.ceil(rows.length / rowPageSize));
  const currentPage = Math.min(page, endPage);
  const globalQuery = globalText.trim().toLowerCase();
  const matchedViews = (Object.keys(views) as View[]).filter((key) => !globalQuery || views[key].title.toLowerCase().includes(globalQuery));
  const matchedItems = globalQuery ? entityViews.flatMap((entity) => (data[entity] as Item[]).filter((item) => item.name.toLowerCase().includes(globalQuery) || ("email" in item && item.email.toLowerCase().includes(globalQuery))).slice(0, 3).map((item) => ({ entity, item }))) : [];
  const displayDate = today || new Date().toISOString();

  function exportRows(entity: Entity, items: Item[]) {
    const dataRows = items.map((item) => entity === "channels" ? [item.name, categories[(item as Channel).category], (item as Channel).quality, channelStatuses[(item as Channel).status], (item as Channel).viewers] : entity === "subscribers" ? [item.name, (item as Subscriber).email, plans[(item as Subscriber).plan], subscriberStatuses[(item as Subscriber).status], item.createdAt] : [item.name, (item as PanelServer).region, serverStatuses[(item as PanelServer).status], (item as PanelServer).load, (item as PanelServer).traffic]);
    const head = entity === "channels" ? ["القناة", "التصنيف", "الجودة", "الحالة", "المشاهدون"] : entity === "subscribers" ? ["المشترك", "البريد", "الخطة", "الحالة", "تاريخ الإضافة"] : ["الخادم", "المنطقة", "الحالة", "الحمل (%)", "حركة البيانات (Gbps)"];
    downloadFile(`xpanel-${entity}.csv`, [head, ...dataRows].map((row) => row.map(escapeCell).join(",")).join("\r\n"));
    setToast("تم تجهيز ملف CSV.");
  }

  return <div className="xp" data-theme={theme} dir="rtl">
    <a href="#xpanel-content" className="xp-skip" onClick={(event) => {
      const content = document.getElementById("xpanel-content");
      if (content) { event.preventDefault(); content.focus({ preventScroll: true }); content.scrollIntoView(); }
    }}>انتقل إلى المحتوى</a>
    {sidebar && <button type="button" className="xp-scrim" aria-label="إغلاق القائمة" onClick={() => setSidebar(false)} />}
    <aside className={`xp-sidebar ${sidebar ? "is-open" : ""}`} aria-label="الشريط الجانبي">
      <button type="button" className="xp-brand" onClick={() => navigate("overview")}><LogoMark /><span><bdi className="xp-wordmark">xpanel<span>.</span></bdi><small>إدارة البث</small></span></button>
      <button type="button" className="xp-space" onClick={() => navigate("settings")}><span className="xp-space-mark"><Activity size={16} /></span><span><b>شبكة البث</b><small>{demo ? "مساحة تجريبية" : "مساحة خاصة"}</small></span><ChevronDown size={15} className="xp-space-chevron" /></button>
      <nav className="xp-navigation" aria-label="التنقّل الرئيسي">{menus.map(([label, options]) => <div className="xp-nav-group" key={label}><p>{label}</p>{options.map((key) => { const Icon = views[key].icon; return <button type="button" className={`xp-nav-item ${view === key ? "is-active" : ""}`} aria-current={view === key ? "page" : undefined} key={key} onClick={() => navigate(key)}><Icon size={19} strokeWidth={1.8} /><span>{views[key].title}</span>{view === key && <span className="xp-nav-indicator" />}</button>; })}{label === "النظام" && demo && <a className="xp-nav-item" href={sidebarReport}><FileText size={18} strokeWidth={1.8} /><span>التوثيق التقني</span><ArrowLeft size={13} className="xp-nav-link-arrow" /></a>}</div>)}</nav>
      <div className="xp-side-bottom">
        <div className="xp-network"><span className={`xp-network-dot ${activeServers ? "is-live" : ""}`} /><div><b>حالة الشبكة</b><small>{activeServers ? `${activeServers} خوادم متصلة` : "لا توجد خوادم متصلة"}</small></div><button type="button" className="xp-icon-button" aria-label="عرض حالة الشبكة" onClick={() => navigate("servers")}><ChevronLeft size={16} /></button></div>
        <button type="button" className="xp-help" onClick={() => navigate("settings")}><CircleHelp size={16} /> حول مساحة العمل <bdi>v1.0</bdi></button>
      </div>
    </aside>
    <div className="xp-workspace">
      <header className="xp-topbar">
        <div className="xp-breadcrumb"><button type="button" className="xp-icon-button xp-mobile-menu" aria-label="فتح القائمة" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><Menu size={21} /></button><button type="button" onClick={() => navigate("overview")} className="xp-crumb-home" aria-label="مساحة العمل الرئيسية"><LayoutDashboard size={16} /><span>مساحة العمل</span></button><ChevronLeft size={13} className="xp-crumb-sep" /><span>{views[view].title}</span></div>
        <div ref={toolbar} className="xp-toolbar">
          <button type="button" className="xp-search-trigger" aria-label="فتح البحث" onClick={() => { setGlobalText(""); setSearching(true); setPopover(null); }}><Search size={16} /><span>بحث في اللوحة…</span><kbd dir="ltr">Ctrl K</kbd></button>
          <div className="xp-pop-anchor"><button type="button" className="xp-icon-button xp-bell" aria-label="الإشعارات" aria-expanded={popover === "notification"} onClick={() => setPopover(popover === "notification" ? null : "notification")}><Bell size={19} strokeWidth={1.85} />{!!alerts.length && !seen && <i />}</button>
            {popover === "notification" && <div className="xp-popover"><div className="xp-pop-head"><b>الإشعارات</b>{alerts.length > 0 && <button type="button" onClick={() => setSeen(true)}>{seen ? "تمت القراءة" : "تحديد كمقروءة"}</button>}</div>{alerts.length ? alerts.map((item) => <button type="button" className="xp-alert" key={item.id} onClick={() => { setSeen(true); navigate("servers"); }}><span className="xp-icon-box amber"><Server size={16} /></span><span><b><bdi>{item.name}</bdi></b><small>{serverStatuses[item.status]}</small></span></button>) : <p className="xp-pop-empty">لا توجد إشعارات جديدة.</p>}</div>}
          </div>
          <span className="xp-toolbar-divider" />
          <div className="xp-pop-anchor"><button type="button" className="xp-profile" aria-expanded={popover === "profile"} aria-label="قائمة الحساب" onClick={() => setPopover(popover === "profile" ? null : "profile")}><span className="xp-avatar">م</span><span className="xp-profile-text"><b>المشرف</b><small>{profile}</small></span><ChevronDown size={14} /></button>
            {popover === "profile" && <div className="xp-popover xp-profile-menu"><div className="xp-pop-head"><b>{profile}</b></div><button type="button" className="xp-pop-action" onClick={() => navigate("settings")}><Settings2 size={16} /> إعدادات الواجهة</button>{logout && <form method="post" action={logout}><input type="hidden" name="csrf" value={csrf} /><button name="action" value="logout" className="xp-pop-action" type="submit"><LogOut size={16} /> تسجيل الخروج</button></form>}</div>}
          </div>
        </div>
      </header>
      <main className="xp-main" id="xpanel-content" tabIndex={-1}>
        <div className="xp-heading"><div><h1>{views[view].title}</h1><p>{views[view].subtitle}</p></div><div className="xp-heading-actions">
          {view === "overview" && <><DateBadge date={displayDate} /><button type="button" className="xp-button primary" disabled={!ready} onClick={() => openEditor("channels")}><Plus size={18} /> إضافة قناة</button></>}
          {currentEntity && <><button type="button" className="xp-button quiet" onClick={() => exportRows(currentEntity, rows)} disabled={!rows.length}><ArrowDownToLine size={16} /> تصدير CSV</button><button type="button" className="xp-button primary" disabled={!ready} onClick={() => openEditor(currentEntity)}><Plus size={18} /> {entityLabels[currentEntity].add}</button></>}
          {view === "analytics" && <button type="button" className="xp-button quiet" disabled={!data.history.length} onClick={() => { downloadFile("xpanel-audience.csv", ["date,audience", ...data.history.map((point) => `${point.date},${point.audience}`)].join("\r\n")); setToast("تم تجهيز ملف CSV."); }}><ArrowDownToLine size={16} /> تصدير الإحصاءات</button>}
        </div></div>
        {networkError && <div className="xp-error xp-network-error" role="alert"><span>{networkError}</span><button type="button" onClick={() => setRetry((n) => n + 1)}><RefreshCw size={14} /> إعادة المحاولة</button></div>}
        {view === "overview" && <div className="xp-stack">
          <Intro demo={demo} />
          <KPIs data={data} />
          <div className="xp-widgets"><AudienceChart history={data.history} /><ServersCard servers={data.servers} onOpen={() => navigate("servers")} /></div>
          <section className="xp-card xp-records"><div className="xp-card-top"><div><h2><span className="xp-widget-icon"><Tv size={16} /></span> أحدث القنوات</h2><p>آخر القنوات المضافة إلى مساحة العمل</p></div><button type="button" className="xp-card-link" onClick={() => navigate("channels")}>عرض الكل <ArrowLeft size={15} /></button></div>{data.channels.length ? <RecordsTable entity="channels" items={data.channels.slice(0, 5)} onEdit={(item) => openEditor("channels", item)} /> : <div className="xp-empty"><Tv size={24} /><b>لا توجد قنوات مسجلة</b><button type="button" className="xp-button quiet" disabled={!ready} onClick={() => openEditor("channels")}>إضافة قناة</button></div>}</section>
        </div>}
        {currentEntity && <section className="xp-card xp-records"><div className="xp-card-top xp-record-header"><div><h2><span className="xp-widget-icon"><ListFilter size={16} /></span> سجل {views[currentEntity].title}</h2><p>{formatNumber(rows.length)} سجل يطابق عوامل التصفية</p></div><div className="xp-filters"><label className="xp-search-field"><Search size={17} /><input value={filterText} onChange={(event) => { setFilterText(event.target.value); setPage(1); }} placeholder={`بحث في ${views[currentEntity].title}…`} aria-label={`بحث في ${views[currentEntity].title}`} /></label><select className="xp-filter" aria-label="تصفية حسب الحالة" value={filterStatus} onChange={(event) => { setFilterStatus(event.target.value); setPage(1); }}><option value="all">جميع الحالات</option>{Object.entries(entityLabels[currentEntity].status).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div></div>
          {rows.length ? <RecordsTable entity={currentEntity} items={rows.slice((currentPage - 1) * rowPageSize, currentPage * rowPageSize)} onEdit={(item) => openEditor(currentEntity, item)} /> : <div className="xp-empty"><Search size={26} /><b>لا توجد سجلات مطابقة</b><span>عدّل عوامل التصفية أو أضف سجلًا جديدًا.</span><button type="button" className="xp-button quiet" onClick={() => { setFilterText(""); setFilterStatus("all"); setPage(1); }}>مسح الفلاتر</button></div>}
          <div className="xp-pagination"><p>صفحة <bdi>{currentPage} / {endPage}</bdi></p><div><button type="button" className="xp-icon-button" aria-label="الصفحة السابقة" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronRight size={18} /></button><button type="button" className="xp-icon-button" aria-label="الصفحة التالية" disabled={currentPage >= endPage} onClick={() => setPage(currentPage + 1)}><ChevronLeft size={18} /></button></div></div>
        </section>}
        {view === "analytics" && <div className="xp-stack"><KPIs data={data} /><AudienceChart history={data.history} /><section className="xp-card xp-records"><div className="xp-card-top"><div><h2><span className="xp-widget-icon"><Activity size={16} /></span> سجل المشاهدات</h2><p>آخر القيم المحفوظة، مرتبة من الأحدث</p></div></div>{data.history.length ? <div className="xp-table-scroll"><table className="xp-table"><thead><tr><th>التاريخ</th><th>المشاهدون</th></tr></thead><tbody>{data.history.slice(-8).reverse().map((point) => <tr key={point.date}><td>{formatDate(point.date)}</td><td><bdi>{formatNumber(point.audience)}</bdi></td></tr>)}</tbody></table></div> : <div className="xp-empty"><Activity size={24} /><b>لا يوجد نشاط محفوظ</b></div>}</section></div>}
        {view === "settings" && <div className="xp-settings-grid"><section className="xp-card xp-setting"><div className="xp-card-top"><div><h2><span className="xp-widget-icon"><Settings2 size={16} /></span> المظهر</h2><p>اللغة العربية واتجاه الكتابة من اليمين إلى اليسار، بخط Cairo.</p></div></div><div className="xp-theme-options">{([["light", "فاتح", Sun], ["dark", "داكن", Moon]] as const).map(([key, label, Icon]) => <button type="button" className={theme === key ? "selected" : ""} key={key} aria-pressed={theme === key} onClick={() => chooseTheme(key)}><Icon size={21} /> {label}{theme === key && <Check size={15} />}</button>)}</div><p className="xp-settings-note">يُحفظ تفضيلك في هذا المتصفح.</p></section><section className="xp-card xp-setting"><div className="xp-card-top"><div><h2><span className="xp-widget-icon"><ShieldCheck size={16} /></span> مساحة العمل</h2><p>{demo ? "هذه المعاينة تحتوي بيانات افتراضية، وتغييراتك مرتبطة بهذا المتصفح." : "تُحفظ السجلات في مساحة اللوحة الخاصة، ولا تشغّل محرك البث أو تغيّر إعداداته."}</p></div></div><div className="xp-setting-detail"><LockKeyhole size={17} /><span>{demo ? "معاينة مستقلة عن خادم البث" : "جلسة إدارة خاصة"}</span></div>{demo && <a href={sidebarReport} className="xp-card-link">التوثيق التقني <ArrowLeft size={15} /></a>}</section></div>}
        {view === "settings" && demo && <section className="xp-card xp-setting xp-bundles">
          <div className="xp-card-top"><div><h2><span className="xp-widget-icon"><ArrowDownToLine size={16} /></span> حزمة التثبيت</h2><p>أرشيف واحد جاهز للنشر على <bdi>GitHub Releases</bdi>، وملف بصمته للتحقق.</p></div></div>
          <div className="xp-bundle-links">{["xpanel.zip", "xpanel.zip.sha256"].map((name) => <a className="xp-bundle-link" key={name} href={`/api/xpanel/bundles/${name}`} download><ArrowDownToLine size={14} /><bdi>{name}</bdi></a>)}</div>
        </section>}
        <footer className="xp-footer"><bdi>XPanel &middot; v1.0</bdi><span>{demo ? "بيانات المعاينة توضيحية" : "إدارة سجل البث"}</span></footer>
      </main>
    </div>
    {searching && <Dialog title="البحث في اللوحة" description="انتقل إلى صفحة أو ابحث بالاسم." onClose={() => setSearching(false)}><div className="xp-search-dialog"><label className="xp-search-field"><Search size={19} /><input autoFocus value={globalText} onChange={(event) => setGlobalText(event.target.value)} placeholder="اكتب اسمًا أو صفحة…" aria-label="بحث عام" /></label><div className="xp-search-results">{matchedViews.map((key) => { const Icon = views[key].icon; return <button type="button" key={key} onClick={() => { navigate(key); setSearching(false); }}><Icon size={17} /><span>{views[key].title}</span><ArrowLeft size={14} /></button>; })}{matchedItems.map(({ entity, item }) => <button type="button" key={item.id} onClick={() => { navigate(entity); setSearching(false); openEditor(entity, item); }}><ArrowLeftRight size={17} /><span><bdi>{item.name}</bdi><small>{views[entity].title}</small></span><ArrowLeft size={14} /></button>)}{!matchedViews.length && !matchedItems.length && <p className="xp-pop-empty">لا توجد نتائج.</p>}</div></div></Dialog>}
    {editing && <Editor key={editing.item?.id ?? editing.entity} value={editing} onClose={() => setEditing(null)} onSubmit={save} error={editError} busy={busy || !ready} />}
    {toast && <div className="xp-toast" role="status"><Check size={18} /> {toast}<button type="button" aria-label="إغلاق الرسالة" onClick={() => setToast("")}><X size={17} /></button></div>}
  </div>;
}
