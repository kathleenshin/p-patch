import React, { useState, useEffect, useRef } from "react";
import {
  Bell, Search, ChevronRight, Eye, EyeOff, Plus, Filter,
  Leaf, ClipboardList, Package, Pencil, Trash2, X,
  CloudRain, Sun, Cloud, Zap, Droplets, ArrowRight,
  Newspaper, MapPin, Users, AlertTriangle, Check, ChevronDown,
  Home, LayoutGrid, Archive, ShieldCheck,
  Wind, Gauge, Thermometer, Sunrise, Sunset, Navigation
} from "lucide-react";
import gardenPhoto from "@/imports/gardening_plots_growing_veggies_vivid.jpg";
import plantIconPng from "@/imports/ChatGPT_Image_Jul_21__2026__02_30_30_AM.png";
import plotPhoto    from "@/imports/I_want_a_picture_of_a_single_gardening_plot_with_some_bell_p.jpg";
import plotBedIcon  from "@/imports/I_need_a_garden_themed_icon_on_a_pale_green_square_shaped_ba__1_.jpg";
import taskBoardIcon   from "@/imports/it_a_task_board_3_bullet_points_on_the_left_and_lines_on_the.jpg";
import dashboardIcon   from "@/imports/Make_the_image_in_the_center_bigger_make_the_border_wider.jpg";

const gardenFacts = [
  "Did you know that tomatoes are botanically a berry, but legally classified as a vegetable in the US?",
  "Tomato juice is the official state beverage of Ohio, honoring the breeder who popularized it in the 1800s.",
  "A single voracious hornworm can completely strip a tomato plant of its leaves in just 24 hours.",
  "Tomatoes are packed with lycopene, a powerful antioxidant that becomes even more active when cooked.",
  "In Europe, tomatoes were once called 'poison apples' because aristocrats got sick eating them off pewter plates.",
  "Storing your garden tomatoes in the refrigerator destroys their flavor enzymes and makes them mealy.",
  "Planting onions or basil right next to your tomatoes can actually improve their overall growth.",
  "The heaviest single tomato ever recorded weighed an astonishing 11 pounds, 6 ounces.",
  "Bell peppers are completely unique because they lack the chemical gene required to make capsaicin.",
  "Red, yellow, and orange bell peppers are simply green peppers allowed to ripen fully on the vine.",
  "Birds are totally immune to the heat of hot peppers; they spread the seeds without feeling any burn.",
  "The heat of a pepper is concentrated in its white internal membrane, not actually in its seeds.",
  "Peppers are technically perennial plants and can be overwintered indoors to grow again next spring.",
  "Hot peppers produce capsaicin as a natural defense mechanism to stop fungi and mammals from eating them.",
  "A zucchini is a type of summer squash, but if left unpicked, it will grow into a massive marrow.",
  "Squash flowers are completely edible and are often stuffed with cheese, battered, and fried.",
  "Native Americans historically planted squash, corn, and beans together as 'The Three Sisters'.",
  "Zucchini grows incredibly fast, often expanding by several inches in a single hot summer afternoon.",
  "Cucumbers are 95% water, making them an incredibly refreshing treat straight from the summer patch.",
  "Luffa sponges are not sea creatures; they are actually grown from the dried skeleton of a luffa squash vine.",
  "Gram for gram, raw broccoli actually packs a higher percentage of protein than a steak.",
  "Spinach grows so fast that it can be harvested just 4 to 6 weeks after sowing the seeds.",
  "Broccoli, kale, cabbage, cauliflower, and Brussels sprouts are all bred from the exact same wild mustard plant.",
  "Kale can survive sub-freezing winter weather, and frost actually makes its leaves taste much sweeter.",
  "The largest cabbage ever recorded in agricultural history weighed a massive 138 pounds.",
  "Carrots were originally purple or yellow; the orange varieties were bred later in Western Europe.",
  "Potatoes were the very first vegetable to successfully grow in space, aboard the Space Shuttle Columbia.",
  "Radishes are one of the fastest garden crops, going from seed to harvest in just 21 days.",
  "Sweet potatoes belong to the morning glory family and are completely unrelated to regular white potatoes.",
  "Carrots are incredibly high in beta-carotene, which your liver converts directly into Vitamin A.",
  "The green leafy tops of carrots are completely edible and make a fantastic, tangy kitchen pesto.",
  "Nasturtium flowers are completely edible, peppery, and act as a natural aphid trap in gardens.",
  "Planting French marigolds releases root chemicals that drive away destructive soil nematodes.",
  "Mint spreads so aggressively via underground runners that it should always be grown in containers.",
  "Lavender blooms smell wonderful to humans but naturally repel annoying garden flies and mosquitoes.",
  "Basil should never be stored in the fridge, as the cold air turns its aromatic leaves black.",
  "Dill is a powerhouse companion plant that attracts beneficial wasps to eat tomato hornworms.",
  "Sunflowers can be used as a 'trap crop' to draw stinkbugs completely away from your vegetables.",
  "Dandelions were intentionally brought to America by European immigrants as a valued spring green vegetable.",
  "Sprinkling used coffee grounds around your crops adds nitrogen and deters crawling garden pests.",
];

// ─── Fonts ────────────────────────────────────────────────────────────────────
const serif = { fontFamily: "'Lora', serif" };
const sans  = { fontFamily: "'Nunito', sans-serif" };
const mono  = { fontFamily: "'DM Mono', monospace" };

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  // Core brand
  cream:      "#FAF8F3",   // Warm Ivory background
  creamDark:  "#EDE8DC",
  card:       "#FFFFFF",
  sage:       "#3F7D47",   // Forest Green (primary)
  sageDark:   "#2D5C33",
  sageLight:  "#D2ECD8",
  sagePop:    "#E8F5EB",
  sageMid:    "#B4D8BC",
  header:     "#2F4633",   // Deep Olive (nav/header)
  terra:      "#C76A32",   // Warm Terracotta (accent)
  terraDark:  "#9E5025",
  terraLight: "#FAE8DA",
  amber:      "#D4920A",
  amberLight: "#FEF3D0",
  gold:       "#C8A020",   // Gold for My Plot border/badge
  lavender:   "#7C5CBF",
  sky:        "#1D90D0",
  // Text
  brown:      "#2B2B2B",   // Charcoal
  brownMid:   "#4A4A4A",
  brownLight: "#6A6A6A",
  muted:      "#9A9A8A",
  border:     "#DED8CC",
  white:      "#FFFFFF",
};

// ─── Weather data ─────────────────────────────────────────────────────────────
const weekWeather = [
  { day: "Mon", icon: "sun",   hi: 74, lo: 52, desc: "Sunny" },
  { day: "Tue", icon: "cloud", hi: 68, lo: 50, desc: "Cloudy" },
  { day: "Wed", icon: "rain",  hi: 61, lo: 48, desc: "Rain" },
  { day: "Thu", icon: "storm", hi: 58, lo: 46, desc: "Thunderstorm" },
  { day: "Fri", icon: "cloud", hi: 63, lo: 49, desc: "Partly Cloudy" },
  { day: "Sat", icon: "sun",   hi: 71, lo: 51, desc: "Sunny" },
  { day: "Sun", icon: "sun",   hi: 76, lo: 53, desc: "Sunny" },
];

const todayDetail = {
  humidity:   68,          // %
  pressure:   1013,        // hPa
  wind:       9,           // mph
  windDir:    "SW",
  uvIndex:    4,
  visibility: 10,          // miles
  dewPoint:   52,          // °F
  feelsLike:  71,          // °F
};

function WeatherIcon({ type, size = 18 }: { type: string; size?: number }) {
  if (type === "sun")   return <Sun   size={size} color="#E8960A" />;
  if (type === "rain")  return <CloudRain size={size} color={C.sky} />;
  if (type === "storm") return <Zap   size={size} color="#7C5CBF" />;
  return <Cloud size={size} color="#94A3B8" />;
}

// ─── Day forecast widget ──────────────────────────────────────────────────────
function DayForecastWidget() {
  const today = weekWeather[0];
  const d     = todayDetail;
  const wh    = "rgba(255,255,255,0.9)";
  const wm    = "rgba(255,255,255,0.6)";

  const sideStats: { Icon: React.ElementType; value: string }[] = [
    { Icon: Sunrise,    value: "6:42 am" },
    { Icon: Sunset,     value: "8:18 pm" },
    { Icon: Droplets,   value: `${d.humidity}%` },
    { Icon: Wind,       value: `${d.wind} mph` },
    { Icon: Navigation, value: d.windDir },
    { Icon: Gauge,      value: `${d.pressure} mb` },
  ];

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: "hidden" }}>
      {/* Green header strip */}
      <div style={{ background: C.sagePop, borderBottom: `1px solid ${C.sageMid}`,
        padding: "8px 14px", display: "flex", alignItems: "center",
        justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sun size={13} color={C.sage} />
          <span style={{ fontSize: "0.68rem", fontWeight: 800, color: C.sage,
            textTransform: "uppercase", letterSpacing: "0.06em", ...mono }}>
            Today
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <MapPin size={11} color={C.sage} />
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: C.sage }}>South Seattle</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "12px 14px" }}>
        {/* Main row: temp | big icon | stats */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center" }}>
          {/* Temperature */}
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
              <Thermometer size={18} color={C.terra} />
              <span style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1, color: C.brown }}>
                {today.hi}°
              </span>
            </div>
            <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 4 }}>
              Feels like {d.feelsLike}°F
            </div>
            <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 2 }}>
              Low {today.lo}°F
            </div>
          </div>

          {/* Big weather icon + description */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <WeatherIcon type={today.icon} size={56} />
            <span style={{ fontSize: "0.78rem", color: C.brownLight, textAlign: "center" }}>{today.desc}</span>
          </div>

          {/* Right stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sideStats.map(({ Icon, value }) => (
              <div key={value} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Icon size={13} color={C.muted} />
                <span style={{ fontSize: "0.72rem", color: C.brownMid, whiteSpace: "nowrap" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Week forecast widget ─────────────────────────────────────────────────────
function WeekWeatherWidget() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ background: C.sagePop, borderBottom: `1px solid ${C.sageMid}`,
        padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <Cloud size={13} color={C.sage} />
        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: C.sage,
          textTransform: "uppercase", letterSpacing: "0.06em", ...mono }}>
          Week Forecast
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${weekWeather.length}, 1fr)`,
        padding: "8px 8px 10px" }}>
        {weekWeather.map((d, i) => (
          <div key={d.day} style={{ display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, padding: "4px 2px",
            background: i === 0 ? C.sagePop : "transparent",
            borderRadius: 8 }}>
            <span style={{ fontSize: "0.58rem", color: i === 0 ? C.sage : C.muted,
              fontWeight: 800, ...mono }}>{d.day}</span>
            <WeatherIcon type={d.icon} size={14} />
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: C.brown }}>{d.hi}°</span>
            <span style={{ fontSize: "0.56rem", color: C.muted }}>{d.lo}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── External weather widget (Plot page) ─────────────────────────────────────
function ExternalWeatherWidget() {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    el.setAttribute("v", "1.3");
    el.setAttribute("loc", "id");
    el.setAttribute("a", JSON.stringify({
      t: "responsive", lang: "en", sl_lpl: 1, ids: ["wl3620"],
      font: "Arial", sl_ics: "one_a", sl_sot: "fahrenheit", cl_bkg: "image",
      cl_font: "#FFFFFF", cl_cloud: "#FFFFFF", cl_persp: "#81D4FA",
      cl_sun: "#FFC107", cl_moon: "#FFC107", cl_thund: "#FF5722",
    }));

    const scriptId = "ww-weather-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://app3.weatherwidget.org/js/?id=ww_d1c8be0e3c255";
      script.async = true;
      document.body.appendChild(script);
    } else {
      // Re-init if already loaded
      (window as any).ww_d1c8be0e3c255?.init?.();
    }
  }, []);

  return (
    <div style={{ borderRadius: 18, overflow: "hidden",
      border: `1.5px solid ${C.sageMid}`, minHeight: 100 }}>
      <div ref={divRef} id="ww_d1c8be0e3c255" style={{ width: "100%" }}>
        <span style={{ fontSize: "0.75rem", color: C.muted }}>Loading weather…</span>
      </div>
    </div>
  );
}

// ─── Plot states ──────────────────────────────────────────────────────────────
type PlotState = "available" | "active" | "help-needed" | "pending" | "mine";

const plotColors: Record<PlotState, { bg: string; border: string; text: string; label: string }> = {
  available:    { bg: "#EBEBEB",   border: "#C0C0C0",   text: "#777",       label: "Free" },
  active:       { bg: C.sage,      border: C.sageDark,  text: C.white,      label: "Occupied" },
  "help-needed":{ bg: C.terra,     border: C.terraDark, text: C.white,      label: "Needs Help" },
  pending:      { bg: "#EBEBEB",   border: "#C0C0C0",   text: "#777",       label: "Available" },
  mine:         { bg: C.sage,      border: C.gold,      text: C.white,      label: "My Plot" },
};
const plotEmoji: Record<PlotState, string> = {
  available: "", active: "", "help-needed": "🟠", pending: "", mine: "",
};

interface PlotInfo {
  id: number; state: PlotState; owner?: string; since?: string;
  crops?: string[]; section: string;
}
const allPlots: PlotInfo[] = [
  { id:  1, state: "active",       owner: "James L.",  since: "2019", crops: ["Kale","Garlic"],          section: "North" },
  { id:  2, state: "available",    section: "North" },
  { id:  3, state: "available",    section: "North" },
  { id:  4, state: "active",       owner: "Sofia M.",  since: "2021", crops: ["Squash","Basil"],          section: "North" },
  { id:  5, state: "help-needed",  owner: "Theo R.",   since: "2020", crops: ["Tomatoes","Cucumbers"],    section: "North" },
  { id:  6, state: "available",    section: "North" },
  { id:  7, state: "active",       owner: "Amara O.",  since: "2018", crops: ["Chard","Onions"],          section: "North" },
  { id:  8, state: "available",    section: "South" },
  { id:  9, state: "pending",      owner: "New Member (Pending)",      section: "South" },
  { id: 10, state: "active",       owner: "Luis M.",   since: "2022", crops: ["Peppers","Eggplant"],      section: "South" },
  { id: 11, state: "mine",         owner: "Elena V.",  since: "2023", crops: ["Tomatoes","Basil","Garlic"],section: "South" },
  { id: 12, state: "available",    section: "South" },
  { id: 13, state: "active",       owner: "Kenji T.",  since: "2020", crops: ["Daikon","Shiso"],          section: "South" },
  { id: 14, state: "help-needed",  owner: "Sue K.",    since: "2021", crops: ["Basil","Lettuce"],         section: "East" },
  { id: 15, state: "available",    section: "East" },
  { id: 16, state: "active",       owner: "Priya N.",  since: "2022", crops: ["Beans","Peas"],            section: "East" },
  { id: 17, state: "active",       owner: "Marco R.",  since: "2019", crops: ["Zucchini","Fennel"],       section: "East" },
  { id: 18, state: "available",    section: "East" },
];

// ─── Shared ───────────────────────────────────────────────────────────────────
type Screen = "login" | "dashboard" | "plot" | "tasks" | "inventory" | "admin";

function DoodleLeaf({ size = 28, color = C.sage }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M8 26 C8 26 10 14 20 8 C28 4 28 4 28 4 C28 4 26 14 18 20 C12 24 8 26 8 26Z"
        fill={color} opacity="0.95" />
      <path d="M8 26 L18 16" stroke={color === C.white ? "rgba(255,255,255,0.4)" : C.sageDark}
        strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlantIcon({ size = 38 }: { size?: number }) {
  return (
    <img src={plantIconPng} alt="plant" width={size} height={size}
      style={{ objectFit: "contain", display: "block" }} />
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "11px 14px",
  border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: "0.9rem",
  background: C.cream, color: C.brown, outline: "none",
  fontFamily: "'Nunito', sans-serif",
};
const linkStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: C.brownLight, fontFamily: "'Nunito', sans-serif", fontSize: "0.82rem",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem", fontWeight: 800, color: C.brownLight,
  letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6,
};
const cardStyle: React.CSSProperties = {
  background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px",
};

function TopNav({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const links: { label: string; screen: Screen; Icon: React.ElementType }[] = [
    { label: "Dashboard", screen: "dashboard", Icon: Home },
    { label: "Plots",     screen: "plot",      Icon: LayoutGrid },
    { label: "Tasks",     screen: "tasks",     Icon: ClipboardList },
    { label: "Inventory", screen: "inventory", Icon: Archive },
  ];
  return (
    <nav style={{ background: C.header, ...sans, position: "sticky", top: 0, zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: 52 }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
        flexShrink: 0 }} onClick={() => setScreen("dashboard")}>
        <DoodleLeaf size={24} color={C.white} />
        <span style={{ ...serif, color: C.white, fontWeight: 700, fontSize: "0.95rem",
          whiteSpace: "nowrap" }}>
          Judkins Park P-Patch Gardening
        </span>
      </div>
      {/* Links */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {links.map((l) => {
          const active = screen === l.screen;
          return (
            <button key={l.label} onClick={() => setScreen(l.screen)}
              style={{ color: active ? C.white : "rgba(255,255,255,0.6)",
                fontWeight: active ? 700 : 500,
                background: active ? "rgba(255,255,255,0.14)" : "none",
                border: "none", cursor: "pointer", padding: "7px 14px", borderRadius: 10,
                fontSize: "0.83rem", fontFamily: "'Nunito', sans-serif", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 6 }}>
              <l.Icon size={15} />
              {l.label}
            </button>
          );
        })}
        <button onClick={() => setScreen("admin")}
          style={{ color: screen === "admin" ? C.white : "rgba(255,255,255,0.6)",
            fontWeight: screen === "admin" ? 700 : 500,
            background: screen === "admin" ? "rgba(255,255,255,0.14)" : "none",
            border: "none", cursor: "pointer", padding: "7px 14px", borderRadius: 10,
            fontSize: "0.83rem", fontFamily: "'Nunito', sans-serif",
            display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={15} />
          Admin
        </button>
      </div>
      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10,
          padding: "7px", cursor: "pointer", display: "flex" }}>
          <Bell size={16} color={C.amber} />
        </button>
        <div style={{ width: 32, height: 32, borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.terra}, ${C.amber})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.white, fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>E</div>
      </div>
    </nav>
  );
}

// ─── Screen 1: Login ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab]       = useState<"login" | "register">("login");
  const [fact]              = useState(() => gardenFacts[Math.floor(Math.random() * gardenFacts.length)]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", ...sans }}>
      {/* Left: garden photo — 65% */}
      <div style={{ flex: "0 0 65%", position: "relative", background: "#2A4A2A", overflow: "hidden" }}>
        <img
          src={gardenPhoto}
          alt="Vibrant community garden raised beds with tomatoes, lettuce, and cabbage"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(160deg, rgba(30,70,30,0.45) 0%, rgba(15,35,15,0.65) 100%)" }} />

        {/* Overlay content */}
        <div style={{ position: "absolute", bottom: 52, left: 52, right: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <DoodleLeaf size={34} color={C.white} />
            <span style={{ ...serif, color: C.white, fontWeight: 700, fontSize: "1.4rem" }}>
              Judkins Park P-Patch
            </span>
          </div>

          {/* Rotating garden fact */}
          <div style={{ background: "rgba(234,245,237,0.15)", backdropFilter: "blur(10px)",
            borderRadius: 18, padding: "18px 22px",
            border: "1px solid rgba(255,255,255,0.22)", maxWidth: 500 }}>
            <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, ...mono }}>
              🌱 Garden fact
            </div>
            <p style={{ color: C.white, fontSize: "0.95rem", lineHeight: 1.75,
              margin: 0, fontStyle: "italic", ...serif }}>
              "{fact}"
            </p>
          </div>
        </div>
      </div>

      {/* Right: form — 35%, centered, equal horizontal padding */}
      <div style={{ flex: "0 0 35%", background: C.cream, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "48px 36px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 340 }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: C.sageLight,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px" }}>
              <DoodleLeaf size={34} />
            </div>
            <h1 style={{ ...serif, fontSize: "1.5rem", fontWeight: 700, color: C.brown, margin: "0 0 5px" }}>
              Welcome back
            </h1>
            <p style={{ color: C.muted, fontSize: "0.82rem", margin: 0 }}>Sign in to your garden account</p>
          </div>

          {/* Tab */}
          <div style={{ display: "flex", background: C.creamDark, borderRadius: 14,
            padding: 4, marginBottom: 22, gap: 4 }}>
            {(["login","register"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: "9px", borderRadius: 11, border: "none",
                  cursor: "pointer", background: tab === t ? C.white : "transparent",
                  color: tab === t ? C.brown : C.muted, fontWeight: tab === t ? 800 : 500,
                  fontSize: "0.85rem", fontFamily: "'Nunito', sans-serif",
                  boxShadow: tab === t ? "0 1px 6px rgba(44,31,20,0.1)" : "none",
                  transition: "all 0.15s" }}>
                {t === "login" ? "Login" : "Register"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tab === "register" && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input placeholder="Jane Smith" style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" placeholder="email@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} defaultValue="••••••••"
                  style={{ ...inputStyle, paddingRight: 42 }} />
                <button onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)", background: "none", border: "none",
                    cursor: "pointer", color: C.muted, display: "flex" }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button onClick={onLogin}
              style={{ marginTop: 4,
                background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                color: C.white, border: "none", borderRadius: 14, padding: "13px",
                fontWeight: 800, fontSize: "0.95rem", cursor: "pointer",
                fontFamily: "'Nunito', sans-serif",
                boxShadow: `0 4px 14px ${C.sage}44` }}>
              {tab === "login" ? "Login →" : "Create Account →"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: "0.8rem", color: C.muted }}>
            {tab === "login" ? (
              <>
                <button style={linkStyle}>Forgot Password?</button>
                <div style={{ marginTop: 7 }}>
                  No account?{" "}
                  <button onClick={() => setTab("register")}
                    style={{ ...linkStyle, color: C.terra, fontWeight: 800 }}>Register</button>
                </div>
              </>
            ) : (
              <div>
                Already a member?{" "}
                <button onClick={() => setTab("login")}
                  style={{ ...linkStyle, color: C.terra, fontWeight: 800 }}>Login</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Plot hover card ──────────────────────────────────────────────────────────
function PlotHoverCard({ plot, x, y }: { plot: PlotInfo; x: number; y: number }) {
  const col = plotColors[plot.state];
  return (
    <div style={{ position: "fixed", left: x + 14, top: y - 10, zIndex: 100,
      background: C.white, border: `2px solid ${col.border}`,
      borderRadius: 16, padding: "14px 16px", width: 196,
      boxShadow: "0 8px 32px rgba(44,31,20,0.18)", pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ ...mono, fontSize: "0.66rem", fontWeight: 700,
          color: plot.state === "available" ? C.brownLight : col.bg === C.white ? C.brownLight : col.bg,
          textTransform: "uppercase", letterSpacing: "0.06em" }}>Plot #{plot.id}</span>
        <span style={{ background: col.bg, color: col.text, fontSize: "0.6rem",
          fontWeight: 800, padding: "2px 8px", borderRadius: 20,
          border: `1px solid ${col.border}` }}>{col.label}</span>
      </div>
      {plot.state === "available" ? (
        <div style={{ color: C.muted, fontSize: "0.78rem" }}>No owner — available to apply</div>
      ) : plot.state === "pending" ? (
        <div style={{ color: C.lavender, fontSize: "0.78rem" }}>⏳ Awaiting admin approval</div>
      ) : (
        <>
          <div style={{ fontWeight: 700, fontSize: "0.86rem", color: C.brown,
            marginBottom: 3, ...serif }}>{plot.owner}</div>
          {plot.since && (
            <div style={{ fontSize: "0.7rem", color: C.muted, marginBottom: 6 }}>
              Member since {plot.since} · {plot.section}
            </div>
          )}
          {plot.crops && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {plot.crops.map((c) => (
                <span key={c} style={{ background: C.sagePop, color: C.sageDark,
                  fontSize: "0.66rem", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{c}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlotCell({ plot, onClick, selected = false }: {
  plot: PlotInfo; onClick: () => void; selected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const col    = plotColors[plot.state];
  const isMine = plot.state === "mine";

  return (
    <>
      <div onClick={onClick}
        onMouseEnter={(e) => { setHovered(true); setPos({ x: e.clientX, y: e.clientY }); }}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: col.bg,
          border: selected
            ? `3px solid ${C.amber}`
            : isMine ? `3px solid ${C.gold}` : `2px solid ${col.border}`,
          borderRadius: 13, padding: "8px 8px 6px", cursor: "pointer", position: "relative",
          filter: hovered && !selected ? "brightness(1.18)" : "none",
          transform: hovered && !selected ? "translateY(-2px) scale(1.02)" : "none",
          boxShadow: selected
            ? `0 0 0 3px ${C.amber}55, 0 4px 16px ${C.amber}33`
            : isMine ? `0 0 0 1px ${C.gold}44, 0 4px 14px ${C.gold}33`
            : hovered ? `0 5px 18px ${col.border}80` : "0 1px 3px rgba(0,0,0,0.05)",
          minHeight: 72, transition: "transform 0.12s, box-shadow 0.12s, border-color 0.12s",
        }}>
        {/* Top row: PLOT # + star */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.05em",
            color: plot.state === "available" || plot.state === "pending" ? "#888" : col.text, ...mono }}>
            #{plot.id}
          </span>
          {isMine && (
            <span style={{ fontSize: "0.75rem", lineHeight: 1, color: "#FFE033",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>★</span>
          )}
        </div>
        {/* Icon */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 40 }}>
          {(plot.state === "active" || plot.state === "mine") && <PlantIcon size={36} />}
          {plot.state === "help-needed" && <AlertTriangle size={26} color="#FFFFFF" strokeWidth={2} />}
          {(plot.state === "available" || plot.state === "pending") && (
            <div style={{ width: 10, height: 10, borderRadius: "50%",
              background: "#C8C8C8", opacity: 0.6 }} />
          )}
        </div>
        {/* Owner name or status */}
        <div style={{ textAlign: "center", fontSize: "0.58rem", marginTop: 3, fontWeight: 700,
          color: plot.state === "available" || plot.state === "pending" ? C.muted : `${col.text}CC`,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {plot.owner && plot.state !== "available" && plot.state !== "pending"
            ? plot.owner
            : col.label}
        </div>
      </div>
      {hovered && <PlotHoverCard plot={plot} x={pos.x} y={pos.y} />}
    </>
  );
}

// ─── Plot detail panel (used inside PlotGrid) ─────────────────────────────────
function PlotDetailPanel({ plot, colByState, onClose, onNavigate }: {
  plot: PlotInfo;
  colByState: typeof plotColors;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const col    = colByState[plot.state];
  const isMine = plot.state === "mine";
  return (
    <div style={{ width: 200, flexShrink: 0,
      borderLeft: `1px solid ${C.border}`, marginLeft: 16, paddingLeft: 16,
      display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ ...mono, fontSize: "0.68rem", fontWeight: 800,
          color: C.brownLight, textTransform: "uppercase" }}>
          Plot #{plot.id}
        </span>
        <button onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer",
            color: C.muted, display: "flex", padding: 2 }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 5,
        background: col.bg, borderRadius: 20, padding: "4px 10px", width: "fit-content",
        border: isMine ? `2px solid ${C.gold}` : `1.5px solid ${col.border}` }}>
        {(plot.state === "active" || plot.state === "mine") && <PlantIcon size={14} />}
        {plot.state === "help-needed" && (
          <AlertTriangle size={12} color={col.text} strokeWidth={2.5} />
        )}
        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: col.text }}>
          {col.label}
        </span>
      </div>

      {plot.owner ? (
        <>
          <div>
            <div style={{ fontSize: "0.62rem", color: C.muted,
              textTransform: "uppercase", letterSpacing: "0.05em", ...mono }}>Owner</div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem",
              color: C.brown, marginTop: 2, ...serif }}>{plot.owner}</div>
            {plot.since && (
              <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 1 }}>
                Member since {plot.since}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: "0.62rem", color: C.muted,
              textTransform: "uppercase", letterSpacing: "0.05em", ...mono }}>Zone</div>
            <div style={{ fontSize: "0.78rem", color: C.brownMid, marginTop: 2 }}>
              {plot.section}
            </div>
          </div>
          {plot.crops && plot.crops.length > 0 && (
            <div>
              <div style={{ fontSize: "0.62rem", color: C.muted,
                textTransform: "uppercase", letterSpacing: "0.05em", ...mono,
                marginBottom: 5 }}>Growing</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {plot.crops.map(c => (
                  <span key={c} style={{ background: C.sagePop, color: C.sageDark,
                    fontSize: "0.64rem", padding: "2px 8px", borderRadius: 20,
                    fontWeight: 700 }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: "0.78rem", color: C.muted, lineHeight: 1.5 }}>
          This plot is unassigned and free to apply for.
        </div>
      )}

      <button onClick={onNavigate}
        style={{ marginTop: "auto", padding: "8px 10px",
          background: isMine
            ? `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`
            : plot.state === "available"
            ? `linear-gradient(135deg, ${C.terra}, ${C.terraDark})`
            : C.creamDark,
          color: (isMine || plot.state === "available") ? C.white : C.brownLight,
          border: "none", borderRadius: 11, cursor: "pointer", fontWeight: 700,
          fontSize: "0.75rem", fontFamily: "'Nunito', sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        {isMine ? "My Plot Details →"
          : plot.state === "available" ? "Apply for Plot →"
          : "View Details →"}
      </button>
    </div>
  );
}

// ─── Interactive plot grid ────────────────────────────────────────────────────
type FilterKey = PlotState | "all";

function PlotGrid({ onNavigate }: { onNavigate: () => void }) {
  const [filter,     setFilter]     = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filterDefs: { key: FilterKey; label: string }[] = [
    { key: "all",         label: "All" },
    { key: "available",   label: "Free" },
    { key: "active",      label: "Occupied" },
    { key: "help-needed", label: "Needs Help" },
    { key: "mine",        label: "My Plot" },
  ];

  const visible    = filter === "all" ? allPlots : allPlots.filter(p => p.state === filter);
  const selected   = allPlots.find(p => p.id === selectedId) ?? null;
  const colByState = plotColors;

  const handleClick = (id: number) =>
    setSelectedId(prev => (prev === id ? null : id));

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {filterDefs.map(({ key, label }) => {
          const count = key === "all" ? allPlots.length : allPlots.filter(p => p.state === key).length;
          const active = filter === key;
          return (
            <button key={key} onClick={() => { setFilter(key); setSelectedId(null); }}
              style={{ display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                fontFamily: "'Nunito', sans-serif", fontSize: "0.75rem", fontWeight: 700,
                background: active ? C.sage : C.creamDark,
                color: active ? C.white : C.brownLight,
                transition: "all 0.15s" }}>
              {label}
              <span style={{ background: active ? "rgba(255,255,255,0.22)" : C.border,
                color: active ? C.white : C.muted,
                fontSize: "0.65rem", borderRadius: 10, padding: "1px 7px", fontWeight: 800 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid + detail panel */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 18, padding: "16px", display: "flex", gap: 0 }}>

        {/* Grid area — scrollable */}
        <div style={{ flex: 1, minWidth: 0, maxHeight: 380, overflowY: "auto",
          paddingRight: 6 } as React.CSSProperties}>
          <div style={{ display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8 }}>
            {visible.map(p => (
              <PlotCell key={p.id} plot={p}
                selected={selectedId === p.id}
                onClick={() => handleClick(p.id)} />
            ))}
          </div>
          <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 4 }}>
            {visible.length} of {allPlots.length} plots shown
            {selectedId ? " · click a plot again to deselect" : " · click any plot for details"}
          </div>
        </div>

        {/* Detail panel */}
        {selected && <PlotDetailPanel plot={selected} colByState={colByState}
          onClose={() => setSelectedId(null)} onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

// ─── News feed ────────────────────────────────────────────────────────────────
const newsFeed = [
  { title: "Community Work Party — June 22", tag: "Event", tagColor: C.sage,
    body: "Join us Saturday 9am–noon. Tools provided, coffee too. All welcome!", time: "2d ago" },
  { title: "Frost Warning Advisory", tag: "Alert", tagColor: C.terra,
    body: "Low of 35°F expected Thursday night. Cover tender plants by Wednesday evening.", time: "1d ago" },
  { title: "Shared Plot Hits 100 lbs Donated!", tag: "Milestone", tagColor: C.amber,
    body: "The food bank plot crossed 100 lbs for the season. Incredible community effort.", time: "3h ago" },
  { title: "New Compost Drop-off Spot", tag: "Update", tagColor: C.lavender,
    body: "Kitchen scraps can now go in the new bin by the east gate, labeled green.", time: "5h ago" },
];

// ─── Screen 2: Dashboard ─────────────────────────────────────────────────────
const topTask = {
  title: "Weeding — Zone A",
  desc: "Remove clover and crabgrass around raised beds in north zone.",
  assignee: "MK", aColor: C.sage, date: "Aug 14", urgency: "Active",
};

function DashboardScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", background: C.cream, ...sans }}>
      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: "22px 24px" }}>
        {/* Grid header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <img src={dashboardIcon} alt="dashboard"
            style={{ height: "2rem", width: "2rem", objectFit: "cover",
              borderRadius: 8, display: "block", flexShrink: 0 }} />
          <h1 style={{ ...serif, fontSize: "1.5rem", fontWeight: 700, color: C.brown, margin: 0 }}>
            Garden Plots
          </h1>
        </div>

        {/* Interactive plot grid */}
        <div style={{ marginBottom: 22 }}>
          <PlotGrid onNavigate={() => setScreen("plot")} />
        </div>

        {/* Newsfeed */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9,
              background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Newspaper size={15} color={C.white} />
            </div>
            <h2 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
              Newsfeed
            </h2>
          </div>
          <div style={{ background: C.card, border: `1.5px dashed ${C.border}`,
            borderRadius: 18, padding: "36px 24px",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 10, minHeight: 140 }}>
            <div style={{ fontSize: "2.2rem" }}>🌱</div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: C.brownMid, ...serif }}>
              No posts yet
            </div>
            <div style={{ fontSize: "0.8rem", color: C.muted, textAlign: "center", maxWidth: 300 }}>
              Garden news, events, and community updates will appear here once members start posting.
            </div>
            <button style={{ marginTop: 4, background: C.sagePop, color: C.sage,
              border: `1px solid ${C.sageMid}`, borderRadius: 10, padding: "7px 16px",
              fontSize: "0.78rem", fontWeight: 800, cursor: "pointer",
              fontFamily: "'Nunito', sans-serif" }}>
              + Post an update
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside style={{ width: 340, flexShrink: 0, borderLeft: `1px solid ${C.border}`,
        background: C.card, overflow: "auto", padding: "22px 22px",
        display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Weather */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <DayForecastWidget />
          <WeekWeatherWidget />
        </div>

        {/* Task board card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden" }}>
          {/* Green header */}
          <div style={{ background: C.sage, padding: "10px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <ClipboardList size={14} color={C.white} />
              <span style={{ color: C.white, fontWeight: 800, fontSize: "0.8rem" }}>Task Board</span>
            </div>
            <button onClick={() => setScreen("tasks")}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8,
                padding: "3px 10px", color: C.white, fontSize: "0.7rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
              View all →
            </button>
          </div>
          {/* Top task */}
          <div style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: "0.65rem", color: C.muted, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, ...mono }}>
              Top Task
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ background: C.terra, color: C.white, fontSize: "0.6rem",
                fontWeight: 800, padding: "2px 8px", borderRadius: 20 }}>Active</span>
              <span style={{ fontSize: "0.68rem", color: C.muted, ...mono }}>Plot #5 · Aug 14</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: C.brown,
              marginBottom: 5, ...serif }}>Weeding — Zone A</div>
            <div style={{ fontSize: "0.76rem", color: C.brownLight, lineHeight: 1.5,
              marginBottom: 10 }}>
              Remove clover and crabgrass around raised beds in the north zone.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.sage,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.white, fontWeight: 800, fontSize: "0.62rem" }}>MK</div>
              <span style={{ fontSize: "0.7rem", color: C.muted }}>Maria K.</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─── Screen 3: Plot Detail ────────────────────────────────────────────────────

function PlotScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [publicNote,  setPublicNote]  = useState("Tomatoes planted Apr 12. Back row is garlic — hands off until July. Squash needs extra water.");
  const [privateNote, setPrivateNote] = useState("Soil amendment added Mar 2025. pH test due August.");
  const [activeTab,   setActiveTab]   = useState<"overview"|"notes"|"gallery"|"history">("overview");

  const today = weekWeather[0];
  const d     = todayDetail;

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "notes",    label: "Notes" },
    { key: "gallery",  label: "Gallery" },
    { key: "history",  label: "History" },
  ];

  const plotInfo = [
    { label: "Status",      value: "Active Planting" },
    { label: "Owner",       value: "Elena V." },
    { label: "Plants",      value: "Tomatoes, Bell Peppers" },
    { label: "Size",        value: "10′ × 12′" },
    { label: "Location",    value: "Community North" },
    { label: "Established", value: "Spring 2022" },
  ];

  const secondaryOwners = [
    { initials: "MK", name: "Maria K.",  color: C.sage },
    { initials: "JS", name: "Jake S.",   color: "#B8A070" },
    { initials: "AW", name: "Aiko W.",   color: C.sky },
  ];

  const quickActions = [
    { label: "Add Public Note",    Icon: Plus },
    { label: "Add Private Note",   Icon: Plus },
    { label: "Upload Photo",       Icon: Plus },
    { label: "View Plot on Map",   Icon: MapPin },
    { label: "Print Plot Summary", Icon: ArrowRight },
  ];

  const recentActivity = [
    { who: "Elena V.", action: "added a public note", when: "2h ago" },
    { who: "Maria K.", action: "uploaded a photo",    when: "Yesterday" },
    { who: "Jake S.",  action: "updated plot status", when: "3d ago" },
  ];

  const noteTA = (value: string, onChange: (v: string) => void, bg: string) => (
    <textarea value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", boxSizing: "border-box",
        border: `1.5px solid ${C.border}`, borderRadius: 10,
        padding: "10px 12px", fontSize: "0.8rem", color: C.brownMid,
        background: bg, fontFamily: "'Nunito', sans-serif",
        resize: "vertical", minHeight: 110, outline: "none", lineHeight: 1.6 }} />
  );

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.cream, ...sans }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 24px" }}>

        {/* ── Breadcrumb ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 5,
          marginBottom: 12, fontSize: "0.74rem", color: C.muted }}>
          <button onClick={() => setScreen("dashboard")}
            style={{ ...linkStyle, color: C.sage, fontWeight: 700, fontSize: "0.74rem" }}>Plots</button>
          <ChevronRight size={11} color={C.muted} />
          <span>Community North</span>
          <ChevronRight size={11} color={C.muted} />
          <span style={{ color: C.brownMid, fontWeight: 700 }}>Plot #14</span>
        </div>

        {/* ── Outer 2-column layout: left 80% | right 20% ── */}
        <div style={{ display: "grid", gridTemplateColumns: "4fr 1fr", gap: 14 }}>

          {/* ── LEFT COLUMN: stacked items ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Header — transparent background */}
            <div style={{ padding: "10px 4px",
              display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={plotBedIcon} alt="garden plot"
                  style={{ height: "3.2rem", width: "3.2rem", display: "block",
                    objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                <div>
                  <div style={{ ...serif, fontSize: "1.5rem", fontWeight: 800,
                    color: C.brown, lineHeight: 1.1 }}>Plot #14</div>
                  <div style={{ fontSize: "0.72rem", color: C.brownLight,
                    fontWeight: 600, marginTop: 3, ...sans }}>Owner: Elena V.</div>
                </div>
              </div>
              <button style={{ background: C.white, border: `1px solid ${C.border}`,
                borderRadius: 9, padding: "7px 16px", color: C.brownMid, fontWeight: 700,
                fontSize: "0.78rem", cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 1px 4px rgba(44,31,20,0.08)" }}>
                <Pencil size={12} /> Edit Plot
              </button>
            </div>

            {/* Hero photo */}
            <div style={{ borderRadius: 14, overflow: "hidden",
              border: `1px solid ${C.border}`, aspectRatio: "16/5",
              boxShadow: "0 2px 10px rgba(44,31,20,0.08)" }}>
              <img src={plotPhoto} alt="Garden plot"
                style={{ width: "100%", height: "100%", objectFit: "cover",
                  objectPosition: "center 40%", display: "block" }} />
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0 }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{ background: "none", border: "none", cursor: "pointer",
                    padding: "9px 16px", fontSize: "0.82rem", fontWeight: 700,
                    fontFamily: "'Nunito', sans-serif",
                    color: activeTab === t.key ? C.sage : C.muted,
                    borderBottom: activeTab === t.key
                      ? `2px solid ${C.sage}` : "2px solid transparent",
                    transition: "color 0.12s, border-color 0.12s" }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Bottom row: Plot Info (25%) + Notes (75%) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 14 }}>

              {/* Plot Info */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 13, padding: "14px 16px",
                boxShadow: "0 1px 4px rgba(44,31,20,0.05)" }}>
                <h3 style={{ ...serif, fontSize: "0.8rem", fontWeight: 700,
                  color: C.brown, margin: "0 0 10px",
                  display: "flex", alignItems: "center", gap: 6 }}>
                  <ClipboardList size={13} color={C.sage} /> Plot Info
                </h3>
                {plotInfo.map(({ label, value }) => (
                  <div key={label} style={{ padding: "6px 0", borderBottom: `1px solid ${C.creamDark}` }}>
                    <div style={{ fontSize: "0.58rem", color: C.muted,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      ...mono, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: "0.76rem", color: C.brown, fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Public Notes */}
                <div style={{ background: C.card, border: `1px solid ${C.border}`,
                  borderTop: `3px solid ${C.sage}`, borderRadius: 13, padding: "14px 16px",
                  boxShadow: "0 1px 4px rgba(44,31,20,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: 8 }}>
                    <h3 style={{ ...serif, fontSize: "0.85rem", fontWeight: 700,
                      color: C.brown, margin: 0 }}>Public Notes</h3>
                    <button style={{ background: C.sagePop, color: C.sage,
                      border: `1px solid ${C.sageMid}`, borderRadius: 7,
                      padding: "3px 9px", fontSize: "0.7rem", fontWeight: 700,
                      cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                      display: "flex", alignItems: "center", gap: 3 }}>
                      <Plus size={10} /> Add Note
                    </button>
                  </div>
                  {noteTA(publicNote, setPublicNote, C.sagePop)}
                  <div style={{ fontSize: "0.65rem", color: C.sage, marginTop: 5, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 4 }}>
                    <Eye size={11} color={C.sage} /> Visible to all members
                  </div>
                </div>

                {/* Private Notes */}
                <div style={{ background: C.card, border: `1px solid ${C.border}`,
                  borderTop: `3px solid ${C.terra}`, borderRadius: 13, padding: "14px 16px",
                  boxShadow: "0 1px 4px rgba(44,31,20,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <h3 style={{ ...serif, fontSize: "0.85rem", fontWeight: 700,
                        color: C.brown, margin: 0 }}>Private Notes</h3>
                      <span style={{ background: C.terra, color: C.white, fontSize: "0.54rem",
                        fontWeight: 800, padding: "2px 6px", borderRadius: 5,
                        textTransform: "uppercase", letterSpacing: "0.04em", ...mono }}>
                        Owners Only
                      </span>
                    </div>
                    <button style={{ background: C.terraLight, color: C.terra,
                      border: `1px solid ${C.terra}44`, borderRadius: 7,
                      padding: "3px 9px", fontSize: "0.7rem", fontWeight: 700,
                      cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                      display: "flex", alignItems: "center", gap: 3 }}>
                      <Plus size={10} /> Add Note
                    </button>
                  </div>
                  {noteTA(privateNote, setPrivateNote, C.terraLight)}
                  <div style={{ fontSize: "0.65rem", color: C.terra, marginTop: 5, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 4 }}>
                    <EyeOff size={11} color={C.terra} /> Only visible to plot owners
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: independent flex stack ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Weather */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 14, overflow: "hidden",
              boxShadow: "0 1px 6px rgba(44,31,20,0.07)" }}>
              {/* Green header strip — same as WeekWeatherWidget */}
              <div style={{ background: C.sagePop, borderBottom: `1px solid ${C.sageMid}`,
                padding: "8px 14px", display: "flex", alignItems: "center",
                justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Sun size={13} color={C.sage} />
                  <span style={{ fontSize: "0.68rem", fontWeight: 800, color: C.sage,
                    textTransform: "uppercase", letterSpacing: "0.06em", ...mono }}>
                    Today
                  </span>
                </div>
                <WeatherIcon type={today.icon} size={18} />
              </div>
              {/* Content */}
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 0 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: "2rem", fontWeight: 800,
                    color: C.brown, lineHeight: 1 }}>{today.hi}°</span>
                  <span style={{ fontSize: "0.65rem", color: C.brownLight,
                    display: "block", marginTop: 2 }}>{today.desc}</span>
                </div>
                <div style={{ fontSize: "0.65rem", color: C.muted, marginBottom: 12 }}>
                  Feels like {d.feelsLike}°F
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { Icon: Droplets,    val: `${d.humidity}%`,    label: "Humidity" },
                    { Icon: Wind,        val: `${d.wind} mph`,      label: "Wind" },
                    { Icon: Gauge,       val: `${d.pressure} mb`,   label: "Pressure" },
                    { Icon: Thermometer, val: `UV ${d.uvIndex}`,    label: "UV Index" },
                    { Icon: Eye,         val: `${d.visibility} mi`, label: "Visibility" },
                  ].map(({ Icon, val, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center",
                      justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon size={11} color={C.muted} />
                        <span style={{ fontSize: "0.64rem", color: C.muted }}>{label}</span>
                      </div>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.brownMid }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 12 }}>
                  <button style={{ background: "none", border: "none", padding: 0,
                    cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: "0.72rem", fontWeight: 700, color: C.sage }}>
                    Weekly forecast <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary Owners */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 13, padding: "12px 14px",
              boxShadow: "0 1px 4px rgba(44,31,20,0.05)" }}>
              <h3 style={{ ...serif, fontSize: "0.78rem", fontWeight: 700,
                color: C.brown, margin: "0 0 8px",
                display: "flex", alignItems: "center", gap: 5 }}>
                <Users size={12} color={C.sage} /> Secondary Owners
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {secondaryOwners.map((o) => (
                  <div key={o.initials} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%",
                      background: o.color, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.white, fontWeight: 800, fontSize: "0.6rem" }}>
                      {o.initials}
                    </div>
                    <span style={{ fontSize: "0.74rem", fontWeight: 600, color: C.brown }}>{o.name}</span>
                  </div>
                ))}
              </div>
              <button style={{ marginTop: 8, width: "100%", background: C.creamDark,
                border: "none", borderRadius: 7, padding: "5px 8px",
                fontSize: "0.68rem", fontWeight: 700, color: C.brownLight,
                cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                Manage owners
              </button>
            </div>

            {/* Quick Actions */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 13, padding: "12px 14px",
              boxShadow: "0 1px 4px rgba(44,31,20,0.05)" }}>
              <h3 style={{ ...serif, fontSize: "0.78rem", fontWeight: 700,
                color: C.brown, margin: "0 0 6px" }}>Quick Actions</h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {quickActions.map(({ label, Icon }) => (
                  <button key={label}
                    style={{ background: "none", border: "none", padding: "5px 0",
                      textAlign: "left", cursor: "pointer", color: C.sage,
                      fontSize: "0.73rem", fontWeight: 600,
                      fontFamily: "'Nunito', sans-serif",
                      display: "flex", alignItems: "center", gap: 6,
                      borderBottom: `1px solid ${C.creamDark}` }}>
                    <Icon size={11} /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 4: Tasks ─────────────────────────────────────────────────────────
interface Task { id: number; title: string; desc: string; assignee: string; aColor: string; date: string; }
interface Column { id: string; label: string; count: number; accent: string; tasks: Task[]; }

const initialColumns: Column[] = [
  { id: "active", label: "Active", count: 3, accent: C.terra, tasks: [
    { id: 1, title: "Weeding — Zone A", desc: "Remove clover and crabgrass around raised beds in north zone.", assignee: "MK", aColor: C.sage,  date: "Aug 14" },
    { id: 2, title: "Fix Drip Irrigation", desc: "Leaking valve in Plot #12 needs replacement parts from shed.", assignee: "JS", aColor: C.terra, date: "Aug 15" },
  ]},
  { id: "pending", label: "Pending", count: 5, accent: C.amber, tasks: [
    { id: 3, title: "Compost Turning", desc: "Central bins need turning and moisture check this weekend.", assignee: "AW", aColor: C.sage,    date: "Aug 18" },
    { id: 4, title: "Fertilizer Run", desc: "Pick up organic nitrogen mix for the community greenhouse.", assignee: "MK", aColor: "#B8A070", date: "Aug 20" },
  ]},
  { id: "done", label: "Done", count: 12, accent: C.sage, tasks: [
    { id: 5, title: "Shed Inventory", desc: "Updated tool list. 2 shovels are missing handles.", assignee: "JD", aColor: C.terra, date: "Jul 30" },
    { id: 6, title: "Planting Ceremony", desc: "Annual spring kick-off event successful. Photo uploaded.", assignee: "ALL", aColor: C.sage, date: "Apr 05" },
  ]},
];

function TaskScreen() {
  const [columns] = useState(initialColumns);
  const [showNew, setShowNew] = useState(false);
  const colBg: Record<string, string> = { active: "#FFF4F0", pending: "#FFFBEE", done: "#F2FAF2" };

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.cream, ...sans, position: "relative" }}>
      <div style={{ padding: "22px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={taskBoardIcon} alt="task board"
              style={{ height: "2rem", width: "2rem", objectFit: "cover",
                borderRadius: 8, display: "block", flexShrink: 0 }} />
            <h1 style={{ ...serif, fontSize: "1.5rem", fontWeight: 700, color: C.brown, margin: 0 }}>Task Board</h1>
          </div>
          <button style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "8px 14px", fontSize: "0.8rem", fontWeight: 700, color: C.brownMid,
            cursor: "pointer", fontFamily: "'Nunito', sans-serif",
            display: "flex", alignItems: "center", gap: 5 }}>
            <Filter size={13} /> Filter: All Tasks
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {columns.map((col) => (
            <div key={col.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: col.accent,
                  textTransform: "uppercase", letterSpacing: "0.08em", ...mono }}>{col.label}</span>
                <span style={{ background: col.accent, color: C.white, borderRadius: 20,
                  padding: "2px 8px", fontSize: "0.66rem", fontWeight: 800 }}>{col.count}</span>
              </div>
              <div style={{ background: colBg[col.id], borderRadius: 16, padding: 10,
                minHeight: 120, display: "flex", flexDirection: "column", gap: 9,
                border: `1.5px solid ${col.accent}22` }}>
                {col.tasks.map((task) => (
                  <div key={task.id} style={{ background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 13, padding: "13px 14px", borderLeft: `4px solid ${col.accent}` }}>
                    <div style={{ fontWeight: 700, fontSize: "0.86rem", color: C.brown,
                      marginBottom: 5, ...serif }}>{task.title}</div>
                    <div style={{ fontSize: "0.76rem", color: C.brownLight,
                      lineHeight: 1.5, marginBottom: 10 }}>{task.desc}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%",
                          background: task.aColor, display: "flex", alignItems: "center",
                          justifyContent: "center", color: C.white,
                          fontWeight: 800, fontSize: "0.62rem" }}>{task.assignee}</div>
                        <span style={{ fontSize: "0.7rem", color: C.muted, ...mono }}>{task.date}</span>
                      </div>
                      <button style={{ background: C.creamDark, border: "none", borderRadius: 7,
                        padding: "4px 10px", fontSize: "0.7rem", fontWeight: 700, color: C.brownMid,
                        cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setShowNew(true)}
        style={{ position: "fixed", bottom: 26, right: 26, width: 50, height: 50,
          borderRadius: "50%", background: `linear-gradient(135deg, ${C.terra}, ${C.terraDark})`,
          color: C.white, border: "none", cursor: "pointer",
          boxShadow: `0 4px 16px ${C.terra}55`,
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
        <Plus size={20} />
      </button>

      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,31,20,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
          <div style={{ background: C.card, borderRadius: 22, padding: 26, width: 370,
            boxShadow: "0 16px 48px rgba(44,31,20,0.25)", border: `2px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
                New Task
              </h3>
              <button onClick={() => setShowNew(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <X size={17} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <input placeholder="Task title" style={{ ...inputStyle, fontSize: "0.84rem" }} />
              <textarea placeholder="Description..." style={{ ...inputStyle, minHeight: 76,
                resize: "vertical", fontSize: "0.84rem",
                fontFamily: "'Nunito', sans-serif" } as React.CSSProperties} />
              <input placeholder="Assigned to" style={{ ...inputStyle, fontSize: "0.84rem" }} />
              <button onClick={() => setShowNew(false)}
                style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                  color: C.white, border: "none", borderRadius: 12, padding: 12,
                  fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                  fontSize: "0.88rem" }}>Create Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Screen 5: Inventory ─────────────────────────────────────────────────────
const inventoryData = [
  { item: "Tomato Seeds",       qty: "50 pkts",  location: "Tool Shed",      addedBy: "Alice Green" },
  { item: "Organic Fertilizer", qty: "12 bags",  location: "Plot B4",        addedBy: "Bob Stone" },
  { item: "Hand Trowels",       qty: "8 units",  location: "Tool Shed",      addedBy: "Alice Green" },
  { item: "Watering Cans",      qty: "4 units",  location: "West Gate",      addedBy: "Charlie Brown" },
  { item: "Bamboo Stakes",      qty: "120 pcs",  location: "Storage Locker", addedBy: "Bob Stone" },
  { item: "Row Cover Fabric",   qty: "3 rolls",  location: "Tool Shed",      addedBy: "Elena V." },
  { item: "Compost (bagged)",   qty: "2 bins",   location: "North End",      addedBy: "Sofia M." },
];
const tdStyle: React.CSSProperties = { padding: "11px 16px", fontSize: "0.84rem", color: C.brown };

function InventoryScreen() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const filtered = inventoryData.filter((r) =>
    r.item.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.cream, ...sans, position: "relative" }}>
      <div style={{ padding: "22px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11,
              background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={17} color={C.white} />
            </div>
            <h1 style={{ ...serif, fontSize: "1.5rem", fontWeight: 700, color: C.brown, margin: 0 }}>Inventory</h1>
          </div>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%",
              transform: "translateY(-50%)", color: C.muted }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              style={{ ...inputStyle, paddingLeft: 34, width: 210, fontSize: "0.8rem" }} />
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 18, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})` }}>
                {["Item","Qty","Location","Added By","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 16px",
                    fontSize: "0.66rem", fontWeight: 800,
                    color: "rgba(255,255,255,0.9)", letterSpacing: "0.08em",
                    textTransform: "uppercase", ...mono }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i}
                  style={{ borderTop: `1px solid ${C.creamDark}`,
                    background: i % 2 === 0 ? C.card : C.cream, transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.sagePop)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? C.card : C.cream)}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{row.item}</td>
                  <td style={{ ...tdStyle, ...mono, fontSize: "0.8rem",
                    color: C.sage, fontWeight: 800 }}>{row.qty}</td>
                  <td style={{ ...tdStyle, color: C.brownLight }}>{row.location}</td>
                  <td style={{ ...tdStyle, color: C.brownLight }}>{row.addedBy}</td>
                  <td style={{ ...tdStyle }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button style={{ background: C.sageLight, border: "none", borderRadius: 7,
                        padding: "4px 10px", color: C.sageDark, fontSize: "0.7rem", fontWeight: 800,
                        cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                        display: "flex", alignItems: "center", gap: 3 }}>
                        <Pencil size={11} /> Edit
                      </button>
                      <button style={{ background: C.terraLight, border: "none", borderRadius: 7,
                        padding: "4px 9px", color: C.terra, fontSize: "0.7rem",
                        cursor: "pointer", display: "flex", alignItems: "center" }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center",
                  color: C.muted, fontSize: "0.84rem" }}>
                  No items match "{search}"
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={() => setShowAdd(true)}
        style={{ position: "fixed", bottom: 26, right: 26,
          background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
          color: C.white, border: "none", borderRadius: 50, padding: "11px 18px",
          fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
          fontFamily: "'Nunito', sans-serif", boxShadow: `0 4px 16px ${C.sage}44`,
          display: "flex", alignItems: "center", gap: 7, zIndex: 20 }}>
        <Plus size={15} /> Add Item
      </button>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,31,20,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
          <div style={{ background: C.card, borderRadius: 22, padding: 26, width: 370,
            boxShadow: "0 16px 48px rgba(44,31,20,0.25)", border: `2px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
                Add Item
              </h3>
              <button onClick={() => setShowAdd(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <X size={17} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {["Item name","Quantity (e.g. 12 bags)","Location","Notes"].map((p) => (
                <input key={p} placeholder={p} style={{ ...inputStyle, fontSize: "0.84rem" }} />
              ))}
              <button onClick={() => setShowAdd(false)}
                style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                  color: C.white, border: "none", borderRadius: 12, padding: 12,
                  fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                  fontSize: "0.88rem" }}>Add to Inventory</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Screen 6: Admin Dashboard ───────────────────────────────────────────────
function AdminScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annText, setAnnText] = useState("");

  const statCards = [
    { label: "Pending Registrations", value: 2, color: C.terra,    Icon: Users,         action: () => {} },
    { label: "Unassigned Plots",       value: 3, color: C.amber,   Icon: LayoutGrid,    action: () => setScreen("plot") },
    { label: "Unclaimed Tasks",        value: 2, color: C.lavender, Icon: ClipboardList, action: () => setScreen("tasks") },
    { label: "Inventory Alerts",       value: 1, color: C.sky,     Icon: Archive,       action: () => setScreen("inventory") },
    { label: "Flagged Content",        value: 0, color: C.sage,    Icon: AlertTriangle, action: () => {} },
  ];

  const pendingRegs = [
    { name: "John Smith",    date: "May 7, 2025",  initials: "JS", color: C.terra },
    { name: "Kate Williams", date: "May 11, 2025", initials: "KW", color: C.sage  },
  ];

  const unassignedPlots = [
    { id: 5,  zone: "North" },
    { id: 12, zone: "South" },
    { id: 21, zone: "East"  },
  ];

  const helpRequests = [
    { title: "Repair the north fence",  date: "September 15, 2025", urgent: true  },
    { title: "Water shared flower bed", date: "October 2, 2025",    urgent: false },
  ];

  const inventoryAlerts = [
    { item: "Wheelbarrow",        qty: 0, label: "Out of stock" },
    { item: "Organic Fertilizer", qty: 2, label: "Low stock"    },
  ];

  const recentActivity = [
    { name: "Kate A.",  sub: "Approved John S.",        when: "10m ago",   initials: "KA", color: C.sage     },
    { name: "Plot 2",   sub: "Assigned to Maria K.",    when: "1h ago",    initials: "P2", color: C.amber    },
    { name: "John S.",  sub: '"Close Shed" marked done', when: "2h ago",   initials: "JS", color: C.terra    },
    { name: "Mary K.",  sub: "New announcement posted", when: "Yesterday", initials: "MK", color: C.lavender },
  ];

  const panel = (
    title: string,
    icon: React.ReactNode,
    action: React.ReactNode,
    children: React.ReactNode
  ) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: "hidden",
      boxShadow: "0 1px 4px rgba(44,31,20,0.05)" }}>
      <div style={{ background: C.sagePop, borderBottom: `1px solid ${C.sageMid}`,
        padding: "9px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {icon}
          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: C.sage,
            letterSpacing: "0.04em", ...mono }}>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );

  const viewAll = (onClick?: () => void) => (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer",
      color: C.sage, fontSize: "0.7rem", fontWeight: 700,
      fontFamily: "'Nunito', sans-serif", display: "flex", alignItems: "center", gap: 3 }}>
      View all <ChevronRight size={12} />
    </button>
  );

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.cream, ...sans }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 24px" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ ...serif, fontSize: "1.4rem", fontWeight: 700,
              color: C.brown, margin: "0 0 3px" }}>Admin Dashboard</h1>
            <p style={{ fontSize: "0.76rem", color: C.muted, margin: 0 }}>
              Overview of what needs your attention and recent community activity
            </p>
          </div>
          <button style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
            color: C.white, border: "none", borderRadius: 10, padding: "8px 16px",
            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
            fontFamily: "'Nunito', sans-serif",
            display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> New Activity
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12, marginBottom: 18 }}>
          {statCards.map(({ label, value, color, Icon, action }) => (
            <button key={label} onClick={action}
              style={{ background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: "16px 16px 14px",
                boxShadow: "0 1px 4px rgba(44,31,20,0.05)",
                cursor: "pointer", textAlign: "left",
                fontFamily: "'Nunito', sans-serif",
                display: "flex", flexDirection: "column", gap: 8,
                transition: "box-shadow 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 4px 14px ${color}33`)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(44,31,20,0.05)")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ width: 32, height: 32, borderRadius: 9,
                  background: `${color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={16} color={color} />
                </div>
                <span style={{ fontSize: "2rem", fontWeight: 800,
                  color: value === 0 ? C.muted : C.brown, lineHeight: 1 }}>{value}</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: C.brownLight,
                fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
              <div style={{ fontSize: "0.66rem", color: color, fontWeight: 700 }}>
                {value === 0 ? "All clear" : "View →"}
              </div>
            </button>
          ))}
        </div>

        {/* 2x2 panel grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

          {panel("Pending Registrations", <Users size={13} color={C.sage} />, viewAll(), (
            <div>
              {pendingRegs.map((r, i) => (
                <div key={r.name} style={{ display: "flex", alignItems: "center",
                  gap: 10, padding: "11px 16px",
                  borderBottom: i < pendingRegs.length - 1 ? `1px solid ${C.creamDark}` : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%",
                    background: r.color, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.white, fontWeight: 800, fontSize: "0.64rem" }}>
                    {r.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown }}>{r.name}</div>
                    <div style={{ fontSize: "0.66rem", color: C.muted, ...mono }}>{r.date}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ background: C.sageLight, color: C.sageDark, border: "none",
                      borderRadius: 7, padding: "4px 10px", fontSize: "0.68rem", fontWeight: 800,
                      cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>Approve</button>
                    <button style={{ background: C.terraLight, color: C.terra, border: "none",
                      borderRadius: 7, padding: "4px 10px", fontSize: "0.68rem", fontWeight: 800,
                      cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {panel("Unassigned Plots", <LayoutGrid size={13} color={C.sage} />, viewAll(() => setScreen("plot")), (
            <div>
              {unassignedPlots.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center",
                  gap: 10, padding: "11px 16px",
                  borderBottom: i < unassignedPlots.length - 1 ? `1px solid ${C.creamDark}` : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: C.sageLight,
                    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LayoutGrid size={14} color={C.sage} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown }}>Plot {p.id}</div>
                    <div style={{ fontSize: "0.66rem", color: C.muted }}>{p.zone} Zone</div>
                  </div>
                  <button style={{ background: C.amberLight, color: C.amber, border: "none",
                    borderRadius: 7, padding: "4px 12px", fontSize: "0.68rem", fontWeight: 800,
                    cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>Assign</button>
                </div>
              ))}
            </div>
          ))}

          {panel("Unclaimed Help Requests", <AlertTriangle size={13} color={C.sage} />, viewAll(() => setScreen("tasks")), (
            <div>
              {helpRequests.map((h, i) => (
                <div key={h.title} style={{ display: "flex", alignItems: "center",
                  gap: 10, padding: "11px 16px",
                  borderBottom: i < helpRequests.length - 1 ? `1px solid ${C.creamDark}` : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown, marginBottom: 2 }}>{h.title}</div>
                    <div style={{ fontSize: "0.66rem", color: C.muted, ...mono }}>{h.date}</div>
                  </div>
                  <span style={{ background: h.urgent ? C.terraLight : C.amberLight,
                    color: h.urgent ? C.terra : C.amber,
                    fontSize: "0.64rem", fontWeight: 800, padding: "2px 8px", borderRadius: 20 }}>
                    {h.urgent ? "Urgent" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {panel("Inventory Alerts", <Archive size={13} color={C.sage} />, viewAll(() => setScreen("inventory")), (
            <div>
              {inventoryAlerts.map((a, i) => (
                <div key={a.item} style={{ display: "flex", alignItems: "center",
                  gap: 10, padding: "11px 16px",
                  borderBottom: i < inventoryAlerts.length - 1 ? `1px solid ${C.creamDark}` : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9,
                    background: a.qty === 0 ? C.terraLight : C.amberLight, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Package size={14} color={a.qty === 0 ? C.terra : C.amber} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown }}>{a.item}</div>
                    <div style={{ fontSize: "0.66rem", color: C.muted }}>Qty: {a.qty}</div>
                  </div>
                  <span style={{ background: a.qty === 0 ? C.terraLight : C.amberLight,
                    color: a.qty === 0 ? C.terra : C.amber,
                    fontSize: "0.64rem", fontWeight: 800, padding: "2px 8px", borderRadius: 20 }}>
                    {a.label}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Recent Activity — full width horizontal */}
        <div style={{ marginBottom: 14 }}>
          {panel("Recent Activity", <Check size={13} color={C.sage} />, viewAll(), (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
              {recentActivity.map((a, i) => (
                <div key={i} style={{ padding: "14px 16px",
                  borderRight: i < recentActivity.length - 1 ? `1px solid ${C.creamDark}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%",
                      background: a.color, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.white, fontWeight: 800, fontSize: "0.62rem" }}>
                      {a.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: C.brown }}>{a.name}</div>
                      <div style={{ fontSize: "0.62rem", color: C.muted, ...mono }}>{a.when}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: C.brownLight, lineHeight: 1.4 }}>{a.sub}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Community Announcements */}
        {panel("Community Announcements", <Newspaper size={13} color={C.sage} />,
          <button onClick={() => setShowAnnForm(v => !v)}
            style={{ background: C.sage, color: C.white, border: "none",
              borderRadius: 7, padding: "4px 12px", fontSize: "0.7rem", fontWeight: 700,
              cursor: "pointer", fontFamily: "'Nunito', sans-serif",
              display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={11} /> New Announcement
          </button>,
          <div style={{ padding: "14px 16px" }}>
            {showAnnForm ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea value={annText} onChange={e => setAnnText(e.target.value)}
                  placeholder="Write your announcement to the community…"
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical",
                    fontFamily: "'Nunito', sans-serif" } as React.CSSProperties} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setShowAnnForm(false); setAnnText(""); }}
                    style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                      color: C.white, border: "none", borderRadius: 9, padding: "8px 20px",
                      fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                      fontFamily: "'Nunito', sans-serif" }}>Post</button>
                  <button onClick={() => setShowAnnForm(false)}
                    style={{ background: C.creamDark, color: C.brownLight, border: "none",
                      borderRadius: 9, padding: "8px 14px", fontWeight: 700, fontSize: "0.8rem",
                      cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.sagePop,
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Newspaper size={18} color={C.sage} />
                </div>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: C.brownMid }}>
                    No announcements yet
                  </div>
                  <div style={{ fontSize: "0.72rem", color: C.muted }}>
                    Click "New Announcement" to post one for all members.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column",
      background: C.cream, ...sans, overflow: "hidden" }}>
      {screen !== "login" && <TopNav screen={screen} setScreen={setScreen} />}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {screen === "login"     && <LoginScreen     onLogin={() => setScreen("dashboard")} />}
        {screen === "dashboard" && <DashboardScreen  setScreen={setScreen} />}
        {screen === "plot"      && <PlotScreen       setScreen={setScreen} />}
        {screen === "tasks"     && <TaskScreen />}
        {screen === "inventory" && <InventoryScreen />}
        {screen === "admin"     && <AdminScreen setScreen={setScreen} />}
      </div>
    </div>
  );
}
