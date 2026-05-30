// InstitutionAdminDashboard.jsx — Childwatch Institution Admin Panel
import { useState } from "react";
import {
  LayoutDashboard, Users, FolderOpen, CheckCircle2, Clock,
  BarChart3, Bell, Shield, Building2, Menu, LogOut, Plus,
  Edit2, Eye, Download, Send, FileText, Activity, Settings,
  ArrowRightLeft, AlertTriangle, Calendar, Lock, Power,
  RefreshCw, Star, TrendingUp, UserCheck, Hash
} from "lucide-react";

const STATS = [
  { label:"Total Staff",          value:"12", icon:Users,        color:"blue"  },
  { label:"Cases Handled",        value:"54", icon:FolderOpen,   color:"blue"  },
  { label:"Open Cases",           value:"18", icon:Clock,        color:"amber" },
  { label:"Closed Cases",         value:"36", icon:CheckCircle2, color:"green" },
  { label:"Pending Assignments",  value:"5",  icon:ArrowRightLeft,color:"amber"},
  { label:"Monthly Cases",        value:"23", icon:BarChart3,    color:"green" },
];

const STAFF = [
  { id:1, name:"Inès Uwimana",     role:"Police Officer",  cases:14, status:"active",   lastActive:"1h ago"  },
  { id:2, name:"Grace Nyiraneza",  role:"Police Officer",  cases:11, status:"active",   lastActive:"3h ago"  },
  { id:3, name:"Patrick Habimana", role:"Investigator",    cases:9,  status:"active",   lastActive:"2h ago"  },
  { id:4, name:"Claudette Uwera",  role:"Case Officer",    cases:7,  status:"inactive", lastActive:"2d ago"  },
  { id:5, name:"Eric Ndayambaje",  role:"Police Officer",  cases:13, status:"active",   lastActive:"30m ago" },
];

const PENDING_ASSIGNMENTS = [
  { id:"CW-2026-012", child:"Nshimiye Marc",  type:"Missing",district:"Gasabo",    date:"2026-04-21" },
  { id:"CW-2026-025", child:"Uwase Diane",    type:"Abuse",  district:"Gasabo",    date:"2026-04-20" },
  { id:"CW-2026-031", child:"Mutware Alice",  type:"Missing",district:"Kicukiro",  date:"2026-04-19" },
];

const MONTHLY_DATA = [8,12,10,15,11,14,18,13,16,20,17,23];

const NAV = [
  { id:"dashboard",   label:"Dashboard",           icon:LayoutDashboard },
  { id:"staff",       label:"Staff Management",    icon:Users           },
  { id:"cases",       label:"Institution Cases",   icon:FolderOpen      },
  { id:"assign",      label:"Assign Cases",        icon:ArrowRightLeft  },
  { id:"performance", label:"Staff Performance",   icon:BarChart3       },
  { id:"activity",    label:"Activity Logs",       icon:Activity        },
  { id:"permissions", label:"Permissions",         icon:Lock            },
  { id:"reports",     label:"Reports & Export",    icon:FileText        },
  { id:"settings",    label:"Institution Settings",icon:Settings        },
];

function StatCard({ label, value, icon:Icon, color }) {
  const C = { blue:"bg-yellow-50 text-yellow-600 ring-yellow-100", green:"bg-green-50 text-green-600 ring-green-100", amber:"bg-amber-50 text-amber-600 ring-amber-100", red:"bg-red-50 text-red-500 ring-red-100" }[color];
  const [bg,ic,ring]=C.split(" ");
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${bg} ring-4 ${ring} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${ic}`}/></div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-[12px] font-semibold text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function Btn({ children, variant="primary", size="sm", onClick, className="" }) {
  const V = { primary:"bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm", green:"bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm", outline:"border border-slate-200 bg-white hover:bg-[var(--simba-bg-main)] text-slate-700", danger:"bg-red-50 hover:bg-red-100 text-red-600 border border-red-200", ghost:"text-slate-500 hover:bg-slate-100" }[variant];
  const S = { sm:"px-3 py-1.5 text-[12px]", md:"px-4 py-2.5 text-[13px]" }[size];
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 font-semibold rounded-xl transition-all active:scale-[0.97] ${V} ${S} ${className}`}>{children}</button>;
}

function SectionTitle({ title, sub, action }) {
  return <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5"><div><h2 className="text-[17px] font-extrabold text-slate-900">{title}</h2>{sub&&<p className="text-[12px] text-slate-500 mt-0.5">{sub}</p>}</div>{action}</div>;
}

function BarChart({ data }) {
  const max=Math.max(...data);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((v,i)=><div key={i} className="flex-1 rounded-t-sm" style={{height:`${(v/max)*56}px`,background:i===data.length-1?"#2563EB":"#BFDBFE"}}/>)}
    </div>
  );
}

function DashboardView({ onNav }) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-yellow-600 rounded-2xl px-6 py-5 text-white">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-yellow-500 rounded-full opacity-50 pointer-events-none"/>
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-green-500 rounded-full opacity-10 pointer-events-none"/>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-blue-200 mb-1">Institution Administrator</p>
            <h2 className="text-[20px] font-extrabold">Commander Remy Byiringiro</h2>
            <p className="text-[13px] text-blue-200 mt-0.5 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/>RPS Gasabo Police Station</p>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>onNav("staff")} className="flex items-center gap-2 px-4 py-2.5 bg-white text-yellow-700 font-bold text-[13px] rounded-xl hover:bg-yellow-50"><Users className="w-4 h-4"/>Manage Staff</button>
            <button onClick={()=>onNav("assign")} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/30 text-white font-bold text-[13px] rounded-xl hover:bg-white/20"><ArrowRightLeft className="w-4 h-4"/>Assign Cases</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {STATS.map(s=><StatCard key={s.label} {...s}/>)}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-extrabold text-slate-800">Monthly Case Summary</p>
              <span className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md">↑ 18%</span>
            </div>
            <BarChart data={MONTHLY_DATA}/>
            <div className="flex justify-between mt-2">
              {["J","F","M","A","M","J","J","A","S","O","N","D"].map(m=><span key={m} className="text-[9px] text-slate-400 flex-1 text-center">{m}</span>)}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-extrabold text-slate-800">Staff Overview</p>
              <button onClick={()=>onNav("staff")} className="text-[12px] font-semibold text-yellow-600">Manage →</button>
            </div>
            <div className="space-y-2">
              {STAFF.slice(0,4).map(s=>(
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--simba-bg-main)]">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-extrabold text-yellow-700">{s.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{s.role} · {s.cases} cases</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${s.status==="active"?"bg-green-50 text-green-700 border-green-200":"bg-[var(--simba-bg-main)] text-slate-500 border-slate-200"}`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <p className="font-extrabold text-slate-800 mb-4">Pending Assignments</p>
            <div className="space-y-3">
              {PENDING_ASSIGNMENTS.map(p=>(
                <div key={p.id} className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="font-mono text-[10px] text-amber-600 font-bold">{p.id}</p>
                  <p className="text-[12px] font-bold text-slate-800">{p.child}</p>
                  <p className="text-[11px] text-slate-500">{p.type} · {p.district}</p>
                  <button onClick={()=>onNav("assign")} className="mt-2 text-[11px] font-bold text-yellow-600 hover:text-blue-800">Assign →</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-blue-100 rounded-2xl p-4">
            <p className="font-extrabold text-blue-800 mb-3">Institution Profile</p>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between"><span className="text-yellow-600">Type</span><span className="font-bold text-blue-900">Police Station</span></div>
              <div className="flex justify-between"><span className="text-yellow-600">District</span><span className="font-bold text-blue-900">Gasabo</span></div>
              <div className="flex justify-between"><span className="text-yellow-600">Staff</span><span className="font-bold text-blue-900">12 active</span></div>
              <div className="flex justify-between"><span className="text-yellow-600">Status</span><span className="font-bold text-green-700">Operational</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffView() {
  const [showModal, setShowModal] = useState(false);
  return (
    <div className="space-y-5">
      <SectionTitle title="Staff Management" sub={`${STAFF.length} staff members`}
        action={<Btn onClick={()=>setShowModal(true)}><Plus className="w-3.5 h-3.5"/>Add Staff</Btn>}/>
      <div className="space-y-3">
        {STAFF.map(s=>(
          <div key={s.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-[13px] font-extrabold text-yellow-700">{s.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-slate-800">{s.name}</p>
              <p className="text-[12px] text-slate-400">{s.role} · {s.cases} cases · Last active: {s.lastActive}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${s.status==="active"?"bg-green-50 text-green-700 border-green-200":"bg-[var(--simba-bg-main)] text-slate-500 border-slate-200"}`}>{s.status}</span>
              <Btn variant="ghost"><Edit2 className="w-3.5 h-3.5"/></Btn>
              <Btn variant="ghost"><Power className="w-3.5 h-3.5"/></Btn>
              <Btn variant="danger"><Lock className="w-3.5 h-3.5"/></Btn>
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-extrabold text-slate-800">Add Staff Member</h3>
              <button onClick={()=>setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><RefreshCw className="w-4 h-4 text-slate-500"/></button>
            </div>
            <div className="space-y-4">
              {["Full Name","Email","Role"].map(f=>(
                <div key={f}><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{f}</label>
                <input className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 bg-white"/></div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Btn variant="outline" size="md" onClick={()=>setShowModal(false)} className="flex-1 justify-center">Cancel</Btn>
              <Btn variant="primary" size="md" onClick={()=>setShowModal(false)} className="flex-1 justify-center">Add Member</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Assign Cases Internally" sub="Assign pending cases to staff members"/>
      {PENDING_ASSIGNMENTS.map(p=>(
        <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[11px] text-yellow-600 font-bold">{p.id}</span>
              <h3 className="text-[15px] font-extrabold text-slate-900 mt-0.5">{p.child}</h3>
              <p className="text-[12px] text-slate-400">{p.type} · {p.district} · {p.date}</p>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">Unassigned</span>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assign to staff member</label>
            <select className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 bg-white">
              <option value="">Select officer…</option>
              {STAFF.filter(s=>s.status==="active").map(s=><option key={s.id}>{s.name} ({s.cases} cases)</option>)}
            </select>
          </div>
          <Btn variant="primary"><Send className="w-3.5 h-3.5"/>Assign Case</Btn>
        </div>
      ))}
    </div>
  );
}

function PerformanceView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Staff Performance" sub="Case handling metrics per staff member"/>
      <div className="space-y-3">
        {STAFF.map((s,i)=>(
          <div key={s.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-[12px] font-extrabold text-yellow-700">{s.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</span>
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-slate-800">{s.name}</p>
                <p className="text-[12px] text-slate-400">{s.role}</p>
              </div>
              <p className="text-[22px] font-extrabold text-yellow-600">{s.cases}</p>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-2 rounded-full bg-yellow-500" style={{width:`${(s.cases/14)*100}%`}}/>
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-slate-400">
              <span>{s.cases} cases handled</span>
              <span>{Math.round((s.cases/54)*100)}% of institution total</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityView() {
  const logs = [
    {u:"Inès Uwimana",    a:"Updated case status",    t:"CW-2026-001", time:"20m ago", type:"update"},
    {u:"Grace Nyiraneza", a:"Uploaded evidence",       t:"CW-2026-007", time:"1h ago",  type:"upload"},
    {u:"Commander Remy",  a:"Assigned case",           t:"CW-2026-012", time:"2h ago",  type:"assign"},
    {u:"Patrick Habimana",a:"Closed resolved case",    t:"CW-2026-003", time:"3h ago",  type:"close"},
    {u:"Eric Ndayambaje", a:"Added case note",         t:"CW-2026-015", time:"4h ago",  type:"note"},
    {u:"Commander Remy",  a:"Added new staff member",  t:"Eric N.",     time:"1d ago",  type:"create"},
  ];
  const TYPE_BG = {update:"bg-yellow-50",upload:"bg-green-50",assign:"bg-amber-50",close:"bg-green-50",note:"bg-[var(--simba-bg-main)]",create:"bg-yellow-50"};
  const TYPE_IC = {update:"text-yellow-600",upload:"text-green-600",assign:"text-amber-600",close:"text-green-600",note:"text-slate-500",create:"text-yellow-600"};
  return (
    <div className="space-y-5">
      <SectionTitle title="Activity Logs" sub="All institution actions and events"/>
      <div className="space-y-2">
        {logs.map((l,i)=>(
          <div key={i} className="flex gap-3 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TYPE_BG[l.type]}`}>
              <Activity className={`w-4 h-4 ${TYPE_IC[l.type]}`}/>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-slate-800">{l.u} — {l.a}</p>
              <p className="text-[11px] text-slate-400 font-mono">{l.t} · {l.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PermissionsView() {
  const perms = [
    {role:"Police Officer",   can:["View cases","Update status","Add notes","Upload evidence"]},
    {role:"Investigator",     can:["View cases","Update status","Add notes","Add suspect details"]},
    {role:"Case Officer",     can:["View cases","Add notes","View reports"]},
  ];
  return (
    <div className="space-y-5">
      <SectionTitle title="Permissions Management" sub="Control what each role can do"/>
      {perms.map(p=>(
        <div key={p.role} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="font-extrabold text-slate-800">{p.role}</p>
            <Btn variant="outline"><Edit2 className="w-3.5 h-3.5"/>Edit</Btn>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.can.map(c=><span key={c} className="px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-[12px] font-semibold"><CheckCircle2 className="w-3 h-3 inline mr-1"/>{c}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Reports & Export"/>
      <div className="grid sm:grid-cols-2 gap-4">
        {[{t:"Institution Case Report",s:"All cases handled by institution",i:FolderOpen},{t:"Staff Activity Report",s:"Staff login and action history",i:Users},{t:"Monthly Summary",s:"Month-by-month case breakdown",i:BarChart3},{t:"Performance Analysis",s:"Staff efficiency metrics",i:TrendingUp}].map(r=>(
          <div key={r.t} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center mb-3"><r.i className="w-5 h-5 text-yellow-600"/></div>
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

function SettingsView() {
  return (
    <div className="space-y-5">
      <SectionTitle title="Institution Settings"/>
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <p className="font-extrabold text-slate-800">Institution Profile</p>
        {[["Institution Name","RPS Gasabo Police Station"],["Type","Police Station"],["District","Gasabo"],["Contact Phone","+250 788 000 001"],["Contact Email","rps.gasabo@police.gov.rw"]].map(([lbl,val])=>(
          <div key={lbl}>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{lbl}</label>
            <input defaultValue={val} className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 bg-white"/>
          </div>
        ))}
        <Btn variant="primary" size="md"><Send className="w-4 h-4"/>Save Changes</Btn>
      </div>
    </div>
  );
}

export default function InstitutionAdminDashboard() {
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const SECTIONS = {
    dashboard:   <DashboardView onNav={setActive}/>,
    staff:       <StaffView/>,
    cases:       <div className="p-4 text-slate-500">Case list view — same as police cases filtered by institution.</div>,
    assign:      <AssignView/>,
    performance: <PerformanceView/>,
    activity:    <ActivityView/>,
    permissions: <PermissionsView/>,
    reports:     <ReportsView/>,
    settings:    <SettingsView/>,
  };
  const cur = NAV.find(n=>n.id===active);
  return (
    <div className="flex h-screen bg-[var(--simba-bg-main)] overflow-hidden font-sans">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={()=>setSidebarOpen(false)}/>}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 xl:w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen?"translate-x-0":"-translate-x-full"}`}>
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-600 flex items-center justify-center shadow-sm"><Building2 className="w-5 h-5 text-white"/></div>
            <div><p className="text-[14px] font-extrabold text-yellow-700">Childwatch</p><p className="text-[10px] text-slate-400 font-medium">Institution Admin</p></div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {NAV.map(item=>{const Icon=item.icon;const isA=active===item.id;return <button key={item.id} onClick={()=>{setActive(item.id);setSidebarOpen(false);}} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${isA?"bg-yellow-600 text-white shadow-sm":"text-slate-600 hover:bg-[var(--simba-bg-main)]"}`}><Icon className="w-4 h-4 shrink-0"/>{item.label}</button>;})}
        </nav>
        <div className="px-4 pb-5 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--simba-bg-main)]">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><span className="text-[11px] font-extrabold text-yellow-700">RB</span></div>
            <div className="flex-1 min-w-0"><p className="text-[12px] font-bold text-slate-800 truncate">Remy Byiringiro</p><p className="text-[10px] text-slate-400">Institution Admin</p></div>
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
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><span className="text-[11px] font-bold text-yellow-700">RB</span></div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{SECTIONS[active]}</main>
        <div className="lg:hidden border-t border-slate-100 bg-white flex items-center justify-around px-1 py-2 shrink-0">
          {[{id:"dashboard",icon:LayoutDashboard,label:"Home"},{id:"staff",icon:Users,label:"Staff"},{id:"assign",icon:ArrowRightLeft,label:"Assign"},{id:"performance",icon:BarChart3,label:"Stats"},{id:"settings",icon:Settings,label:"Settings"}].map(item=>{const Icon=item.icon;const isA=active===item.id;return <button key={item.id} onClick={()=>setActive(item.id)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl"><Icon className={`w-5 h-5 ${isA?"text-yellow-700":"text-slate-400"}`}/><span className={`text-[9px] font-bold ${isA?"text-yellow-700":"text-slate-400"}`}>{item.label}</span></button>;})}</div>
      </div>
    </div>
  );
}
