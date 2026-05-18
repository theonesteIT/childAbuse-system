// Register.jsx
// Dependencies: React, Tailwind CSS, lucide-react
// Shared helpers: ./AuthShared  (BrandPanel, MobileTopBar, Field, Spinner)

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User, Mail, Phone, Lock, Eye, EyeOff,
  Users, Shield, CheckCircle2, AlertCircle, ChevronLeft, ArrowRight,
} from "lucide-react";
import { BrandPanel, MobileTopBar, Field, Spinner } from "./Authshared";
import { registerUser } from "../services/authApi";

/* ── Role options ── */
const ROLES = [
  { value: "parent",    label: "Parent / Guardian"       },
  { value: "community", label: "Community Member"        },
  { value: "police",    label: "Police / Response Team"  },
  { value: "social",    label: "Social Worker"           },
  { value: "hospital",  label: "Hospital / Medical"      },
];

/* ── Password strength scorer ── */
function scorePassword(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8)           s++;
  if (/[A-Z]/.test(p))         s++;
  if (/[0-9]/.test(p))         s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = [
  "",
  "bg-red-400",
  "bg-yellow-400",
  "bg-blue-500",
  "bg-green-500",
];
const STRENGTH_TEXT = [
  "",
  "text-red-500",
  "text-yellow-600",
  "text-blue-600",
  "text-green-600",
];

/* ── Step indicator ── */
function StepBar({ step }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      {[1, 2].map((s, idx) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-300
              ${step === s
                ? "bg-green-700 text-white shadow-sm ring-2 ring-green-200"
                : step > s
                  ? "bg-green-500 text-white"
                  : "bg-slate-200 text-slate-500"}`}
          >
            {step > s
              ? <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : s}
          </div>
          <span className={`text-[12px] font-semibold transition-colors
            ${step === s ? "text-green-700" : step > s ? "text-green-500" : "text-slate-400"}`}>
            {s === 1 ? "Your info" : "Security"}
          </span>
          {idx < 1 && (
            <div className={`w-10 h-px transition-colors ${step > 1 ? "bg-green-400" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Main component ── */
export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: "",
    email:    "",
    phone:    "",
    role:     "",
    password: "",
    confirm:  "",
  });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors,      setErrors]      = useState({});
  const [agreed,      setAgreed]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [serverError, setServerError] = useState("");

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const strength = scorePassword(form.password);

  /* ── Step 1 validation ── */
  const validateStep1 = () => {
    const e = {};
    if (!form.fullName.trim())             e.fullName = "Full name is required";
    if (!form.email)                       e.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.phone)                       e.phone    = "Phone number is required";
    else if (!/^\+?[\d\s\-()]{7,}$/.test(form.phone)) e.phone = "Enter a valid phone number";
    if (!form.role)                        e.role     = "Please select your role";
    return e;
  };

  /* ── Step 2 validation ── */
  const validateStep2 = () => {
    const e = {};
    if (!form.password)              e.password = "Password is required";
    else if (form.password.length < 8) e.password = "At least 8 characters required";
    if (!form.confirm)               e.confirm  = "Please confirm your password";
    else if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    if (!agreed)                     e.agreed   = "You must agree to continue";
    return e;
  };

  const handleNext = () => {
    const errs = validateStep1();
    setErrors(errs);
    if (!Object.keys(errs).length) setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validateStep2();
    setErrors(errs);
    setServerError("");
    if (Object.keys(errs).length) return;

    try {
      setLoading(true);
      await registerUser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role || "parent",
        district: "Kigali",
        password: form.password,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 800);
    } catch (error) {
      setServerError(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">

      {/* ── Mobile top bar ── */}
      <MobileTopBar
        isLogin={false}
        href="/login"
        linkText="Have an account?"
        linkLabel="Sign in →"
      />

      {/* ── Left brand panel (desktop only) ── */}
      <div className="lg:w-[46%] xl:w-[42%] shrink-0">
        <BrandPanel mode="register" />
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-10 py-12 lg:py-8">
        <div className="w-full max-w-[420px]">

          {/* ── Page heading ── */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-green-700 mb-3">
              <span className="block w-4 h-px bg-green-500" />
              Create account
            </span>
            <h1 className="text-[28px] sm:text-[32px] font-extrabold text-slate-900 leading-tight">
              Join Childwatch
            </h1>
            <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
              Start protecting children in your community today.
            </p>
          </div>

          {/* ── Success ── */}
          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-7 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-[17px] font-extrabold text-green-800 mb-2">Account created!</h3>
              <p className="text-[13px] text-green-600 leading-relaxed mb-6">
                Welcome to Childwatch,{" "}
                <span className="font-semibold">{form.fullName.split(" ")[0]}</span>!
                Your account is ready. Redirecting you to login...
              </p>
              <Link
                to="/login"
                className="block w-full py-3 bg-green-700 hover:bg-green-800 text-white font-bold text-[14px]
                  rounded-xl transition-colors text-center"
              >
                Sign in now →
              </Link>
            </div>

          ) : (
            <>
              {/* ── Step indicator ── */}
              <StepBar step={step} />

              {/* ══ STEP 1 ══ */}
              {step === 1 && (
                <div className="space-y-4">
                  <Field
                    label="Full name"
                    placeholder="e.g. Amara Nkosi"
                    icon={User}
                    value={form.fullName}
                    onChange={set("fullName")}
                    error={errors.fullName}
                  />
                  <Field
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    icon={Mail}
                    value={form.email}
                    onChange={set("email")}
                    error={errors.email}
                  />
                  <Field
                    label="Phone number"
                    type="tel"
                    placeholder="+250 7XX XXX XXX"
                    icon={Phone}
                    value={form.phone}
                    onChange={set("phone")}
                    error={errors.phone}
                  />

                  {/* Role select */}
                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-slate-500 tracking-widest uppercase">
                      Your role
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Users className="w-4 h-4" />
                      </div>
                      <select
                        value={form.role}
                        onChange={set("role")}
                        className={`w-full pl-10 pr-9 py-3 text-[14px] rounded-xl border outline-none
                          appearance-none cursor-pointer transition-all
                          ${errors.role
                            ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                            : "border-slate-200 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-50"}
                          ${!form.role ? "text-slate-400" : "text-slate-800"}`}
                      >
                        <option value="" disabled>Select your role</option>
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {errors.role && (
                      <p className="flex items-center gap-1.5 text-[12px] text-red-500 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.role}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full flex items-center justify-center gap-2 py-3.5 mt-1 bg-green-700
                      hover:bg-green-800 text-white font-bold text-[14px] rounded-xl shadow-sm
                      transition-all active:scale-[0.98]"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ══ STEP 2 ══ */}
              {step === 2 && (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">

                  {/* Back link */}
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-400
                      hover:text-green-700 transition-colors mb-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back to your info
                  </button>

                  {/* Password */}
                  <Field
                    label="Password"
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    icon={Lock}
                    value={form.password}
                    onChange={set("password")}
                    error={errors.password}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={showPass ? "Hide password" : "Show password"}
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />

                  {/* Strength meter */}
                  {form.password && (
                    <div className="space-y-1.5 -mt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300
                              ${i <= strength ? STRENGTH_COLOR[strength] : "bg-slate-200"}`}
                          />
                        ))}
                      </div>
                      <p className={`text-[11px] font-semibold ${STRENGTH_TEXT[strength]}`}>
                        {STRENGTH_LABEL[strength]} password
                        {strength < 3 && (
                          <span className="text-slate-400 font-normal ml-1">
                            — add uppercase, numbers or symbols
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Confirm password */}
                  <Field
                    label="Confirm password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    icon={Lock}
                    value={form.confirm}
                    onChange={set("confirm")}
                    error={errors.confirm}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />

                  {/* Terms checkbox */}
                  <div className="pt-0.5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setAgreed(!agreed)}
                        className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0
                          transition-all ${agreed ? "bg-green-700 border-green-700" : "border-slate-300 bg-white"}`}
                        aria-pressed={agreed}
                      >
                        {agreed && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                      <span className="text-[12px] text-slate-600 leading-[1.65]">
                        I agree to the{" "}
                        <a href="/terms" className="font-semibold text-green-700 hover:underline">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="font-semibold text-green-700 hover:underline">
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                    {errors.agreed && (
                      <p className="flex items-center gap-1.5 text-[12px] text-red-500 font-medium mt-1.5 ml-6">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.agreed}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-700
                      hover:bg-green-800 disabled:opacity-60 text-white font-bold text-[14px]
                      rounded-xl shadow-sm transition-all active:scale-[0.98]"
                  >
                    {loading
                      ? <Spinner />
                      : <><Shield className="w-4 h-4" /><span>Create account</span></>
                    }
                  </button>
                </form>
              )}

              {serverError && (
                <p className="text-[12px] text-red-500 font-medium">{serverError}</p>
              )}

              {/* ── Switch to Login ── */}
              <p className="text-center text-[13px] text-slate-500 mt-8">
                Already have an account?{" "}
                <Link to="/login" className="font-bold text-green-700 hover:text-green-900 transition-colors">
                  Sign in →
                </Link>
              </p>
            </>
          )}

          {/* ── Footer note ── */}
          {!success && (
            <p className="text-center text-[11px] text-slate-400 mt-5 leading-relaxed">
              Your data is encrypted and protected under Rwanda&rsquo;s data privacy regulations.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}