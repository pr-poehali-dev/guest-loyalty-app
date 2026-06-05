import { useState } from "react";
import Icon from "@/components/ui/icon";

type Section = "home" | "profile" | "earn" | "spend" | "history" | "levels" | "about" | "contacts";

const LOGO_URL = "https://cdn.poehali.dev/projects/1c0a4e35-bc68-4a24-b157-6e54c5e66aa3/bucket/eca21a63-97af-4be7-b4c5-0dbea45a48ae.jpg";
const HOUSE_URL = "https://cdn.poehali.dev/projects/1c0a4e35-bc68-4a24-b157-6e54c5e66aa3/bucket/d8034e69-c810-4a69-b63f-17e5edcf7adc.jpg";

const GUEST = {
  name: "Анна Смирнова",
  phone: "+7 (900) 123-45-67",
  bonuses: 3240,
  totalSpent: 54800,
  visits: 7,
  level: "Серебряный",
  levelNext: "Золотой",
  levelProgress: 68,
  memberSince: "март 2023",
};

const HISTORY = [
  { id: 1, date: "28 мая 2026", desc: "Проживание — Дом №3 «Берёзка»", amount: +480, type: "earn" },
  { id: 2, date: "15 мая 2026", desc: "Списание при бронировании", amount: -1000, type: "spend" },
  { id: 3, date: "2 апреля 2026", desc: "Проживание — Дом №1 «Сосновый»", amount: +620, type: "earn" },
  { id: 4, date: "10 марта 2026", desc: "Бонус за отзыв", amount: +200, type: "earn" },
  { id: 5, date: "20 февраля 2026", desc: "Проживание — Дом №5 «Кедровый»", amount: +540, type: "earn" },
  { id: 6, date: "5 февраля 2026", desc: "Списание при бронировании", amount: -500, type: "spend" },
];

const LEVELS = [
  {
    name: "Гость",
    icon: "🌿",
    minAmount: 0,
    maxAmount: 15000,
    percent: 3,
    perks: ["3% бонусов с каждого проживания", "День рождения — 500 бонусов"],
    color: "from-stone-400 to-stone-500",
    current: false,
  },
  {
    name: "Серебряный",
    icon: "🪨",
    minAmount: 15000,
    maxAmount: 50000,
    percent: 5,
    perks: ["5% бонусов с каждого проживания", "Ранний заезд при наличии", "500 бонусов на день рождения"],
    color: "from-slate-400 to-slate-500",
    current: true,
  },
  {
    name: "Золотой",
    icon: "🌾",
    minAmount: 50000,
    maxAmount: 100000,
    percent: 7,
    perks: ["7% бонусов с каждого проживания", "Ранний заезд / поздний выезд", "1000 бонусов на день рождения", "Приоритетное бронирование"],
    color: "from-amber-500 to-yellow-500",
    current: false,
  },
  {
    name: "Платиновый",
    icon: "🦅",
    minAmount: 100000,
    maxAmount: null,
    percent: 10,
    perks: ["10% бонусов с каждого проживания", "Ранний заезд / поздний выезд всегда", "2000 бонусов на день рождения", "Персональный менеджер", "Скидка 5% на всё"],
    color: "from-violet-400 to-purple-500",
    current: false,
  },
];

const NAV = [
  { id: "home" as Section, label: "Главная", icon: "Home" },
  { id: "profile" as Section, label: "Кабинет", icon: "User" },
  { id: "earn" as Section, label: "Накопить", icon: "TrendingUp" },
  { id: "spend" as Section, label: "Списать", icon: "Gift" },
  { id: "history" as Section, label: "История", icon: "Clock" },
  { id: "levels" as Section, label: "Уровни", icon: "Star" },
  { id: "about" as Section, label: "О программе", icon: "Info" },
  { id: "contacts" as Section, label: "Контакты", icon: "Phone" },
];

export default function Index() {
  const [section, setSection] = useState<Section>("home");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            className="flex items-center gap-2"
            onClick={() => setSection("home")}
          >
            <img src={LOGO_URL} alt="Фридом Виладж" className="h-8 w-8 object-contain" />
            <div className="leading-tight">
              <div className="font-display font-semibold text-sm text-foreground tracking-wide">ФРИДОМ ВИЛАДЖ</div>
              <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Программа лояльности</div>
            </div>
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors"
          >
            <Icon name={menuOpen ? "X" : "Menu"} size={20} />
          </button>
        </div>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute top-14 right-0 left-0 bg-white border-b border-border shadow-lg animate-fade-in z-50">
            <div className="max-w-2xl mx-auto px-4 py-3 grid grid-cols-4 gap-1">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setSection(item.id); setMenuOpen(false); }}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-center transition-all ${
                    section === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon name={item.icon} size={18} />
                  <span className="text-[10px] leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 pb-24">
        {section === "home" && <HomeSection onNavigate={setSection} />}
        {section === "profile" && <ProfileSection />}
        {section === "earn" && <EarnSection />}
        {section === "spend" && <SpendSection />}
        {section === "history" && <HistorySection />}
        {section === "levels" && <LevelsSection />}
        {section === "about" && <AboutSection />}
        {section === "contacts" && <ContactsSection />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border z-40">
        <div className="max-w-2xl mx-auto px-2 h-16 flex items-center justify-around">
          {NAV.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${
                section === item.id
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon name={item.icon} size={20} />
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ─── HOME ─── */
function HomeSection({ onNavigate }: { onNavigate: (s: Section) => void }) {
  return (
    <div className="pt-5 space-y-5">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-52 animate-fade-in">
        <img src={HOUSE_URL} alt="Фридом Виладж" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(210,15%,22%)]/80 via-[hsl(210,15%,22%)]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <div className="font-display text-2xl font-semibold leading-tight">
            Добро пожаловать,<br />{GUEST.name.split(" ")[0]}!
          </div>
          <div className="text-sm text-white/80 mt-1 font-body">Уровень: {GUEST.level} гость</div>
        </div>
      </div>

      {/* Bonus card */}
      <div className="rounded-2xl wood-texture p-5 text-white animate-fade-in delay-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-white/70 text-xs uppercase tracking-widest font-body">Ваши бонусы</div>
            <div className="font-display text-5xl font-bold mt-1">{GUEST.bonuses.toLocaleString()}</div>
            <div className="text-white/70 text-sm mt-0.5">баллов</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">🎁</div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20 flex gap-3">
          <button
            onClick={() => onNavigate("earn")}
            className="flex-1 bg-white/20 hover:bg-white/30 transition-colors rounded-xl py-2 text-sm font-medium text-center text-white"
          >
            Накопить
          </button>
          <button
            onClick={() => onNavigate("spend")}
            className="flex-1 bg-white/20 hover:bg-white/30 transition-colors rounded-xl py-2 text-sm font-medium text-center text-white"
          >
            Списать
          </button>
        </div>
      </div>

      {/* Level progress */}
      <div className="card-warm rounded-2xl p-5 animate-fade-in delay-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">Уровень</div>
            <div className="font-display text-xl font-semibold mt-0.5">{GUEST.level}</div>
          </div>
          <button onClick={() => onNavigate("levels")} className="text-accent text-sm font-medium">
            Все уровни →
          </button>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full wood-texture transition-all duration-700"
            style={{ width: `${GUEST.levelProgress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{GUEST.level}</span>
          <span>{GUEST.levelProgress}% до «{GUEST.levelNext}»</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 animate-fade-in delay-300">
        {[
          { label: "Визитов", value: GUEST.visits, icon: "MapPin" },
          { label: "Потрачено ₽", value: GUEST.totalSpent.toLocaleString(), icon: "CreditCard" },
          { label: "С нами с", value: GUEST.memberSince, icon: "Calendar" },
        ].map((s) => (
          <div key={s.label} className="card-warm rounded-xl p-3 text-center">
            <Icon name={s.icon} size={18} className="mx-auto text-accent mb-1" />
            <div className="font-display text-lg font-bold">{s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Last operations */}
      <div className="animate-fade-in delay-400">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-lg font-semibold">Последние операции</div>
          <button onClick={() => onNavigate("history")} className="text-accent text-sm">Все →</button>
        </div>
        <div className="space-y-2">
          {HISTORY.slice(0, 3).map((op) => (
            <div key={op.id} className="card-warm rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{op.desc}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{op.date}</div>
              </div>
              <div className={`font-semibold text-sm ml-3 whitespace-nowrap ${op.type === "earn" ? "text-emerald-600" : "text-rose-500"}`}>
                {op.type === "earn" ? "+" : ""}{op.amount.toLocaleString()} б
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── PROFILE ─── */
function ProfileSection() {
  return (
    <div className="pt-5 space-y-4 animate-fade-in">
      <div className="font-display text-2xl font-semibold">Личный кабинет</div>

      <div className="card-warm rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl wood-texture flex items-center justify-center text-white text-2xl font-display font-bold">
            {GUEST.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <div className="font-display text-xl font-semibold">{GUEST.name}</div>
            <div className="text-muted-foreground text-sm mt-0.5">{GUEST.phone}</div>
            <div className="inline-flex items-center gap-1 mt-1.5 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
              🪨 {GUEST.level} гость
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Бонусный баланс", value: `${GUEST.bonuses.toLocaleString()} б`, icon: "Star", color: "text-amber-500" },
          { label: "Всего визитов", value: String(GUEST.visits), icon: "Home", color: "text-accent" },
          { label: "Сумма брониров.", value: `${GUEST.totalSpent.toLocaleString()} ₽`, icon: "CreditCard", color: "text-emerald-600" },
          { label: "В программе с", value: GUEST.memberSince, icon: "Calendar", color: "text-primary" },
        ].map((item) => (
          <div key={item.label} className="card-warm rounded-xl p-4">
            <Icon name={item.icon} size={20} className={`${item.color} mb-2`} />
            <div className="font-display text-xl font-bold">{item.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="card-warm rounded-2xl p-5 space-y-3">
        <div className="font-display text-lg font-semibold">Персональные данные</div>
        {[
          { label: "Имя", value: GUEST.name },
          { label: "Телефон", value: GUEST.phone },
          { label: "Уровень лояльности", value: GUEST.level },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
            <span className="text-muted-foreground text-sm">{row.label}</span>
            <span className="font-medium text-sm">{row.value}</span>
          </div>
        ))}
        <button className="w-full mt-2 border border-border rounded-xl py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
          Редактировать данные
        </button>
      </div>
    </div>
  );
}

/* ─── EARN ─── */
function EarnSection() {
  return (
    <div className="pt-5 space-y-5 animate-fade-in">
      <div className="font-display text-2xl font-semibold">Как накопить бонусы</div>

      <div className="relative rounded-2xl overflow-hidden">
        <img src={HOUSE_URL} alt="" className="w-full h-36 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(210,15%,22%)]/70 to-transparent flex items-center px-5">
          <div className="text-white">
            <div className="text-3xl font-display font-bold">5%</div>
            <div className="text-sm text-white/80">с каждого проживания</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { icon: "🏡", title: "Проживание в наших домах", desc: "От 3% до 10% от стоимости бронирования в зависимости от уровня", bonus: "3–10%" },
          { icon: "⭐", title: "Отзыв после проживания", desc: "Оставьте отзыв о вашем отдыхе", bonus: "+200 б" },
          { icon: "👥", title: "Приведи друга", desc: "Ваш друг забронирует впервые — оба получат бонус", bonus: "+500 б" },
          { icon: "🎂", title: "День рождения", desc: "Подарок от нас в ваш праздник", bonus: "до 2000 б" },
          { icon: "📱", title: "Регистрация в программе", desc: "Приветственные бонусы за вступление", bonus: "+300 б" },
        ].map((item) => (
          <div key={item.title} className="card-warm rounded-xl px-4 py-4 flex items-start gap-4">
            <div className="text-2xl flex-shrink-0">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
            <div className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap">
              {item.bonus}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <div className="flex gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm text-amber-800">
            <span className="font-semibold">Совет:</span> Повышайте уровень лояльности — больший уровень даёт больший процент начисления бонусов.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SPEND ─── */
function SpendSection() {
  const [amount, setAmount] = useState("");
  const bonusAmount = parseInt(amount) || 0;

  return (
    <div className="pt-5 space-y-5 animate-fade-in">
      <div className="font-display text-2xl font-semibold">Списать бонусы</div>

      <div className="card-warm rounded-2xl p-5 text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Доступно для списания</div>
        <div className="font-display text-5xl font-bold mt-2 text-accent">{GUEST.bonuses.toLocaleString()}</div>
        <div className="text-muted-foreground text-sm">баллов = {GUEST.bonuses.toLocaleString()} ₽</div>
      </div>

      <div className="card-warm rounded-2xl p-5 space-y-4">
        <div className="font-display text-lg font-semibold">Применить при бронировании</div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Стоимость бронирования (₽)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Введите сумму"
            className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {bonusAmount > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 animate-scale-in">
            Вы можете оплатить бонусами до <strong>{Math.min(GUEST.bonuses, Math.round(bonusAmount * 0.5)).toLocaleString()} ₽</strong> (до 50% от суммы)
          </div>
        )}
        <button className="w-full wood-texture text-white rounded-xl py-3.5 font-semibold text-sm transition-opacity hover:opacity-90">
          Применить бонусы
        </button>
      </div>

      <div className="space-y-3">
        <div className="font-display text-lg font-semibold">Условия списания</div>
        {[
          { icon: "📌", text: "Бонусами можно оплатить до 50% стоимости бронирования" },
          { icon: "📌", text: "Минимальная сумма списания — 500 баллов" },
          { icon: "📌", text: "1 бонус = 1 рубль" },
          { icon: "📌", text: "Списание происходит в момент подтверждения брони" },
        ].map((item, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span className="text-base">{item.icon}</span>
            <span className="text-sm text-muted-foreground">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── HISTORY ─── */
function HistorySection() {
  const [filter, setFilter] = useState<"all" | "earn" | "spend">("all");
  const filtered = filter === "all" ? HISTORY : HISTORY.filter((h) => h.type === filter);

  return (
    <div className="pt-5 space-y-4 animate-fade-in">
      <div className="font-display text-2xl font-semibold">История операций</div>

      <div className="flex gap-2">
        {[
          { key: "all" as const, label: "Все" },
          { key: "earn" as const, label: "Начисления" },
          { key: "spend" as const, label: "Списания" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === f.key
                ? "wood-texture text-white"
                : "bg-muted text-muted-foreground hover:bg-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-warm rounded-xl p-3 text-center">
          <div className="text-emerald-600 text-xs font-medium mb-1">Начислено</div>
          <div className="font-display text-2xl font-bold text-emerald-600">
            +{HISTORY.filter((h) => h.type === "earn").reduce((s, h) => s + h.amount, 0).toLocaleString()} б
          </div>
        </div>
        <div className="card-warm rounded-xl p-3 text-center">
          <div className="text-rose-500 text-xs font-medium mb-1">Списано</div>
          <div className="font-display text-2xl font-bold text-rose-500">
            {HISTORY.filter((h) => h.type === "spend").reduce((s, h) => s + h.amount, 0).toLocaleString()} б
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((op, i) => (
          <div
            key={op.id}
            className="card-warm rounded-xl px-4 py-3.5 flex items-center gap-3 animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
              op.type === "earn" ? "bg-emerald-100" : "bg-rose-100"
            }`}>
              {op.type === "earn" ? "⬆️" : "⬇️"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium leading-tight">{op.desc}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{op.date}</div>
            </div>
            <div className={`font-semibold text-sm whitespace-nowrap ${op.type === "earn" ? "text-emerald-600" : "text-rose-500"}`}>
              {op.type === "earn" ? "+" : ""}{op.amount.toLocaleString()} б
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── LEVELS ─── */
function LevelsSection() {
  return (
    <div className="pt-5 space-y-5 animate-fade-in">
      <div className="font-display text-2xl font-semibold">Уровни лояльности</div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
        <span className="text-2xl">🪨</span>
        <div>
          <div className="font-semibold text-amber-900 text-sm">Ваш уровень — {GUEST.level}</div>
          <div className="text-xs text-amber-700 mt-0.5">
            До «{GUEST.levelNext}» осталось {Math.round((1 - GUEST.levelProgress / 100) * (50000 - 15000)).toLocaleString()} ₽ трат
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {LEVELS.map((level, i) => (
          <div
            key={level.name}
            className={`rounded-2xl overflow-hidden border-2 transition-all animate-fade-in ${
              level.current ? "border-accent shadow-lg" : "border-transparent"
            }`}
            style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}
          >
            <div className={`bg-gradient-to-r ${level.color} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{level.icon}</span>
                  <div>
                    <div className="font-display text-xl font-semibold">{level.name}</div>
                    <div className="text-white/70 text-xs">
                      {level.maxAmount
                        ? `от ${level.minAmount.toLocaleString()} до ${level.maxAmount.toLocaleString()} ₽`
                        : `от ${level.minAmount.toLocaleString()} ₽`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display font-bold">{level.percent}%</div>
                  <div className="text-white/70 text-xs">бонусов</div>
                </div>
              </div>
              {level.current && (
                <div className="mt-2 inline-block bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                  ✓ Ваш текущий уровень
                </div>
              )}
            </div>
            <div className="card-warm p-4 space-y-1.5">
              {level.perks.map((perk) => (
                <div key={perk} className="flex items-start gap-2 text-sm">
                  <span className="text-accent mt-0.5">✦</span>
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── ABOUT ─── */
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
          { step: "1", title: "Бронируйте и отдыхайте", desc: "Выбирайте любой дом из нашей сети и наслаждайтесь отдыхом" },
          { step: "2", title: "Получайте бонусы", desc: "За каждое проживание автоматически начисляются бонусные баллы" },
          { step: "3", title: "Повышайте уровень", desc: "Чем больше вы бронируете — тем выгоднее условия программы" },
          { step: "4", title: "Тратьте с удовольствием", desc: "Оплачивайте бонусами до 50% стоимости следующего отдыха" },
        ].map((item) => (
          <div key={item.step} className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full wood-texture text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {item.step}
            </div>
            <div>
              <div className="font-medium text-sm">{item.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-warm rounded-2xl p-5">
        <div className="font-display text-lg font-semibold mb-3">Часто задаваемые вопросы</div>
        <div className="space-y-3">
          {[
            { q: "Когда начисляются бонусы?", a: "Бонусы зачисляются на счёт в течение 24 часов после выезда." },
            { q: "Срок действия бонусов?", a: "Бонусы действуют 12 месяцев с момента последнего проживания." },
            { q: "Можно передать бонусы?", a: "Бонусы начисляются и используются только владельцем аккаунта." },
            { q: "Как узнать свой баланс?", a: "Баланс всегда доступен в личном кабинете и на главном экране." },
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

/* ─── CONTACTS ─── */
function ContactsSection() {
  return (
    <div className="pt-5 space-y-5 animate-fade-in">
      <div className="font-display text-2xl font-semibold">Контакты</div>

      <div className="card-warm rounded-2xl p-5 flex items-center gap-4">
        <img src={LOGO_URL} alt="Фридом Виладж" className="w-16 h-16 object-contain rounded-xl bg-white p-1 border border-border" />
        <div>
          <div className="font-display text-lg font-semibold">Фридом Виладж</div>
          <div className="text-muted-foreground text-sm">Сеть арендных домов</div>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { icon: "Phone", label: "Телефон", value: "+7 (900) 000-00-00", action: "Позвонить" },
          { icon: "MessageCircle", label: "WhatsApp / Telegram", value: "+7 (900) 000-00-00", action: "Написать" },
          { icon: "Mail", label: "Email", value: "info@freedom-village.ru", action: "Написать" },
          { icon: "MapPin", label: "Адрес", value: "Московская область, пос. Лесной", action: "На карте" },
          { icon: "Clock", label: "Режим работы", value: "Ежедневно, 9:00 — 21:00", action: null },
        ].map((c) => (
          <div key={c.label} className="card-warm rounded-xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl wood-texture flex items-center justify-center flex-shrink-0">
              <Icon name={c.icon} size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className="text-sm font-medium mt-0.5 truncate">{c.value}</div>
            </div>
            {c.action && (
              <button className="text-accent text-xs font-semibold whitespace-nowrap">
                {c.action} →
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="card-warm rounded-2xl p-5">
        <div className="font-display text-lg font-semibold mb-3">Написать нам</div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Ваше имя"
            className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            placeholder="Ваше сообщение"
            rows={3}
            className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <button className="w-full wood-texture text-white rounded-xl py-3.5 font-semibold text-sm transition-opacity hover:opacity-90">
            Отправить сообщение
          </button>
        </div>
      </div>
    </div>
  );
}
