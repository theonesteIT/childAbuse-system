// PoliceDashboard.jsx — Childwatch Police Officer Panel
// Stack: React + Tailwind CSS + lucide-react

import { useState } from "react";
import {
  LayoutDashboard, FolderOpen, Search, Bell, Shield, AlertTriangle,
  MapPin, Upload, FileText, User, CheckCircle2, Clock, Flag,
  Menu, X, LogOut, Plus, Edit2, Eye, Download, ArrowRight,
  ChevronRight, Zap, Hash, Camera, BookOpen, MessageSquare,
  UserPlus, Lock, RefreshCw, Filter, MoreVertical, Star,
  Navigation, Activity, TrendingUp, Phone, Calendar, Send
} from "lucide-react";

// ── Mock data ─────────────────────────────────────────────────────
const STATS = [
  { label: "Total Assigned",      value: "24",  icon: FolderOpen,    color: "blue",  delta: "cases"    },
  { label: "New Cases",           value: "3",   icon: Plus,          color: "amber", delta: "today"    },
  { label: "Under Investigation", value: "11",  icon: Search,        color: "blue",  delta: "active"   },
  { label: "Urgent",              value: "4",   icon: AlertTriangle, color: "red",   delta: "priority" },
  { label: "Resolved",            value: "6",   icon: CheckCircle2,  color: "green", delta: "this month"},
  { label: "Missing Not Found",   value: "7",   icon: Flag,          color: "red",   delta: "open"     },
];

const CASES = [
  { id:"CW-2026-001", type:"Missing",  child:"Mutoni Aline",    age:8,  district:"Gasabo",     status:"urgent",          date:"2026-04-20", assigned:"Self", location:[-1.944,30.059] },
  { id:"CW-2026-007", type:"Abuse",    child:"Keza Brian",      age:11, district:"Kicukiro",   status:"under-investigation", date:"2026-04-19", assigned:"Self", location:[-1.966,30.104] },
  { id:"CW-2026-012", type:"Missing",  child:"Nshimiye Marc",   age:6,  district:"Gasabo",     status:"new",             date:"2026-04-21", assigned:"Self", location:[-1.932,30.072] },
  { id:"CW-2026-015", type:"Abuse",    child:"Uwase Clarisse",  age:9,  district:"Nyarugenge", status:"urgent",          date:"2026-04-18", assigned:"Self", location:[-1.955,30.061] },
  { id:"CW-2026-003", type:"Missing",  child:"Irakoze Ivan",    age:7,  district:"Gasabo",     status:"resolved",        date:"2026-04-17", assigned:"Self", location:[-1.948,30.067] },
];

const ALERTS = [
  { msg:"New urgent case assigned: CW-2026-012",      time:"15m ago", type:"urgent"  },
  { msg:"Case CW-2026-001 requires immediate action", time:"1h ago",  type:"alert"   },
  { msg:"Medical report uploaded for CW-2026-007",    time:"3h ago",  type:"update"  },
  { msg:"Transfer request received for CW-2026-015",  time:"5h ago",  type:"transfer"},
];

const INCIDENT_LOCATIONS = [
  { id:"CW-2026-001", name:"Mutoni Aline",   x:42, y:38, type:"Missing", urgent:true  },
  { id:"CW-2026-007", name:"Keza Brian",     x:61, y:52, type:"Abuse",   urgent:false },
  { id:"CW-2026-012", name:"Nshimiye Marc",  x:35, y:30, type:"Missing", urgent:false },
  { id:"CW-2026-015", name:"Uwase Clarisse", x:50, y:60, type:"Abuse",   urgent:true  },
  { id:"CW-2026-003", name:"Irakoze Ivan",   x:55, y:42, type:"Missing", urgent:false },
];

const STATUS_CONFIG = {
  urgent:               { bg:"bg-red-50",    text:"text-red-700",    dot:"bg-red-500",    border:"border-red-200"    },
  "under-investigation":{ bg:"bg-blue-50",   text:"text-blue-700",   dot:"bg-blue-500",   border:"border-blue-200"   },
  new:                  { bg:"bg-amber-50",  text:"text-amber-700",  dot:"bg-amber-500",  border:"border-amber-200"  },
  resolved:             { bg:"bg-green-50",  text:"text-green-700",  dot:"bg-green-500",  border:"border-green-200"  },
};

const NAV = [
  { id:"dashboard",   label:"Dashboard",          icon:LayoutDashboard },
  { id:"cases",       label:"Assigned Cases",     icon:FolderOpen      },
  { id:"missing",     label:"Missing Children",   icon:Search          },
  { id:"abuse",       label:"Abuse Cases",        icon:Shield          },
  { id:"map",         label:"Incident Map",       icon:MapPin          },
  { id:"evidence",    label:"Evidence Upload",    icon:Upload          },
  { id:"notes",       label:"Case Notes",         icon:MessageSquare   },
  { id:"reports",     label:"Generate Reports",   icon:FileText        },
  { id:"alerts",      label:"Alerts",             icon:Bell            },
];

// ── Shared UI ─────────────────────────────────────────────────────
const STATUS_ROW_BG = { urgent:"bg-red-50/40", new:"bg-amber-50/40", resolved:"", "under-investigation":"" };

function StatCard({ label, value, icon:Icon, color, delta }) {
  const C = {
    blue:  { bg:"bg-blue-50",  ic:"text-blue-600",  ring:"ring-blue-100"  },
    green: { bg:"bg-green-50", ic:"text-green-600", ring:"ring-green-100" },
    amber: { bg:"bg-amber-50", ic:"text-amber-600", ring:"ring-amber-100" },
    red:   { bg:"bg-red-50",   ic:"text-red-500",   ring:"ring-red-100"   },
  }[color] || { bg:"bg-blue-50", ic:"text-blue-600", ring:"ring-blue-100" };
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${C.bg} ring-4 ${C.ring} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${C.ic}`} />
      </div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-[12px] font-semibold text-slate-500 mt-0.5">{label}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{delta}</p>
    </div>
  );
}

function SectionTitle({ title, sub }) {
  return (
    <div className="mb-5">
      <h2 className="text-[17px] font-extrabold text-slate-900">{title}</h2>
      {sub && <p className="text-[12px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.replace("-"," ")}
    </span>
  );
}

function Btn({ children, variant="primary", size="sm", onClick, className="" }) {
  const V = {
    primary:"bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    green:  "bg-green-700 hover:bg-green-800 text-white shadow-sm",
    outline:"border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
    danger: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200",
    ghost:  "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
  }[variant];
  const S = { sm:"px-3 py-1.5 text-[12px]", md:"px-4 py-2.5 text-[13px]" }[size];
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 font-semibold rounded-xl transition-all active:scale-[0.97] ${V} ${S} ${className}`}>{children}</button>;
}

function TableWrap({ children }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-100"><table className="w-full text-[13px]">{children}</table></div>;
}
function Th({ children }) { return <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 whitespace-nowrap">{children}</th>; }
function Td({ children, className="" }) { return <td className={`px-4 py-3 border-t border-slate-100 text-slate-700 ${className}`}>{children}</td>; }

// ── SECTIONS ──────────────────────────────────────────────────────
function DashboardView({ onNav }) {
  return (
    <div className="space-y-6">
      {/* Hero bar */}
      <div className="relative overflow-hidden bg-blue-700 rounded-2xl px-6 py-5 text-white">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-blue-600 rounded-full opacity-50 pointer-events-none" />
        <div className="absolute -bottom-6 left-1/2 w-28 h-28 bg-green-500 rounded-full opacity-10 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-blue-200 mb-1">Good morning</p>
            <h2 className="text-[20px] font-extrabold">Officer Inès Uwimana</h2>
            <p className="text-[13px] text-blue-200 mt-0.5">Gasabo Police Station · Badge #RPS-0042</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => onNav("cases")} className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 font-bold text-[13px] rounded-xl hover:bg-blue-50 transition-colors">
              <FolderOpen className="w-4 h-4" /> My Cases
            </button>
            <button onClick={() => onNav("map")} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/30 text-white font-bold text-[13px] rounded-xl hover:bg-white/20 transition-colors">
              <MapPin className="w-4 h-4" /> Live Map
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent cases */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="font-extrabold text-slate-800">Recent Cases</p>
            <button onClick={() => onNav("cases")} className="text-[12px] font-semibold text-blue-600">View all →</button>
          </div>
          <div className="space-y-2">
            {CASES.slice(0,4).map(c => (
              <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-slate-50 ${STATUS_ROW_BG[c.status]||""}`}>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_CONFIG[c.status]?.dot || "bg-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 truncate">{c.child} <span className="text-slate-400 font-normal">· age {c.age}</span></p>
                  <p className="text-[11px] text-slate-400">{c.id} · {c.district}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="font-extrabold text-slate-800 mb-4">Recent Alerts</p>
          <div className="space-y-3">
            {ALERTS.map((a, i) => (
              <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.type==="urgent"?"bg-red-500":a.type==="alert"?"bg-amber-500":"bg-blue-500"}`} />
                <div>
                  <p className="text-[12px] text-slate-700 leading-relaxed">{a.msg}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mini map */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="font-extrabold text-slate-800">Incident Locations — Gasabo District</p>
          <button onClick={() => onNav("map")} className="text-[12px] font-semibold text-blue-600">Full map →</button>
        </div>
        <IncidentMapView mini />
      </div>
    </div>
  );
}

function CasesView() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");

  const filtered = CASES.filter(c =>
    (filter==="All" || c.status===filter) &&
    (c.child.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <SectionTitle title="Assigned Cases" sub={`${CASES.length} cases assigned to you`} />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by child name or case ID…"
            className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 bg-white" />
        </div>
        <select value={filter} onChange={e=>setFilter(e.target.value)}
          className="px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none bg-white">
          {["All","urgent","new","under-investigation","resolved"].map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid gap-3">
        {filtered.map(c => (
          <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${c.type==="Missing"?"bg-blue-50 text-blue-700 border-blue-200":"bg-red-50 text-red-700 border-red-200"}`}>{c.type}</span>
                  <span className="font-mono text-[11px] text-slate-400">{c.id}</span>
                </div>
                <h3 className="text-[15px] font-extrabold text-slate-900">{c.child} <span className="text-slate-400 text-[13px] font-normal">· age {c.age}</span></h3>
                <p className="text-[12px] text-slate-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{c.district} · {c.date}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Btn variant="outline"><Eye className="w-3.5 h-3.5" /> View</Btn>
              <Btn variant="outline"><Edit2 className="w-3.5 h-3.5" /> Update Status</Btn>
              <Btn variant="outline"><MessageSquare className="w-3.5 h-3.5" /> Add Note</Btn>
              <Btn variant="outline"><UserPlus className="w-3.5 h-3.5" /> Transfer</Btn>
              {c.status !== "resolved" && <Btn variant="danger"><CheckCircle2 className="w-3.5 h-3.5" /> Close</Btn>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MissingView() {
  const missing = CASES.filter(c => c.type === "Missing");
  return (
    <div className="space-y-5">
      <SectionTitle title="Missing Children Cases" sub="All verified missing child reports assigned to you" />
      <div className="grid gap-4">
        {missing.map(c => (
          <div key={c.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className={`h-1.5 w-full ${c.status==="urgent"?"bg-red-500":c.status==="resolved"?"bg-green-500":"bg-blue-500"}`} />
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-[15px] font-extrabold text-slate-900">{c.child}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-[12px] text-slate-500">Age {c.age} · Last seen: <span className="font-semibold text-slate-700">{c.district}</span> · {c.date}</p>
                  <p className="font-mono text-[11px] text-blue-600 mt-0.5">{c.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <Btn variant="primary" className="justify-center"><Eye className="w-3.5 h-3.5" />View Profile</Btn>
                <Btn variant="outline" className="justify-center"><Edit2 className="w-3.5 h-3.5" />Update</Btn>
                <Btn variant="outline" className="justify-center"><Upload className="w-3.5 h-3.5" />Evidence</Btn>
                <Btn variant="outline" className="justify-center"><MapPin className="w-3.5 h-3.5" />Location</Btn>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AbuseView() {
  const abuse = CASES.filter(c => c.type === "Abuse");
  return (
    <div className="space-y-5">
      <SectionTitle title="Abuse Cases" sub="Abuse reports referred to police for investigation" />
      {abuse.map(c => (
        <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-[11px] text-red-500 font-bold">{c.id}</span>
              <h3 className="text-[15px] font-extrabold text-slate-900 mt-0.5">{c.child}</h3>
              <p className="text-[12px] text-slate-400">{c.district} · {c.date}</p>
            </div>
            <StatusBadge status={c.status} />
          </div>
          {/* Suspect form */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <p className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Suspect Details</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input placeholder="Suspect name" className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
              <input placeholder="Relationship to child" className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
            </div>
            <textarea rows={2} placeholder="Incident description…" className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-white resize-none" />
            <Btn variant="primary"><Send className="w-3.5 h-3.5" /> Save Suspect Details</Btn>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="outline"><Upload className="w-3.5 h-3.5" />Upload Evidence</Btn>
            <Btn variant="outline"><MessageSquare className="w-3.5 h-3.5" />Add Note</Btn>
            <Btn variant="green"><CheckCircle2 className="w-3.5 h-3.5" />Mark Resolved</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

function IncidentMapView({ mini = false }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className={`relative bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl overflow-hidden ${mini ? "h-48" : "h-80"}`}>
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        {[20,40,60,80].map(v => (
          <g key={v}>
            <line x1={`${v}%`} y1="0" x2={`${v}%`} y2="100%" stroke="#2563EB" strokeWidth="0.5" />
            <line x1="0" y1={`${v}%`} x2="100%" y2={`${v}%`} stroke="#2563EB" strokeWidth="0.5" />
          </g>
        ))}
      </svg>
      {/* District label */}
      <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1 text-[11px] font-bold text-blue-700">
        Gasabo District
      </div>
      {/* Incident pins */}
      {INCIDENT_LOCATIONS.map(loc => (
        <div key={loc.id} className="absolute" style={{ left:`${loc.x}%`, top:`${loc.y}%`, transform:"translate(-50%,-100%)" }}
          onMouseEnter={() => setHovered(loc)} onMouseLeave={() => setHovered(null)}>
          <div className={`w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-pointer
            ${loc.urgent?"bg-red-500":"bg-blue-600"}`}>
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          {hovered?.id === loc.id && !mini && (
            <div className="absolute bottom-9 left-1/2 -translate-x-1/2 bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 whitespace-nowrap z-10">
              <p className="text-[12px] font-bold text-slate-800">{loc.name}</p>
              <p className="text-[10px] text-slate-500">{loc.type} · {loc.id}</p>
            </div>
          )}
        </div>
      ))}
      {!mini && (
        <div className="absolute bottom-3 right-3 flex gap-2">
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-[10px] font-semibold text-slate-700">Urgent</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /><span className="text-[10px] font-semibold text-slate-700">Active</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MapView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Incident Map" sub="Real-time location view of all assigned cases" />
      <IncidentMapView />
      <div className="grid sm:grid-cols-2 gap-3">
        {INCIDENT_LOCATIONS.map(loc => (
          <div key={loc.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${loc.urgent?"bg-red-100":"bg-blue-100"}`}>
              <MapPin className={`w-4 h-4 ${loc.urgent?"text-red-600":"text-blue-600"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-800 truncate">{loc.name}</p>
              <p className="text-[11px] text-slate-400">{loc.type} · {loc.id}</p>
            </div>
            {loc.urgent && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">URGENT</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Upload Investigation Evidence" sub="Add photos, documents or recordings to cases" />
      {CASES.slice(0,3).map(c => (
        <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono text-[11px] text-blue-600 font-bold">{c.id}</p>
              <p className="text-[14px] font-extrabold text-slate-800">{c.child}</p>
            </div>
            <StatusBadge status={c.status} />
          </div>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors cursor-pointer">
            <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-[13px] text-slate-600 font-semibold">Drop files or tap to upload</p>
            <p className="text-[11px] text-slate-400 mt-1">Photos, videos, documents · Max 50 MB</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {["📷 Photo","🎥 Video","📄 Document"].map(t => (
              <button key={t} className="py-2 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">{t}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesView() {
  const [notes, setNotes] = useState({ "CW-2026-001":"Child last seen near Kimironko market.", "CW-2026-007":"" });
  return (
    <div className="space-y-5">
      <SectionTitle title="Case Notes" sub="Add investigation notes, recovery details, and updates" />
      {CASES.slice(0,4).map(c => (
        <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] text-blue-600 font-bold">{c.id}</p>
              <p className="text-[14px] font-extrabold text-slate-800">{c.child}</p>
            </div>
            <StatusBadge status={c.status} />
          </div>
          <textarea value={notes[c.id]||""} onChange={e => setNotes(p=>({...p,[c.id]:e.target.value}))} rows={3}
            placeholder="Add investigation notes, suspect details, recovery information…"
            className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-none bg-white" />
          <div className="flex gap-2">
            <Btn variant="primary" size="sm"><Send className="w-3.5 h-3.5" />Save Note</Btn>
            <Btn variant="outline" size="sm"><Flag className="w-3.5 h-3.5" />Mark Urgent</Btn>
            <Btn variant="green" size="sm"><CheckCircle2 className="w-3.5 h-3.5" />Mark Resolved</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Generate Case Reports" sub="Export case documentation for official use" />
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { title:"Full Case Report",    sub:"Complete investigation summary",  icon:FileText    },
          { title:"Missing Child Report",sub:"Official missing persons form",   icon:User        },
          { title:"Arrest/Suspect Log",  sub:"Suspect and arrest documentation",icon:Lock        },
          { title:"Recovery Report",     sub:"Child recovery and outcome",      icon:CheckCircle2},
          { title:"Evidence Log",        sub:"All uploaded evidence manifest",  icon:Camera      },
          { title:"Monthly Summary",     sub:"All cases handled this month",    icon:Calendar    },
        ].map(r => (
          <div key={r.title} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <r.icon className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-[14px] font-bold text-slate-800 mb-1">{r.title}</h3>
            <p className="text-[12px] text-slate-500 mb-4">{r.sub}</p>
            <div className="flex gap-2">
              <Btn variant="outline" className="flex-1 justify-center"><Download className="w-3.5 h-3.5" />PDF</Btn>
              <Btn variant="outline" className="flex-1 justify-center"><Download className="w-3.5 h-3.5" />CSV</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Alerts & Notifications" sub="All alerts, updates, and system messages" />
      <div className="space-y-3">
        {[...ALERTS, ...ALERTS].map((a, i) => (
          <div key={i} className={`flex gap-3 p-4 rounded-xl border ${a.type==="urgent"?"bg-red-50 border-red-100":"bg-white border-slate-100"} shadow-sm`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
              ${a.type==="urgent"?"bg-red-100":a.type==="alert"?"bg-amber-100":"bg-blue-100"}`}>
              {a.type==="urgent"
                ? <AlertTriangle className="w-4 h-4 text-red-600" />
                : a.type==="alert"
                  ? <Bell className="w-4 h-4 text-amber-600" />
                  : <Bell className="w-4 h-4 text-blue-600" />}
            </div>
            <div className="flex-1">
              <p className="text-[13px] text-slate-800 font-medium leading-relaxed">{a.msg}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────
export default function PoliceDashboard() {
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const SECTIONS = {
    dashboard: <DashboardView onNav={setActive} />,
    cases:     <CasesView />,
    missing:   <MissingView />,
    abuse:     <AbuseView />,
    map:       <MapView />,
    evidence:  <EvidenceView />,
    notes:     <NotesView />,
    reports:   <ReportsView />,
    alerts:    <AlertsView />,
  };
  const cur = NAV.find(n => n.id === active);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={()=>setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 xl:w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen?"translate-x-0":"-translate-x-full"}`}>
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[14px] font-extrabold text-blue-700">Childwatch</p>
              <p className="text-[10px] text-slate-400 font-medium">Police Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {NAV.map(item => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button key={item.id} onClick={()=>{setActive(item.id);setSidebarOpen(false);}}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all
                  ${isActive?"bg-blue-700 text-white shadow-sm":"text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                <Icon className="w-4 h-4 shrink-0" />{item.label}
              </button>
            );
          })}
        </nav>
        <div className="px-4 pb-5 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-extrabold text-blue-700">IU</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-slate-800 truncate">Inès Uwimana</p>
              <p className="text-[10px] text-slate-400">Police Officer</p>
            </div>
            <button className="text-slate-400 hover:text-slate-700"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={()=>setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100"><Menu className="w-5 h-5 text-slate-600" /></button>
            <h1 className="text-[14px] font-extrabold text-slate-800">{cur?.label}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setActive("alerts")} className="relative p-2 rounded-lg hover:bg-slate-100">
              <Bell className="w-5 h-5 text-slate-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-[11px] font-bold text-blue-700">IU</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{SECTIONS[active]}</main>
        {/* Mobile bottom nav */}
        <div className="lg:hidden border-t border-slate-100 bg-white flex items-center justify-around px-1 py-2 shrink-0">
          {[
            {id:"dashboard",icon:LayoutDashboard,label:"Home"},
            {id:"cases",icon:FolderOpen,label:"Cases"},
            {id:"missing",icon:Search,label:"Missing"},
            {id:"map",icon:MapPin,label:"Map"},
            {id:"alerts",icon:Bell,label:"Alerts"},
          ].map(item=>{
            const Icon=item.icon; const isA=active===item.id;
            return <button key={item.id} onClick={()=>setActive(item.id)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl">
              <Icon className={`w-5 h-5 ${isA?"text-blue-700":"text-slate-400"}`}/>
              <span className={`text-[9px] font-bold ${isA?"text-blue-700":"text-slate-400"}`}>{item.label}</span>
            </button>;
          })}
        </div>
      </div>
    </div>
  );
}