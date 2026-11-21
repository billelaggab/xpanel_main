export const categories = { sports: "رياضة", news: "أخبار", entertainment: "ترفيه", documentary: "وثائقي", kids: "أطفال", music: "موسيقى" } as const;
export const qualities = { "4K": "4K", "1080p": "1080p", "720p": "720p", "480p": "480p" } as const;
export const channelStatuses = { live: "مباشر", paused: "متوقف", scheduled: "مجدول" } as const;
export const subscriberStatuses = { active: "نشط", trial: "تجريبي", expired: "منتهي" } as const;
export const plans = { monthly: "شهري", quarterly: "ربع سنوي", annual: "سنوي" } as const;
export const serverStatuses = { online: "متصل", busy: "حمل مرتفع", offline: "غير متصل" } as const;

export type Channel = { id: string; name: string; category: keyof typeof categories; quality: keyof typeof qualities; status: keyof typeof channelStatuses; viewers: number; createdAt: string };
export type Subscriber = { id: string; name: string; email: string; plan: keyof typeof plans; status: keyof typeof subscriberStatuses; createdAt: string };
export type PanelServer = { id: string; name: string; region: string; status: keyof typeof serverStatuses; load: number; traffic: number; createdAt: string };
export type HistoryPoint = { date: string; audience: number };
export type Snapshot = { channels: Channel[]; subscribers: Subscriber[]; servers: PanelServer[]; history: HistoryPoint[] };
export type Entity = "channels" | "subscribers" | "servers";
export type Item = Channel | Subscriber | PanelServer;
export type Command = { action: "create" | "update" | "delete"; entity: Entity; id?: string; data?: Record<string, string | number> };
export type View = "overview" | Entity | "analytics" | "settings";

export const emptySnapshot: Snapshot = { channels: [], subscribers: [], servers: [], history: [] };

const audience = [1240, 1410, 1330, 1560, 1480, 1620, 1510, 1700, 1450, 1740, 1835, 1600, 1810, 1660, 1930, 1990, 1830, 2015, 1780, 2050, 1860, 2140, 1990, 1584, 1827, 1614, 2146, 1970, 2340, 2486];
const seedChannels: [string, Channel["category"], Channel["quality"], Channel["status"], number][] = [
  ["الرياضية الأولى", "sports", "1080p", "live", 782],
  ["أخبار الشرق", "news", "1080p", "live", 536],
  ["سينما بلس", "entertainment", "4K", "live", 412],
  ["عالم الوثائقيات", "documentary", "1080p", "paused", 0],
  ["رحلة المعرفة", "kids", "720p", "live", 163],
  ["موسيقى لايف", "music", "1080p", "scheduled", 0],
  ["ملعب اليوم", "sports", "1080p", "live", 189],
  ["صوت المدينة", "music", "720p", "live", 62],
  ["شاشة العائلة", "entertainment", "1080p", "live", 76],
  ["اتجاهات الأخبار", "news", "720p", "live", 47],
  ["اكتشف العالم", "documentary", "4K", "live", 59],
  ["الاستوديو الثقافي", "entertainment", "1080p", "paused", 0],
  ["أبطال الغد", "kids", "1080p", "live", 31],
  ["الرياضية الدولية", "sports", "4K", "live", 87],
  ["مشاهد من الطبيعة", "documentary", "1080p", "scheduled", 0],
  ["ألحان المساء", "music", "720p", "live", 42],
];

export function sampleSnapshot(now = new Date()): Snapshot {
  const back = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  const given = ["ليان", "عمر", "نور", "أحمد", "سارة", "يوسف", "تالة", "ياسمين", "سامر", "رنا", "مروان", "ريم", "عبدالله", "هند", "خالد", "سلمى"];
  const families = ["ناصر", "منصور", "العلي", "الحسن", "الرفاعي", "فهد", "خليل", "رشيد"];
  return {
    channels: seedChannels.map(([name, category, quality, status, viewers], i) => ({ id: `channel-${i + 1}`, name, category, quality, status, viewers, createdAt: back(i + 1) })),
    subscribers: Array.from({ length: 128 }, (_, i) => ({
      id: `subscriber-${i + 1}`, name: `${given[i % given.length]} ${families[Math.floor(i / given.length)]}`,
      email: `member${i + 1}@example.test`, plan: i % 5 === 0 ? "annual" : i % 3 === 0 ? "quarterly" : "monthly",
      status: i >= 122 ? "expired" : i >= 116 ? "trial" : "active", createdAt: back(i + 1),
    })),
    servers: [
      { id: "server-riyadh", name: "Riyadh Edge", region: "الرياض، السعودية", status: "online", load: 68, traffic: 2.4, createdAt: back(1) },
      { id: "server-dubai", name: "Dubai Edge", region: "دبي، الإمارات", status: "online", load: 42, traffic: 1.8, createdAt: back(2) },
      { id: "server-frankfurt", name: "Frankfurt Edge", region: "فرانكفورت، ألمانيا", status: "busy", load: 83, traffic: 1.2, createdAt: back(3) },
      { id: "server-bahrain", name: "Bahrain Backup", region: "المنامة، البحرين", status: "offline", load: 0, traffic: 0, createdAt: back(4) },
    ],
    history: audience.map((count, i) => ({ date: back(audience.length - 1 - i).slice(0, 10), audience: count })),
  };
}
