import { useId, useState, type ReactNode } from "react";
import { Activity, ArrowLeft, ArrowUpRight, CalendarDays, CirclePlay, Clapperboard, Eye, Globe2, Music2, Newspaper, Radio, Server, Sparkles, Trophy, Tv, UsersRound, type LucideIcon } from "lucide-react";
import { categories, serverStatuses, type Channel, type HistoryPoint, type PanelServer, type Snapshot } from "./model";

export const formatNumber = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
export const formatDate = (date: string, short = false) => new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: short ? "short" : "long", ...(short ? {} : { year: "numeric" }), timeZone: "UTC" }).format(new Date(date));
export const categoryIcons: Record<Channel["category"], LucideIcon> = { sports: Trophy, news: Newspaper, entertainment: Clapperboard, documentary: Globe2, kids: Sparkles, music: Music2 };

export function LogoMark() {
  return <span className="xp-logo-mark" aria-hidden="true"><Radio size={22} strokeWidth={2.15} /></span>;
}

export function Intro({ demo }: { demo: boolean }) {
  const id = useId().replace(/[^\w-]/g, "");
  return (
    <section className="xp-hero">
      <div className="xp-hero-copy">
        <div className="xp-hero-tag"><span className="xp-pulse" /> {demo ? "مساحة عمل تجريبية" : "مساحة عمل خاصة"}</div>
        <h2>مركز عمليات البث</h2>
        <p>كل ما تحتاجه لمتابعة القنوات والمشتركين والخوادم، في مكان واحد.</p>
      </div>
      <div className="xp-hero-visual" aria-hidden="true">
        <svg direction="ltr" viewBox="0 0 520 185" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id={`${id}grid`} width="26" height="26" patternUnits="userSpaceOnUse"><path d="M 26 0 L 0 0 0 26" fill="none" stroke="#a8c6ff" strokeOpacity=".18" strokeWidth="1" /></pattern>
            <radialGradient id={`${id}glow`}><stop offset="0%" stopColor="#8eafff" stopOpacity=".4" /><stop offset="100%" stopColor="#7ba0ff" stopOpacity="0" /></radialGradient>
            <linearGradient id={`${id}sweep`} x1="0" x2="1" y1="1" y2="0"><stop stopColor="#a7d2ff" stopOpacity="0" /><stop offset="1" stopColor="#8ec3ff" stopOpacity=".63" /></linearGradient>
            <linearGradient id={`${id}wave`}><stop stopColor="#90afff" stopOpacity="0" /><stop offset=".6" stopColor="#a4c0ff" stopOpacity=".72" /><stop offset="1" stopColor="#c5d9ff" stopOpacity="0" /></linearGradient>
          </defs>
          <rect width="520" height="185" fill={`url(#${id}grid)`} />
          <circle cx="242" cy="95" r="155" fill={`url(#${id}glow)`} />
          <g fill="none" stroke="#bad3ff">
            <circle cx="242" cy="95" r="113" strokeOpacity=".26" strokeDasharray="2 5" />
            <circle cx="242" cy="95" r="87" strokeOpacity=".52" />
            <circle cx="242" cy="95" r="62" strokeOpacity=".39" />
            <circle cx="242" cy="95" r="37" strokeOpacity=".58" />
            <path d="M129 95h226M242 -18v226" strokeOpacity=".34" />
            <path d="M242 95l-67-55a87 87 0 0 1 128-6z" fill={`url(#${id}sweep)`} stroke="none" />
            <path d="M242 95l61-61" stroke="#ddf0ff" strokeOpacity=".77" />
          </g>
          <circle cx="242" cy="95" r="22" fill="#fff" fillOpacity=".13" stroke="#c0d9ff" strokeOpacity=".7" />
          <path d="m238 88 11 7-11 7z" fill="#f3f8ff" />
          <path d="M17 142h48l11-13 11 23 11-39 16 29h35m183-79h34l9-11 10 20 10-28 12 19h72" fill="none" stroke={`url(#${id}wave)`} strokeWidth="1.5" />
          <g fill="#b4f9e9"><circle cx="196" cy="52" r="3" /><circle cx="311" cy="126" r="3.5" /><circle cx="172" cy="140" r="2.3" /></g>
          <g fill="none" stroke="#d8edff" strokeOpacity=".7"><circle cx="196" cy="52" r="7" /><circle cx="311" cy="126" r="7" /></g>
          <g transform="translate(39 30)"><rect width="97" height="24" rx="6" fill="#b6caff" fillOpacity=".14" stroke="#c4d9ff" strokeOpacity=".24" /><path d="M10 14h3l2-4 3 7 3-6 2 3h4" fill="none" stroke="#a5f6e6" strokeWidth="1.45" /><text x="34" y="15.4" fill="#e2ecff" fontFamily="sans-serif" fontSize="8.1" fontWeight="600" letterSpacing="1.1">X / SIGNAL</text></g>
          <g transform="translate(352 131)"><rect width="75" height="24" rx="6" fill="#a4c1ff" fillOpacity=".13" stroke="#c4d9ff" strokeOpacity=".28" /><path d="M11 16v-3m4 3V10m4 6V7" stroke="#a5f6e6" strokeWidth="1.5" strokeLinecap="round" /><text x="29" y="15.4" fill="#e2ecff" fontFamily="sans-serif" fontSize="8.1" fontWeight="600" letterSpacing="1.1">UPLINK</text></g>
        </svg>
      </div>
    </section>
  );
}

export function KPIs({ data }: { data: Snapshot }) {
  const live = data.channels.filter((channel) => channel.status === "live");
  const active = data.subscribers.filter((user) => user.status === "active").length;
  const connected = data.servers.filter((server) => server.status !== "offline").length;
  const viewers = live.reduce((sum, channel) => sum + channel.viewers, 0);
  const items: { title: string; value: ReactNode; note: string; Icon: LucideIcon; tone: string; accent?: string }[] = [
    { title: "القنوات النشطة", value: formatNumber(live.length), note: `من أصل ${formatNumber(data.channels.length)} قناة`, Icon: Tv, tone: "blue", accent: data.channels.length ? `${Math.round(live.length / data.channels.length * 100)}%` : undefined },
    { title: "إجمالي المشتركين", value: formatNumber(data.subscribers.length), note: `${formatNumber(active)} اشتراكًا نشطًا`, Icon: UsersRound, tone: "violet" },
    { title: "المشاهدون الآن", value: formatNumber(viewers), note: "على القنوات المباشرة", Icon: Eye, tone: "teal" },
    { title: "الخوادم المتصلة", value: <>{connected}<span className="xp-metric-total"> / {data.servers.length}</span></>, note: `${formatNumber(data.servers.filter((server) => server.status === "busy").length)} بحاجة للمتابعة`, Icon: Server, tone: "amber" },
  ];
  return <div className="xp-metrics">{items.map(({ title, value, note, Icon, tone, accent }) => (
    <article className="xp-metric xp-card" key={title}>
      <div className="xp-metric-top"><span>{title}</span><span className={`xp-icon-box ${tone}`}><Icon size={17} strokeWidth={1.9} /></span></div>
      <div className="xp-metric-value" dir="ltr">{value}</div>
      <div className="xp-metric-bottom"><span>{note}</span>{accent && <small dir="ltr"><ArrowUpRight size={12} />{accent}</small>}</div>
    </article>
  ))}</div>;
}

function smooth(points: [number, number][]) {
  return points.reduce((d, [x, y], i) => {
    if (!i) return `M ${x} ${y}`;
    const [px, py] = points[i - 1];
    const mid = (px + x) / 2;
    return `${d} C ${mid} ${py}, ${mid} ${y}, ${x} ${y}`;
  }, "");
}

export function AudienceChart({ history }: { history: HistoryPoint[] }) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const [hover, setHover] = useState<number | null>(null);
  const id = useId().replace(/[^\w-]/g, "");
  const series = history.slice(-period);
  const max = Math.max(3000, Math.ceil(Math.max(0, ...series.map((p) => p.audience)) / 1000) * 1000);
  const height = 142, width = 600;
  const points: [number, number][] = series.map((point, i) => [series.length > 1 ? 3 + i / (series.length - 1) * (width - 6) : width / 2, 7 + (1 - point.audience / max) * (height - 14)]);
  const path = smooth(points);
  const selected = series.length > 0 ? Math.min(hover ?? series.length - 1, series.length - 1) : 0;
  const point = points[selected];
  const last = series.at(-1)?.audience ?? 0;
  const ticks = [max, max * 2 / 3, max / 3, 0];
  const displayedDates = series.length <= 7 ? series : series.filter((_, i) => i % 5 === 0 || i === series.length - 1);
  const tickLabel = (num: number) => num > 999 ? `${Math.round(num / 100) / 10}k` : formatNumber(num);
  return (
    <section className="xp-card xp-chart">
      <div className="xp-card-top">
        <div><h2><span className="xp-widget-icon"><Activity size={16} /></span> نشاط المشاهدة</h2><p>تغيّر عدد المشاهدين بمرور الوقت</p></div>
        <div className="xp-segment" aria-label="فترة الإحصاءات">
          <button type="button" aria-pressed={period === 7} onClick={() => { setPeriod(7); setHover(null); }}>7 أيام</button>
          <button type="button" aria-pressed={period === 30} onClick={() => { setPeriod(30); setHover(null); }}>30 يومًا</button>
        </div>
      </div>
      {series.length ? <>
        <div className="xp-chart-summary"><b dir="ltr">{formatNumber(last)}</b><span><i /> المشاهدون</span></div>
        <div className="xp-chart-body" dir="ltr">
          <div className="xp-y-axis" aria-hidden="true">{ticks.map((n) => <span key={n}>{tickLabel(n)}</span>)}</div>
          <div className="xp-chart-area" onPointerLeave={() => setHover(null)} onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            setHover(Math.min(series.length - 1, Math.max(0, Math.round((event.clientX - box.left) / box.width * (series.length - 1)))));
          }}>
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`رسم المشاهدات، أحدث قيمة ${last}`}>
              <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#4a6aff" stopOpacity=".24" /><stop offset="1" stopColor="#5a74ff" stopOpacity=".025" /></linearGradient></defs>
              {ticks.map((n, i) => <line key={n} x1="0" x2={width} y1={7 + i / 3 * (height - 14)} y2={7 + i / 3 * (height - 14)} stroke="var(--xp-line)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />)}
              {points.length > 1 && <path fill={`url(#${id})`} d={`${path} L ${points.at(-1)?.[0]} ${height - 7} L ${points[0][0]} ${height - 7} Z`} />}
              <path fill="none" d={path} stroke="var(--xp-blue)" strokeWidth="2.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {point && <>
                {hover !== null && <line x1={point[0]} x2={point[0]} y1="7" y2={height - 7} stroke="var(--xp-blue)" strokeOpacity=".48" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
                <circle cx={point[0]} cy={point[1]} r="4.6" fill="var(--xp-blue)" stroke="var(--xp-card)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </>}
            </svg>
            {hover !== null && point && <div className="xp-chart-tooltip" style={{ left: `${Math.max(10, Math.min(90, point[0] / width * 100))}%` }} dir="auto"><b>{formatNumber(series[selected].audience)}</b> · {formatDate(series[selected].date, true)}</div>}
          </div>
          <div className="xp-x-axis">{displayedDates.map((p) => <span key={p.date}>{formatDate(p.date, true)}</span>)}</div>
        </div>
      </> : <div className="xp-empty compact"><Activity size={24} /><b>لا توجد إحصاءات بعد</b><span>تُسجّل نقطة جديدة عند تحديث بيانات القنوات.</span></div>}
    </section>
  );
}

export function Status({ status, label }: { status: string; label: string }) {
  const tone = ["live", "active", "online"].includes(status) ? "positive" : ["busy", "trial"].includes(status) ? "warning" : status === "scheduled" ? "idle" : "muted";
  return <span className={`xp-status ${tone}`}><i />{label}</span>;
}

export function ServersCard({ servers, onOpen }: { servers: PanelServer[]; onOpen: () => void }) {
  return <section className="xp-card xp-server-widget">
    <div className="xp-card-top"><div><h2><span className="xp-widget-icon"><Server size={16} /></span> حالة الخوادم</h2><p>استخدام موارد شبكة البث</p></div><span className="xp-chip"><i /> {servers.filter((s) => s.status !== "offline").length} متصل</span></div>
    <div className="xp-server-rows">
      {servers.length ? servers.slice(0, 3).map((s) => <div className="xp-server-row" key={s.id}>
        <span className="xp-server-mark"><Server size={17} /></span>
        <div className="xp-server-info"><b><bdi>{s.name}</bdi></b><span>{s.region}</span></div>
        <div className="xp-server-end"><Status status={s.status} label={serverStatuses[s.status]} /><div className="xp-server-progress" role="progressbar" aria-label={`${s.name} — استخدام الموارد`} aria-valuenow={s.load} aria-valuemin={0} aria-valuemax={100}><i className={s.status === "busy" ? "warm" : ""} style={{ width: `${s.load}%` }} /></div></div>
      </div>) : <div className="xp-empty compact"><Server size={24} /><b>لا توجد خوادم مسجلة</b></div>}
    </div>
    <button type="button" className="xp-card-link" onClick={onOpen}>إدارة الخوادم <ArrowLeft size={15} /></button>
  </section>;
}

export function DateBadge({ date }: { date: string }) {
  return <div className="xp-date" title="تاريخ اليوم"><CalendarDays size={16} /><span>{formatDate(date)}</span></div>;
}

export function ChannelIdentity({ channel }: { channel: Channel }) {
  const Icon = categoryIcons[channel.category] ?? CirclePlay;
  return <div className="xp-identity"><span className={`xp-channel-mark ${channel.category}`}><Icon size={17} /></span><div><b><bdi>{channel.name}</bdi></b><small>{categories[channel.category]}</small></div></div>;
}
