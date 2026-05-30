import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileText, Lock, MapPin, ShieldAlert, User } from "lucide-react";
import { createPublicReport } from "../services/reporterApi";

const REPORT_TYPES = ["Missing", "Abuse"];

export default function PublicReport() {
  const [type, setType] = useState("Missing");
  const [anonymous, setAnonymous] = useState(true);
  const [form, setForm] = useState({
    childName: "",
    age: "",
    gender: "",
    location: "",
    district: "",
    description: "",
    reporterContact: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdCase, setCreatedCase] = useState(null);

  const setField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.childName.trim() || !form.location.trim() || !form.description.trim()) {
      setError("Please provide child name, location, and description.");
      return;
    }

    if (!anonymous && !form.reporterContact.trim()) {
      setError("Reporter contact is required when anonymous reporting is disabled.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await createPublicReport({
        type,
        childName: form.childName.trim(),
        age: form.age ? Number(form.age) : null,
        gender: form.gender.trim() || null,
        location: form.location.trim(),
        district: form.district.trim() || "Unknown",
        description: form.description.trim(),
        anonymous,
        reporterContact: anonymous ? null : form.reporterContact.trim(),
      });
      setCreatedCase(response.report || null);
    } catch (submitError) {
      setError(submitError.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  }

  if (createdCase) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-700" />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-slate-900">Report Submitted</h1>
          <p className="mb-5 text-sm text-slate-500">
            Keep this case ID to reference your report in follow-up communication.
          </p>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Case ID</p>
            <p className="font-mono text-2xl font-extrabold text-blue-700">{createdCase.caseId}</p>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              onClick={() => {
                setCreatedCase(null);
                setError("");
                setForm({
                  childName: "",
                  age: "",
                  gender: "",
                  location: "",
                  district: "",
                  description: "",
                  reporterContact: "",
                });
                setAnonymous(true);
                setType("Missing");
              }}
            >
              Submit Another Report
            </button>
            <Link
              to="/"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
            <ShieldAlert className="h-3.5 w-3.5" />
            Public Tip Line
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900">Submit a Child Protection Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            No account is required. You can submit fully anonymously.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-2 sm:grid-cols-2">
            {REPORT_TYPES.map((reportType) => (
              <button
                key={reportType}
                type="button"
                onClick={() => setType(reportType)}
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                  type === reportType
                    ? reportType === "Missing"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-red-600 bg-red-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {reportType === "Missing" ? "Missing Child" : "Child Abuse"}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-sm">
              <p className="font-semibold text-slate-700">Submit anonymously</p>
              <p className="text-xs text-slate-500">No personal contact information is saved.</p>
            </div>
            <button
              type="button"
              onClick={() => setAnonymous((prev) => !prev)}
              className={`relative h-5 w-10 rounded-full transition-colors ${anonymous ? "bg-blue-600" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                  anonymous ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Child Name
            <div className="relative mt-1.5">
              <User className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                value={form.childName}
                onChange={setField("childName")}
                placeholder="Child full name"
              />
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Age
              <input
                type="number"
                min="0"
                max="120"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                value={form.age}
                onChange={setField("age")}
                placeholder="Optional"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Gender
              <input
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                value={form.gender}
                onChange={setField("gender")}
                placeholder="Optional"
              />
            </label>
          </div>

          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Location
            <div className="relative mt-1.5">
              <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                value={form.location}
                onChange={setField("location")}
                placeholder="Last seen location or incident place"
              />
            </div>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            District
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              value={form.district}
              onChange={setField("district")}
              placeholder="Optional (e.g., Gasabo)"
            />
          </label>

          {!anonymous && (
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Reporter Contact
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                  value={form.reporterContact}
                  onChange={setField("reporterContact")}
                  placeholder="Phone or email for follow-up"
                />
              </div>
            </label>
          )}

          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Description
            <textarea
              rows={5}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              value={form.description}
              onChange={setField("description")}
              placeholder="Describe what happened, when, and any useful details."
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
            <div className="text-xs text-slate-500">
              Have an account?{" "}
              <Link to="/login" className="font-semibold text-blue-700 hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
