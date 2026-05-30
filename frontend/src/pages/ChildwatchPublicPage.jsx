import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Shield, Search, Bell, Lock, Camera, FileText,
  Phone, ArrowRight, CheckCircle2, Users, ShieldAlert,
  Menu, X, MapPin, Clock, ChevronRight, AlertCircle,
  Heart, Star, Zap, Globe, ChevronLeft,
} from "lucide-react";

// import Hero1 from "../../assets/hero/hero-1.jpg";
// import Hero2 from "../../assets/hero/hero-2.jpg";
// import Hero3 from "../../assets/hero/hero-3.jpg";
// import Hero4 from "../../assets/hero/hero-4.jpg";

/* ─────────────────────────────────────────────────────────────────
   HERO SLIDESHOW IMAGES
   ────────────────────────────────────────────────────────────────
   These are free-to-use Unsplash images that match the child
   protection / community safety theme.

   HOW TO REPLACE WITH YOUR OWN IMAGES:
   ──────────────────────────────────────
   1. Add your images to:  src/assets/hero/
      e.g.  hero-1.jpg, hero-2.jpg, hero-3.jpg, hero-4.jpg

   2. Import them at the top of this file:
      import Hero1 from "../../assets/hero/hero-1.jpg";
      import Hero2 from "../../assets/hero/hero-2.jpg";
      import Hero3 from "../../assets/hero/hero-3.jpg";
      import Hero4 from "../../assets/hero/hero-4.jpg";

   3. Replace the `src` values in SLIDES below with:
      { src: Hero1, ... }, { src: Hero2, ... }, etc.
   ──────────────────────────────────────────────────────────────── */
const SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=900&q=80&fit=crop",
    caption: "Every child deserves to feel safe",
    sub: "Report missing children and abuse cases quickly and effectively.",
  },
  {
    src: "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=900&q=80&fit=crop",
    caption: "Communities protecting children together",
    sub: "Anonymous reporting tools for parents, neighbors, and institutions.",
  },
  {
    src: "https://images.unsplash.com/photo-1574952847949-87a0b4a4b6c6?w=900&q=80&fit=crop",
    caption: "Fast response saves lives",
    sub: "Cases reach the right authorities in under two hours on average.",
  },
  {
    src: "https://images.unsplash.com/photo-1601312687290-3a3cece13f4f?w=900&q=80&fit=crop",
    caption: "A safer Rwanda for every child",
    sub: "Coordinating police, social workers, and healthcare providers.",
  },
];

/* ─── Animated counter hook ─────────────────────────────────────── */
function useCounter(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

/* ─── Nav ────────────────────────────────────────────────────────── */
function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "About",        href: "#about"    },
    { label: "Features",     href: "#features" },
    { label: "How it works", href: "#how"      },
    { label: "Track report", href: "#track"    },
  ];

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm group-hover:bg-blue-700 transition-colors">
              <Shield className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[15px] font-bold text-blue-700 leading-none">Childwatch</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5 font-medium tracking-wide">
                Protect · Report · Respond
              </p>
            </div>
          </a>

          <nav className="hidden lg:flex items-center gap-7">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-[13px] font-medium text-slate-500 hover:text-blue-700 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-[13px] font-semibold text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/report"
              className="px-4 py-2 text-[13px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all active:scale-[0.98] shadow-sm"
            >
              Report now
            </Link>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="font-bold text-blue-700 text-[15px]">Childwatch</span>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 px-4 py-5 space-y-1">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  {l.label}
                </a>
              ))}
            </div>
            <div className="px-4 pb-6 space-y-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block w-full text-center py-3 rounded-xl border border-blue-200 text-blue-700 font-semibold text-[14px] hover:bg-blue-50 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/report"
                onClick={() => setOpen(false)}
                className="block w-full text-center py-3 rounded-xl bg-blue-600 text-white font-semibold text-[14px] hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                Report now
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Hero Slideshow ─────────────────────────────────────────────── */
function Hero() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState("next"); // "next" | "prev"
  const timerRef = useRef(null);

  const goTo = (idx, dir = "next") => {
    if (animating) return;
    setAnimating(true);
    setDirection(dir);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 500);
  };

  const next = () => goTo((current + 1) % SLIDES.length, "next");
  const prev = () => goTo((current - 1 + SLIDES.length) % SLIDES.length, "prev");

  /* Auto-advance every 5 s */
  useEffect(() => {
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [current]);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 5000);
  };

  const handleNext = () => { next(); resetTimer(); };
  const handlePrev = () => { prev(); resetTimer(); };

  const slide = SLIDES[current];

  return (
    <section id="home" className="relative min-h-screen w-full overflow-hidden flex flex-col">

      {/* ── Slideshow background ── */}
      <div className="absolute inset-0 z-0">
        {SLIDES.map((s, i) => (
          <div
            key={i}
            aria-hidden={i !== current}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${s.src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: i === current ? 1 : 0,
              transition: "opacity 0.7s cubic-bezier(0.4,0,0.2,1)",
              willChange: "opacity",
            }}
          />
        ))}

        {/* Dark overlay gradient — heavier at left/bottom for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.55) 50%, rgba(15,23,42,0.28) 100%)",
          }}
        />
        {/* Bottom fade into white sections */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{
            background: "linear-gradient(to top, rgba(255,255,255,0.12) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-6xl mx-auto w-full px-4 sm:px-6 pt-28 pb-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center w-full">

          {/* Left: text */}
          <div>
            {/* Live badge */}
            <div
              className="inline-flex items-center gap-2 border rounded-full px-3.5 py-1.5 text-[12px] font-semibold mb-6"
              style={{
                background: "rgba(255,255,255,0.1)",
                borderColor: "rgba(255,255,255,0.2)",
                color: "#fff",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Child protection platform · Rwanda
            </div>

            {/* Slide headline — animated on change */}
            <div
              style={{
                opacity: animating ? 0 : 1,
                transform: animating
                  ? direction === "next"
                    ? "translateY(16px)"
                    : "translateY(-16px)"
                  : "translateY(0)",
                transition: "opacity 0.45s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <h1
                className="font-extrabold leading-[1.1] tracking-tight text-white mb-4"
                style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}
              >
                {slide.caption}
              </h1>
              <p className="text-[15px] text-white/70 leading-[1.75] max-w-[420px] mb-8">
                {slide.sub}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                to="/report"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[14px] rounded-xl shadow-lg transition-all active:scale-[0.98]"
              >
                <FileText className="w-4 h-4" />
                Report a case
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="tel:116"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-[14px] rounded-xl transition-all active:scale-[0.98]"
              >
                <Phone className="w-4 h-4" />
                Emergency — 116
              </a>
            </div>

            {/* ── Slideshow controls ── */}
            <div className="flex items-center gap-4">
              {/* Prev / Next buttons */}
              <button
                onClick={handlePrev}
                aria-label="Previous slide"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  color: "#fff",
                  backdropFilter: "blur(8px)",
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next slide"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  color: "#fff",
                  backdropFilter: "blur(8px)",
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Dot indicators */}
              <div className="flex items-center gap-2 ml-1">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { goTo(i, i > current ? "next" : "prev"); resetTimer(); }}
                    aria-label={`Go to slide ${i + 1}`}
                    style={{
                      width: i === current ? "28px" : "8px",
                      height: "8px",
                      borderRadius: "99px",
                      background: i === current ? "#3B82F6" : "rgba(255,255,255,0.35)",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      transition: "width 0.35s cubic-bezier(0.22,1,0.36,1), background 0.3s",
                    }}
                  />
                ))}
              </div>

              {/* Slide counter */}
              <span className="text-[12px] font-semibold text-white/50 ml-auto tabular-nums">
                {current + 1} / {SLIDES.length}
              </span>
            </div>
          </div>

          {/* Right: case card — unchanged from original */}
          <div className="relative hidden lg:block">
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="h-44 bg-gradient-to-br from-blue-50 via-blue-100 to-green-50 relative overflow-hidden flex items-center justify-center">
                <HeroIllustration />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Case active
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">#CW-2026-00124</span>
                </div>
                <p className="text-[14px] font-semibold text-slate-800 mb-1">Missing child report</p>
                <div className="flex items-center gap-3 text-[12px] text-slate-400 mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Kigali, Gasabo</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 2 hours ago</span>
                </div>
                <div className="mb-1.5">
                  <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1.5">
                    <span>Response in progress</span>
                    <span className="text-blue-600">65%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-1.5 bg-blue-600 rounded-full" style={{ width: "65%" }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  {["Police", "Social Worker", "Hospital"].map((a, i) => (
                    <span
                      key={a}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg"
                      style={{
                        background: i === 0 ? "#EFF6FF" : i === 1 ? "#F0FDF4" : "#FFF7ED",
                        color: i === 0 ? "#1D4ED8" : i === 1 ? "#15803D" : "#C2410C",
                      }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress bar at very bottom ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 h-[3px] bg-white/10">
        <div
          key={current}
          style={{
            height: "100%",
            background: "#3B82F6",
            borderRadius: "0 2px 2px 0",
            animation: "slideProgress 5s linear forwards",
          }}
        />
      </div>

      <style>{`
        @keyframes slideProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </section>
  );
}

/* ─── Hero illustration SVG (unchanged) ─────────────────────────── */
function HeroIllustration() {
  return (
    <svg viewBox="0 0 340 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="340" height="160" fill="#EFF6FF" />
      <rect x="0" y="118" width="340" height="42" fill="#F0FDF4" />
      <circle cx="298" cy="32" r="18" fill="#FDE68A" />
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = Math.PI * deg / 180;
        return <line key={i} x1={298+22*Math.cos(r)} y1={32+22*Math.sin(r)} x2={298+27*Math.cos(r)} y2={32+27*Math.sin(r)} stroke="#FCD34D" strokeWidth="2" strokeLinecap="round"/>;
      })}
      <rect x="28" y="72" width="70" height="48" rx="2" fill="white" stroke="#BFDBFE" strokeWidth="1"/>
      <polygon points="24,73 98,73 61,42" fill="#2563EB"/>
      <rect x="54" y="88" width="18" height="32" rx="3" fill="#93C5FD"/>
      <rect x="36" y="80" width="14" height="12" rx="1.5" fill="#DBEAFE" stroke="#BFDBFE" strokeWidth="0.7"/>
      <rect x="74" y="80" width="14" height="12" rx="1.5" fill="#DBEAFE" stroke="#BFDBFE" strokeWidth="0.7"/>
      <rect x="112" y="92" width="7" height="28" rx="3" fill="#86EFAC"/>
      <circle cx="115" cy="82" r="17" fill="#16A34A" opacity="0.85"/>
      <circle cx="104" cy="90" r="12" fill="#15803D" opacity="0.75"/>
      <circle cx="126" cy="88" r="13" fill="#22C55E" opacity="0.7"/>
      <rect x="155" y="30" width="60" height="72" rx="12" fill="white" stroke="#BFDBFE" strokeWidth="0.8"/>
      <path d="M185 42 c0 0-14 5-14 14 v10 c0 9 14 16 14 16 s14-7 14-16 V56 c0-9-14-14-14-14z" fill="#DBEAFE" stroke="#2563EB" strokeWidth="1.5" strokeLinejoin="round"/>
      <polyline points="179,63 183,68 192,57" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="185" y="92" textAnchor="middle" fontSize="9" fill="#2563EB" fontFamily="system-ui,sans-serif" fontWeight="600">Safe</text>
      <circle cx="247" cy="68" r="11" fill="#2563EB"/>
      <rect x="239" y="80" width="16" height="26" rx="5" fill="#2563EB"/>
      <circle cx="267" cy="72" r="9" fill="#60A5FA"/>
      <rect x="260" y="82" width="14" height="24" rx="5" fill="#60A5FA"/>
      <circle cx="284" cy="76" r="6" fill="#93C5FD"/>
      <rect x="279" y="83" width="10" height="20" rx="4" fill="#93C5FD"/>
      <path d="M240,78 Q232,58 215,55" fill="none" stroke="#16A34A" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round"/>
      <circle cx="251" cy="56" r="7" fill="#EF4444"/>
      <text x="251" y="60" textAnchor="middle" fontSize="9" fill="white" fontFamily="system-ui,sans-serif" fontWeight="800">!</text>
    </svg>
  );
}

/* ─── Stats ──────────────────────────────────────────────────────── */
function Stats() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const c1 = useCounter(4200, 1600, visible);
  const c2 = useCounter(89,   1400, visible);
  const c3 = useCounter(30,   1200, visible);

  const stats = [
    { value: `${(c1 / 1000).toFixed(1)}k`, label: "Cases reported",    color: "text-blue-600"  },
    { value: `${c2}%`,                      label: "Response rate",     color: "text-green-700" },
    { value: "<2h",                          label: "Avg response time", color: "text-blue-600"  },
    { value: `${c3}+`,                       label: "Partner agencies",  color: "text-green-700" },
  ];

  return (
    <div ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <p className={`text-3xl font-extrabold ${s.color} tabular-nums`}>{s.value}</p>
            <p className="text-[12px] text-slate-500 font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Section wrapper ────────────────────────────────────────────── */
function Section({ id, label, title, sub, children, alt = false }) {
  return (
    <section id={id} className={`py-16 sm:py-20 ${alt ? "bg-slate-50/70" : "bg-white"}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-10 sm:mb-12">
          {label && (
            <p className="text-[11px] font-bold tracking-widest uppercase text-blue-600 mb-2">{label}</p>
          )}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight mb-3">{title}</h2>
          {sub && <p className="text-[14px] sm:text-[15px] text-slate-500 leading-[1.75] max-w-2xl">{sub}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

/* ─── Audience ───────────────────────────────────────────────────── */
function Audience() {
  const cards = [
    { icon: <Users className="w-5 h-5" />, title: "Parents & guardians",  text: "Report quickly, upload photos, and track your case with live status updates.",                        accent: "blue"  },
    { icon: <Heart className="w-5 h-5" />, title: "Community members",    text: "Report suspicious incidents safely and anonymously to protect children near you.",                      accent: "green" },
    { icon: <Shield className="w-5 h-5"/>, title: "Police & response",    text: "Receive verified alerts and coordinate fast, effective multi-agency responses.",                        accent: "blue"  },
    { icon: <Star className="w-5 h-5" />,  title: "Social workers",       text: "Support welfare assessments, protection interventions, and medical referrals.",                         accent: "green" },
  ];
  const colors = {
    blue:  { bg: "bg-blue-50",  text: "text-blue-700"  },
    green: { bg: "bg-green-50", text: "text-green-700" },
  };
  return (
    <Section id="about" label="Who it's for" title="Built for communities and institutions"
      sub="Childwatch connects everyone who plays a role in child safety — from concerned citizens to first responders." alt>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const col = colors[c.accent];
          return (
            <div key={c.title}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className={`w-10 h-10 rounded-xl ${col.bg} ${col.text} flex items-center justify-center mb-4`}>{c.icon}</div>
              <h3 className="text-[14px] font-bold text-slate-800 mb-2">{c.title}</h3>
              <p className="text-[13px] text-slate-500 leading-[1.65]">{c.text}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ─── Features ───────────────────────────────────────────────────── */
function Features() {
  const features = [
    { icon: <Search className="w-5 h-5" />,    title: "Missing child report", desc: "Submit details, last seen location, date, and photo evidence in minutes.",                            accent: "blue"  },
    { icon: <ShieldAlert className="w-5 h-5"/>, title: "Report abuse",         desc: "Confidentially report physical abuse, neglect, or trafficking suspicion.",                            accent: "green" },
    { icon: <Bell className="w-5 h-5" />,       title: "Real-time alerts",     desc: "Urgent cases trigger immediate alerts to child protection authorities.",                               accent: "blue"  },
    { icon: <Lock className="w-5 h-5" />,       title: "Anonymous reporting",  desc: "Report safely and securely without exposing your identity.",                                           accent: "green" },
    { icon: <Camera className="w-5 h-5" />,     title: "Evidence upload",      desc: "Upload images and documents to help authorities verify and act faster.",                               accent: "blue"  },
    { icon: <FileText className="w-5 h-5" />,   title: "Case tracking",        desc: "Follow your report's progress using a case number or account dashboard.",                             accent: "green" },
  ];
  const colors = {
    blue:  { icon: "bg-blue-50 text-blue-700",   border: "group-hover:border-blue-200"  },
    green: { icon: "bg-green-50 text-green-700", border: "group-hover:border-green-200" },
  };
  return (
    <Section id="features" label="Features" title="Everything you need to report and respond"
      sub="Simple, secure tools designed for both urban and rural access across Rwanda.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => {
          const col = colors[f.accent];
          return (
            <div key={f.title}
              className={`group flex gap-4 bg-white border border-slate-100 ${col.border} rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${col.icon}`}>{f.icon}</div>
              <div>
                <h3 className="text-[14px] font-bold text-slate-800 mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-slate-500 leading-[1.65]">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ─── How It Works ───────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { n: "1", title: "Report",  desc: "Submit a missing child or abuse report using a simple public form from any device.",                                icon: <FileText className="w-5 h-5" />, color: "blue"  },
    { n: "2", title: "Alert",   desc: "The system instantly notifies the relevant authority, child protection officer, or emergency unit.",                 icon: <Zap className="w-5 h-5" />,     color: "blue"  },
    { n: "3", title: "Respond", desc: "Police, social workers, and healthcare providers coordinate and update the case status.",                            icon: <Users className="w-5 h-5" />,   color: "green" },
    { n: "4", title: "Resolve", desc: "The case is tracked until the child is safe and the final resolution is recorded.",                                  icon: <CheckCircle2 className="w-5 h-5"/>, color: "green" },
  ];

  return (
    <Section id="how" label="How it works" title="From report to resolution"
      sub="Four steps to move information quickly from the community to the right institutions." alt>
      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 mb-10 overflow-hidden">
        <svg viewBox="0 0 680 160" className="w-full" xmlns="http://www.w3.org/2000/svg">
          <line x1="158" y1="80" x2="198" y2="80" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="5,3"/>
          <line x1="318" y1="80" x2="358" y2="80" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="5,3"/>
          <line x1="478" y1="80" x2="518" y2="80" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="5,3"/>
          <polygon points="198,75 210,80 198,85" fill="#CBD5E1"/>
          <polygon points="358,75 370,80 358,85" fill="#CBD5E1"/>
          <polygon points="518,75 530,80 518,85" fill="#CBD5E1"/>
          <rect x="20"  y="44" width="138" height="72" rx="14" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1"/>
          <rect x="36"  y="56" width="28"  height="28" rx="8"  fill="#2563EB"/>
          <text x="50"  y="75" textAnchor="middle" fontSize="14" fill="white" fontFamily="system-ui" fontWeight="700">1</text>
          <text x="112" y="72" textAnchor="middle" fontSize="13" fill="#1E3A5F" fontFamily="system-ui" fontWeight="600">Report</text>
          <text x="112" y="88" textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="system-ui">Public form</text>
          <rect x="210" y="44" width="138" height="72" rx="14" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1"/>
          <rect x="226" y="56" width="28"  height="28" rx="8"  fill="#2563EB"/>
          <text x="240" y="75" textAnchor="middle" fontSize="14" fill="white" fontFamily="system-ui" fontWeight="700">2</text>
          <text x="302" y="72" textAnchor="middle" fontSize="13" fill="#1E3A5F" fontFamily="system-ui" fontWeight="600">Alert</text>
          <text x="302" y="88" textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="system-ui">Authorities notified</text>
          <rect x="370" y="44" width="138" height="72" rx="14" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1"/>
          <rect x="386" y="56" width="28"  height="28" rx="8"  fill="#15803D"/>
          <text x="400" y="75" textAnchor="middle" fontSize="14" fill="white" fontFamily="system-ui" fontWeight="700">3</text>
          <text x="462" y="72" textAnchor="middle" fontSize="13" fill="#14532D" fontFamily="system-ui" fontWeight="600">Respond</text>
          <text x="462" y="88" textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="system-ui">Agencies coordinate</text>
          <rect x="530" y="44" width="138" height="72" rx="14" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1"/>
          <rect x="546" y="56" width="28"  height="28" rx="8"  fill="#15803D"/>
          <text x="560" y="75" textAnchor="middle" fontSize="14" fill="white" fontFamily="system-ui" fontWeight="700">4</text>
          <text x="622" y="72" textAnchor="middle" fontSize="13" fill="#14532D" fontFamily="system-ui" fontWeight="600">Resolve</text>
          <text x="622" y="88" textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="system-ui">Child safe & recorded</text>
        </svg>
      </div>
      <div className="space-y-0">
        {steps.map((s, i) => (
          <div key={s.n} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 ${s.color === "blue" ? "bg-blue-600" : "bg-green-700"}`}>
                {s.n}
              </div>
              {i < steps.length - 1 && <div className="w-px bg-slate-200 flex-1 my-2" />}
            </div>
            <div className="pb-7 pt-1.5">
              <h3 className="text-[15px] font-bold text-slate-800 mb-1">{s.title}</h3>
              <p className="text-[13px] text-slate-500 leading-[1.65]">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─── Track Report ───────────────────────────────────────────────── */
function TrackReport() {
  return (
    <Section id="track" label="Track reports" title="Follow your case progress"
      sub="Enter your report number to check the status of a submitted case at any time.">
      <div className="grid lg:grid-cols-2 gap-10 items-start">
        <div className="space-y-3">
          {[
            "Track reports by unique case number",
            "See current status and progress stage",
            "Receive updates after verification or response",
            "Submit additional information when needed",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <CheckCircle2 className="w-[18px] h-[18px] text-green-600 shrink-0 mt-0.5" />
              <span className="text-[13px] font-medium text-slate-700">{item}</span>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-7">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Search className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800">Track a submitted report</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Report number</label>
              <input type="text" placeholder="e.g. CW-2026-00124"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Phone or email</label>
              <input type="text" placeholder="Linked contact information"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
            </div>
            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[14px] rounded-xl transition-colors active:scale-[0.98] shadow-sm">
              Track report
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── CTA Banner ─────────────────────────────────────────────────── */
function CTABanner() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="relative overflow-hidden bg-blue-600 rounded-2xl px-6 sm:px-10 py-10 sm:py-12">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500 rounded-full opacity-40 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-green-500 rounded-full opacity-20 pointer-events-none" />
        <div className="relative grid sm:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-blue-200 mb-2">Take action</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-3">
              Protect a child. Raise a report.<br className="hidden sm:block" /> Build a safer community.
            </h2>
            <p className="text-[14px] text-blue-100 leading-[1.7] max-w-xl">
              Join Childwatch in making child protection faster, more coordinated, and accessible for everyone.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <Link to="/report"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold text-[14px] rounded-xl hover:bg-blue-50 transition-all active:scale-[0.98] whitespace-nowrap">
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="mailto:support@childwatch.org"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white border border-white/20 font-semibold text-[14px] rounded-xl hover:bg-white/20 transition-all active:scale-[0.98] whitespace-nowrap">
              Contact us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────── */
function Footer() {
  const platform = ["Report a case", "Track report", "How it works", "Login"];
  const support  = ["Emergency line", "Contact us", "www.childwatch.org"];
  const legal    = ["Privacy policy", "Terms of use"];

  return (
    <footer id="contact" className="bg-slate-900 mt-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-white text-[15px]">Childwatch</span>
            </div>
            <p className="text-[13px] text-slate-400 leading-[1.75]">
              A public child protection platform supporting fast and secure collaboration across institutions in Rwanda.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Platform</p>
            <div className="space-y-2.5">{platform.map((l) => <a key={l} href="#" className="block text-[13px] text-slate-400 hover:text-white transition-colors">{l}</a>)}</div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Support</p>
            <div className="space-y-2.5">{support.map((l) => <a key={l} href="#" className="block text-[13px] text-slate-400 hover:text-white transition-colors">{l}</a>)}</div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Legal</p>
            <div className="space-y-2.5">{legal.map((l) => <a key={l} href="#" className="block text-[13px] text-slate-400 hover:text-white transition-colors">{l}</a>)}</div>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-slate-500">© 2026 Childwatch. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <Globe className="w-3.5 h-3.5" /> Rwanda · Kigali
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Root ───────────────────────────────────────────────────────── */
export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Audience />
        <Features />
        <HowItWorks />
        <TrackReport />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
