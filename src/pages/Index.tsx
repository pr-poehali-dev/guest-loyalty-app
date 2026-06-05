import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

type Section = "home" | "profile" | "earn" | "spend" | "history" | "levels" | "about" | "contacts";

const AUTH_URL  = "https://functions.poehali.dev/971033a9-bdd6-4ca4-ab0f-633f8266c75c";
const OPS_URL   = "https://functions.poehali.dev/fabd8921-1cce-4538-a097-120f5859948f";
const ADMIN_URL = "https://functions.poehali.dev/ed5b87b9-be69-467e-8657-3ee303c934a8";

const LOGO_URL  = "https://cdn.poehali.dev/projects/1c0a4e35-bc68-4a24-b157-6e54c5e66aa3/bucket/eca21a63-97af-4be7-b4c5-0dbea45a48ae.jpg";
const HOUSE_URL = "https://cdn.poehali.dev/projects/1c0a4e35-bc68-4a24-b157-6e54c5e66aa3/bucket/d8034e69-c810-4a69-b63f-17e5edcf7adc.jpg";

const LEVELS_DATA = [
  { name: "Гость",      icon: "🌿", min: 0,      max: 15000,  percent: 3,  color: "from-stone-400 to-stone-500" },
  { name: "Серебряный", icon: "🪨", min: 15000,  max: 50000,  percent: 5,  color: "from-slate-400 to-slate-500" },
  { name: "Золотой",    icon: "🌾", min: 50000,  max: 100000, percent: 7,  color: "from-amber-500 to-yellow-500" },
  { name: "Платиновый", icon: "🦅", min: 100000, max: null,   percent: 10, color: "from-violet-400 to-purple-500" },
];

const LEVEL_PERKS: Record<string, string[]> = {
  "Гость":      ["3% бонусов с каждого проживания","День рождения — 500 бонусов"],
  "Серебряный": ["5% бонусов с каждого проживания","Ранний заезд при наличии","500 бонусов на день рождения"],
  "Золотой":    ["7% бонусов с каждого проживания","Ранний заезд / поздний выезд","1000 бонусов на день рождения","Приоритетное бронирование"],
  "Платиновый": ["10% бонусов","Ранний заезд / поздний выезд всегда","2000 бонусов на день рождения","Персональный менеджер","Скидка 5% на всё"],
};

function levelProgress(totalSpent: number) {
  const idx = LEVELS_DATA.findIndex(l => totalSpent < (l.max ?? Infinity));
  const curIdx = idx === -1 ? LEVELS_DATA.length - 1 : idx;
  const cur  = LEVELS_DATA[curIdx];
  const prev = LEVELS_DATA[Math.max(0, curIdx - 1)];
  const range = (cur.max ?? cur.min + 50000) - prev.min;
  const pct = Math.min(100, Math.round(((totalSpent - prev.min) / range) * 100));
  const next = LEVELS_DATA[curIdx + 1];
  return { pct, nextName: next?.name ?? null, remaining: next ? Math.max(0, next.min - totalSpent) : 0 };
}

const NAV = [
  { id: "home"     as Section, label: "Главная",     icon: "Home" },
  { id: "profile"  as Section, label: "Кабинет",     icon: "User" },
  { id: "earn"     as Section, label: "Накопить",    icon: "TrendingUp" },
  { id: "spend"    as Section, label: "Списать",     icon: "Gift" },
  { id: "history"  as Section, label: "История",     icon: "Clock" },
  { id: "levels"   as Section, label: "Уровни",      icon: "Star" },
  { id: "about"    as Section, label: "О программе", icon: "Info" },
  { id: "contacts" as Section, label: "Контакты",    icon: "Phone" },
];

interface Guest {
  id: number; phone: string; name: string | null; birth_date: string | null;
  email: string | null; notifications: boolean; bonuses: number;
  total_spent: number; visits: number; level: string; member_since: string;
}
interface Operation {
  id: number; type: "earn" | "spend"; amount: number; description: string; date: string;
}

/* ══════════════════════════════════════════════════════════════════
   APP
══════════════════════════════════════════════════════════════════ */
export default function Index() {
  const [token, setToken]       = useState<string | null>(() => localStorage.getItem("fv_token"));
  const [guest, setGuest]       = useState<Guest | null>(null);
  const [ops,   setOps]         = useState<Operation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [section, setSection]   = useState<Section>("home");
  const [menuOpen, setMenuOpen] = useState(false);

  const apiFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const hdrs: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as Record<string, string>) };
    if (token) hdrs["X-Session-Token"] = token;
    const res  = await fetch(url, { ...opts, headers: hdrs });
    const raw  = await res.json();
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  }, [token]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    apiFetch(AUTH_URL, { method: "GET" })
      .then(d => { if (d.guest) setGuest(d.guest); else { localStorage.removeItem("fv_token"); setToken(null); } })
      .catch(() => { localStorage.removeItem("fv_token"); setToken(null); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!guest || !token) return;
    apiFetch(OPS_URL, { method: "GET" })
      .then(d => { if (d.operations) setOps(d.operations); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest?.id]);

  const handleLogin = async (phone: string) => {
    const d = await apiFetch(AUTH_URL, { method: "POST", body: JSON.stringify({ action: "login", phone }) });
    if (d.token) { localStorage.setItem("fv_token", d.token); setToken(d.token); setGuest(d.guest); }
    return d;
  };

  const handleLogout = async () => {
    await apiFetch(AUTH_URL, { method: "POST", body: JSON.stringify({ action: "logout" }) }).catch(() => {});
    localStorage.removeItem("fv_token");
    setToken(null); setGuest(null); setOps([]); setSection("home");
  };

  const handleUpdateProfile = async (fields: Partial<Guest>) => {
    const d = await apiFetch(AUTH_URL, { method: "PUT", body: JSON.stringify({ action: "update_profile", ...fields }) });
    if (d.guest) setGuest(d.guest);
    return d;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <img src={LOGO_URL} className="w-16 h-16 mx-auto animate-pulse" alt="" />
        <div className="text-muted-foreground text-sm">Загрузка…</div>
      </div>
    </div>
  );

  if (!guest) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button className="flex items-center gap-2" onClick={() => { setSection("home"); setMenuOpen(false); }}>
            <img src={LOGO_URL} alt="Фридом Виладж" className="h-8 w-8 object-contain" />
            <div className="leading-tight">
              <div className="font-display font-semibold text-sm text-foreground tracking-wide">ФРИДОМ ВИЛАДЖ</div>
              <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Программа лояльности</div>
            </div>
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors">
            <Icon name={menuOpen ? "X" : "Menu"} size={20} />
          </button>
        </div>

        {menuOpen && (
          <div className="absolute top-14 right-0 left-0 bg-white border-b border-border shadow-lg animate-fade-in z-50">
            <div className="max-w-2xl mx-auto px-4 py-3 grid grid-cols-4 gap-1">
              {NAV.map(item => (
                <button key={item.id} onClick={() => { setSection(item.id); setMenuOpen(false); }}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-center transition-all ${section === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <Icon name={item.icon} size={18} />
                  <span className="text-[10px] leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="max-w-2xl mx-auto px-4 pb-3">
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                <Icon name="LogOut" size={16} /> Выйти
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-24">
        {section === "home"     && <HomeSection    guest={guest} ops={ops} onNavigate={setSection} />}
        {section === "profile"  && <ProfileSection guest={guest} onUpdate={handleUpdateProfile} onLogout={handleLogout} />}
        {section === "earn"     && <EarnSection    guest={guest} />}
        {section === "spend"    && <SpendSection   guest={guest} />}
        {section === "history"  && <HistorySection ops={ops} />}
        {section === "levels"   && <LevelsSection  guest={guest} />}
        {section === "about"    && <AboutSection />}
        {section === "contacts" && <ContactsSection />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border z-40">
        <div className="max-w-2xl mx-auto px-2 h-16 flex items-center justify-around">
          {NAV.slice(0, 5).map(item => (
            <button key={item.id} onClick={() => setSection(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${section === item.id ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon name={item.icon} size={20} />
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin }: { onLogin: (p: string) => Promise<unknown> }) {
  const [phone,   setPhone]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const fmt = (val: string) => {
    const d = val.replace(/\D/g, "");
    if (!d) return "";
    let n = d.startsWith("8") ? "7" + d.slice(1) : d.startsWith("7") ? d : "7" + d;
    n = n.slice(0, 11);
    if (n.length <= 1) return "+" + n;
    if (n.length <= 4) return `+${n[0]} (${n.slice(1)}`;
    if (n.length <= 7) return `+${n[0]} (${n.slice(1,4)}) ${n.slice(4)}`;
    if (n.length <= 9) return `+${n[0]} (${n.slice(1,4)}) ${n.slice(4,7)}-${n.slice(7)}`;
    return `+${n[0]} (${n.slice(1,4)}) ${n.slice(4,7)}-${n.slice(7,9)}-${n.slice(9)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 11) { setError("Введите полный номер телефона"); return; }
    setLoading(true); setError("");
    try {
      const normalized = "+" + (digits.startsWith("8") ? "7" + digits.slice(1) : digits);
      await onLogin(normalized);
    } catch {
      setError("Ошибка соединения. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative h-64 flex-shrink-0">
        <img src={HOUSE_URL} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(210,15%,22%)]/40 to-background" />
      </div>

      <div className="flex-1 flex flex-col px-6 -mt-8 relative z-10 pb-8">
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center p-2 mb-4">
            <img src={LOGO_URL} className="w-full h-full object-contain" alt="Фридом Виладж" />
          </div>
          <div className="font-display text-2xl font-semibold text-center">ФРИДОМ ВИЛАДЖ</div>
          <div className="text-muted-foreground text-sm tracking-widest uppercase mt-1">Программа лояльности</div>
        </div>

        <div className="card-warm rounded-2xl p-6 animate-fade-in delay-100">
          <div className="font-display text-xl font-semibold mb-1">Добро пожаловать</div>
          <div className="text-muted-foreground text-sm mb-5">Введите номер телефона для входа или регистрации</div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1.5">Номер телефона</label>
              <input type="tel" value={phone} onChange={e => setPhone(fmt(e.target.value))}
                placeholder="+7 (___) ___-__-__"
                className="w-full border border-input rounded-xl px-4 py-3.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-ring font-body"
                autoComplete="tel" />
              {error && <div className="text-rose-500 text-xs mt-1.5">{error}</div>}
            </div>
            <button type="submit" disabled={loading}
              className="w-full wood-texture text-white rounded-xl py-3.5 font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading
                ? <><Icon name="Loader2" size={16} className="animate-spin" /> Входим…</>
                : "Войти / Зарегистрироваться"}
            </button>
          </form>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 animate-fade-in delay-200">
          {[
            { icon: "🎁", text: "Бонусы за каждое проживание" },
            { icon: "⭐", text: "Уровни и привилегии" },
            { icon: "🏡", text: "Специальные предложения" },
          ].map(item => (
            <div key={item.text} className="card-warm rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HOME
══════════════════════════════════════════════════════════════════ */
function HomeSection({ guest, ops, onNavigate }: { guest: Guest; ops: Operation[]; onNavigate: (s: Section) => void }) {
  const { pct, nextName, remaining } = levelProgress(guest.total_spent);
  const firstName = guest.name ? guest.name.split(" ")[0] : "Гость";

  return (
    <div className="pt-5 space-y-5">
      <div className="relative rounded-2xl overflow-hidden h-52 animate-fade-in">
        <img src={HOUSE_URL} alt="Фридом Виладж" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(210,15%,22%)]/80 via-[hsl(210,15%,22%)]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <div className="font-display text-2xl font-semibold leading-tight">Добро пожаловать,<br />{firstName}!</div>
          <div className="text-sm text-white/80 mt-1">Уровень: {guest.level}</div>
        </div>
      </div>

      <div className="rounded-2xl wood-texture p-5 text-white animate-fade-in delay-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-white/70 text-xs uppercase tracking-widest">Ваши бонусы</div>
            <div className="font-display text-5xl font-bold mt-1">{guest.bonuses.toLocaleString()}</div>
            <div className="text-white/70 text-sm mt-0.5">баллов</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">🎁</div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20 flex gap-3">
          <button onClick={() => onNavigate("earn")}  className="flex-1 bg-white/20 hover:bg-white/30 transition-colors rounded-xl py-2 text-sm font-medium text-white">Накопить</button>
          <button onClick={() => onNavigate("spend")} className="flex-1 bg-white/20 hover:bg-white/30 transition-colors rounded-xl py-2 text-sm font-medium text-white">Списать</button>
        </div>
      </div>

      <a href="https://freedomvilage.ru/#homes" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-between bg-white border border-border rounded-2xl px-5 py-4 hover:bg-muted/50 transition-colors animate-fade-in delay-150 group">
        <div>
          <div className="font-display text-base font-semibold">Забронировать дом</div>
          <div className="text-muted-foreground text-xs mt-0.5">freedomvilage.ru</div>
        </div>
        <div className="w-10 h-10 rounded-xl wood-texture flex items-center justify-center flex-shrink-0 group-hover:opacity-90 transition-opacity">
          <Icon name="ExternalLink" size={18} className="text-white" />
        </div>
      </a>

      <div className="card-warm rounded-2xl p-5 animate-fade-in delay-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">Уровень</div>
            <div className="font-display text-xl font-semibold mt-0.5">{guest.level}</div>
          </div>
          <button onClick={() => onNavigate("levels")} className="text-accent text-sm font-medium">Все уровни →</button>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div className="h-2 rounded-full wood-texture transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{guest.level}</span>
          {nextName ? <span>{pct}% до «{nextName}»</span> : <span>Максимальный уровень</span>}
        </div>
        {nextName && remaining > 0 && (
          <div className="mt-2 text-xs text-muted-foreground text-center">До «{nextName}» осталось {remaining.toLocaleString()} ₽</div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 animate-fade-in delay-300">
        {[
          { label: "Визитов",     value: guest.visits,                       icon: "MapPin" },
          { label: "Потрачено ₽", value: guest.total_spent.toLocaleString(), icon: "CreditCard" },
          { label: "С нами с",    value: guest.member_since || "—",          icon: "Calendar" },
        ].map(s => (
          <div key={s.label} className="card-warm rounded-xl p-3 text-center">
            <Icon name={s.icon} size={18} className="mx-auto text-accent mb-1" />
            <div className="font-display text-lg font-bold">{s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {ops.length > 0 && (
        <div className="animate-fade-in delay-400">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display text-lg font-semibold">Последние операции</div>
            <button onClick={() => onNavigate("history")} className="text-accent text-sm">Все →</button>
          </div>
          <div className="space-y-2">
            {ops.slice(0, 3).map(op => (
              <div key={op.id} className="card-warm rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{op.description}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{op.date}</div>
                </div>
                <div className={`font-semibold text-sm ml-3 whitespace-nowrap ${op.type === "earn" ? "text-emerald-600" : "text-rose-500"}`}>
                  {op.type === "earn" ? "+" : ""}{op.amount.toLocaleString()} б
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROFILE
══════════════════════════════════════════════════════════════════ */
function ProfileSection({ guest, onUpdate, onLogout }: { guest: Guest; onUpdate: (f: Partial<Guest>) => Promise<unknown>; onLogout: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: guest.name || "", birth_date: guest.birth_date || "", email: guest.email || "", notifications: guest.notifications });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ name: form.name || null, birth_date: form.birth_date || null, email: form.email || null, notifications: form.notifications });
    setSaving(false); setSaved(true); setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const levelIcon = LEVELS_DATA.find(l => l.name === guest.level)?.icon || "🌿";

  return (
    <div className="pt-5 space-y-4 animate-fade-in">
      <div className="font-display text-2xl font-semibold">Личный кабинет</div>

      <div className="card-warm rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl wood-texture flex items-center justify-center text-white text-2xl font-display font-bold">
            {guest.name ? guest.name.split(" ").map(n => n[0]).join("").slice(0, 2) : "?"}
          </div>
          <div>
            <div className="font-display text-xl font-semibold">{guest.name || "Имя не указано"}</div>
            <div className="text-muted-foreground text-sm mt-0.5">{guest.phone}</div>
            <div className="inline-flex items-center gap-1 mt-1.5 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
              {levelIcon} {guest.level}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Бонусный баланс", value: `${guest.bonuses.toLocaleString()} б`,        icon: "Star",       color: "text-amber-500" },
          { label: "Всего визитов",   value: String(guest.visits),                         icon: "Home",       color: "text-accent" },
          { label: "Сумма брониров.", value: `${guest.total_spent.toLocaleString()} ₽`,    icon: "CreditCard", color: "text-emerald-600" },
          { label: "В программе с",  value: guest.member_since || "—",                    icon: "Calendar",   color: "text-primary" },
        ].map(item => (
          <div key={item.label} className="card-warm rounded-xl p-4">
            <Icon name={item.icon} size={20} className={`${item.color} mb-2`} />
            <div className="font-display text-xl font-bold">{item.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="card-warm rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-display text-lg font-semibold">Персональные данные</div>
          {!editing && <button onClick={() => setEditing(true)} className="text-accent text-sm font-medium">Изменить</button>}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Имя и фамилия</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Иван Иванов"
                className="w-full border border-input rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Дата рождения</label>
              <input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                className="w-full border border-input rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Email для уведомлений</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com"
                className="w-full border border-input rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex items-center justify-between py-2.5 border border-border rounded-xl px-4">
              <div>
                <div className="text-sm font-medium">Уведомления</div>
                <div className="text-xs text-muted-foreground">Спецпредложения и скидки</div>
              </div>
              <button onClick={() => setForm(f => ({ ...f, notifications: !f.notifications }))}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.notifications ? "wood-texture" : "bg-muted"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.notifications ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(false)} className="flex-1 border border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors">Отмена</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 wood-texture text-white rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60">
                {saving ? "Сохраняю…" : "Сохранить"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {[
              { label: "Имя",              value: guest.name || "Не указано" },
              { label: "Телефон",          value: guest.phone },
              { label: "Дата рождения",    value: guest.birth_date ? new Date(guest.birth_date).toLocaleDateString("ru-RU") : "Не указана" },
              { label: "Email",            value: guest.email || "Не указан" },
              { label: "Уведомления",      value: guest.notifications ? "Включены ✓" : "Выключены" },
              { label: "Уровень",          value: guest.level },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
                <span className="text-muted-foreground text-sm">{row.label}</span>
                <span className={`font-medium text-sm ${row.label === "Уведомления" && guest.notifications ? "text-emerald-600" : ""}`}>{row.value}</span>
              </div>
            ))}
          </div>
        )}
        {saved && <div className="text-emerald-600 text-sm text-center animate-fade-in">✓ Данные успешно сохранены</div>}
      </div>

      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-rose-500 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors">
        <Icon name="LogOut" size={16} /> Выйти из аккаунта
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EARN
══════════════════════════════════════════════════════════════════ */
function EarnSection({ guest }: { guest: Guest }) {
  const percent = LEVELS_DATA.find(l => l.name === guest.level)?.percent || 3;
  return (
    <div className="pt-5 space-y-5 animate-fade-in">
      <div className="font-display text-2xl font-semibold">Как накопить бонусы</div>
      <div className="relative rounded-2xl overflow-hidden">
        <img src={HOUSE_URL} alt="" className="w-full h-36 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(210,15%,22%)]/70 to-transparent flex items-center px-5">
          <div className="text-white">
            <div className="text-3xl font-display font-bold">{percent}%</div>
            <div className="text-sm text-white/80">ваш текущий процент</div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {[
          { icon: "🏡", title: "Проживание в наших домах",  desc: "От 3% до 10% от стоимости бронирования",         bonus: "3–10%" },
          { icon: "⭐", title: "Отзыв после проживания",    desc: "Оставьте отзыв о вашем отдыхе",                  bonus: "+200 б" },
          { icon: "👥", title: "Приведи друга",             desc: "Ваш друг забронирует впервые — оба получат бонус",bonus: "+500 б" },
          { icon: "🎂", title: "День рождения",             desc: "Подарок от нас в ваш праздник",                  bonus: "до 2000 б" },
          { icon: "📱", title: "Регистрация в программе",   desc: "Приветственные бонусы за вступление",            bonus: "+300 б" },
        ].map(item => (
          <div key={item.title} className="card-warm rounded-xl px-4 py-4 flex items-start gap-4">
            <div className="text-2xl flex-shrink-0">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
            <div className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap">{item.bonus}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SPEND
══════════════════════════════════════════════════════════════════ */
function SpendSection({ guest }: { guest: Guest }) {
  const [amount, setAmount] = useState("");
  const bonusAmount = parseInt(amount) || 0;
  return (
    <div className="pt-5 space-y-5 animate-fade-in">
      <div className="font-display text-2xl font-semibold">Списать бонусы</div>
      <div className="card-warm rounded-2xl p-5 text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Доступно для списания</div>
        <div className="font-display text-5xl font-bold mt-2 text-accent">{guest.bonuses.toLocaleString()}</div>
        <div className="text-muted-foreground text-sm">баллов = {guest.bonuses.toLocaleString()} ₽</div>
      </div>
      <div className="card-warm rounded-2xl p-5 space-y-4">
        <div className="font-display text-lg font-semibold">Применить при бронировании</div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Стоимость бронирования (₽)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Введите сумму"
            className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {bonusAmount > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
            Вы можете оплатить бонусами до <strong>{Math.min(guest.bonuses, Math.round(bonusAmount * 0.5)).toLocaleString()} ₽</strong> (до 50% от суммы)
          </div>
        )}
        <button className="w-full wood-texture text-white rounded-xl py-3.5 font-semibold text-sm transition-opacity hover:opacity-90">
          Применить бонусы
        </button>
      </div>
      <div className="space-y-3">
        <div className="font-display text-lg font-semibold">Условия списания</div>
        {["Бонусами можно оплатить до 50% стоимости бронирования","Минимальная сумма списания — 500 баллов","1 бонус = 1 рубль","Списание происходит в момент подтверждения брони"].map((t, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span className="text-base">📌</span>
            <span className="text-sm text-muted-foreground">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HISTORY
══════════════════════════════════════════════════════════════════ */
function HistorySection({ ops }: { ops: Operation[] }) {
  const [filter, setFilter] = useState<"all"|"earn"|"spend">("all");
  const filtered = filter === "all" ? ops : ops.filter(h => h.type === filter);
  const earned = ops.filter(h => h.type === "earn").reduce((s, h) => s + h.amount, 0);
  const spent  = ops.filter(h => h.type === "spend").reduce((s, h) => s + h.amount, 0);

  return (
    <div className="pt-5 space-y-4 animate-fade-in">
      <div className="font-display text-2xl font-semibold">История операций</div>
      <div className="flex gap-2">
        {([["all","Все"],["earn","Начисления"],["spend","Списания"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === key ? "wood-texture text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card-warm rounded-xl p-3 text-center">
          <div className="text-emerald-600 text-xs font-medium mb-1">Начислено</div>
          <div className="font-display text-2xl font-bold text-emerald-600">+{earned.toLocaleString()} б</div>
        </div>
        <div className="card-warm rounded-xl p-3 text-center">
          <div className="text-rose-500 text-xs font-medium mb-1">Списано</div>
          <div className="font-display text-2xl font-bold text-rose-500">{spent.toLocaleString()} б</div>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="card-warm rounded-2xl p-8 text-center text-muted-foreground text-sm">Операций пока нет</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((op, i) => (
            <div key={op.id} className="card-warm rounded-xl px-4 py-3.5 flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 0.04}s`, opacity: 0 }}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${op.type === "earn" ? "bg-emerald-100" : "bg-rose-100"}`}>
                {op.type === "earn" ? "⬆️" : "⬇️"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight">{op.description}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{op.date}</div>
              </div>
              <div className={`font-semibold text-sm whitespace-nowrap ${op.type === "earn" ? "text-emerald-600" : "text-rose-500"}`}>
                {op.type === "earn" ? "+" : ""}{op.amount.toLocaleString()} б
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LEVELS
══════════════════════════════════════════════════════════════════ */
function LevelsSection({ guest }: { guest: Guest }) {
  const { pct, nextName, remaining } = levelProgress(guest.total_spent);
  const levelIcon = LEVELS_DATA.find(l => l.name === guest.level)?.icon || "🌿";

  return (
    <div className="pt-5 space-y-5 animate-fade-in">
      <div className="font-display text-2xl font-semibold">Уровни лояльности</div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-2xl">{levelIcon}</span>
        <div>
          <div className="font-semibold text-amber-900 text-sm">Ваш уровень — {guest.level}</div>
          {nextName
            ? <div className="text-xs text-amber-700 mt-0.5">До «{nextName}» осталось {remaining.toLocaleString()} ₽ трат ({pct}% выполнено)</div>
            : <div className="text-xs text-amber-700 mt-0.5">Максимальный уровень достигнут!</div>}
        </div>
      </div>
      <div className="space-y-4">
        {LEVELS_DATA.map((level, i) => (
          <div key={level.name} className={`rounded-2xl overflow-hidden border-2 transition-all animate-fade-in ${level.name === guest.level ? "border-accent shadow-lg" : "border-transparent"}`}
            style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}>
            <div className={`bg-gradient-to-r ${level.color} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{level.icon}</span>
                  <div>
                    <div className="font-display text-xl font-semibold">{level.name}</div>
                    <div className="text-white/70 text-xs">{level.max ? `от ${level.min.toLocaleString()} до ${level.max.toLocaleString()} ₽` : `от ${level.min.toLocaleString()} ₽`}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display font-bold">{level.percent}%</div>
                  <div className="text-white/70 text-xs">бонусов</div>
                </div>
              </div>
              {level.name === guest.level && <div className="mt-2 inline-block bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">✓ Ваш текущий уровень</div>}
            </div>
            <div className="card-warm p-4 space-y-1.5">
              {(LEVEL_PERKS[level.name] || []).map(perk => (
                <div key={perk} className="flex items-start gap-2 text-sm"><span className="text-accent mt-0.5">✦</span><span>{perk}</span></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ABOUT
══════════════════════════════════════════════════════════════════ */
function AboutSection() {
  return (
    <div className="pt-5 space-y-5 animate-fade-in">
      <div className="font-display text-2xl font-semibold">О программе лояльности</div>
      <div className="relative rounded-2xl overflow-hidden">
        <img src={HOUSE_URL} alt="Фридом Виладж" className="w-full h-44 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(210,15%,22%)]/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="font-display text-lg">Фридом Виладж — сеть арендных домов</div>
          <div className="text-sm text-white/80">Ценим каждого гостя</div>
        </div>
      </div>
      <div className="card-warm rounded-2xl p-5 space-y-3">
        <div className="font-display text-lg font-semibold">Как это работает</div>
        {[
          { step:"1", title:"Бронируйте и отдыхайте",     desc:"Выбирайте любой дом из нашей сети и наслаждайтесь отдыхом" },
          { step:"2", title:"Получайте бонусы",           desc:"За каждое проживание автоматически начисляются бонусные баллы" },
          { step:"3", title:"Повышайте уровень",          desc:"Чем больше вы бронируете — тем выгоднее условия программы" },
          { step:"4", title:"Тратьте с удовольствием",    desc:"Оплачивайте бонусами до 50% стоимости следующего отдыха" },
        ].map(item => (
          <div key={item.step} className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full wood-texture text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{item.step}</div>
            <div>
              <div className="font-medium text-sm">{item.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="card-warm rounded-2xl p-5">
        <div className="font-display text-lg font-semibold mb-3">FAQ</div>
        <div className="space-y-3">
          {[
            { q:"Когда начисляются бонусы?",  a:"Бонусы зачисляются на счёт в течение 24 часов после выезда." },
            { q:"Срок действия бонусов?",     a:"Бонусы действуют 12 месяцев с момента последнего проживания." },
            { q:"Как получить поздравление?", a:"Укажите дату рождения в профиле и включите уведомления." },
            { q:"Как узнать свой баланс?",    a:"Баланс всегда доступен на главном экране в личном кабинете." },
          ].map((faq, i) => (
            <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="font-medium text-sm mb-1">{faq.q}</div>
              <div className="text-xs text-muted-foreground">{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CONTACTS
══════════════════════════════════════════════════════════════════ */
function ContactsSection() {
  const [contacts, setContacts] = useState({
    contact_phone:    "",
    contact_whatsapp: "",
    contact_email:    "",
    contact_address:  "",
    contact_hours:    "",
    contact_website:  "",
  });

  useEffect(() => {
    fetch(`${ADMIN_URL}?type=public_settings`)
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (data.settings) setContacts(s => ({ ...s, ...data.settings }));
      })
      .catch(() => {});
  }, []);

  const rows = [
    { icon: "Phone",         label: "Телефон",             value: contacts.contact_phone,    href: contacts.contact_phone    ? `tel:${contacts.contact_phone.replace(/\D/g,"")}` : null, action: "Позвонить" },
    { icon: "MessageCircle", label: "WhatsApp / Telegram",  value: contacts.contact_whatsapp, href: null,                                                                                  action: "Написать" },
    { icon: "Mail",          label: "Электронная почта",    value: contacts.contact_email,    href: contacts.contact_email    ? `mailto:${contacts.contact_email}` : null,                action: "Написать" },
    { icon: "MapPin",        label: "Адрес",                value: contacts.contact_address,  href: null,                                                                                  action: "На карте" },
    { icon: "Clock",         label: "Режим работы",         value: contacts.contact_hours,    href: null,                                                                                  action: null },
  ].filter(r => r.value);

  const website = contacts.contact_website || "https://freedomvilage.ru/#homes";

  return (
    <div className="pt-5 space-y-5 animate-fade-in">
      <div className="font-display text-2xl font-semibold">Контакты</div>

      {/* Кнопка бронирования */}
      <a href={website} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-between wood-texture text-white rounded-2xl px-5 py-4 hover:opacity-90 transition-opacity">
        <div>
          <div className="font-display text-lg font-semibold">Забронировать дом</div>
          <div className="text-white/70 text-xs mt-0.5">Перейти на сайт бронирования</div>
        </div>
        <Icon name="ExternalLink" size={22} className="text-white/80 flex-shrink-0" />
      </a>

      <div className="card-warm rounded-2xl p-5 flex items-center gap-4">
        <img src={LOGO_URL} alt="Фридом Виладж" className="w-16 h-16 object-contain rounded-xl bg-white p-1 border border-border" />
        <div>
          <div className="font-display text-lg font-semibold">Фридом Виладж</div>
          <div className="text-muted-foreground text-sm">Сеть арендных домов</div>
        </div>
      </div>
      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map(c => (
            <div key={c.label} className="card-warm rounded-xl px-4 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl wood-texture flex items-center justify-center flex-shrink-0">
                <Icon name={c.icon} size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="text-sm font-medium mt-0.5 truncate">{c.value}</div>
              </div>
              {c.action && c.href && (
                <a href={c.href} className="text-accent text-xs font-semibold whitespace-nowrap">{c.action} →</a>
              )}
              {c.action && !c.href && (
                <span className="text-accent text-xs font-semibold whitespace-nowrap">{c.action} →</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card-warm rounded-2xl p-8 text-center text-muted-foreground text-sm">Контакты не заполнены</div>
      )}
      <div className="card-warm rounded-2xl p-5">
        <div className="font-display text-lg font-semibold mb-3">Написать нам</div>
        <div className="space-y-3">
          <input type="text" placeholder="Ваше имя" className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
          <textarea placeholder="Ваше сообщение" rows={3} className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          <button className="w-full wood-texture text-white rounded-xl py-3.5 font-semibold text-sm transition-opacity hover:opacity-90">Отправить сообщение</button>
        </div>
      </div>
    </div>
  );
}