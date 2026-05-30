// AdminDashboard.jsx — Childwatch Admin Panel
// Stack: React + Tailwind CSS + lucide-react
// No external chart lib needed — uses inline SVG bar/line charts

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Building2, FolderOpen, Bell, BarChart3,
  Paperclip, Search, FileDown, Settings, ScrollText, Shield,
  ChevronDown, ChevronRight, Menu, X, Plus, Edit2, Trash2,
  Eye, Download, Lock, Power, RefreshCw, Filter, ArrowUpDown,
  AlertTriangle, CheckCircle2, Clock, XCircle, MapPin, User,
  Phone, Mail, Calendar, TrendingUp, Activity, Zap, Flag,
  MoreVertical, LogOut, ArrowRight, ChevronUp, Info, Star,
  Hash, Database
} from "lucide-react";
import { clearAuthSession } from "../utils/authStorage";
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUserById,
  getManagedUsers,
  setManagedUserActive,
  updateManagedUser,
} from "../services/adminUsersApi";
import { getAdminReports, updateAdminReportStatus } from "../services/adminReportsApi";
import { assignCase, updateCasePriority } from "../services/caseApi";

// ── Mock data ────────────────────────────────────────────────────
const STATS = [
  { label: "Total Reports",     value: "1,284", icon: FolderOpen,    delta: "+12%", color: "blue"  },
  { label: "Missing Children",  value: "342",   icon: AlertTriangle, delta: "+5%",  color: "amber" },
  { label: "Abuse Cases",       value: "189",   icon: Flag,          delta: "-3%",  color: "red"   },
  { label: "Resolved Cases",    value: "753",   icon: CheckCircle2,  delta: "+18%", color: "green" },
  { label: "Active Users",      value: "428",   icon: Users,         delta: "+7%",  color: "blue"  },
  { label: "Institutions",      value: "36",    icon: Building2,     delta: "+2",   color: "green" },
];

const MONTHLY = [42,58,61,74,68,83,91,78,95,102,88,114];
const DISTRICTS = [
  { name:"Gasabo",   cases:134 },
  { name:"Kicukiro", cases:98  },
  { name:"Nyarugenge",cases:87 },
  { name:"Bugesera", cases:54  },
  { name:"Rubavu",   cases:47  },
  { name:"Musanze",  cases:39  },
];

const CASES = [
  { id:"CW-2026-001", type:"Missing",  child:"Mutoni Aline",   district:"Gasabo",    status:"urgent",      date:"2026-04-20", assigned:"Police"        },
  { id:"CW-2026-002", type:"Abuse",    child:"Keza Brian",     district:"Kicukiro",  status:"under-review",date:"2026-04-19", assigned:"Social Worker" },
  { id:"CW-2026-003", type:"Missing",  child:"Irakoze Ivan",   district:"Musanze",   status:"resolved",    date:"2026-04-18", assigned:"Police"        },
  { id:"CW-2026-004", type:"Abuse",    child:"Uwase Clarisse", district:"Nyarugenge",status:"high",        date:"2026-04-18", assigned:"Hospital"      },
  { id:"CW-2026-005", type:"Missing",  child:"Nshimiye Marc",  district:"Rubavu",    status:"medium",      date:"2026-04-17", assigned:"—"             },
  { id:"CW-2026-006", type:"Abuse",    child:"Ingabire Diana", district:"Bugesera",  status:"resolved",    date:"2026-04-16", assigned:"Social Worker" },
];

const INSTITUTIONS = [
  { id:1, name:"RPS Gasabo Station",       type:"Police",         district:"Gasabo",    users:12, cases:54, status:"active" },
  { id:2, name:"CHUK University Hospital", type:"Hospital",       district:"Kicukiro",  users:8,  cases:31, status:"active" },
  { id:3, name:"MINISANTE Nyarugenge",     type:"Social Services",district:"Nyarugenge",users:6,  cases:28, status:"active" },
  { id:4, name:"RPS Rubavu Station",       type:"Police",         district:"Rubavu",    users:9,  cases:19, status:"inactive"},
];

const AUDIT_LOGS = [
  { id:1, user:"Admin",            action:"Deleted report",   target:"CW-2025-099", time:"10m ago", type:"delete"  },
  { id:2, user:"Inès Uwimana",     action:"Updated case",     target:"CW-2026-001", time:"25m ago", type:"update"  },
  { id:3, user:"Admin",            action:"Created user",     target:"Eric Habimana",time:"1h ago", type:"create"  },
  { id:4, user:"Grace Nyiraneza",  action:"Assigned case",    target:"CW-2026-005", time:"2h ago",  type:"assign"  },
  { id:5, user:"Admin",            action:"Deactivated user", target:"Pierre N.",   time:"3h ago",  type:"delete"  },
  { id:6, user:"Aline Mukamana",   action:"Logged in",        target:"—",           time:"3h ago",  type:"login"   },
];

const ROLE_COLORS = {
  "Police":          "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Hospital":        "bg-green-50 text-green-700 border-green-200",
  "Social Worker":   "bg-teal-50 text-teal-700 border-teal-200",
  "Parent/Reporter": "bg-[var(--simba-bg-main)] text-slate-600 border-slate-200",
};

const STATUS_COLORS = {
  urgent:        "bg-red-50 text-red-700 border-red-200",
  high:          "bg-orange-50 text-orange-700 border-orange-200",
  medium:        "bg-yellow-50 text-yellow-700 border-yellow-200",
  "under-review":"bg-yellow-50 text-yellow-700 border-yellow-200",
  resolved:      "bg-green-50 text-green-700 border-green-200",
  submitted: "bg-slate-100 text-slate-700 border-slate-200",
  verified: "bg-yellow-50 text-yellow-700 border-yellow-200",
  "under-investigation": "bg-amber-50 text-amber-700 border-amber-200",
};

const NAV_ITEMS = [
  { id:"dashboard",    label:"Dashboard",        icon:LayoutDashboard },
  { id:"users",        label:"User Management",  icon:Users           },
  { id:"institutions", label:"Institutions",     icon:Building2       },
  { id:"cases",        label:"Case Management",  icon:FolderOpen      },
  { id:"alerts",       label:"Alerts & Emergency",icon:Bell           },
  { id:"analytics",    label:"Analytics",        icon:BarChart3       },
  { id:"evidence",     label:"Evidence",         icon:Paperclip       },
  { id:"search",       label:"Advanced Search",  icon:Search          },
  { id:"reports",      label:"Reports & Export", icon:FileDown        },
  { id:"settings",     label:"Settings",         icon:Settings        },
  { id:"audit",        label:"Audit Logs",       icon:ScrollText      },
];

// ── Reusable components ──────────────────────────────────────────

function Badge({ children, color = "blue" }) {
  const map = {
    blue:   "bg-yellow-50 text-yellow-700 border border-yellow-200",
    green:  "bg-green-50 text-green-700 border border-green-200",
    red:    "bg-red-50 text-red-700 border border-red-200",
    amber:  "bg-amber-50 text-amber-700 border border-amber-200",
    slate:  "bg-[var(--simba-bg-main)] text-slate-600 border border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${map[color]}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, delta, color }) {
  const up = delta?.startsWith("+");
  const colors = {
    blue:  { bg:"bg-yellow-50",  icon:"text-yellow-600",  ring:"ring-yellow-100"  },
    green: { bg:"bg-green-50", icon:"text-green-600", ring:"ring-green-100" },
    amber: { bg:"bg-amber-50", icon:"text-amber-600", ring:"ring-amber-100" },
    red:   { bg:"bg-red-50",   icon:"text-red-500",   ring:"ring-red-100"   },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl ${c.bg} ring-4 ${c.ring} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <span className={`text-[12px] font-semibold ${up ? "text-green-600" : "text-red-500"}`}>{delta}</span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-900">{value}</p>
        <p className="text-[12px] text-slate-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h2 className="text-[16px] font-extrabold text-slate-800">{title}</h2>
        {sub && <p className="text-[12px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Btn({ children, variant = "primary", size = "sm", onClick, className = "" }) {
  const base = "inline-flex items-center gap-1.5 font-semibold rounded-lg transition-all active:scale-[0.97]";
  const sizes = { sm: "px-3 py-1.5 text-[12px]", md: "px-4 py-2 text-[13px]" };
  const variants = {
    primary:  "bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm",
    green:    "bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm",
    outline:  "border border-slate-200 bg-white hover:bg-[var(--simba-bg-main)] text-slate-700",
    danger:   "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200",
    ghost:    "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
  };
  return (
    <button onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function TableWrap({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-[13px]">{children}</table>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[var(--simba-bg-main)] whitespace-nowrap">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 text-slate-700 border-t border-slate-100 ${className}`}>{children}</td>;
}

// ── Mini bar chart ───────────────────────────────────────────────
function BarChart({ data, color = "#F4B400" }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{ height: `${(v / max) * 72}px`, background: color, opacity: i === data.length - 1 ? 1 : 0.55 }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Mini donut chart ─────────────────────────────────────────────
function DonutChart({ segments }) {
  // segments: [{value, color, label}]
  const total = segments.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  const r = 40, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0">
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * circ;
          const gap = circ - dash;
          const el = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ}
              strokeLinecap="butt"
            />
          );
          offset += frac;
          return el;
        })}
        <text x="50" y="54" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1F2937">{total}</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[12px] text-slate-600">{s.label}</span>
            <span className="text-[12px] font-bold text-slate-800 ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SECTIONS ──────────────────────────────────────────────────────

function DashboardSection() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Monthly trend */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[14px] font-extrabold text-slate-800">Monthly Case Trends</p>
              <p className="text-[12px] text-slate-400">Jan – Dec 2026</p>
            </div>
            <Badge color="green">↑ 23% vs last year</Badge>
          </div>
          <BarChart data={MONTHLY} />
          <div className="flex justify-between mt-2">
            {["J","F","M","A","M","J","J","A","S","O","N","D"].map(m => (
              <span key={m} className="text-[10px] text-slate-400 flex-1 text-center">{m}</span>
            ))}
          </div>
        </div>

        {/* Case breakdown */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[14px] font-extrabold text-slate-800 mb-4">Case Breakdown</p>
          <DonutChart segments={[
            { value:342, color:"#F4B400", label:"Missing"       },
            { value:189, color:"#D71920", label:"Abuse"         },
            { value:753, color:"#16A34A", label:"Resolved"      },
          ]}/>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Cases by district */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[14px] font-extrabold text-slate-800 mb-4">Cases by District</p>
          <div className="space-y-3">
            {DISTRICTS.map(d => (
              <div key={d.name}>
                <div className="flex justify-between text-[12px] font-medium text-slate-600 mb-1">
                  <span>{d.name}</span><span className="font-bold text-slate-800">{d.cases}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-2 rounded-full bg-yellow-500" style={{ width:`${(d.cases/134)*100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent cases */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <SectionHeader title="Recent Cases" action={<Btn variant="outline">View all</Btn>} />
          <div className="space-y-2">
            {CASES.slice(0,4).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--simba-bg-main)] transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${c.status==="resolved"?"bg-green-500":c.status==="urgent"?"bg-red-500":"bg-yellow-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{c.child}</p>
                  <p className="text-[11px] text-slate-400">{c.id} · {c.district}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${STATUS_COLORS[c.status]||STATUS_COLORS.medium}`}>
                  {c.status.replace("-"," ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersSection() {
  const EMPTY_FORM = {
    fullName: "",
    email: "",
    phone: "",
    role: "Police",
    district: "Gasabo",
    password: "",
  };

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [formError, setFormError] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getManagedUsers();
      setUsers(data.users || []);
    } catch (error) {
      setFormError(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (roleFilter === "All" || u.role === roleFilter) &&
      (u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  });

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedUserId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  };

  const openViewOrEdit = async (id, mode) => {
    try {
      setFormError("");
      const data = await getManagedUserById(id);
      setModalMode(mode);
      setSelectedUserId(id);
      setForm({
        fullName: data.user.fullName || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
        role: data.user.role || "Police",
        district: data.user.district || "Gasabo",
        password: "",
      });
      setShowModal(true);
    } catch (error) {
      setFormError(error.message || "Failed to fetch user");
    }
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.role || !form.district) {
      setFormError("Full name, email, role and district are required");
      return;
    }

    if (modalMode === "create" && !form.password) {
      setFormError("Password is required for new users");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      if (modalMode === "create") {
        await createManagedUser({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: form.role,
          district: form.district,
          password: form.password,
        });
      } else if (modalMode === "edit" && selectedUserId) {
        await updateManagedUser(selectedUserId, {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: form.role,
          district: form.district,
          password: form.password || undefined,
        });
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
      await loadUsers();
    } catch (error) {
      setFormError(error.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this user permanently?");
    if (!confirmDelete) return;

    try {
      await deleteManagedUser(id);
      await loadUsers();
    } catch (error) {
      setFormError(error.message || "Failed to delete user");
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await setManagedUserActive(user.id, user.status !== "active");
      await loadUsers();
    } catch (error) {
      setFormError(error.message || "Failed to update user status");
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="User Management"
        sub={`${users.length} users registered`}
        action={<Btn onClick={openCreateModal}><Plus className="w-3.5 h-3.5" /> Add User</Btn>}
      />

      {formError && (
        <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {formError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none bg-white focus:border-blue-400">
          {["All","Police","Hospital","Social Worker","Parent/Reporter"].map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <TableWrap>
        <thead>
          <tr><Th>User</Th><Th>Role</Th><Th>District</Th><Th>Status</Th><Th>Created</Th><Th>Actions</Th></tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td className="px-4 py-3 text-slate-700 border-t border-slate-100 text-center" colSpan={6}>Loading users...</td>
            </tr>
          )}
          {!loading && filtered.length === 0 && (
            <tr>
              <td className="px-4 py-3 text-slate-700 border-t border-slate-100 text-center" colSpan={6}>No users found</td>
            </tr>
          )}
          {filtered.map(u => (
            <tr key={u.id} className="hover:bg-[var(--simba-bg-main)] transition-colors">
              <Td>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-yellow-700 font-bold text-[12px]">
                    {u.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-[13px]">{u.fullName}</p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </div>
                </div>
              </Td>
              <Td><span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${ROLE_COLORS[u.role]||""}`}>{u.role}</span></Td>
              <Td><span className="text-[12px]">{u.district}</span></Td>
              <Td>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${u.status==="active"?"bg-green-50 text-green-700 border-green-200":"bg-[var(--simba-bg-main)] text-slate-500 border-slate-200"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${u.status==="active"?"bg-green-500":"bg-slate-400"}`} />
                  {u.status}
                </span>
              </Td>
              <Td><span className="text-[12px] text-slate-400">{formatDate(u.createdAt)}</span></Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Btn variant="ghost" onClick={() => openViewOrEdit(u.id, "view")}><Eye className="w-3.5 h-3.5" /></Btn>
                  <Btn variant="ghost" onClick={() => openViewOrEdit(u.id, "edit")}><Edit2 className="w-3.5 h-3.5" /></Btn>
                  <Btn variant="ghost" onClick={() => handleToggleActive(u)}><Power className="w-3.5 h-3.5" /></Btn>
                  <Btn variant="danger" onClick={() => handleDelete(u.id)}><Trash2 className="w-3.5 h-3.5" /></Btn>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-extrabold text-slate-800">
                {modalMode === "create" ? "Add New User" : modalMode === "edit" ? "Edit User" : "View User"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              {[["Full Name","fullName","text"],["Email","email","email"],["Phone","phone","text"]].map(([lbl,key,type]) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{lbl}</label>
                  <input
                    type={type}
                    value={form[key]}
                    disabled={modalMode === "view"}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                </div>
              ))}
              {[["Role","role",["Police","Hospital","Social Worker","Parent/Reporter"]],
                ["District","district",["Gasabo","Kicukiro","Nyarugenge","Rubavu","Musanze","Bugesera"]]].map(([lbl,key,opts]) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{lbl}</label>
                  <select
                    value={form[key]}
                    disabled={modalMode === "view"}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 bg-white">
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              {modalMode !== "view" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Password {modalMode === "edit" ? "(optional)" : ""}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={modalMode === "edit" ? "Leave blank to keep old password" : "Set login password"}
                    className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Btn variant="outline" size="md" onClick={() => setShowModal(false)} className="flex-1 justify-center">Cancel</Btn>
              {modalMode !== "view" && (
                <Btn variant="primary" size="md" onClick={handleSubmit} className="flex-1 justify-center">
                  {submitting ? "Saving..." : modalMode === "create" ? "Create User" : "Save Changes"}
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InstitutionsSection() {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Institution Management"
        sub="Manage partner police, hospitals, and social services"
        action={<Btn><Plus className="w-3.5 h-3.5" /> Register Institution</Btn>}
      />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {INSTITUTIONS.map(inst => (
          <div key={inst.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                ${inst.type==="Police"?"bg-yellow-50 text-yellow-600":inst.type==="Hospital"?"bg-green-50 text-green-600":"bg-teal-50 text-teal-600"}`}>
                <Building2 className="w-5 h-5" />
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${inst.status==="active"?"bg-green-50 text-green-700 border-green-200":"bg-[var(--simba-bg-main)] text-slate-500 border-slate-200"}`}>
                {inst.status}
              </span>
            </div>
            <h3 className="text-[13px] font-bold text-slate-800 mb-1 leading-tight">{inst.name}</h3>
            <p className="text-[11px] text-slate-400 mb-3">{inst.type} · {inst.district}</p>
            <div className="flex gap-4 text-center mb-4">
              <div><p className="text-[16px] font-extrabold text-yellow-600">{inst.users}</p><p className="text-[10px] text-slate-400">Users</p></div>
              <div><p className="text-[16px] font-extrabold text-green-600">{inst.cases}</p><p className="text-[10px] text-slate-400">Cases</p></div>
            </div>
            <div className="flex gap-2">
              <Btn variant="outline" className="flex-1 justify-center text-[11px]"><Edit2 className="w-3 h-3" /> Edit</Btn>
              <Btn variant="ghost" className="flex-1 justify-center text-[11px]"><Eye className="w-3 h-3" /> View</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CasesSection() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAdminReports({ status: statusFilter, q: search.trim() });
      setReports(data.reports || []);
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    getManagedUsers().then(d => setUsers(d.users || [])).catch(() => {});
  }, [statusFilter, search]);

  const handleStatusUpdate = async (reportId, status) => {
    try {
      setUpdatingId(reportId);
      await updateAdminReportStatus(reportId, status);
      setReports((items) => items.map((item) => (item.id === reportId ? { ...item, status } : item)));
    } catch (updateError) {
      setError(updateError.message || "Failed to update case status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePriorityUpdate = async (caseId, priority) => {
    try {
      await updateCasePriority(caseId, priority);
      setReports(items => items.map(item => item.caseId === caseId ? { ...item, priority } : item));
    } catch (err) {
      setError(err.message || "Failed to update priority");
    }
  };

  const handleAssign = async (caseId, userId) => {
    if (!userId) return;
    try {
      await assignCase(caseId, parseInt(userId, 10));
      const user = users.find(u => String(u.id) === String(userId));
      setReports(items => items.map(item => item.caseId === caseId ? { ...item, assignedTo: user?.fullName || "Assigned" } : item));
    } catch (err) {
      setError(err.message || "Failed to assign case");
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Case Management — Global View" sub={`${reports.length} total cases`} />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by child name or case ID…"
            className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 bg-white" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none bg-white">
          {["All","submitted","verified","under-investigation","resolved"].map(s=><option key={s}>{s}</option>)}
        </select>
        <Btn variant="outline" onClick={loadReports}><RefreshCw className="w-3.5 h-3.5" /> Refresh</Btn>
      </div>
      {error && (
        <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </div>
      )}
      <TableWrap>
        <thead><tr><Th>Case ID</Th><Th>Type</Th><Th>Child</Th><Th>District</Th><Th>Status</Th><Th>Priority</Th><Th>Assigned To</Th><Th>Date</Th><Th>Actions</Th></tr></thead>
        <tbody>
          {loading && (
            <tr>
              <td className="px-4 py-3 text-slate-700 border-t border-slate-100 text-center" colSpan={9}>
                Loading reports...
              </td>
            </tr>
          )}
          {!loading && reports.length === 0 && (
            <tr>
              <td className="px-4 py-3 text-slate-700 border-t border-slate-100 text-center" colSpan={9}>
                No reports found
              </td>
            </tr>
          )}
          {!loading && reports.map((c) => (
            <tr key={c.id} className="hover:bg-[var(--simba-bg-main)] transition-colors">
              <Td><span className="font-mono text-[12px] text-yellow-600 font-bold">{c.caseId}</span></Td>
              <Td><Badge color={c.type==="Missing"?"blue":"red"}>{c.type}</Badge></Td>
              <Td><span className="font-semibold">{c.child}</span></Td>
              <Td>{c.district}</Td>
              <Td>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${STATUS_COLORS[c.status]||STATUS_COLORS.submitted}`}>
                  {c.status}
                </span>
              </Td>
              <Td>
                <select value={c.priority || "medium"}
                  onChange={e => handlePriorityUpdate(c.caseId, e.target.value)}
                  className="px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white">
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </Td>
              <Td>
                <select defaultValue=""
                  onChange={e => handleAssign(c.caseId, e.target.value)}
                  className="px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white max-w-[130px]">
                  <option value="">{c.assignedTo || "— Assign —"}</option>
                  {users.filter(u => u.role !== "Parent/Reporter").map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </Td>
              <Td><span className="text-[12px] text-slate-400">{formatDate(c.createdAt)}</span></Td>
              <Td>
                <div className="flex items-center gap-2">
                  <select
                    className="px-2 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white"
                    value={c.status}
                    disabled={updatingId === c.id}
                    onChange={(e) => handleStatusUpdate(c.id, e.target.value)}
                  >
                    {["submitted","verified","under-investigation","resolved"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  {updatingId === c.id && <span className="text-[11px] text-slate-400">Saving...</span>}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}

function AlertsSection() {
  const [alertType, setAlertType] = useState("Police");
  const [msg, setMsg] = useState("");
  return (
    <div className="space-y-5">
      <SectionHeader title="Alert & Emergency System" sub="Trigger and broadcast alerts to response teams" />
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Compose */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-red-600" />
            </div>
            <p className="font-extrabold text-slate-800">Broadcast Alert</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Send to</label>
              <div className="flex flex-wrap gap-2">
                {["Police","Hospitals","Social Workers","All Users"].map(t => (
                  <button key={t} onClick={() => setAlertType(t)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all
                      ${alertType===t?"bg-yellow-500 text-white border-yellow-600":"bg-white text-slate-600 border-slate-200 hover:bg-[var(--simba-bg-main)]"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message</label>
              <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={4} placeholder="Type your alert message…"
                className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-none bg-white" />
            </div>
            <Btn variant="primary" size="md" className="w-full justify-center"><Zap className="w-4 h-4" /> Send Emergency Alert</Btn>
          </div>
        </div>
        {/* History */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="font-extrabold text-slate-800 mb-4">Alert History</p>
          <div className="space-y-3">
            {[
              { to:"Police",         msg:"Missing child reported in Gasabo",      time:"2h ago",  status:"delivered" },
              { to:"All Users",      msg:"Awareness: Child safety week",          time:"1d ago",  status:"delivered" },
              { to:"Hospitals",      msg:"Emergency case CW-2026-004 incoming",   time:"2d ago",  status:"delivered" },
              { to:"Social Workers", msg:"New abuse case assigned in Nyarugenge", time:"3d ago",  status:"delivered" },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-[var(--simba-bg-main)] rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
                  <Bell className="w-3.5 h-3.5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-800">→ {a.to}</p>
                  <p className="text-[12px] text-slate-500 truncate">{a.msg}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400">{a.time}</p>
                  <Badge color="green">{a.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsSection() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Analytics & Reports" sub="System-wide performance overview" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Avg Response Time", value:"1.4h",  icon:Clock,    color:"blue" },
          { label:"Resolution Rate",   value:"58.6%", icon:TrendingUp,color:"green"},
          { label:"Reports This Month",value:"114",   icon:Activity,  color:"blue" },
          { label:"Active Cases",      value:"531",   icon:Flag,      color:"amber"},
        ].map(s=><StatCard key={s.label} {...s} delta="" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="font-extrabold text-slate-800 mb-4">Response Time Analysis</p>
          <BarChart data={[1.2,1.8,1.4,2.1,1.6,1.3,1.9,1.5,1.4,1.1,1.7,1.4]} color="#F4B400" />
          <div className="flex justify-between mt-2">
            {["J","F","M","A","M","J","J","A","S","O","N","D"].map(m=>(
              <span key={m} className="text-[10px] text-slate-400 flex-1 text-center">{m}</span>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="font-extrabold text-slate-800 mb-4">Type Distribution</p>
          <DonutChart segments={[
            {value:342,color:"#F4B400",label:"Missing Children"},
            {value:189,color:"#D71920",label:"Abuse Cases"},
            {value:98, color:"#16A34A",label:"Neglect"},
            {value:45, color:"#F59E0B",label:"Trafficking"},
          ]}/>
        </div>
      </div>
    </div>
  );
}

function EvidenceSection() {
  const files = [
    { id:1, case:"CW-2026-001", name:"photo_child.jpg",   size:"2.1 MB", type:"image", uploaded:"2h ago",  status:"verified"   },
    { id:2, case:"CW-2026-002", name:"medical_report.pdf",size:"1.3 MB", type:"doc",   uploaded:"5h ago",  status:"pending"    },
    { id:3, case:"CW-2026-003", name:"cctv_footage.mp4",  size:"48 MB",  type:"video", uploaded:"1d ago",  status:"verified"   },
    { id:4, case:"CW-2026-004", name:"witness_photo.jpg", size:"3.7 MB", type:"image", uploaded:"2d ago",  status:"flagged"    },
  ];
  return (
    <div className="space-y-5">
      <SectionHeader title="Evidence Management" sub="Uploaded files and documents" />
      <TableWrap>
        <thead><tr><Th>Case ID</Th><Th>File</Th><Th>Size</Th><Th>Uploaded</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
        <tbody>
          {files.map(f => (
            <tr key={f.id} className="hover:bg-[var(--simba-bg-main)]">
              <Td><span className="font-mono text-[12px] text-yellow-600 font-bold">{f.case}</span></Td>
              <Td><span className="text-[13px] font-medium">{f.name}</span></Td>
              <Td>{f.size}</Td>
              <Td><span className="text-slate-400 text-[12px]">{f.uploaded}</span></Td>
              <Td>
                <Badge color={f.status==="verified"?"green":f.status==="flagged"?"red":"amber"}>
                  {f.status}
                </Badge>
              </Td>
              <Td>
                <div className="flex gap-1">
                  <Btn variant="ghost"><Eye className="w-3.5 h-3.5" /></Btn>
                  <Btn variant="ghost"><Download className="w-3.5 h-3.5" /></Btn>
                  <Btn variant="danger"><Trash2 className="w-3.5 h-3.5" /></Btn>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}

function SearchSection() {
  const [q, setQ] = useState("");
  const [by, setBy] = useState("Child Name");
  return (
    <div className="space-y-5">
      <SectionHeader title="Advanced Search" sub="Search across all cases, users, and reports" />
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select value={by} onChange={e=>setBy(e.target.value)}
            className="px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none bg-white shrink-0">
            {["Child Name","Case ID","Location","Reporter","District"].map(b=><option key={b}>{b}</option>)}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder={`Search by ${by.toLowerCase()}…`}
              className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-blue-400 bg-white" />
          </div>
          <Btn variant="primary" size="md"><Search className="w-4 h-4" /> Search</Btn>
        </div>
        {!q && (
          <div className="text-center py-12 text-slate-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-[13px]">Enter a search term above to find cases, users, or reports</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExportsSection() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Reports & Export" sub="Generate and download system reports" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title:"Monthly Report",   sub:"Full case summary for current month", icon:Calendar },
          { title:"District Report",  sub:"Cases grouped by district",           icon:MapPin   },
          { title:"Case Summary",     sub:"Detailed case-by-case breakdown",     icon:FolderOpen},
          { title:"User Activity",    sub:"Login and action logs per user",      icon:Users    },
          { title:"Response Analysis",sub:"Response times and performance",      icon:Activity },
          { title:"Custom Export",    sub:"Select date range and filters",       icon:Filter   },
        ].map(r => (
          <div key={r.title} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center mb-3">
              <r.icon className="w-5 h-5 text-yellow-600" />
            </div>
            <h3 className="text-[14px] font-bold text-slate-800 mb-1">{r.title}</h3>
            <p className="text-[12px] text-slate-500 mb-4">{r.sub}</p>
            <div className="flex gap-2">
              <Btn variant="outline" className="flex-1 justify-center"><FileDown className="w-3.5 h-3.5" /> PDF</Btn>
              <Btn variant="outline" className="flex-1 justify-center"><FileDown className="w-3.5 h-3.5" /> CSV</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="space-y-5">
      <SectionHeader title="System Settings" sub="Configure platform behavior and categories" />
      <div className="grid lg:grid-cols-2 gap-5">
        {[
          { title:"Abuse Categories", items:["Physical Abuse","Sexual Abuse","Emotional Abuse","Neglect","Trafficking","Exploitation"] },
          { title:"Case Statuses",    items:["Submitted","Verified","Under Investigation","Escalated","Resolved","Closed","Archived"] },
          { title:"Notification Channels", items:["In-App Notifications","Email Alerts","SMS Alerts","Push Notifications","Broadcast Alerts"] },
          { title:"System Behavior",  items:["Auto-assign cases by district","Escalation after 24h","Mandatory evidence review","Two-factor authentication"] },
        ].map(sec => (
          <div key={sec.title} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-extrabold text-slate-800">{sec.title}</p>
              <Btn variant="outline"><Edit2 className="w-3 h-3" /> Edit</Btn>
            </div>
            <div className="space-y-2">
              {sec.items.map(item => (
                <div key={item} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--simba-bg-main)]">
                  <span className="text-[13px] text-slate-700">{item}</span>
                  <div className="w-8 h-4 rounded-full bg-yellow-500 relative">
                    <div className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditSection() {
  const TYPE_COLORS = {
    delete:"bg-red-50 text-red-600",create:"bg-green-50 text-green-600",
    update:"bg-yellow-50 text-yellow-600",assign:"bg-teal-50 text-teal-600",login:"bg-[var(--simba-bg-main)] text-slate-600"
  };
  return (
    <div className="space-y-5">
      <SectionHeader title="Audit Logs" sub="Full trail of all system actions" />
      <TableWrap>
        <thead><tr><Th>#</Th><Th>User</Th><Th>Action</Th><Th>Target</Th><Th>Time</Th><Th>Type</Th></tr></thead>
        <tbody>
          {AUDIT_LOGS.map(l => (
            <tr key={l.id} className="hover:bg-[var(--simba-bg-main)]">
              <Td><span className="font-mono text-[11px] text-slate-400">#{l.id}</span></Td>
              <Td><span className="font-semibold text-[13px]">{l.user}</span></Td>
              <Td>{l.action}</Td>
              <Td><span className="font-mono text-[12px] text-yellow-600">{l.target}</span></Td>
              <Td><span className="text-[12px] text-slate-400">{l.time}</span></Td>
              <Td><span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${TYPE_COLORS[l.type]}`}>{l.type}</span></Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  const SECTIONS = {
    dashboard: <DashboardSection />,
    users:     <UsersSection />,
    institutions:<InstitutionsSection />,
    cases:     <CasesSection />,
    alerts:    <AlertsSection />,
    analytics: <AnalyticsSection />,
    evidence:  <EvidenceSection />,
    search:    <SearchSection />,
    reports:   <ExportsSection />,
    settings:  <SettingsSection />,
    audit:     <AuditSection />,
  };

  const currentNav = NAV_ITEMS.find(n => n.id === active);

  return (
    <div className="flex h-screen bg-[var(--simba-bg-main)] overflow-hidden font-sans">

      {/* ── Sidebar ── */}
      <>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 xl:w-64 bg-white border-r border-slate-100 flex flex-col
          transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>

          {/* Logo */}
          <div className="px-5 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-yellow-500 flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[14px] font-extrabold text-yellow-700">Childwatch</p>
                <p className="text-[10px] text-slate-400 font-medium">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button key={item.id} onClick={() => { setActive(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all
                    ${isActive
                      ? "bg-yellow-500 text-white shadow-sm"
                      : "text-slate-600 hover:bg-[var(--simba-bg-main)] hover:text-slate-900"}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Admin badge */}
          <div className="px-4 pb-5 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--simba-bg-main)]">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-[11px] font-bold text-yellow-700">AD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-slate-800 truncate">Admin User</p>
                <p className="text-[10px] text-slate-400">Super Admin</p>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </aside>
      </>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-[14px] font-extrabold text-slate-800">{currentNav?.label}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-slate-100">
              <Bell className="w-5 h-5 text-slate-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button onClick={handleLogout} className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors" title="Logout">
              <span className="text-[11px] font-bold text-yellow-700">AD</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {SECTIONS[active]}
        </main>
      </div>
    </div>
  );
}

