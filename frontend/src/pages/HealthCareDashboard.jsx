// HealthcareDashboard.jsx — Childwatch Healthcare Provider Panel
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession, getAuthProfile } from "../utils/authStorage";
import { getHealthCases, getHealthStats } from "../services/healthApi";
import NotificationBell from "../components/NotificationBell";
import FileUploadWidget from "../components/FileUploadWidget";
import {
  LayoutDashboard, FolderOpen, ClipboardList, Upload, AlertTriangle,
  CheckCircle2, Clock, Bell, Menu, LogOut, Send, Eye, Download,
  ArrowRightLeft, Shield, FileText, Plus, Edit2, Activity, Heart,
  Calendar, User, MapPin, Star, Zap
} from "lucide-react";

function buildStats(s = {}) {
  return [
    { label:"New Referrals",      value: String(s.emergency ?? 0), icon:Plus,          color:"amber" },
    { label:"Active Child Cases", value: String(s.active   ?? 0), icon:FolderOpen,     color:"blue"  },
    { label:"Emergency Cases",    value: String(s.emergency?? 0), icon:AlertTriangle,  color:"red"   },
    { label:"Assessments Done",   value: String(s.completed?? 0), icon:CheckCircle2,   color:"green" },
    { label:"Pending Reports",    value: String(s.active   ?? 0), icon:Clock,          color:"amber" },
    { label:"Referrals Sent",     value: String(s.total    ?? 0), icon:ArrowRightLeft,  color:"blue"  },
  ];
}

const NAV = [
  { id:"dashboard",   label:"Dashboard",           icon:LayoutDashboard },
  { id:"referrals",   label:"Medical Referrals",   icon:ArrowRightLeft   },
  { id:"assessment",  label:"Medical Assessments", icon:ClipboardList   },
  { id:"evidence",    label:"Upload Reports",      icon:Upload          },
  { id:"emergency",   label:"Emergency Cases",     icon:AlertTriangle   },
  { id:"reports",     label:"Reports",             icon:FileText        },
  { id:"alerts",      label:"Alerts",              icon:Bell            },
];

const STATUS_CONFIG = {
  emergency: { bg:"bg-red-50",   text:"text-red-700",   border:"border-red-200",   dot:"bg-red-500"   },
  active:    { bg:"bg-blue-50",  text:"text-blue-700",  border:"border-blue-200",  dot:"bg-blue-500"  },
  pending:   { bg:"bg-amber-50", text:"text-amber-700", border:"border-amber-200", dot:"bg-amber-500" },
  completed: { bg:"bg-green-50", text:"text-green-700", border:"border-green-200", dot:"bg-green-500" },
};

const COND_COLOR = { Critical:"text-red-600", Stable:"text-blue-600", Fair:"text-amber-600", Recovered:"text-green-600" };

function StatCard({ label, value, icon:Icon, color }) {
  const C = { blue:"bg-blue-50 text-blue-600 ring-blue-100", green:"bg-green-50 text-green-600 ring-green-100", amber:"bg-amber-50 text-amber-600 ring-amber-100", red:"bg-red-50 text-red-500 ring-red-100" }[color];
  const [bg, ic, ring] = C.split(" ");
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${bg} ring-4 ${ring} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${ic}`}/></div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-[12px] font-semibold text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${c.bg} ${c.text} ${c.border}`}><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>{status}</span>;
}

function Btn({ children, variant="primary", size="sm", onClick, className="" }) {
  const V = { primary:"bg-green-700 hover:bg-green-800 text-white shadow-sm", blue:"bg-blue-600 hover:bg-blue-700 text-white shadow-sm", outline:"border border-slate-200 bg-white hover:bg-slate-50 text-slate-700", danger:"bg-red-50 hover:bg-red-100 text-red-600 border border-red-200", ghost:"text-slate-500 hover:bg-slate-100" }[variant];
  const S = { sm:"px-3 py-1.5 text-[12px]", md:"px-4 py-2.5 text-[13px]" }[size];
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 font-semibold rounded-xl transition-all active:scale-[0.97] ${V} ${S} ${className}`}>{children}</button>;
}

function SectionTitle({ title, sub }) {
  return <div className="mb-5"><h2 className="text-[17px] font-extrabold text-slate-900">{title}</h2>{sub && <p className="text-[12px] text-slate-500 mt-0.5">{sub}</p>}</div>;
}

function DashboardView({ onNav, cases, stats, loading }) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-blue-600 rounded-2xl px-6 py-5 text-white">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-blue-500 rounded-full opacity-50 pointer-events-none"/>
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-green-500 rounded-full opacity-15 pointer-events-none"/>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-blue-200 mb-1">Welcome</p>
            <h2 className="text-[20px] font-extrabold">Dr. Jean Habimana</h2>
            <p className="text-[13px] text-blue-200 mt-0.5">CHUK University Hospital · Kicukiro</p>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>onNav("referrals")} className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 font-bold text-[13px] rounded-xl hover:bg-blue-50">
              <ArrowRightLeft className="w-4 h-4"/>Referrals
            </button>
            <button onClick={()=>onNav("emergency")} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[13px] rounded-xl">
              <AlertTriangle className="w-4 h-4"/>Emergency
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {loading ? <p className="text-[12px] text-slate-400 col-span-6">Loading…</p> : stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="font-extrabold text-slate-800">Recent Cases</p>
            <button onClick={()=>onNav("referrals")} className="text-[12px] font-semibold text-blue-600">View all →</button>
          </div>
          <div className="space-y-2">
            {cases.map(c=>(
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_CONFIG[c.status]?.dot||"bg-slate-400"}`}/>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 truncate">{c.child}</p>
                  <p className="text-[11px] text-slate-400">{c.id} · Condition: <span className={`font-semibold ${COND_COLOR[c.condition]}`}>{c.condition}</span></p>
                </div>
                <StatusBadge status={c.status}/>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="font-extrabold text-slate-800 mb-4">Recent Hospital Actions</p>
          <div className="space-y-3">
            {[
              { action:"Medical assessment completed", case:"CW-2026-019", time:"2h ago" },
              { action:"Injury documentation uploaded",case:"CW-2026-004", time:"4h ago" },
              { action:"Emergency referral sent",       case:"CW-2026-011", time:"6h ago" },
              { action:"Treatment report filed",        case:"CW-2026-007", time:"1d ago" },
            ].map((a,i)=>(
              <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                <Activity className="w-4 h-4 text-blue-500 mt-0.5 shrink-0"/>
                <div>
                  <p className="text-[12px] font-semibold text-slate-800">{a.action}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{a.case} · {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReferralsView({ cases }) {
  return (
    <div className="space-y-5">
      <SectionTitle title="Medical Referrals" sub="Abuse and neglect cases referred for medical assessment"/>
      {cases.map(c=>(
        <div key={c.id} className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 ${c.status==="emergency"?"border-red-200":"border-slate-100"}`}>
          {c.status==="emergency" && <div className="flex items-center gap-2 text-red-600 text-[12px] font-bold"><AlertTriangle className="w-4 h-4"/>Emergency case — immediate attention required</div>}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] text-blue-600 font-bold">{c.id}</p>
              <h3 className="text-[15px] font-extrabold text-slate-900">{c.child} <span className="text-slate-400 font-normal text-[13px]">· age {c.age}</span></h3>
              <p className="text-[12px] text-slate-400">{c.district} · Referred by: <span className="font-semibold text-slate-600">{c.referred}</span></p>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <StatusBadge status={c.status}/>
              <span className={`text-[11px] font-bold ${COND_COLOR[c.condition]}`}>{c.condition}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary"><ClipboardList className="w-3.5 h-3.5"/>Assessment</Btn>
            <Btn variant="outline"><Upload className="w-3.5 h-3.5"/>Upload Report</Btn>
            <Btn variant="blue"><ArrowRightLeft className="w-3.5 h-3.5"/>Refer Emergency</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssessmentView({ cases }) {
  return (
    <div className="space-y-5">
      <SectionTitle title="Medical Assessments" sub="Record and submit child medical evaluations"/>
      {cases.filter(c=>c.status!=="completed").map(c=>(
        <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] text-blue-600 font-bold">{c.id}</p>
              <p className="text-[14px] font-extrabold text-slate-800">{c.child}</p>
            </div>
            <StatusBadge status={c.status}/>
          </div>
          {[["Injury Description","Describe observed injuries and their severity"],
            ["Medical Findings","Record diagnosis and medical conclusions"],
            ["Treatment Provided","List treatments administered"],
            ["Protection Recommendations","Recommendations for child safety"]].map(([lbl,ph])=>(
            <div key={lbl}>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{lbl}</label>
              <textarea rows={2} placeholder={ph} className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-none bg-white"/>
            </div>
          ))}
          <div className="flex gap-2">
            <Btn variant="primary" size="md"><Send className="w-4 h-4"/>Submit Assessment</Btn>
            <Btn variant="outline" size="md"><Upload className="w-4 h-4"/>Attach Evidence</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

function EvidenceView({ cases }) {
  return (
    <div className="space-y-5">
      <SectionTitle title="Upload Medical Reports" sub="Attach treatment reports and injury documentation"/>
      {cases.map(c=>(
        <div key={c.caseId || c.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] text-blue-600 font-bold">{c.caseId || c.id}</p>
              <p className="text-[14px] font-extrabold text-slate-800">{c.child}</p>
            </div>
            <StatusBadge status={c.status}/>
          </div>
          <FileUploadWidget caseId={c.caseId || c.id} accentColor="blue" />
        </div>
      ))}
      {cases.length === 0 && <p className="text-[12px] text-slate-400">No cases to upload reports for yet.</p>}
    </div>
  );
}

function EmergencyView() {
  const [sent, setSent] = useState(false);
  const emergencyCase = CASES.find(c=>c.status==="emergency");
  return (
    <div className="space-y-5">
      <SectionTitle title="Emergency Cases" sub="Immediate response required"/>
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-red-700 font-bold"><AlertTriangle className="w-5 h-5"/><p className="text-[15px]">EMERGENCY — Active Case</p></div>
        {emergencyCase && (
          <>
            <div>
              <p className="font-mono text-[11px] text-red-500 font-bold">{emergencyCase.id}</p>
              <p className="text-[16px] font-extrabold text-red-900">{emergencyCase.child}</p>
              <p className="text-[13px] text-red-700">Age {emergencyCase.age} · {emergencyCase.district} · Condition: <span className="font-bold">{emergencyCase.condition}</span></p>
            </div>
            {sent ? (
              <div className="bg-green-100 border border-green-300 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1"/>
                <p className="text-[14px] font-bold text-green-800">Emergency referral sent. Response team notified.</p>
              </div>
            ) : (
              <button onClick={()=>setSent(true)} className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[14px] rounded-xl transition-colors">
                🚨 SEND EMERGENCY REFERRAL
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Reports & Export"/>
      <div className="grid sm:grid-cols-2 gap-4">
        {[{t:"Medical Assessment Report",s:"Full clinical assessment document",i:ClipboardList},
          {t:"Injury Documentation",s:"Photo and clinical injury records",i:Upload},
          {t:"Treatment Summary",s:"Treatments and outcomes",i:Activity},
          {t:"Monthly Hospital Report",s:"All cases handled this month",i:Calendar}].map(r=>(
          <div key={r.t} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3"><r.i className="w-5 h-5 text-blue-600"/></div>
            <h3 className="text-[14px] font-bold text-slate-800 mb-1">{r.t}</h3>
            <p className="text-[12px] text-slate-500 mb-4">{r.s}</p>
            <div className="flex gap-2">
              <Btn variant="outline" className="flex-1 justify-center"><Download className="w-3.5 h-3.5"/>PDF</Btn>
              <Btn variant="outline" className="flex-1 justify-center"><Download className="w-3.5 h-3.5"/>CSV</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HealthcareDashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(buildStats({}));
  const [loading, setLoading] = useState(true);
  const profile = getAuthProfile();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [casesData, statsData] = await Promise.all([getHealthCases(), getHealthStats()]);
        setCases(casesData.cases || []);
        setStats(buildStats(statsData.stats || {}));
      } catch (err) {
        console.error("Health data load failed:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => { clearAuthSession(); navigate("/login"); };

  const SECTIONS = {
    dashboard:  <DashboardView onNav={setActive} cases={cases} stats={stats} loading={loading}/>,
    referrals:  <ReferralsView cases={cases}/>,
    assessment: <AssessmentView cases={cases}/>,
    evidence:   <EvidenceView cases={cases}/>,
    emergency:  <EmergencyView/>,
    reports:    <ReportsView/>,
    alerts:     <div className="text-slate-500 p-4">No new alerts.</div>,
  };
  const cur = NAV.find(n=>n.id===active);
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={()=>setSidebarOpen(false)}/>}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 xl:w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen?"translate-x-0":"-translate-x-full"}`}>
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm"><Heart className="w-5 h-5 text-white"/></div>
            <div><p className="text-[14px] font-extrabold text-blue-700">Childwatch</p><p className="text-[10px] text-slate-400 font-medium">Healthcare Portal</p></div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {NAV.map(item=>{const Icon=item.icon; const isA=active===item.id; return <button key={item.id} onClick={()=>{setActive(item.id);setSidebarOpen(false);}} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${isA?"bg-blue-600 text-white shadow-sm":"text-slate-600 hover:bg-slate-50"}`}><Icon className="w-4 h-4 shrink-0"/>{item.label}</button>;})}
        </nav>
        <div className="px-4 pb-5 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><span className="text-[11px] font-extrabold text-blue-700">JH</span></div>
            <div className="flex-1 min-w-0"><p className="text-[12px] font-bold text-slate-800 truncate">Dr. Jean Habimana</p><p className="text-[10px] text-slate-400">Healthcare Provider</p></div>
            <button className="text-slate-400 hover:text-slate-700" onClick={handleLogout}><LogOut className="w-4 h-4"/></button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={()=>setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100"><Menu className="w-5 h-5 text-slate-600"/></button>
            <h1 className="text-[14px] font-extrabold text-slate-800">{cur?.label}</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell accentColor="blue" />
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><span className="text-[11px] font-bold text-blue-700">{profile?.fullName?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "HC"}</span></div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{SECTIONS[active]}</main>
        <div className="lg:hidden border-t border-slate-100 bg-white flex items-center justify-around px-1 py-2 shrink-0">
          {[{id:"dashboard",icon:LayoutDashboard,label:"Home"},{id:"referrals",icon:ArrowRightLeft,label:"Referrals"},{id:"assessment",icon:ClipboardList,label:"Assess"},{id:"emergency",icon:AlertTriangle,label:"Emergency"},{id:"reports",icon:FileText,label:"Reports"}].map(item=>{const Icon=item.icon;const isA=active===item.id;return <button key={item.id} onClick={()=>setActive(item.id)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl"><Icon className={`w-5 h-5 ${isA?"text-blue-600":"text-slate-400"}`}/><span className={`text-[9px] font-bold ${isA?"text-blue-600":"text-slate-400"}`}>{item.label}</span></button>;})}</div>
      </div>
    </div>
  );
}