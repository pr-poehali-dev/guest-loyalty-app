import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/ed5b87b9-be69-467e-8657-3ee303c934a8";

const LOGO_URL = "https://cdn.poehali.dev/projects/1c0a4e35-bc68-4a24-b157-6e54c5e66aa3/bucket/eca21a63-97af-4be7-b4c5-0dbea45a48ae.jpg";

const LEVELS = ["Гость", "Серебряный", "Золотой", "Платиновый"];

interface Guest {
  id: number; phone: string; name: string | null; birth_date: string | null;
  email: string | null; bonuses: number; total_spent: number; visits: number;
  level: string; notifications: boolean; created_at: string;
}
interface Stats { total_guests: number; total_bonuses: number; total_earn_ops: number; }

/* ══════════════════════════════════════════════════════════════════ */
export default function Admin() {
  const [password, setPassword]   = useState(() => sessionStorage.getItem("admin_pwd") || "");
  const [authed,   setAuthed]     = useState(false);
  const [authErr,  setAuthErr]    = useState("");
  const [loading,  setLoading]    = useState(false);

  const [guests,   setGuests]     = useState<Guest[]>([]);
  const [stats,    setStats]      = useState<Stats | null>(null);
  const [search,   setSearch]     = useState("");
  const [selected, setSelected]   = useState<Guest | null>(null);
  const [view,     setView]       = useState<"list" | "detail">("list");
  const [tab,      setTab]        = useState<"guests" | "contacts">("guests");

  const apiFetch = useCallback(async (opts: RequestInit = {}, qs = "") => {
    const hdrs: Record<string, string> = { "Content-Type": "application/json", "X-Admin-Password": password };
    const res  = await fetch(`${ADMIN_URL}${qs ? "?" + qs : ""}`, { ...opts, headers: { ...hdrs, ...(opts.headers as object || {}) } });
    const raw  = await res.json();
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (res.status === 401) throw new Error("auth");
    return data;
  }, [password]);

  const loadGuests = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const data = await apiFetch({ method: "GET" }, q ? `search=${encodeURIComponent(q)}` : "");
      setGuests(data.guests || []);
      setStats(data.stats || null);
    } catch (e: unknown) {
      if ((e as Error).message === "auth") { setAuthed(false); setAuthErr("Неверный пароль"); }
    } finally { setLoading(false); }
  }, [apiFetch]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setAuthErr("");
    try {
      const data = await apiFetch({ method: "GET" });
      if (data.guests !== undefined) {
        sessionStorage.setItem("admin_pwd", password);
        setGuests(data.guests);
        setStats(data.stats);
        setAuthed(true);
      }
    } catch { setAuthErr("Неверный пароль администратора"); }
    finally { setLoading(false); }
  };

  if (!authed) return <LoginPanel password={password} setPassword={setPassword} onLogin={handleLogin} loading={loading} error={authErr} />;

  return (
    <div className="min-h-screen bg-[#f4f1ec] font-body">
      {/* Header */}
      <header className="bg-[hsl(210,15%,22%)] text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="" className="h-7 w-7 object-contain brightness-200" />
            <div>
              <div className="font-display font-semibold text-sm tracking-wide">ФРИДОМ ВИЛАДЖ</div>
              <div className="text-[10px] text-white/50 tracking-widest uppercase">Панель администратора</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {view === "detail" && (
              <button onClick={() => { setView("list"); setSelected(null); }} className="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors">
                <Icon name="ArrowLeft" size={16} /> Назад
              </button>
            )}
            <button onClick={() => { sessionStorage.removeItem("admin_pwd"); setAuthed(false); setPassword(""); }}
              className="flex items-center gap-1 text-white/60 hover:text-white/90 text-xs transition-colors">
              <Icon name="LogOut" size={14} /> Выйти
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-0 flex gap-1 mt-1">
          {([["guests", "Users", "Гости"], ["contacts", "Phone", "Контакты"]] as const).map(([key, icon, label]) => (
            <button key={key} onClick={() => { setTab(key); setView("list"); setSelected(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${tab === key ? "bg-[#f4f1ec] text-foreground" : "text-white/60 hover:text-white/90"}`}>
              <Icon name={icon} size={15} />{label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === "guests" && view === "list" && (
          <ListView
            guests={guests} stats={stats} search={search}
            loading={loading}
            onSearch={(q) => { setSearch(q); loadGuests(q); }}
            onSelect={(g) => { setSelected(g); setView("detail"); }}
            onRefresh={() => loadGuests(search)}
          />
        )}
        {tab === "guests" && view === "detail" && selected && (
          <DetailView
            guest={selected}
            apiFetch={apiFetch}
            onBack={() => { setView("list"); setSelected(null); loadGuests(search); }}
            onGuestUpdated={(updated) => setSelected(updated)}
          />
        )}
        {tab === "contacts" && (
          <ContactsView apiFetch={apiFetch} />
        )}
      </main>
    </div>
  );
}

/* ── LOGIN ──────────────────────────────────────────────────────── */
function LoginPanel({ password, setPassword, onLogin, loading, error }: {
  password: string; setPassword: (v: string) => void;
  onLogin: (e: React.FormEvent) => void; loading: boolean; error: string;
}) {
  return (
    <div className="min-h-screen bg-[hsl(210,15%,22%)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center p-3 mb-4">
            <img src={LOGO_URL} className="w-full h-full object-contain brightness-200" alt="" />
          </div>
          <div className="font-display text-2xl text-white font-semibold">ФРИДОМ ВИЛАДЖ</div>
          <div className="text-white/50 text-xs tracking-widest uppercase mt-1">Панель администратора</div>
        </div>
        <form onSubmit={onLogin} className="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-white/60 text-xs uppercase tracking-wide block mb-1.5">Пароль администратора</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 bg-white/15 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-white/50 text-sm" />
            {error && <div className="text-rose-400 text-xs mt-1.5">{error}</div>}
          </div>
          <button type="submit" disabled={loading || !password}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "hsl(32,45%,55%)", color: "white" }}>
            {loading ? <><Icon name="Loader2" size={16} className="animate-spin" /> Вход…</> : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── LIST VIEW ──────────────────────────────────────────────────── */
function ListView({ guests, stats, search, loading, onSearch, onSelect, onRefresh }: {
  guests: Guest[]; stats: Stats | null; search: string; loading: boolean;
  onSearch: (q: string) => void; onSelect: (g: Guest) => void; onRefresh: () => void;
}) {
  const levelIcon: Record<string, string> = { "Гость": "🌿", "Серебряный": "🪨", "Золотой": "🌾", "Платиновый": "🦅" };

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Всего гостей",    value: stats.total_guests,    icon: "Users",      color: "text-blue-600" },
            { label: "Всего бонусов",   value: stats.total_bonuses.toLocaleString() + " б", icon: "Star", color: "text-amber-500" },
            { label: "Операций начисл.", value: stats.total_earn_ops, icon: "TrendingUp", color: "text-emerald-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <Icon name={s.icon} size={20} className={`${s.color} mb-2`} />
              <div className="font-display text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Refresh */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Поиск по имени или телефону…"
            className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={onRefresh} disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white border border-border text-sm text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2">
          <Icon name={loading ? "Loader2" : "RefreshCw"} size={16} className={loading ? "animate-spin" : ""} />
          Обновить
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="font-display text-lg font-semibold">Гости ({guests.length})</div>
        </div>
        {guests.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">{loading ? "Загрузка…" : "Гостей не найдено"}</div>
        ) : (
          <div className="divide-y divide-border">
            {guests.map(g => (
              <button key={g.id} onClick={() => onSelect(g)}
                className="w-full px-4 py-3.5 flex items-center gap-4 hover:bg-muted/40 transition-colors text-left group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: "hsl(32,45%,55%)" }}>
                  {g.name ? g.name.split(" ").map(n => n[0]).join("").slice(0, 2) : g.phone.slice(-2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{g.name || "Без имени"}</span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{levelIcon[g.level] || "🌿"} {g.level}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{g.phone} {g.email ? `• ${g.email}` : ""}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-sm text-amber-600">{g.bonuses.toLocaleString()} б</div>
                  <div className="text-xs text-muted-foreground">{g.visits} визит{g.visits === 1 ? "" : g.visits < 5 ? "а" : "ов"}</div>
                </div>
                <Icon name="ChevronRight" size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── DETAIL VIEW ────────────────────────────────────────────────── */
function DetailView({ guest, apiFetch, onBack, onGuestUpdated }: {
  guest: Guest;
  apiFetch: (opts: RequestInit, qs?: string) => Promise<unknown>;
  onBack: () => void;
  onGuestUpdated: (g: Guest) => void;
}) {
  const [g, setG] = useState<Guest>(guest);

  // Форма начисления/списания
  const [bonusAction,  setBonusAction]  = useState<"earn" | "spend">("earn");
  const [bonusAmount,  setBonusAmount]  = useState("");
  const [bonusDesc,    setBonusDesc]    = useState("");
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusMsg,     setBonusMsg]     = useState("");

  // Форма редактирования
  const [editing,      setEditing]      = useState(false);
  const [editForm,     setEditForm]     = useState({ name: g.name || "", email: g.email || "", birth_date: g.birth_date || "", total_spent: String(g.total_spent), visits: String(g.visits), level: g.level });
  const [editLoading,  setEditLoading]  = useState(false);
  const [editMsg,      setEditMsg]      = useState("");

  const handleBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(bonusAmount);
    if (!amount || amount <= 0) return;
    setBonusLoading(true); setBonusMsg("");
    try {
      const data = await apiFetch({
        method: "POST",
        body: JSON.stringify({ action: bonusAction, guest_id: g.id, amount, description: bonusDesc || undefined }),
      }) as { ok?: boolean; new_balance?: number; error?: string };
      if (data.ok) {
        const updated = { ...g, bonuses: data.new_balance ?? g.bonuses };
        setG(updated); onGuestUpdated(updated);
        setBonusMsg(bonusAction === "earn" ? `✓ Начислено ${amount} бонусов` : `✓ Списано ${amount} бонусов`);
        setBonusAmount(""); setBonusDesc("");
      } else {
        setBonusMsg("✗ " + (data.error || "Ошибка"));
      }
    } catch { setBonusMsg("✗ Ошибка соединения"); }
    finally { setBonusLoading(false); setTimeout(() => setBonusMsg(""), 4000); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true); setEditMsg("");
    try {
      const data = await apiFetch({
        method: "POST",
        body: JSON.stringify({
          action: "update_guest", guest_id: g.id,
          name: editForm.name || null,
          email: editForm.email || null,
          birth_date: editForm.birth_date || null,
          total_spent: editForm.total_spent ? parseFloat(editForm.total_spent) : null,
          visits: editForm.visits ? parseInt(editForm.visits) : null,
          level: editForm.level,
        }),
      }) as { ok?: boolean; error?: string; total_spent?: number; visits?: number; level?: string };
      if (data.ok) {
        const updated = { ...g, name: editForm.name || null, email: editForm.email || null, birth_date: editForm.birth_date || null, total_spent: data.total_spent ?? g.total_spent, visits: data.visits ?? g.visits, level: data.level ?? g.level };
        setG(updated); onGuestUpdated(updated);
        setEditing(false); setEditMsg("✓ Данные сохранены");
      } else { setEditMsg("✗ " + (data.error || "Ошибка")); }
    } catch { setEditMsg("✗ Ошибка соединения"); }
    finally { setEditLoading(false); setTimeout(() => setEditMsg(""), 4000); }
  };

  const levelIcon: Record<string, string> = { "Гость": "🌿", "Серебряный": "🪨", "Золотой": "🌾", "Платиновый": "🦅" };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Guest card */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-display font-bold flex-shrink-0"
            style={{ background: "hsl(32,45%,55%)" }}>
            {g.name ? g.name.split(" ").map(n => n[0]).join("").slice(0, 2) : "?"}
          </div>
          <div className="flex-1">
            <div className="font-display text-xl font-semibold">{g.name || "Без имени"}</div>
            <div className="text-muted-foreground text-sm">{g.phone}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{levelIcon[g.level] || "🌿"} {g.level}</span>
              <span className="text-xs text-muted-foreground">с {g.created_at}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-bold text-amber-600">{g.bonuses.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">бонусов</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "Визитов",        value: g.visits },
            { label: "Потрачено",      value: `${g.total_spent.toLocaleString()} ₽` },
            { label: "Email",          value: g.email || "—" },
            { label: "Дата рожд.",     value: g.birth_date ? new Date(g.birth_date).toLocaleDateString("ru-RU") : "—" },
            { label: "Уведомления",    value: g.notifications ? "✓ Вкл." : "Откл." },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center border-b border-border pb-2 last:border-0 col-span-1">
              <span className="text-muted-foreground text-xs">{row.label}</span>
              <span className="font-medium text-xs">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bonus operations */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="font-display text-lg font-semibold mb-4">Начислить / Списать бонусы</div>
        <form onSubmit={handleBonus} className="space-y-3">
          <div className="flex rounded-xl overflow-hidden border border-border">
            <button type="button" onClick={() => setBonusAction("earn")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${bonusAction === "earn" ? "text-white" : "bg-white text-muted-foreground hover:bg-muted"}`}
              style={bonusAction === "earn" ? { background: "hsl(32,45%,55%)" } : {}}>
              + Начислить
            </button>
            <button type="button" onClick={() => setBonusAction("spend")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors border-l border-border ${bonusAction === "spend" ? "bg-rose-500 text-white" : "bg-white text-muted-foreground hover:bg-muted"}`}>
              − Списать
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Количество бонусов</label>
              <input type="number" min="1" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} placeholder="500"
                className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Описание (необязательно)</label>
              <input type="text" value={bonusDesc} onChange={e => setBonusDesc(e.target.value)} placeholder="Проживание в доме №2"
                className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          {bonusMsg && (
            <div className={`text-sm text-center py-2 rounded-lg ${bonusMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {bonusMsg}
            </div>
          )}
          <button type="submit" disabled={bonusLoading || !bonusAmount}
            className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 ${bonusAction === "earn" ? "" : "bg-rose-500"}`}
            style={bonusAction === "earn" ? { background: "hsl(32,45%,55%)" } : {}}>
            {bonusLoading
              ? <><Icon name="Loader2" size={16} className="animate-spin" /> Обрабатываю…</>
              : bonusAction === "earn" ? `Начислить бонусы` : `Списать бонусы`}
          </button>
        </form>
      </div>

      {/* Edit guest data */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-lg font-semibold">Данные гостя</div>
          {!editing && <button onClick={() => setEditing(true)} className="text-sm font-medium" style={{ color: "hsl(32,45%,55%)" }}>Редактировать</button>}
        </div>

        {editing ? (
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Имя и фамилия</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Иван Иванов"
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com"
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Дата рождения</label>
                <input type="date" value={editForm.birth_date} onChange={e => setEditForm(f => ({ ...f, birth_date: e.target.value }))}
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Уровень</label>
                <select value={editForm.level} onChange={e => setEditForm(f => ({ ...f, level: e.target.value }))}
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring">
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Сумма трат (₽)</label>
                <input type="number" value={editForm.total_spent} onChange={e => setEditForm(f => ({ ...f, total_spent: e.target.value }))}
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Количество визитов</label>
                <input type="number" value={editForm.visits} onChange={e => setEditForm(f => ({ ...f, visits: e.target.value }))}
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            {editMsg && (
              <div className={`text-sm text-center py-2 rounded-lg ${editMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {editMsg}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditing(false)} className="flex-1 border border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors">Отмена</button>
              <button type="submit" disabled={editLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "hsl(32,45%,55%)" }}>
                {editLoading ? "Сохраняю…" : "Сохранить"}
              </button>
            </div>
          </form>
        ) : (
          <div>{editMsg && <div className="text-emerald-600 text-sm mb-3 text-center">{editMsg}</div>}</div>
        )}
      </div>

      <button onClick={onBack} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors">
        <Icon name="ArrowLeft" size={16} /> Вернуться к списку
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CONTACTS VIEW
══════════════════════════════════════════════════════════════════ */
interface ContactSettings {
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;
  contact_address: string;
  contact_hours: string;
  contact_website: string;
}

function ContactsView({ apiFetch }: { apiFetch: (opts: RequestInit, qs?: string) => Promise<unknown> }) {
  const [form, setForm] = useState<ContactSettings>({
    contact_phone:    "",
    contact_whatsapp: "",
    contact_email:    "",
    contact_address:  "",
    contact_hours:    "",
    contact_website:  "",
  });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");

  useEffect(() => {
    apiFetch({ method: "GET" }, "type=settings")
      .then((data: unknown) => {
        const d = data as { settings?: Partial<ContactSettings> };
        if (d.settings) setForm(f => ({ ...f, ...d.settings }));
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      const data = await apiFetch({
        method: "POST",
        body: JSON.stringify({ action: "save_settings", settings: form }),
      }) as { ok?: boolean; error?: string };
      setMsg(data.ok ? "✓ Контакты сохранены" : "✗ " + (data.error || "Ошибка"));
    } catch { setMsg("✗ Ошибка соединения"); }
    finally { setSaving(false); setTimeout(() => setMsg(""), 3000); }
  };

  const fields: { key: keyof ContactSettings; label: string; icon: string; placeholder: string; type?: string }[] = [
    { key: "contact_phone",    label: "Номер телефона",       icon: "Phone",         placeholder: "+7 (900) 000-00-00",           type: "tel" },
    { key: "contact_whatsapp", label: "WhatsApp / Telegram",  icon: "MessageCircle", placeholder: "+7 (900) 000-00-00",           type: "tel" },
    { key: "contact_email",    label: "Электронная почта",    icon: "Mail",          placeholder: "info@example.ru",              type: "email" },
    { key: "contact_address",  label: "Адрес",                icon: "MapPin",        placeholder: "г. Москва, ул. Примерная, 1" },
    { key: "contact_hours",    label: "Режим работы",         icon: "Clock",         placeholder: "Ежедневно, 9:00 — 21:00" },
    { key: "contact_website",  label: "Сайт бронирования",    icon: "Globe",         placeholder: "https://freedomvilage.ru/#homes", type: "url" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
      <Icon name="Loader2" size={20} className="animate-spin mr-2" /> Загрузка…
    </div>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <div className="font-display text-2xl font-semibold">Контакты</div>
        <div className="text-muted-foreground text-sm mt-1">Данные отображаются в разделе «Контакты» приложения для гостей</div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        {fields.map(f => (
          <div key={f.key}>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
              <Icon name={f.icon} size={13} />
              {f.label}
            </label>
            <input
              type={f.type || "text"}
              value={form[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}

        {msg && (
          <div className={`text-sm text-center py-2.5 rounded-xl ${msg.startsWith("✓") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {msg}
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "hsl(32,45%,55%)" }}>
          {saving ? <><Icon name="Loader2" size={16} className="animate-spin" /> Сохраняю…</> : "Сохранить контакты"}
        </button>
      </form>

      {/* Preview */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="font-display text-base font-semibold mb-4 text-muted-foreground">Предпросмотр</div>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(32,45%,55%)" }}>
                <Icon name={f.icon} size={15} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{f.label}</div>
                <div className="text-sm font-medium truncate">{form[f.key] || <span className="text-muted-foreground italic">Не заполнено</span>}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}