// SocialWorkerDashboard.jsx — Childwatch Social Worker Panel
import { useState } from "react";
import {
  LayoutDashboard, FolderOpen, ClipboardList, Heart, Calendar,
  ArrowRightLeft, Bell, Users, AlertTriangle, CheckCircle2,
  Clock, MapPin, Menu, LogOut, Plus, Edit2, Eye, Send,
  Shield, Flag, FileText, Download, Star, Home, User,
  MessageSquare, RefreshCw, Search, BookOpen
} from "lucide-react";

const STATS = [
  { label:"Assigned Cases",    value:"18", icon:FolderOpen,   color:"blue"  },
  { label:"High-Risk Children",value:"5",  icon:AlertTriangle,color:"red"   },
  { label:"Visits Due Today",  value:"3",  icon:Calendar,     color:"amber" },
  { label:"Active Abuse Cases",value:"8",  icon:Shield,       color:"red"   },
  { label:"Referrals Made",    value:"12", icon:ArrowRightLeft,color:"blue" },
  { label:"Cases Resolved",    value:"4",  icon:CheckCircle2, color:"green" },
];

const CASES = [
  { id:"CW-2026-007", child:"Keza Brian",    age:11, type:"Abuse",   risk:"high",   status:"active",     district:"Kicukiro",  nextVisit:"2026-04-23" },
  { id:"CW-2026-014", child:"Ingabire Diana",age:7,  type:"Neglect", risk:"medium", status:"monitoring", district:"Gasabo",    nextVisit:"2026-04-25" },
  { id:"CW-2026-018", child:"Nzeyimana Sam", age:14, type:"Abuse",   risk:"high",   status:"active",     district:"Nyarugenge",nextVisit:"2026-04-24" },
  { id:"CW-2026-022", child:"Umuhoza Grace", age:9,  type:"Neglect", risk:"low",    status:"monitoring", district:"Gasabo",    nextVisit:"2026-04-28" },
];

const RISK_CONFIG = {
  high:   { bg:"bg-red-50",   text:"text-red-700",   border:"border-red-200",   dot:"bg-red-500"   },
  medium: { bg:"bg-amber-50", text:"text-amber-700", border:"border-amber-200", dot:"bg-amber-500" },
  low:    { bg:"bg-green-50", text:"text-green-700", border:"border-green-200", dot:"bg-green-500" },
};

const NAV = [
  { id:"dashboard",  label:"Dashboard",          icon:LayoutDashboard },
  { id:"cases",      label:"Assigned Cases",     icon:FolderOpen      },
  { id:"visits",     label:"Home Visits",        icon:Home            },
  { id:"assessment", label:"Assessments",        icon:ClipboardList   },
  { id:"referrals",  label:"Referrals",          icon:ArrowRightLeft   },
  { id:"follow-up",  label:"Follow-up Schedule", icon:Calendar        },
  { id:"reports",    label:"Reports",            icon:FileText        },
  { id:"alerts",     label:"Alerts",             icon:Bell            },
];

function StatCard({ label, value, icon:Icon, color }) {
  const C = { blue:"bg-blue-50 text-blue-600 ring-blue-100", green:"bg-green-50 text-green-600 ring-green-100", amber:"bg-amber-50 text-amber-600 ring-amber-100", red:"bg-red-50 text-red-500 ring-red-100" }[color];
  const [bg, ic, ring] = C.split(" ");
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${bg} ring-4 ${ring} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${ic}`} />
      </div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-[12px] font-semibold text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function RiskBadge({ risk }) {
  const c = RISK_CONFIG[risk];
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${c.bg} ${c.text} ${c.border}`}><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>{risk} risk</span>;
}

function Btn({ children, variant="primary", size="sm", onClick, className="" }) {
  const V = { primary:"bg-green-700 hover:bg-green-800 text-white shadow-sm", blue:"bg-blue-600 hover:bg-blue-700 text-white shadow-sm", outline:"border border-slate-200 bg-white hover:bg-slate-50 text-slate-700", danger:"bg-red-50 hover:bg-red-100 text-red-600 border border-red-200", ghost:"text-slate-500 hover:bg-slate-100" }[variant];
  const S = { sm:"px-3 py-1.5 text-[12px]", md:"px-4 py-2.5 text-[13px]" }[size];
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 font-semibold rounded-xl transition-all active:scale-[0.97] ${V} ${S} ${className}`}>{children}</button>;
}

function SectionTitle({ title, sub }) {
  return <div className="mb-5"><h2 className="text-[17px] font-extrabold text-slate-900">{title}</h2>{sub && <p className="text-[12px] text-slate-500 mt-0.5">{sub}</p>}</div>;
}

function CaseCard({ c, showActions=true }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="font-mono text-[11px] text-green-700 font-bold">{c.id}</span>
          <h3 className="text-[15px] font-extrabold text-slate-900 mt-0.5">{c.child} <span className="text-slate-400 font-normal text-[13px]">· age {c.age}</span></h3>
          <p className="text-[12px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/>{c.district}</p>
        </div>
        <div className="flex flex-col gap-1.5 items-end">
          <RiskBadge risk={c.risk} />
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${c.type==="Abuse"?"bg-red-50 text-red-600 border border-red-200":"bg-amber-50 text-amber-700 border border-amber-200"}`}>{c.type}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[12px] text-slate-500 mb-3">
        <Calendar className="w-3.5 h-3.5" />
        Next visit: <span className="font-semibold text-slate-700">{c.nextVisit}</span>
      </div>
      {showActions && (
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline"><Eye className="w-3.5 h-3.5"/>View</Btn>
          <Btn variant="outline"><Edit2 className="w-3.5 h-3.5"/>Update</Btn>
          <Btn variant="outline"><MessageSquare className="w-3.5 h-3.5"/>Note</Btn>
          <Btn variant="primary"><ArrowRightLeft className="w-3.5 h-3.5"/>Refer</Btn>
        </div>
      )}
    </div>
  );
}

function DashboardView({ onNav }) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-green-800 rounded-2xl px-6 py-5 text-white">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-green-700 rounded-full opacity-50 pointer-events-none"/>
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-blue-500 rounded-full opacity-10 pointer-events-none"/>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-green-200 mb-1">Welcome back</p>
            <h2 className="text-[20px] font-extrabold">Aline Mukamana</h2>
            <p className="text-[13px] text-green-200 mt-0.5">Social Worker · MINISANTE Nyarugenge</p>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>onNav("cases")} className="flex items-center gap-2 px-4 py-2.5 bg-white text-green-800 font-bold text-[13px] rounded-xl hover:bg-green-50">
              <FolderOpen className="w-4 h-4"/>My Cases
            </button>
            <button onClick={()=>onNav("visits")} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/30 text-white font-bold text-[13px] rounded-xl hover:bg-white/20">
              <Calendar className="w-4 h-4"/>Visits
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="font-extrabold text-slate-800">High-Risk Cases</p>
            <button onClick={()=>onNav("cases")} className="text-[12px] font-semibold text-green-700">View all →</button>
          </div>
          {CASES.filter(c=>c.risk==="high").map(c => <CaseCard key={c.id} c={c} />)}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <p className="font-extrabold text-slate-800 mb-4">Today's Visits</p>
            <div className="space-y-3">
              {CASES.slice(0,3).map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4 text-green-700"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-slate-800 truncate">{c.child}</p>
                    <p className="text-[10px] text-slate-400">{c.district}</p>
                  </div>
                  <RiskBadge risk={c.risk}/>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <p className="font-extrabold text-green-800 mb-1">Child Welfare Summary</p>
            <div className="space-y-2 mt-3">
              {[{l:"Children at risk",v:5,c:"text-red-600"},{l:"Stable / improving",v:13,c:"text-green-700"},{l:"Pending assessment",v:4,c:"text-amber-600"}].map(x=>(
                <div key={x.l} className="flex justify-between text-[12px]">
                  <span className="text-green-700">{x.l}</span>
                  <span className={`font-extrabold ${x.c}`}>{x.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CasesView() {
  const [filter, setFilter] = useState("All");
  const filtered = CASES.filter(c => filter==="All" || c.risk===filter);
  return (
    <div className="space-y-5">
      <SectionTitle title="Assigned Cases" sub={`${CASES.length} child welfare cases`}/>
      <div className="flex gap-2 flex-wrap">
        {["All","high","medium","low"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${filter===f?"bg-green-700 text-white border-green-700":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
            {f==="All"?"All":`${f} risk`}
          </button>
        ))}
      </div>
      <div className="space-y-3">{filtered.map(c=><CaseCard key={c.id} c={c}/>)}</div>
    </div>
  );
}

function VisitsView() {
  const [notes, setNotes] = useState({});
  return (
    <div className="space-y-5">
      <SectionTitle title="Home Visit Notes" sub="Record observations from field visits"/>
      {CASES.map(c=>(
        <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] text-green-700 font-bold">{c.id}</p>
              <p className="text-[14px] font-extrabold text-slate-800">{c.child}</p>
              <p className="text-[12px] text-slate-400">Next visit: {c.nextVisit}</p>
            </div>
            <RiskBadge risk={c.risk}/>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Visit Observations</label>
              <textarea value={notes[c.id+"_obs"]||""} onChange={e=>setNotes(p=>({...p,[c.id+"_obs"]:e.target.value}))} rows={3}
                placeholder="Describe home conditions, child wellbeing, family situation…"
                className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-green-500 resize-none bg-white"/>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Intervention Actions Taken</label>
              <textarea value={notes[c.id+"_action"]||""} onChange={e=>setNotes(p=>({...p,[c.id+"_action"]:e.target.value}))} rows={2}
                placeholder="Actions taken, services provided…"
                className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-green-500 resize-none bg-white"/>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary"><Send className="w-3.5 h-3.5"/>Save Visit Notes</Btn>
            <Btn variant="blue"><CheckCircle2 className="w-3.5 h-3.5"/>Mark Child Safe</Btn>
            <Btn variant="danger"><AlertTriangle className="w-3.5 h-3.5"/>Still At Risk</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssessmentView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Social Assessments" sub="Document formal child welfare assessments"/>
      {CASES.slice(0,3).map(c=>(
        <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] text-green-700 font-bold">{c.id}</p>
              <p className="text-[14px] font-extrabold text-slate-800">{c.child}</p>
            </div>
            <RiskBadge risk={c.risk}/>
          </div>
          {[["Physical safety assessment","Assess child's physical condition and safety"],
            ["Psychological / emotional state","Document emotional wellbeing"],
            ["Family and home environment","Describe family dynamics and home safety"],
            ["Protection recommendation","Recommended next steps for child protection"]].map(([lbl, ph])=>(
            <div key={lbl}>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{lbl}</label>
              <textarea rows={2} placeholder={ph} className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-green-500 resize-none bg-white"/>
            </div>
          ))}
          <Btn variant="primary" size="md"><Send className="w-4 h-4"/>Submit Assessment</Btn>
        </div>
      ))}
    </div>
  );
}

function ReferralsView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Case Referrals" sub="Refer cases to police, hospitals, or other agencies"/>
      {CASES.slice(0,3).map(c=>(
        <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] text-green-700 font-bold">{c.id}</p>
              <p className="text-[14px] font-extrabold text-slate-800">{c.child}</p>
            </div>
            <RiskBadge risk={c.risk}/>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {label:"Refer to Police",   color:"bg-blue-600 hover:bg-blue-700 text-white",    icon:"🚔"},
              {label:"Refer to Hospital", color:"bg-green-700 hover:bg-green-800 text-white",  icon:"🏥"},
              {label:"Escalate Case",     color:"bg-red-600 hover:bg-red-700 text-white",      icon:"⚡"},
            ].map(r=>(
              <button key={r.label} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-[13px] transition-all ${r.color}`}>
                <span>{r.icon}</span>{r.label}
              </button>
            ))}
          </div>
          <textarea rows={2} placeholder="Reason for referral…" className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-green-500 resize-none bg-white"/>
        </div>
      ))}
    </div>
  );
}

function FollowUpView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Follow-up Schedule" sub="Manage upcoming child welfare visits"/>
      <div className="space-y-3">
        {CASES.map((c,i)=>(
          <div key={c.id} className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex flex-col items-center justify-center shrink-0">
              <p className="text-[14px] font-extrabold text-green-700">{c.nextVisit.split("-")[2]}</p>
              <p className="text-[9px] text-green-600 font-bold uppercase">Apr</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-slate-800">{c.child}</p>
              <p className="text-[12px] text-slate-400">{c.district} · {c.type}</p>
            </div>
            <RiskBadge risk={c.risk}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Reports & Export" sub="Generate welfare reports and case summaries"/>
      <div className="grid sm:grid-cols-2 gap-4">
        {[{t:"Case Intervention Report",s:"Full social intervention summary",i:FileText},
          {t:"Child Welfare Assessment",s:"Formal assessment document",i:ClipboardList},
          {t:"Monthly Visit Log",s:"All home visits this month",i:Calendar},
          {t:"Referral Summary",s:"All referrals and outcomes",i:ArrowRightLeft}].map(r=>(
          <div key={r.t} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
              <r.i className="w-5 h-5 text-green-700"/>
            </div>
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

export default function SocialWorkerDashboard() {
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const SECTIONS = {
    dashboard: <DashboardView onNav={setActive}/>,
    cases:     <CasesView/>,
    visits:    <VisitsView/>,
    assessment:<AssessmentView/>,
    referrals: <ReferralsView/>,
    "follow-up":<FollowUpView/>,
    reports:   <ReportsView/>,
    alerts:    <div className="text-slate-500 p-4">Alerts section — no new alerts.</div>,
  };
  const cur = NAV.find(n=>n.id===active);
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={()=>setSidebarOpen(false)}/>}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 xl:w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen?"translate-x-0":"-translate-x-full"}`}>
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-700 flex items-center justify-center shadow-sm"><Heart className="w-5 h-5 text-white"/></div>
            <div><p className="text-[14px] font-extrabold text-green-700">Childwatch</p><p className="text-[10px] text-slate-400 font-medium">Social Worker</p></div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {NAV.map(item=>{
            const Icon=item.icon; const isA=active===item.id;
            return <button key={item.id} onClick={()=>{setActive(item.id);setSidebarOpen(false);}}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${isA?"bg-green-700 text-white shadow-sm":"text-slate-600 hover:bg-slate-50"}`}>
              <Icon className="w-4 h-4 shrink-0"/>{item.label}
            </button>;
          })}
        </nav>
        <div className="px-4 pb-5 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0"><span className="text-[11px] font-extrabold text-green-700">AM</span></div>
            <div className="flex-1 min-w-0"><p className="text-[12px] font-bold text-slate-800 truncate">Aline Mukamana</p><p className="text-[10px] text-slate-400">Social Worker</p></div>
            <button className="text-slate-400 hover:text-slate-700"><LogOut className="w-4 h-4"/></button>
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
            <button className="relative p-2 rounded-lg hover:bg-slate-100"><Bell className="w-5 h-5 text-slate-500"/><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/></button>
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><span className="text-[11px] font-bold text-green-700">AM</span></div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{SECTIONS[active]}</main>
        <div className="lg:hidden border-t border-slate-100 bg-white flex items-center justify-around px-1 py-2 shrink-0">
          {[{id:"dashboard",icon:LayoutDashboard,label:"Home"},{id:"cases",icon:FolderOpen,label:"Cases"},{id:"visits",icon:Home,label:"Visits"},{id:"referrals",icon:ArrowRightLeft,label:"Refer"},{id:"alerts",icon:Bell,label:"Alerts"}].map(item=>{
            const Icon=item.icon; const isA=active===item.id;
            return <button key={item.id} onClick={()=>setActive(item.id)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl">
              <Icon className={`w-5 h-5 ${isA?"text-green-700":"text-slate-400"}`}/><span className={`text-[9px] font-bold ${isA?"text-green-700":"text-slate-400"}`}>{item.label}</span>
            </button>;
          })}
        </div>
      </div>
    </div>
  );
}