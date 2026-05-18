// Reporter.jsx — Childwatch Reporter / Parent Dashboard
// Stack: React + Tailwind CSS + lucide-react

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Search, Bell, AlertTriangle,
  MapPin, Camera, BookOpen, MessageCircle, Globe, Shield,
  User, Plus, Eye, Edit2, Upload, Phone, ChevronRight,
  CheckCircle2, Clock, X, Menu, LogOut, ArrowRight,
  Image, File, Mic, Lock, Mail, Hash, Star, Heart,
  Home, Info, Send, RefreshCw, Zap, Flag
} from "lucide-react";
import { clearAuthSession, getAuthProfile } from "../utils/authStorage";
import { getMyAccount } from "../services/authApi";
import {
  createMyReport,
  getMyNotifications,
  getMyReports,
  markAllNotificationsRead,
  markNotificationRead,
  trackMyCase,
} from "../services/reporterApi";

// ── Mock data ────────────────────────────────────────────────────
const MY_REPORTS = [
  { id:"CW-2026-041", type:"Missing",  child:"Mutoni Jean",   date:"2026-04-20", status:"under-investigation", district:"Gasabo"    },
  { id:"CW-2026-028", type:"Abuse",    child:"Keza Diana",    date:"2026-04-10", status:"verified",             district:"Kicukiro"  },
  { id:"CW-2026-009", type:"Missing",  child:"Irakoze Paul",  date:"2026-03-22", status:"resolved",             district:"Musanze"   },
];

const TIMELINE_STEPS = ["Submitted","Verified","Under Investigation","Resolved"];
const AWARENESS_TIPS = [
  { icon:"🛡️", title:"If a child goes missing", body:"Stay calm. Note last known location, clothing, and time. Report immediately to Childwatch and local police." },
  { icon:"🚨", title:"Signs of abuse to watch for", body:"Unexplained injuries, withdrawal, fear of certain adults, sudden behavioral changes, or lack of basic needs." },
  { icon:"📍", title:"What to do right now", body:"Use the Emergency Button below or call our hotline. Every minute counts — report immediately, anonymously if needed." },
  { icon:"🤝", title:"Community responsibility", body:"Child protection is everyone's role. If you see something suspicious, report it. Your report can save a life." },
];

const LANGS = ["English","Français","Kinyarwanda"];

function normalizeUserProfile(profile) {
  return {
    id: profile?.id ?? null,
    fullName: profile?.fullName || profile?.name || "Reporter",
    email: profile?.email || "No email",
    phone: profile?.phone || "No phone",
    district: profile?.district || "Unknown district",
    role: profile?.role || "reporter",
  };
}

function formatRoleLabel(role) {
  return String(role || "reporter")
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateDisplay(input) {
  if (!input) return "—";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return String(input);
  return dt.toISOString().slice(0, 10);
}

function formatDateTimeDisplay(input) {
  if (!input) return "—";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return String(input);
  return dt.toISOString().slice(0, 16).replace("T", " ");
}

function formatRelativeTime(input) {
  if (!input) return "now";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return String(input);
  const diffMs = Date.now() - dt.getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function normalizeReport(report) {
  const normalizedStatus = String(report.status || "submitted")
    .toLowerCase()
    .replace(/\s+/g, "-");

  return {
    id: report.id,
    caseId: report.caseId || report.id,
    type: report.type || "Missing",
    child: report.child || "Unknown",
    date: formatDateDisplay(report.createdAt || report.date),
    status: normalizedStatus,
    district: report.district || "Unknown",
    createdAt: report.createdAt || report.date,
  };
}

function normalizeNotification(item) {
  return {
    id: item.id,
    msg: item.msg || item.message || "New update",
    time: formatRelativeTime(item.time || item.createdAt),
    read: Boolean(item.read),
    type: item.type || "update",
  };
}

const STATUS_STYLES = {
  submitted:           { bg:"bg-slate-100",  text:"text-slate-600",  dot:"bg-slate-400"  },
  verified:            { bg:"bg-blue-50",    text:"text-blue-700",   dot:"bg-blue-500"   },
  "under-investigation":{ bg:"bg-amber-50",  text:"text-amber-700",  dot:"bg-amber-500"  },
  resolved:            { bg:"bg-green-50",   text:"text-green-700",  dot:"bg-green-500"  },
};

const NAV_ITEMS = [
  { id:"home",          label:"Home",           icon:Home       },
  { id:"report",        label:"New Report",     icon:Plus       },
  { id:"my-reports",    label:"My Reports",     icon:FileText   },
  { id:"track",         label:"Track Case",     icon:Search     },
  { id:"notifications", label:"Notifications",  icon:Bell       },
  { id:"emergency",     label:"Emergency",      icon:AlertTriangle},
  { id:"evidence",      label:"Upload Evidence",icon:Camera     },
  { id:"awareness",     label:"Safety Tips",    icon:BookOpen   },
  { id:"profile",       label:"My Profile",     icon:User       },
];

// ── Reusable ─────────────────────────────────────────────────────

function Badge({ children, color = "blue" }) {
  const map = {
    blue:  "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red:   "bg-red-50 text-red-700 border-red-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${map[color]}`}>{children}</span>;
}

function FormField({ label, type="text", placeholder, icon:Icon, value, onChange, required }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {Icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Icon className="w-4 h-4" /></div>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          className={`w-full ${Icon?"pl-10":"pl-4"} pr-4 py-3 text-[14px] border border-slate-200 bg-white rounded-xl outline-none
            focus:border-blue-400 focus:ring-2 focus:ring-blue-50 placeholder-slate-400 text-slate-800`} />
      </div>
    </div>
  );
}

function SectionWrap({ title, sub, children }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-extrabold text-slate-900">{title}</h2>
        {sub && <p className="text-[13px] text-slate-500 mt-1">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ── SECTIONS ──────────────────────────────────────────────────────

function HomeSection({ onNav, profileData, isProfileLoading, myReports }) {
  const activeCount = myReports.filter((report) =>
    ["submitted", "verified", "under-investigation"].includes(report.status),
  ).length;
  const resolvedCount = myReports.filter((report) => report.status === "resolved").length;
  const stats = [
    { label:"Reports Submitted", value:myReports.length, color:"blue",  icon:FileText },
    { label:"Active Cases",      value:activeCount,      color:"amber", icon:Clock    },
    { label:"Resolved",          value:resolvedCount,    color:"green", icon:CheckCircle2},
  ];
  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden bg-blue-600 rounded-2xl p-6 text-white">
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-blue-500 rounded-full opacity-50 pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-green-500 rounded-full opacity-20 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[11px] font-bold tracking-widest uppercase text-blue-200 mb-1">Welcome back</p>
          <h2 className="text-[22px] font-extrabold leading-tight mb-2">
            {isProfileLoading ? "Loading..." : profileData.fullName}
          </h2>
          <p className="text-[13px] text-blue-100 leading-relaxed mb-5 max-w-sm">
            Your reports are helping protect children in Rwanda. Thank you for being part of the Childwatch network.
          </p>
          <p className="text-[12px] text-blue-100 mb-4">
            {formatRoleLabel(profileData.role)} · {profileData.district}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => onNav("report")}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-bold text-[13px] rounded-xl hover:bg-blue-50 transition-colors">
              <Plus className="w-4 h-4" /> New Report
            </button>
            <button onClick={() => onNav("emergency")}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[13px] rounded-xl transition-colors">
              <AlertTriangle className="w-4 h-4" /> Emergency
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => {
          const colors = {
            blue:  "bg-blue-50 text-blue-600",
            amber: "bg-amber-50 text-amber-600",
            green: "bg-green-50 text-green-600",
          };
          return (
            <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center">
              <div className={`w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center ${colors[s.color]}`}>
                <s.icon className="w-4.5 h-4.5 w-5 h-5" />
              </div>
              <p className="text-[22px] font-extrabold text-slate-900">{s.value}</p>
              <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent reports */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="font-extrabold text-slate-800">Recent Reports</p>
          <button onClick={() => onNav("my-reports")} className="text-[12px] font-semibold text-blue-600 hover:text-blue-800">
            View all →
          </button>
        </div>
        <div className="space-y-2">
          {myReports.slice(0, 3).map(r => {
            const s = STATUS_STYLES[r.status] || STATUS_STYLES.submitted;
            return (
              <div key={r.caseId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onNav("my-reports")}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{r.child} — {r.type}</p>
                  <p className="text-[11px] text-slate-400">{r.caseId} · {r.date}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${s.bg} ${s.text} whitespace-nowrap`}>
                  {r.status.replace("-"," ")}
                </span>
              </div>
            );
          })}
          {myReports.length === 0 && (
            <p className="text-[12px] text-slate-500">No reports yet. Create your first report.</p>
          )}
        </div>
      </div>

      {/* Quick tip */}
      <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
          <Info className="w-4 h-4 text-green-700" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-green-800 mb-0.5">Tip of the day</p>
          <p className="text-[12px] text-green-700 leading-relaxed">
            Always note the child's last seen location, clothing color, and exact time when filing a missing child report.
          </p>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ onReportCreated }) {
  const [type, setType] = useState("Missing");
  const [anon, setAnon] = useState(false);
  const [form, setForm] = useState({ childName:"",age:"",gender:"",location:"",description:"" });
  const [submittedCaseId, setSubmittedCaseId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const set = k => e => setForm(p => ({...p,[k]:e.target.value}));

  const handleSubmit = async () => {
    if (!form.childName || !form.location || !form.description) {
      setSubmitError("Please fill child name, location and description.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      const response = await createMyReport({
        type,
        childName: form.childName,
        age: form.age || null,
        gender: form.gender || null,
        location: form.location,
        description: form.description,
        anonymous: anon,
      });
      setSubmittedCaseId(response?.report?.caseId || "Created");
      if (onReportCreated) {
        await onReportCreated();
      }
    } catch (error) {
      setSubmitError(error.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedCaseId) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 space-y-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-[20px] font-extrabold text-slate-900">Report Submitted!</h2>
      <p className="text-[14px] text-slate-500 max-w-sm">Your case has been created. You will receive updates as authorities respond. Save your case ID below.</p>
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-3 text-center">
        <p className="text-[11px] text-blue-500 font-bold uppercase tracking-wider mb-1">Your Case ID</p>
        <p className="text-[22px] font-extrabold text-blue-700 font-mono">{submittedCaseId}</p>
      </div>
      <button onClick={() => { setSubmittedCaseId(""); setForm({childName:"",age:"",gender:"",location:"",description:""}); }}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[14px] rounded-xl transition-colors">
        Submit Another Report
      </button>
    </div>
  );

  return (
    <SectionWrap title="Create Report" sub="Fill in the details to submit a new report.">
      {/* Type selector */}
      <div className="flex gap-3">
        {["Missing","Abuse"].map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`flex-1 py-3 rounded-xl text-[13px] font-bold border transition-all
              ${type===t
                ? t==="Missing" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-red-600 text-white border-red-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
            {t === "Missing" ? "🔍 Missing Child" : "🚨 Report Abuse"}
          </button>
        ))}
      </div>

      {/* Anonymous toggle */}
      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
        <button onClick={() => setAnon(!anon)}
          className={`w-8 h-4 rounded-full transition-all relative shrink-0 ${anon?"bg-blue-600":"bg-slate-300"}`}>
          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${anon?"right-0.5":"left-0.5"}`} />
        </button>
        <div>
          <p className="text-[13px] font-semibold text-slate-700">Anonymous Report</p>
          <p className="text-[11px] text-slate-400">Your identity will not be shared with authorities</p>
        </div>
        <Lock className="w-4 h-4 text-slate-400 shrink-0 ml-auto" />
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <FormField label="Child's Full Name" placeholder="Enter child's name" icon={User} value={form.childName} onChange={set("childName")} required />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Age" type="number" placeholder="Age" value={form.age} onChange={set("age")} required />
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Gender <span className="text-red-400">*</span></label>
            <select value={form.gender} onChange={set("gender")}
              className="w-full px-4 py-3 text-[14px] border border-slate-200 bg-white rounded-xl outline-none focus:border-blue-400 appearance-none">
              <option value="">Select</option>
              <option>Boy</option><option>Girl</option><option>Unknown</option>
            </select>
          </div>
        </div>
        <FormField label="Last Seen Location" placeholder="e.g. Kimironko Market, Gasabo" icon={MapPin} value={form.location} onChange={set("location")} required />
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Description <span className="text-red-400">*</span></label>
          <textarea value={form.description} onChange={set("description")} rows={4}
            placeholder="Describe what happened, what the child was wearing, any witnesses…"
            className="w-full px-4 py-3 text-[14px] border border-slate-200 bg-white rounded-xl outline-none focus:border-blue-400 resize-none placeholder-slate-400 text-slate-800" />
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Upload Photo / Evidence</label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors cursor-pointer">
            <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-[13px] text-slate-500 font-medium">Tap to upload photo or evidence</p>
            <p className="text-[11px] text-slate-400 mt-1">JPG, PNG, PDF · Max 10 MB</p>
          </div>
        </div>

        <button onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700
            disabled:opacity-60 text-white font-bold text-[14px] rounded-xl shadow-sm transition-all active:scale-[0.98]">
          <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit Report"}
        </button>
        {submitError && <p className="text-[12px] text-red-500 font-medium">{submitError}</p>}
      </div>
    </SectionWrap>
  );
}

function MyReportsSection({ myReports, isLoading, error }) {
  const [filter, setFilter] = useState("All");
  const filtered = myReports.filter(r => filter==="All" || r.status===filter);
  return (
    <SectionWrap title="My Reports" sub="All cases you have submitted">
      <div className="flex gap-2 flex-wrap">
        {["All","under-investigation","verified","resolved"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all
              ${filter===f?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
            {f==="All"?"All":f.replace("-"," ")}
          </button>
        ))}
      </div>
      {isLoading && <p className="text-[12px] text-slate-500">Loading reports...</p>}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
      <div className="space-y-3">
        {filtered.map(r => {
          const s = STATUS_STYLES[r.status] || STATUS_STYLES.submitted;
          const step = ["submitted","verified","under-investigation","resolved"].indexOf(r.status);
          return (
            <div key={r.caseId} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color={r.type==="Missing"?"blue":"red"}>{r.type}</Badge>
                    <span className="font-mono text-[11px] text-slate-400">{r.caseId}</span>
                  </div>
                  <h3 className="text-[15px] font-extrabold text-slate-800">{r.child}</h3>
                  <p className="text-[12px] text-slate-400 mt-0.5">{r.district} · {r.date}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap ${s.bg} ${s.text}`}>
                  {r.status.replace("-"," ")}
                </span>
              </div>
              {/* Mini timeline */}
              <div className="flex items-center gap-1 mb-4">
                {TIMELINE_STEPS.map((st, i) => (
                  <div key={st} className="flex items-center flex-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold
                      ${i <= step ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                      {i < step ? "✓" : i+1}
                    </div>
                    {i < TIMELINE_STEPS.length-1 && (
                      <div className={`flex-1 h-0.5 mx-0.5 ${i < step?"bg-blue-600":"bg-slate-200"}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                {r.status === "submitted" && (
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-blue-200 bg-blue-50 text-[12px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!isLoading && !error && filtered.length === 0 && (
          <p className="text-[12px] text-slate-500">No reports found for this filter.</p>
        )}
      </div>
    </SectionWrap>
  );
}

function TrackSection() {
  const [caseId, setCaseId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async () => {
    if (!caseId.trim()) return;
    try {
      setLoading(true);
      setError("");
      const response = await trackMyCase(caseId.trim().toUpperCase());
      setResult(response.case);
    } catch (err) {
      setError(err.message || "Failed to track case");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };
  return (
    <SectionWrap title="Track Your Case" sub="Enter a case ID to see the latest status and updates.">
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="relative">
          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="e.g. CW-2026-041"
            className="w-full pl-10 pr-4 py-3 text-[14px] border border-slate-200 bg-white rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 placeholder-slate-400 font-mono" />
        </div>
        <button onClick={handleTrack} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[14px] rounded-xl transition-colors">
          <Search className="w-4 h-4" /> {loading ? "Tracking..." : "Track Case"}
        </button>
        {error && <p className="text-[12px] text-red-500">{error}</p>}
      </div>

      {result && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[12px] text-blue-600 font-bold mb-1">{result.caseId}</p>
              <h3 className="text-[16px] font-extrabold text-slate-900">{result.child}</h3>
              <p className="text-[12px] text-slate-400">{result.district} · {formatDateDisplay(result.createdAt)}</p>
            </div>
            <Badge color={result.type==="Missing"?"blue":"red"}>{result.type}</Badge>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
            <Building2Icon />
            <div>
              <p className="text-[11px] text-blue-500 font-bold uppercase tracking-wider">Assigned to</p>
              <p className="text-[13px] font-bold text-blue-800">Childwatch response team</p>
            </div>
          </div>

          {/* Full timeline */}
          <div>
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Status Timeline</p>
            <div className="space-y-0">
              {result.updates.map((u, i) => (
                <div key={u.step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                      ${u.done ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                      {u.done ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5" />}
                    </div>
                    {i < result.updates.length-1 && <div className={`w-px flex-1 my-1 ${u.done?"bg-blue-200":"bg-slate-200"}`} />}
                  </div>
                  <div className="pb-4 pt-0.5">
                    <p className={`text-[13px] font-bold ${u.done?"text-slate-800":"text-slate-400"}`}>{u.step}</p>
                    <p className="text-[11px] text-slate-400">{u.date === "—" ? u.date : formatDateTimeDisplay(u.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SectionWrap>
  );
}

function Building2Icon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
      <Building2Svg />
    </div>
  );
}
function Building2Svg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10M9 8h.01M15 8h.01M9 14h.01M15 14h.01"/>
    </svg>
  );
}

function NotificationsSection({
  notifications,
  loading,
  error,
  onMarkAllRead,
  onMarkRead,
}) {
  const unread = notifications.filter((n) => !n.read).length;
  const TYPE_ICON = {
    update:   <RefreshCw className="w-4 h-4 text-blue-600" />,
    verified: <CheckCircle2 className="w-4 h-4 text-green-600" />,
    note:     <MessageCircle className="w-4 h-4 text-amber-600" />,
    resolved: <Star className="w-4 h-4 text-green-600" />,
  };
  const TYPE_BG = { update:"bg-blue-50", verified:"bg-green-50", note:"bg-amber-50", resolved:"bg-green-50" };
  return (
    <SectionWrap title="Notifications" sub={`${unread} unread messages`}>
      <div className="flex items-center justify-between mb-1">
        <div />
        <button onClick={onMarkAllRead}
          className="text-[12px] font-semibold text-blue-600 hover:text-blue-800">Mark all read</button>
      </div>
      {loading && <p className="text-[12px] text-slate-500">Loading notifications...</p>}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
      <div className="space-y-2">
        {notifications.map(n => (
          <div key={n.id}
            className={`flex gap-3 p-4 rounded-xl border transition-colors cursor-pointer
              ${n.read ? "bg-white border-slate-100" : "bg-blue-50/50 border-blue-100"}`}
            onClick={() => onMarkRead(n.id)}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TYPE_BG[n.type]}`}>
              {TYPE_ICON[n.type] || TYPE_ICON.update}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] leading-relaxed ${n.read?"text-slate-600":"text-slate-800 font-semibold"}`}>{n.msg}</p>
              <p className="text-[11px] text-slate-400 mt-1">{n.time}</p>
            </div>
            {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
          </div>
        ))}
        {!loading && !error && notifications.length === 0 && (
          <p className="text-[12px] text-slate-500">No notifications yet.</p>
        )}
      </div>
    </SectionWrap>
  );
}

function EmergencySection() {
  const [sent, setSent] = useState(false);
  return (
    <SectionWrap title="Emergency" sub="Use this only in urgent child protection situations">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-[18px] font-extrabold text-red-800">Emergency Alert</h3>
        <p className="text-[13px] text-red-600 leading-relaxed max-w-sm mx-auto">
          Pressing this button will immediately notify the nearest police station, social worker, and Childwatch admin team.
        </p>
        {sent ? (
          <div className="bg-green-100 border border-green-300 rounded-xl p-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-[14px] font-bold text-green-800">Alert Sent! Authorities are on the way.</p>
          </div>
        ) : (
          <button onClick={() => setSent(true)}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[16px] rounded-xl transition-colors shadow-sm active:scale-[0.98]">
            🚨 SEND EMERGENCY ALERT
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <a href="tel:+250785555000"
          className="flex flex-col items-center gap-2 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Phone className="w-6 h-6 text-green-700" />
          </div>
          <p className="text-[13px] font-bold text-slate-800">Call Hotline</p>
          <p className="text-[11px] text-slate-400">+250 785 555 000</p>
        </a>
        <button onClick={() => {}}
          className="flex flex-col items-center gap-2 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6 text-blue-700" />
          </div>
          <p className="text-[13px] font-bold text-slate-800">Quick Report</p>
          <p className="text-[11px] text-slate-400">Skip long forms</p>
        </button>
      </div>
    </SectionWrap>
  );
}

function EvidenceSection({ myReports }) {
  return (
    <SectionWrap title="Upload Evidence" sub="Add images, documents, or audio to your case">
      <div className="space-y-3">
        {myReports.map(r => (
          <div key={r.caseId} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[12px] font-mono text-blue-600 font-bold mb-0.5">{r.caseId}</p>
            <p className="text-[14px] font-bold text-slate-800 mb-3">{r.child}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon:<Image className="w-5 h-5" />, label:"Photo",    color:"bg-blue-50 text-blue-600"  },
                { icon:<File className="w-5 h-5" />,  label:"Document", color:"bg-green-50 text-green-600"},
                { icon:<Mic className="w-5 h-5" />,   label:"Audio",    color:"bg-amber-50 text-amber-600"},
              ].map(item => (
                <button key={item.label}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border border-dashed border-slate-200 hover:border-blue-300 transition-colors ${item.color}`}>
                  {item.icon}
                  <span className="text-[11px] font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {myReports.length === 0 && (
          <p className="text-[12px] text-slate-500">Create a report first to attach evidence.</p>
        )}
      </div>
    </SectionWrap>
  );
}

function AwarenessSection() {
  return (
    <SectionWrap title="Safety & Awareness" sub="Child protection tips and what to do in emergencies">
      <div className="space-y-4">
        {AWARENESS_TIPS.map(tip => (
          <div key={tip.title} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex gap-3">
              <span className="text-2xl shrink-0">{tip.icon}</span>
              <div>
                <h3 className="text-[14px] font-extrabold text-slate-800 mb-2">{tip.title}</h3>
                <p className="text-[13px] text-slate-600 leading-[1.7]">{tip.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-blue-600 rounded-2xl p-5 text-white text-center">
        <Heart className="w-8 h-8 mx-auto mb-2 text-blue-200" />
        <p className="font-extrabold text-[16px] mb-1">Every report matters</p>
        <p className="text-[13px] text-blue-100">Together we can protect every child in Rwanda.</p>
      </div>
    </SectionWrap>
  );
}

function ProfileSection({ onSignOut, profileData, isProfileLoading, profileError }) {
  const [lang, setLang] = useState("English");
  const [edit, setEdit] = useState(false);
  const [profile, setProfile] = useState({
    name: profileData.fullName,
    email: profileData.email,
    phone: profileData.phone,
    district: profileData.district,
    role: profileData.role,
  });
  const initials = profile.name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    setProfile({
      name: profileData.fullName,
      email: profileData.email,
      phone: profileData.phone,
      district: profileData.district,
      role: profileData.role,
    });
  }, [profileData]);

  const set = k => e => setProfile(p => ({...p,[k]:e.target.value}));
  return (
    <SectionWrap title="My Profile" sub="Manage your account and preferences">
      {isProfileLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-[12px] text-blue-700 font-medium">
          Loading your account details...
        </div>
      )}
      {profileError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-700 font-medium">
          {profileError}
        </div>
      )}
      {/* Avatar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-extrabold text-blue-700">{initials || "RP"}</div>
          <div>
            <p className="text-[16px] font-extrabold text-slate-900">{profile.name}</p>
            <p className="text-[12px] text-slate-400">{formatRoleLabel(profile.role)} · {profile.district}</p>
            <Badge color="green">Verified Account</Badge>
          </div>
        </div>

        {edit ? (
          <div className="space-y-4">
            {[["Full Name","name","text",User],["Email","email","email",Mail],["Phone","phone","tel",Phone]].map(([lbl,key,type,Icon]) => (
              <div key={key}>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{lbl}</label>
                <div className="relative">
                  <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type={type} value={profile[key]} onChange={set(key)}
                    className="w-full pl-10 pr-4 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 bg-white" />
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setEdit(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => setEdit(false)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-[13px] font-bold text-white">
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <>
            {[{icon:Mail,v:profile.email},{icon:Phone,v:profile.phone},{icon:MapPin,v:profile.district}].map(({icon:Icon,v}) => (
              <div key={v} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="text-[13px] text-slate-700">{v}</span>
              </div>
            ))}
            <button onClick={() => setEdit(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[13px] rounded-xl transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </>
        )}
      </div>

      {/* Language */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <Globe className="w-4 h-4 text-slate-500" />
          <p className="font-bold text-slate-800 text-[14px]">Language</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`py-2 rounded-lg text-[12px] font-semibold border transition-all
                ${lang===l?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <p className="font-bold text-slate-800 text-[14px] mb-3">Security</p>
        <button className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left">
          <Lock className="w-4 h-4 text-slate-500" />
          <span className="text-[13px] font-semibold text-slate-700">Change Password</span>
          <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
        </button>
      </div>

      <button
        onClick={onSignOut}
        className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-[13px] rounded-xl transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </SectionWrap>
  );
}

// ── Main App ─────────────────────────────────────────────────────
export default function Reporter() {
  const navigate = useNavigate();
  const [active, setActive] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileData, setProfileData] = useState(() => normalizeUserProfile(getAuthProfile()));
  const [myReports, setMyReports] = useState(() => MY_REPORTS.map(normalizeReport));
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState("");
  const displayName = profileData.fullName || "Reporter";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = formatRoleLabel(profileData.role);
  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    let activeSession = true;

    async function loadMyAccount() {
      try {
        setProfileLoading(true);
        setProfileError("");
        const response = await getMyAccount();
        if (!activeSession) return;

        if (response?.accountType !== "user" || !response?.user) {
          setProfileError("Unable to load account details for reporter profile.");
          return;
        }

        setProfileData(normalizeUserProfile(response.user));
      } catch (error) {
        if (!activeSession) return;
        setProfileError(error.message || "Could not load latest profile data. Showing local session data.");
      } finally {
        if (activeSession) {
          setProfileLoading(false);
        }
      }
    }

    loadMyAccount();

    return () => {
      activeSession = false;
    };
  }, []);

  const loadReports = async () => {
    try {
      setReportsLoading(true);
      setReportsError("");
      const response = await getMyReports();
      setMyReports((response.reports || []).map(normalizeReport));
    } catch (error) {
      setReportsError(error.message || "Could not load reports");
    } finally {
      setReportsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      setNotificationsError("");
      const response = await getMyNotifications();
      setNotifications((response.notifications || []).map(normalizeNotification));
    } catch (error) {
      setNotificationsError(error.message || "Could not load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const refreshDashboardData = async () => {
    await Promise.all([loadReports(), loadNotifications()]);
  };

  useEffect(() => {
    refreshDashboardData();
  }, []);

  const handleSignOut = () => {
    clearAuthSession();
    navigate("/login");
  };

  const handleMarkNotificationRead = async (id) => {
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
    try {
      await markNotificationRead(id);
    } catch {
      // Keep optimistic update in UI even if request fails.
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // Keep optimistic update in UI even if request fails.
    }
  };

  const SECTIONS = {
    home:          <HomeSection onNav={setActive} profileData={profileData} isProfileLoading={profileLoading} myReports={myReports} />,
    report:        <ReportSection onReportCreated={refreshDashboardData} />,
    "my-reports":  <MyReportsSection myReports={myReports} isLoading={reportsLoading} error={reportsError} />,
    track:         <TrackSection />,
    notifications: (
      <NotificationsSection
        notifications={notifications}
        loading={notificationsLoading}
        error={notificationsError}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onMarkRead={handleMarkNotificationRead}
      />
    ),
    emergency:     <EmergencySection />,
    evidence:      <EvidenceSection myReports={myReports} />,
    awareness:     <AwarenessSection />,
    profile:       (
      <ProfileSection
        onSignOut={handleSignOut}
        profileData={profileData}
        isProfileLoading={profileLoading}
        profileError={profileError}
      />
    ),
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* ── Sidebar (desktop) ── */}
      <>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 xl:w-64 bg-white border-r border-slate-100 flex flex-col
          transition-transform duration-300 lg:translate-x-0 ${sidebarOpen?"translate-x-0":"-translate-x-full"}`}>

          <div className="px-5 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-green-700 flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[14px] font-extrabold text-green-700">Childwatch</p>
                <p className="text-[10px] text-slate-400 font-medium">Reporter Portal</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button key={item.id} onClick={() => { setActive(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all relative
                    ${isActive
                      ? "bg-green-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                  {item.id==="notifications" && unreadCount>0 && (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full
                      ${isActive?"bg-white/20 text-white":"bg-red-500 text-white"}`}>
                      {unreadCount}
                    </span>
                  )}
                  {item.id==="emergency" && (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse
                      ${isActive?"bg-white/20 text-white":"bg-red-100 text-red-600"}`}>
                      SOS
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="px-4 pb-5 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-[11px] font-bold text-green-700">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-slate-800 truncate">{displayName}</p>
                <p className="text-[10px] text-slate-400">{roleLabel}</p>
              </div>
            </div>
          </div>
        </aside>
      </>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-[14px] font-extrabold text-slate-800">
              {NAV_ITEMS.find(n => n.id === active)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActive("notifications")} className="relative p-2 rounded-lg hover:bg-slate-100">
              <Bell className="w-5 h-5 text-slate-500" />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
            <button onClick={() => setActive("emergency")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold rounded-lg transition-colors">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Emergency</span>
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {SECTIONS[active]}
        </main>

        {/* ── Mobile bottom nav ── */}
        <div className="lg:hidden border-t border-slate-100 bg-white flex items-center justify-around px-2 py-2 shrink-0">
          {[
            { id:"home",         icon:Home,          label:"Home"    },
            { id:"report",       icon:Plus,           label:"Report"  },
            { id:"my-reports",   icon:FileText,       label:"Cases"   },
            { id:"track",        icon:Search,         label:"Track"   },
            { id:"notifications",icon:Bell,           label:"Alerts"  },
            { id:"profile",      icon:User,           label:"Profile" },
          ].map(item => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button key={item.id} onClick={() => setActive(item.id)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl relative">
                <Icon className={`w-5 h-5 ${isActive?"text-green-700":"text-slate-400"}`} />
                <span className={`text-[9px] font-bold ${isActive?"text-green-700":"text-slate-400"}`}>{item.label}</span>
                {item.id==="notifications" && unreadCount>0 && (
                  <span className="absolute top-0.5 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}