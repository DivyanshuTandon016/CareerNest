import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CirclePlus,
  ExternalLink,
  FilePenLine,
  Filter,
  LayoutDashboard,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import {
  createApplication,
  deleteApplication,
  getApplications,
  getApplicationStats,
  updateApplication,
} from "./api";
import {
  applicationStatuses,
  type Application,
  type ApplicationPayload,
  type ApplicationStats,
  type ApplicationStatus,
} from "./types";

type FormState = {
  company: string;
  role_title: string;
  location: string;
  job_url: string;
  source_site: string;
  status: ApplicationStatus;
  date_applied: string;
  deadline: string;
  notes: string;
  resume_version: string;
};

const emptyStats: ApplicationStats = {
  total_applications: 0,
  number_applied: 0,
  number_rejected: 0,
  number_interviewing: 0,
  number_offers: 0,
  applications_this_week: 0,
};

const statusStyles: Record<ApplicationStatus, string> = {
  Saved: "border-sky-200 bg-sky-50 text-sky-800",
  Applied: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Online Assessment": "border-amber-200 bg-amber-50 text-amber-900",
  Interview: "border-violet-200 bg-violet-50 text-violet-800",
  Rejected: "border-rose-200 bg-rose-50 text-rose-800",
  Offer: "border-teal-200 bg-teal-50 text-teal-900",
};

function todayForInput(): string {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

function newFormState(): FormState {
  return {
    company: "",
    role_title: "",
    location: "",
    job_url: "",
    source_site: "",
    status: "Saved",
    date_applied: todayForInput(),
    deadline: "",
    notes: "",
    resume_version: "",
  };
}

function formStateFromApplication(application: Application): FormState {
  return {
    company: application.company,
    role_title: application.role_title,
    location: application.location ?? "",
    job_url: application.job_url,
    source_site: application.source_site ?? "",
    status: application.status,
    date_applied: application.date_applied ?? "",
    deadline: application.deadline ?? "",
    notes: application.notes ?? "",
    resume_version: application.resume_version ?? "",
  };
}

function optionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sourceFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function toPayload(form: FormState): ApplicationPayload {
  return {
    company: form.company.trim(),
    role_title: form.role_title.trim(),
    location: optionalValue(form.location),
    job_url: form.job_url.trim(),
    source_site: optionalValue(form.source_site) ?? sourceFromUrl(form.job_url),
    status: form.status,
    date_applied: optionalValue(form.date_applied),
    deadline: optionalValue(form.deadline),
    notes: optionalValue(form.notes),
    resume_version: optionalValue(form.resume_version),
  };
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function StatCard({
  accent,
  label,
  value,
}: {
  accent: string;
  label: string;
  value: number;
}) {
  return (
    <section className="min-h-32 rounded-lg border border-zinc-200 bg-white p-5 shadow-panel">
      <span className={`mb-4 block h-1.5 w-14 rounded-full ${accent}`} />
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
    </section>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex max-w-full rounded-md border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function ApplicationModal({
  application,
  busy,
  onClose,
  onSubmit,
}: {
  application: Application | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: ApplicationPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    application ? formStateFromApplication(application) : newFormState(),
  );

  useEffect(() => {
    setForm(application ? formStateFromApplication(application) : newFormState());
  }, [application]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(toPayload(form));
  }

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-950/40 p-4">
      <section
        aria-modal="true"
        role="dialog"
        className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-700">Application</p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">
              {application ? "Edit application" : "Add application"}
            </h2>
          </div>
          <button
            aria-label="Close modal"
            className="grid size-10 place-items-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <form className="grid gap-5 p-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company" required>
              <input
                autoFocus
                className="input"
                onChange={(event) => updateField("company", event.target.value)}
                required
                value={form.company}
              />
            </Field>
            <Field label="Role title" required>
              <input
                className="input"
                onChange={(event) => updateField("role_title", event.target.value)}
                required
                value={form.role_title}
              />
            </Field>
            <Field label="Location">
              <input
                className="input"
                onChange={(event) => updateField("location", event.target.value)}
                value={form.location}
              />
            </Field>
            <Field label="Status">
              <select
                className="input"
                onChange={(event) =>
                  updateField("status", event.target.value as ApplicationStatus)
                }
                value={form.status}
              >
                {applicationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Job URL" required>
              <input
                className="input"
                onChange={(event) => updateField("job_url", event.target.value)}
                required
                type="url"
                value={form.job_url}
              />
            </Field>
            <Field label="Source site">
              <input
                className="input"
                onChange={(event) => updateField("source_site", event.target.value)}
                placeholder="jobs.example.com"
                value={form.source_site}
              />
            </Field>
            <Field label="Date applied">
              <input
                className="input"
                onChange={(event) => updateField("date_applied", event.target.value)}
                type="date"
                value={form.date_applied}
              />
            </Field>
            <Field label="Deadline">
              <input
                className="input"
                onChange={(event) => updateField("deadline", event.target.value)}
                type="date"
                value={form.deadline}
              />
            </Field>
            <Field label="Resume version">
              <input
                className="input"
                onChange={(event) => updateField("resume_version", event.target.value)}
                value={form.resume_version}
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              className="input min-h-28 resize-y"
              onChange={(event) => updateField("notes", event.target.value)}
              value={form.notes}
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-200 pt-5">
            <button
              className="rounded-md border border-zinc-300 px-4 py-2.5 font-semibold text-zinc-700 transition hover:bg-zinc-100"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-zinc-950 px-4 py-2.5 font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:bg-zinc-500"
              disabled={busy}
              type="submit"
            >
              {busy ? "Saving..." : "Save application"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  children,
  label,
  required,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-700">
      <span>
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function DeleteDialog({
  application,
  busy,
  onCancel,
  onConfirm,
}: {
  application: Application;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-950/40 p-4">
      <section
        aria-modal="true"
        role="dialog"
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase text-rose-700">Delete</p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-950">
          Remove {application.role_title}?
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          This removes the application for {application.company} from CareerNest.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-md border border-zinc-300 px-4 py-2.5 font-semibold text-zinc-700 transition hover:bg-zinc-100"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-rose-700 px-4 py-2.5 font-semibold text-white transition hover:bg-rose-800 disabled:cursor-wait disabled:bg-rose-400"
            disabled={busy}
            onClick={() => void onConfirm()}
            type="button"
          >
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<ApplicationStats>(emptyStats);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [modalApplication, setModalApplication] = useState<Application | null | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const [nextApplications, nextStats] = await Promise.all([
        getApplications(),
        getApplicationStats(),
      ]);
      setApplications(nextApplications);
      setStats(nextStats);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "CareerNest could not load applications.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const companyOptions = useMemo(
    () =>
      Array.from(new Set(applications.map((application) => application.company))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [applications],
  );

  const visibleApplications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          application.company,
          application.role_title,
          application.location ?? "",
          application.source_site ?? "",
          application.notes ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesStatus =
        statusFilter === "All" || application.status === statusFilter;
      const matchesCompany =
        companyFilter === "All" || application.company === companyFilter;

      return matchesSearch && matchesStatus && matchesCompany;
    });
  }, [applications, companyFilter, search, statusFilter]);

  async function saveApplication(payload: ApplicationPayload) {
    setBusy(true);
    setError(null);

    try {
      if (modalApplication) {
        await updateApplication(modalApplication.id, payload);
      } else {
        await createApplication(payload);
      }
      setModalApplication(undefined);
      await refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "CareerNest could not save the application.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeApplication() {
    if (!deleteTarget) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await deleteApplication(deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "CareerNest could not delete the application.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-zinc-900">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[250px_1fr]">
        <aside className="border-b border-zinc-200 bg-white px-5 py-5 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div className="flex items-center justify-between gap-4 lg:block">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-emerald-700 text-white shadow-panel">
                <BriefcaseBusiness size={22} />
              </span>
              <div>
                <p className="text-xl font-semibold text-zinc-950">CareerNest</p>
                <p className="text-sm text-zinc-500">Career clarity</p>
              </div>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 lg:mt-8 lg:w-full lg:justify-center"
              onClick={() => setModalApplication(null)}
              type="button"
            >
              <CirclePlus size={17} />
              Add
            </button>
          </div>
          <nav className="mt-5 flex gap-2 lg:mt-10 lg:grid" aria-label="Sidebar">
            <span className="inline-flex items-center gap-3 rounded-md bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-900">
              <LayoutDashboard size={17} />
              Dashboard
            </span>
            <span className="inline-flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-600">
              <Building2 size={17} />
              Applications
            </span>
          </nav>
          <div className="mt-10 hidden rounded-lg border border-zinc-200 bg-[#fffdf7] p-4 lg:block">
            <p className="text-sm font-semibold text-zinc-900">
              Track every application.
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Grow your career with clarity.
            </p>
          </div>
        </aside>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="flex flex-col gap-5 border-b border-zinc-200 pb-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
                Applications
              </h1>
              <p className="mt-2 text-zinc-600">
                {stats.applications_this_week} saved this week
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(260px,1fr)_170px_190px]">
              <label className="relative block">
                <span className="sr-only">Search applications</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={18}
                />
                <input
                  className="h-12 w-full rounded-md border border-zinc-300 bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search applications"
                  value={search}
                />
              </label>
              <label className="relative block">
                <span className="sr-only">Filter by status</span>
                <Filter
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={17}
                />
                <select
                  className="h-12 w-full appearance-none rounded-md border border-zinc-300 bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  onChange={(event) =>
                    setStatusFilter(event.target.value as ApplicationStatus | "All")
                  }
                  value={statusFilter}
                >
                  <option value="All">All statuses</option>
                  {applicationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="sr-only">Filter by company</span>
                <select
                  className="h-12 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  onChange={(event) => setCompanyFilter(event.target.value)}
                  value={companyFilter}
                >
                  <option value="All">All companies</option>
                  {companyOptions.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </header>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              accent="bg-emerald-600"
              label="Total Applications"
              value={stats.total_applications}
            />
            <StatCard
              accent="bg-sky-600"
              label="Applied"
              value={stats.number_applied}
            />
            <StatCard
              accent="bg-violet-600"
              label="Interviews"
              value={stats.number_interviewing}
            />
            <StatCard
              accent="bg-rose-600"
              label="Rejections"
              value={stats.number_rejected}
            />
            <StatCard accent="bg-teal-600" label="Offers" value={stats.number_offers} />
          </section>

          {error ? (
            <section className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </section>
          ) : null}

          <section className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">Application log</h2>
                <p className="text-sm text-zinc-500">
                  {visibleApplications.length} visible
                </p>
              </div>
              <button
                aria-label="Add application"
                className="grid size-11 place-items-center rounded-md border border-zinc-200 text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                onClick={() => setModalApplication(null)}
                title="Add application"
                type="button"
              >
                <CirclePlus size={20} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full table-fixed border-collapse text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                  <tr>
                    <th className="w-44 px-4 py-3">Company</th>
                    <th className="w-52 px-4 py-3">Role</th>
                    <th className="w-40 px-4 py-3">Location</th>
                    <th className="w-40 px-4 py-3">Status</th>
                    <th className="w-36 px-4 py-3">Date Applied</th>
                    <th className="w-40 px-4 py-3">Source Site</th>
                    <th className="w-24 px-4 py-3">Job URL</th>
                    <th className="w-64 px-4 py-3">Notes</th>
                    <th className="w-28 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-zinc-500" colSpan={9}>
                        Loading applications...
                      </td>
                    </tr>
                  ) : null}
                  {!loading && visibleApplications.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-zinc-500" colSpan={9}>
                        No applications match the current filters.
                      </td>
                    </tr>
                  ) : null}
                  {!loading
                    ? visibleApplications.map((application) => (
                        <tr
                          className="border-t border-zinc-100 align-top transition hover:bg-zinc-50"
                          key={application.id}
                        >
                          <td className="px-4 py-4 font-semibold text-zinc-950">
                            {application.company}
                          </td>
                          <td className="px-4 py-4 text-zinc-800">
                            {application.role_title}
                          </td>
                          <td className="px-4 py-4 text-zinc-600">
                            {application.location ?? "Not set"}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={application.status} />
                          </td>
                          <td className="px-4 py-4 text-zinc-600">
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="shrink-0 text-zinc-400" size={15} />
                              {formatDate(application.date_applied)}
                            </span>
                          </td>
                          <td className="break-words px-4 py-4 text-zinc-600">
                            {application.source_site ?? "Manual"}
                          </td>
                          <td className="px-4 py-4">
                            <a
                              aria-label={`Open ${application.role_title} job URL`}
                              className="grid size-9 place-items-center rounded-md border border-zinc-200 text-zinc-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
                              href={application.job_url}
                              rel="noreferrer"
                              target="_blank"
                              title="Open job URL"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </td>
                          <td className="px-4 py-4 leading-6 text-zinc-600">
                            <span className="line-clamp-3">
                              {application.notes ?? "No notes"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <button
                                aria-label={`Edit ${application.role_title}`}
                                className="grid size-9 place-items-center rounded-md border border-zinc-200 text-zinc-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                                onClick={() => setModalApplication(application)}
                                title="Edit"
                                type="button"
                              >
                                <FilePenLine size={16} />
                              </button>
                              <button
                                aria-label={`Delete ${application.role_title}`}
                                className="grid size-9 place-items-center rounded-md border border-zinc-200 text-zinc-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
                                onClick={() => setDeleteTarget(application)}
                                title="Delete"
                                type="button"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {modalApplication !== undefined ? (
        <ApplicationModal
          application={modalApplication}
          busy={busy}
          onClose={() => setModalApplication(undefined)}
          onSubmit={saveApplication}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteDialog
          application={deleteTarget}
          busy={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={removeApplication}
        />
      ) : null}
    </div>
  );
}
