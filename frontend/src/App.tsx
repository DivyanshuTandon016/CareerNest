import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CirclePlus,
  Clock3,
  Crosshair,
  Eye,
  ExternalLink,
  FilePenLine,
  Github,
  History,
  Link2,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
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
import type {
  Application,
  ApplicationPayload,
  ApplicationStats,
} from "./types";
import careerNestDarkLogo from "./assets/careernest-dark-logo.svg";

type FormState = {
  company: string;
  role_title: string;
  location: string;
  job_url: string;
  source_site: string;
  date_applied: string;
  notes: string;
};

const emptyStats: ApplicationStats = {
  total_applications: 0,
  applications_this_week: 0,
  unique_companies: 0,
  source_sites: 0,
  latest_application: null,
};

const githubRepositoryUrl = "https://github.com/DivyanshuTandon016/CareerNest";

const usBounds = {
  minLat: 24,
  maxLat: 50,
  minLon: -125,
  maxLon: -66,
};

const usMapFrame = {
  x: 82,
  y: 52,
  width: 736,
  height: 440,
};

const cityCoordinates: Record<string, { lat: number; lon: number }> = {
  "atlanta, ga": { lat: 33.75, lon: -84.39 },
  "austin, tx": { lat: 30.27, lon: -97.74 },
  "boston, ma": { lat: 42.36, lon: -71.06 },
  "charlotte, nc": { lat: 35.23, lon: -80.84 },
  "chicago, il": { lat: 41.88, lon: -87.63 },
  "dallas, tx": { lat: 32.78, lon: -96.8 },
  "denver, co": { lat: 39.74, lon: -104.99 },
  "detroit, mi": { lat: 42.33, lon: -83.05 },
  "houston, tx": { lat: 29.76, lon: -95.37 },
  "las vegas, nv": { lat: 36.17, lon: -115.14 },
  "los angeles, ca": { lat: 34.05, lon: -118.24 },
  "miami, fl": { lat: 25.76, lon: -80.19 },
  "new york, ny": { lat: 40.71, lon: -74.01 },
  "phoenix, az": { lat: 33.45, lon: -112.07 },
  "portland, or": { lat: 45.52, lon: -122.68 },
  "raleigh, nc": { lat: 35.78, lon: -78.64 },
  "san diego, ca": { lat: 32.72, lon: -117.16 },
  "san francisco, ca": { lat: 37.77, lon: -122.42 },
  "seattle, wa": { lat: 47.61, lon: -122.33 },
  "tempe, az": { lat: 33.43, lon: -111.94 },
  "washington, dc": { lat: 38.9, lon: -77.04 },
};

const stateCoordinates: Record<string, { lat: number; lon: number }> = {
  AZ: { lat: 34.1, lon: -111.9 },
  CA: { lat: 36.8, lon: -119.4 },
  CO: { lat: 39.0, lon: -105.5 },
  DC: { lat: 38.9, lon: -77.04 },
  FL: { lat: 28.3, lon: -82.0 },
  GA: { lat: 32.7, lon: -83.4 },
  IL: { lat: 40.0, lon: -89.2 },
  MA: { lat: 42.2, lon: -71.8 },
  MI: { lat: 44.3, lon: -85.4 },
  NC: { lat: 35.5, lon: -79.4 },
  NV: { lat: 39.3, lon: -116.6 },
  NY: { lat: 42.9, lon: -75.5 },
  OR: { lat: 44.0, lon: -120.5 },
  TX: { lat: 31.0, lon: -99.0 },
  WA: { lat: 47.4, lon: -120.7 },
};

const usOutlinePoints = [
  [-124.7, 48.5],
  [-123.6, 48.9],
  [-124.2, 47.4],
  [-123.9, 46.2],
  [-124.0, 44.9],
  [-124.2, 43.6],
  [-124.3, 42.0],
  [-123.6, 40.8],
  [-123.0, 39.4],
  [-122.5, 38.1],
  [-122.3, 37.1],
  [-121.5, 36.0],
  [-120.5, 35.1],
  [-119.2, 34.4],
  [-117.1, 32.6],
  [-114.8, 32.7],
  [-111.0, 31.3],
  [-108.2, 31.3],
  [-106.5, 31.8],
  [-104.9, 30.6],
  [-103.2, 29.8],
  [-101.3, 29.3],
  [-99.4, 27.6],
  [-97.4, 25.9],
  [-96.1, 27.5],
  [-94.8, 29.0],
  [-93.0, 29.6],
  [-90.5, 29.1],
  [-88.8, 30.0],
  [-86.8, 30.4],
  [-84.9, 29.8],
  [-83.4, 28.8],
  [-82.8, 27.5],
  [-82.5, 26.2],
  [-81.6, 24.8],
  [-80.3, 25.2],
  [-80.0, 26.3],
  [-80.2, 28.0],
  [-80.6, 29.5],
  [-81.2, 30.7],
  [-80.5, 31.5],
  [-79.4, 33.0],
  [-78.6, 33.9],
  [-77.3, 34.7],
  [-76.0, 35.2],
  [-75.5, 36.4],
  [-75.9, 37.8],
  [-75.2, 38.6],
  [-74.8, 39.5],
  [-74.0, 40.1],
  [-73.2, 40.8],
  [-72.0, 41.2],
  [-71.0, 41.4],
  [-70.5, 42.4],
  [-70.0, 43.0],
  [-69.4, 43.8],
  [-68.2, 44.4],
  [-67.0, 45.0],
  [-69.0, 47.2],
  [-71.0, 45.3],
  [-73.3, 45.0],
  [-75.0, 44.8],
  [-76.8, 44.2],
  [-78.7, 43.7],
  [-79.2, 43.2],
  [-82.5, 42.4],
  [-83.0, 43.7],
  [-84.8, 45.6],
  [-87.0, 46.7],
  [-89.5, 47.9],
  [-92.0, 48.8],
  [-97.0, 49.0],
  [-104.0, 49.0],
  [-111.0, 49.0],
  [-117.0, 49.0],
  [-124.7, 48.5],
] as const;

function albersRaw(point: { lat: number; lon: number }): { x: number; y: number } {
  const toRadians = Math.PI / 180;
  const phi = point.lat * toRadians;
  const lambda = point.lon * toRadians;
  const phi1 = 29.5 * toRadians;
  const phi2 = 45.5 * toRadians;
  const phi0 = 23 * toRadians;
  const lambda0 = -96 * toRadians;
  const n = (Math.sin(phi1) + Math.sin(phi2)) / 2;
  const c = Math.cos(phi1) ** 2 + 2 * n * Math.sin(phi1);
  const theta = n * (lambda - lambda0);
  const rho = Math.sqrt(c - 2 * n * Math.sin(phi)) / n;
  const rho0 = Math.sqrt(c - 2 * n * Math.sin(phi0)) / n;

  return {
    x: rho * Math.sin(theta),
    y: rho0 - rho * Math.cos(theta),
  };
}

function albersBounds(points: readonly (readonly [number, number])[]) {
  const projected = points.map(([lon, lat]) => albersRaw({ lat, lon }));

  return {
    minX: Math.min(...projected.map((point) => point.x)),
    maxX: Math.max(...projected.map((point) => point.x)),
    minY: Math.min(...projected.map((point) => point.y)),
    maxY: Math.max(...projected.map((point) => point.y)),
  };
}

const usProjectedBounds = albersBounds(usOutlinePoints);

const stateBoundaryLines = [
  [
    [-120, 49],
    [-120, 34.6],
  ],
  [
    [-114, 49],
    [-114, 32.7],
  ],
  [
    [-109, 49],
    [-109, 31.4],
  ],
  [
    [-102, 49],
    [-102, 29.5],
  ],
  [
    [-95, 49],
    [-95, 29.3],
  ],
  [
    [-88, 47],
    [-88, 30],
  ],
  [
    [-81, 43],
    [-81, 31],
  ],
  [
    [-124, 42],
    [-67, 42],
  ],
  [
    [-124, 37],
    [-75, 37],
  ],
  [
    [-114, 32],
    [-80, 32],
  ],
] as const;

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
    date_applied: todayForInput(),
    notes: "",
  };
}

function formStateFromApplication(application: Application): FormState {
  return {
    company: application.company,
    role_title: application.role_title,
    location: application.location ?? "",
    job_url: application.job_url,
    source_site: application.source_site ?? "",
    date_applied: application.date_applied ?? "",
    notes: application.notes ?? "",
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
    status: "Applied",
    date_applied: optionalValue(form.date_applied),
    deadline: null,
    notes: optionalValue(form.notes),
    resume_version: null,
  };
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not captured";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function projectUsPoint(point: { lat: number; lon: number }): { x: number; y: number } {
  const raw = albersRaw(point);
  const x =
    usMapFrame.x +
    ((raw.x - usProjectedBounds.minX) /
      (usProjectedBounds.maxX - usProjectedBounds.minX)) *
      usMapFrame.width;
  const y =
    usMapFrame.y +
    ((usProjectedBounds.maxY - raw.y) /
      (usProjectedBounds.maxY - usProjectedBounds.minY)) *
      usMapFrame.height;

  return { x, y };
}

function usPath(points: readonly (readonly [number, number])[]): string {
  return points
    .map(([lon, lat], index) => {
      const point = projectUsPoint({ lat, lon });
      return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(" ");
}

function locationKey(value: string | null): string {
  return value?.trim().replace(/\s+/g, " ") || "Unknown location";
}

function coordinatesForLocation(value: string | null): { x: number; y: number } | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  const cityMatch = normalized.match(/([a-z .'-]+),\s*([a-z]{2})\b/i);

  if (cityMatch) {
    const key = `${cityMatch[1].trim()}, ${cityMatch[2].toLowerCase()}`;
    const cityCoordinate = cityCoordinates[key];
    const stateCoordinate = stateCoordinates[cityMatch[2].toUpperCase()];
    return cityCoordinate || stateCoordinate
      ? projectUsPoint(cityCoordinate ?? stateCoordinate)
      : null;
  }

  const stateMatch = normalized.match(/\b([a-z]{2})\b/i);
  const stateCoordinate = stateMatch
    ? stateCoordinates[stateMatch[1].toUpperCase()]
    : null;

  return stateCoordinate ? projectUsPoint(stateCoordinate) : null;
}

function groupedLocations(applications: Application[]) {
  const groups = new Map<
    string,
    { applications: Application[]; coordinates: { x: number; y: number } | null }
  >();

  for (const application of applications) {
    const key = locationKey(application.location);
    const existing = groups.get(key);

    if (existing) {
      existing.applications.push(application);
    } else {
      groups.set(key, {
        applications: [application],
        coordinates: coordinatesForLocation(application.location),
      });
    }
  }

  return Array.from(groups.entries()).map(([location, group]) => ({
    location,
    ...group,
  }));
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone: string;
}) {
  return (
    <section className="tactical-card rounded-lg border p-4 backdrop-blur">
      <div className={`mb-4 flex size-10 items-center justify-center rounded-md ${tone}`}>
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase text-lime-200/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
    </section>
  );
}

function SourcePill({ source }: { source: string | null }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-lime-300/20 bg-lime-300/10 px-2.5 py-1 text-xs font-semibold text-lime-100">
      <Link2 size={13} />
      <span className="truncate">{source ?? "Unknown source"}</span>
    </span>
  );
}

function TacticalMap({ applications }: { applications: Application[] }) {
  const locations = groupedLocations(applications);
  const plottedLocations = locations.filter((location) => location.coordinates);
  const unknownLocations = locations.filter((location) => !location.coordinates);

  return (
    <section className="tactical-panel mt-6 overflow-hidden rounded-lg border backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-lime-300/15 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-lime-200">
            <Navigation size={17} />
            Mission map
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">
            Application deployment zones
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Cities light up as CareerNest captures applied jobs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-zinc-300">
          <span className="rounded-md border border-lime-300/20 bg-lime-300/10 px-2.5 py-1">
            {plottedLocations.length} mapped zones
          </span>
          <span className="rounded-md border border-amber-300/20 bg-amber-300/10 px-2.5 py-1">
            {applications.length} total captures
          </span>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_320px]">
        <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-lime-300/15 bg-[#050505]">
          <svg
            aria-label="Tactical map of applied job locations"
            className="h-full min-h-[360px] w-full"
            role="img"
            viewBox="0 0 900 560"
          >
            <defs>
              <linearGradient id="mapFill" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#242427" />
                <stop offset="100%" stopColor="#0b0b0c" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width="900" height="560" fill="#050505" />
            {Array.from({ length: 18 }, (_, index) => (
              <line
                key={`v-${index}`}
                stroke="#ef444433"
                strokeWidth="1"
                x1={index * 54}
                x2={index * 54}
                y1="0"
                y2="560"
              />
            ))}
            {Array.from({ length: 12 }, (_, index) => (
              <line
                key={`h-${index}`}
                stroke="#ef444426"
                strokeWidth="1"
                x1="0"
                x2="900"
                y1={index * 52}
                y2={index * 52}
              />
            ))}
            <path
              d={`${usPath(usOutlinePoints)} Z`}
              fill="url(#mapFill)"
              stroke="#ef4444"
              strokeOpacity="0.48"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d={usPath([
                [-97.0, 25.9],
                [-95.0, 28.0],
                [-92.0, 29.0],
                [-89.0, 29.2],
                [-85.0, 29.7],
                [-83.2, 27.7],
                [-81.7, 25.2],
                [-80.2, 25.1],
              ])}
              fill="#18181b"
              stroke="#ef4444"
              strokeOpacity="0.38"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {stateBoundaryLines.map((line, index) => (
              <path
                d={usPath(line)}
                fill="none"
                key={`state-line-${index}`}
                stroke="#ef4444"
                strokeOpacity="0.16"
                strokeWidth="2"
              />
            ))}
            <path
              d={usPath([
                [-123, 44],
                [-115, 41],
                [-105, 40.5],
                [-95, 40],
                [-86, 38],
                [-75, 39],
                [-69, 43],
              ])}
              fill="none"
              stroke="#9ca3af"
              strokeDasharray="8 10"
              strokeOpacity="0.38"
              strokeWidth="2"
            />
            {plottedLocations.map((location) => {
              const coordinates = location.coordinates!;
              const radius = location.applications.length > 1 ? 5 : 3.5;

              return (
                <g
                  key={location.location}
                  transform={`translate(${coordinates.x} ${coordinates.y})`}
                >
                  <circle
                    fill="#ef4444"
                    fillOpacity="0.18"
                    r={radius + 5}
                    stroke="#ef4444"
                    strokeOpacity="0.22"
                  />
                  <circle fill="#ef4444" r={radius} />
                  {location.applications.length > 1 ? (
                    <text
                      fill="#e5e7eb"
                      fontSize="10"
                      fontWeight="700"
                      textAnchor="middle"
                      x="12"
                      y="4"
                    >
                      {location.applications.length}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-lime-300/20 bg-black/45 px-3 py-2 text-xs font-semibold uppercase text-lime-100">
            US AO / live capture feed
          </div>
        </div>

        <div className="grid content-start gap-3">
          {plottedLocations.map((location) => (
            <button
              className="rounded-lg border border-lime-300/15 bg-black/25 p-4 text-left transition hover:border-lime-300/35 hover:bg-lime-300/10"
              key={location.location}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <Crosshair size={16} className="text-amber-300" />
                  {location.location}
                </span>
                <span className="rounded-md bg-lime-300/10 px-2 py-1 text-xs font-semibold text-lime-100">
                  {location.applications.length}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {location.applications.slice(0, 3).map((application) => (
                  <p className="truncate text-xs text-zinc-400" key={application.id}>
                    {application.company} / {application.role_title}
                  </p>
                ))}
              </div>
            </button>
          ))}
          {unknownLocations.length > 0 ? (
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
              {unknownLocations.length} location needs manual map coordinates.
            </div>
          ) : null}
          {applications.length === 0 ? (
            <div className="rounded-lg border border-lime-300/15 bg-black/25 p-4 text-sm text-zinc-400">
              Apply to a job and the first marker will appear here.
            </div>
          ) : null}
        </div>
      </div>
    </section>
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="border-b border-zinc-100 py-3 last:border-b-0">
      <dt className="text-xs font-semibold uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm leading-6 text-zinc-900">{value}</dd>
    </div>
  );
}

function ApplicationDetailsDialog({
  application,
  onClose,
  onEdit,
}: {
  application: Application;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-950/40 p-4">
      <section
        aria-modal="true"
        role="dialog"
        className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-700">
              Detailed history
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
              {application.role_title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{application.company}</p>
          </div>
          <button
            aria-label="Close details"
            className="grid size-10 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <dl>
            <DetailRow label="Company" value={application.company} />
            <DetailRow label="Role" value={application.role_title} />
            <DetailRow
              label="Location"
              value={application.location ?? "Not captured"}
            />
            <DetailRow
              label="Applied date"
              value={formatDate(application.date_applied)}
            />
            <DetailRow
              label="Source site"
              value={application.source_site ?? "Unknown"}
            />
            <DetailRow
              label="Original job URL"
              value={
                <a
                  className="text-sky-700 underline decoration-sky-300 underline-offset-2"
                  href={application.job_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {application.job_url}
                </a>
              }
            />
          </dl>

          <dl className="rounded-lg border border-zinc-200 bg-zinc-50 px-4">
            <DetailRow label="History ID" value={application.id} />
            <DetailRow
              label="Captured at"
              value={formatTimestamp(application.created_at)}
            />
            <DetailRow
              label="Last updated"
              value={formatTimestamp(application.updated_at)}
            />
            <DetailRow
              label="Notes"
              value={application.notes ?? "No notes captured"}
            />
          </dl>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-200 px-6 py-5">
          <button
            className="rounded-md border border-zinc-300 px-4 py-2.5 font-semibold text-zinc-700 transition hover:bg-zinc-100"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-2.5 font-semibold text-white transition hover:bg-zinc-800"
            onClick={onEdit}
            type="button"
          >
            <FilePenLine size={16} />
            Edit details
          </button>
        </div>
      </section>
    </div>
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
            <p className="text-xs font-semibold uppercase text-emerald-700">
              {application ? "Edit captured job" : "Add missed job"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">
              {application ? application.role_title : "Application details"}
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
            <Field label="Date applied">
              <input
                className="input"
                onChange={(event) => updateField("date_applied", event.target.value)}
                type="date"
                value={form.date_applied}
              />
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
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
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
          This removes the captured application for {application.company}.
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

function JobCard({
  application,
  onDelete,
  onEdit,
  onView,
}: {
  application: Application;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
}) {
  return (
    <article className="group tactical-card overflow-hidden rounded-lg border transition hover:-translate-y-0.5 hover:border-lime-300/40">
      <div className="h-1.5 bg-[linear-gradient(90deg,#ef4444,#7f1d1d,#6b7280)]" />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-lime-300/20 bg-lime-300/10 px-2.5 py-1 text-xs font-semibold text-lime-100">
              <BadgeCheck size={14} />
              Applied
            </span>
            <SourcePill source={application.source_site} />
          </div>

          <h3 className="text-xl font-semibold text-zinc-100">
            {application.role_title}
          </h3>
          <p className="mt-1 text-base font-semibold text-amber-200">
            {application.company}
          </p>

          <dl className="mt-5 grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
            <div className="flex min-w-0 items-start gap-2">
              <CalendarDays className="mt-0.5 shrink-0 text-lime-300" size={16} />
              <div>
                <dt className="text-xs font-semibold uppercase text-lime-200/60">
                  Applied
                </dt>
                <dd>{formatDate(application.date_applied)}</dd>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <MapPin className="mt-0.5 shrink-0 text-sky-300" size={16} />
              <div>
                <dt className="text-xs font-semibold uppercase text-lime-200/60">
                  Location
                </dt>
                <dd className="break-words">{application.location ?? "Not captured"}</dd>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <Clock3 className="mt-0.5 shrink-0 text-amber-300" size={16} />
              <div>
                <dt className="text-xs font-semibold uppercase text-lime-200/60">
                  Captured
                </dt>
                <dd>{formatTimestamp(application.created_at)}</dd>
              </div>
            </div>
          </dl>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            {application.notes ?? "Captured automatically from the browser extension."}
          </p>
        </div>

        <div className="flex items-start gap-2 xl:justify-end">
          <a
            aria-label={`Open ${application.role_title} job URL`}
            className="grid size-10 place-items-center rounded-md border border-lime-300/20 bg-black/20 text-zinc-300 transition hover:border-sky-300/50 hover:bg-sky-400/10 hover:text-sky-100"
            href={application.job_url}
            rel="noreferrer"
            target="_blank"
            title="Open job URL"
          >
            <ExternalLink size={17} />
          </a>
          <button
            aria-label={`View details for ${application.role_title}`}
            className="grid size-10 place-items-center rounded-md border border-lime-300/20 bg-black/20 text-zinc-300 transition hover:border-sky-300/50 hover:bg-sky-400/10 hover:text-sky-100"
            onClick={onView}
            title="View details"
            type="button"
          >
            <Eye size={17} />
          </button>
          <button
            aria-label={`Edit ${application.role_title}`}
            className="grid size-10 place-items-center rounded-md border border-lime-300/20 bg-black/20 text-zinc-300 transition hover:border-lime-300/50 hover:bg-lime-400/10 hover:text-lime-100"
            onClick={onEdit}
            title="Edit"
            type="button"
          >
            <FilePenLine size={17} />
          </button>
          <button
            aria-label={`Delete ${application.role_title}`}
            className="grid size-10 place-items-center rounded-md border border-lime-300/20 bg-black/20 text-zinc-300 transition hover:border-rose-300/60 hover:bg-rose-400/10 hover:text-rose-100"
            onClick={onDelete}
            title="Delete"
            type="button"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<ApplicationStats>(emptyStats);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [detailsTarget, setDetailsTarget] = useState<Application | null>(null);
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
          : "CareerNest could not load captured applications.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const sourceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          applications
            .map((application) => application.source_site)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
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
          application.job_url,
          application.notes ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesSource =
        sourceFilter === "All" || application.source_site === sourceFilter;

      return matchesSearch && matchesSource;
    });
  }, [applications, search, sourceFilter]);

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
          : "CareerNest could not save this application.",
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
          : "CareerNest could not delete this application.",
      );
    } finally {
      setBusy(false);
    }
  }

  const latestApplication = applications[0] ?? null;

  return (
    <div className="tactical-app min-h-screen text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-[1680px] lg:grid-cols-[292px_1fr]">
        <aside className="border-b border-lime-300/15 bg-black/50 px-5 py-5 shadow-[14px_0_50px_-42px_rgba(0,0,0,0.9)] backdrop-blur lg:border-b-0 lg:border-r lg:px-7 lg:py-8">
          <div className="flex items-center justify-between gap-4 lg:block">
            <div className="w-[min(112px,34vw)]">
              <img
                alt="CareerNest"
                className="block h-auto w-full rounded-lg shadow-panel"
                src={careerNestDarkLogo}
              />
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-lime-300/35 bg-lime-300/10 px-3 py-2.5 text-sm font-semibold text-lime-50 shadow-panel transition hover:bg-lime-300/20 lg:mt-8 lg:w-full lg:justify-center"
              onClick={() => setModalApplication(null)}
              type="button"
            >
              <CirclePlus size={17} />
              Add missed
            </button>
          </div>
          <nav className="mt-5 flex gap-2 lg:mt-10 lg:grid" aria-label="Sidebar">
            <a
              className="inline-flex items-center gap-3 rounded-md border border-lime-300/30 bg-lime-300/10 px-3 py-2.5 text-sm font-semibold text-lime-100"
              href="#history"
            >
              <History size={17} />
              History
            </a>
            <a
              className="inline-flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
              href={githubRepositoryUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Github size={17} />
              GitHub
            </a>
          </nav>
          <section className="tactical-card mt-10 hidden rounded-lg border p-4 lg:block">
            <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-lime-300/10 text-lime-200">
              <ShieldCheck size={18} />
            </div>
            <p className="text-sm font-semibold text-lime-100">Extension capture</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              CareerNest listens for a submitted confirmation and files the job here.
            </p>
            {latestApplication ? (
              <div className="mt-4 rounded-md border border-lime-300/15 bg-black/25 p-3 text-xs text-zinc-300">
                <p className="font-semibold text-lime-100">Latest capture</p>
                <p className="mt-1 break-words">{latestApplication.company}</p>
              </div>
            ) : null}
          </section>
        </aside>

        <main className="px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
          <header className="tactical-panel overflow-hidden rounded-lg border backdrop-blur">
            <div className="h-2 bg-[linear-gradient(90deg,#ef4444,#7f1d1d,#6b7280,#18181b)]" />
            <div className="flex flex-col gap-6 p-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-md border border-lime-300/20 bg-lime-300/10 px-2.5 py-1 text-sm font-semibold text-lime-100">
                <Sparkles size={15} />
                CareerNest tactical board
              </p>
              <h1 className="mt-4 text-4xl font-semibold text-zinc-50">
                Applied Job History
              </h1>
              <p className="mt-3 max-w-2xl text-zinc-400">
                A clean record of jobs captured from your Chrome extension, grouped for fast review instead of manual spreadsheet tracking.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-zinc-200">
                <span className="rounded-md border border-lime-300/20 bg-lime-300/10 px-2.5 py-1">
                  {stats.applications_this_week} this week
                </span>
                <span className="rounded-md border border-sky-300/20 bg-sky-300/10 px-2.5 py-1">
                  {stats.unique_companies} companies
                </span>
                <span className="rounded-md border border-amber-300/20 bg-amber-300/10 px-2.5 py-1">
                  {stats.source_sites} sources
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(260px,1fr)_190px_auto]">
              <label className="relative block">
                <span className="sr-only">Search captured applications</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={18}
                />
                <input
                  className="tactical-input h-12 w-full rounded-md border pl-10 pr-3 text-sm shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/15"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search history"
                  value={search}
                />
              </label>
              <label className="block">
                <span className="sr-only">Filter by source</span>
                <select
                  className="tactical-input h-12 w-full rounded-md border px-3 text-sm shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/15"
                  onChange={(event) => setSourceFilter(event.target.value)}
                  value={sourceFilter}
                >
                  <option value="All">All sources</option>
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
              <button
                aria-label="Refresh history"
                className="grid size-12 place-items-center rounded-md border border-lime-300/25 bg-black/25 text-lime-100 shadow-sm transition hover:bg-lime-300/10"
                onClick={() => void refresh()}
                title="Refresh history"
                type="button"
              >
                <RefreshCw size={18} />
              </button>
            </div>
            </div>
          </header>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              icon={<History size={19} />}
              label="Captured"
              value={stats.total_applications}
              tone="border border-lime-300/20 bg-lime-300/10 text-lime-100"
            />
            <StatCard
              icon={<CalendarDays size={19} />}
              label="This week"
              value={stats.applications_this_week}
              tone="border border-sky-300/20 bg-sky-300/10 text-sky-100"
            />
            <StatCard
              icon={<Search size={19} />}
              label="Companies"
              value={stats.unique_companies}
              tone="border border-amber-300/20 bg-amber-300/10 text-amber-100"
            />
            <StatCard
              icon={<Link2 size={19} />}
              label="Sources"
              value={stats.source_sites}
              tone="border border-zinc-300/20 bg-zinc-300/10 text-zinc-100"
            />
            <StatCard
              icon={<CalendarDays size={19} />}
              label="Latest"
              value={formatDate(stats.latest_application)}
              tone="border border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
            />
          </section>

          {error ? (
            <section className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </section>
          ) : null}

          <TacticalMap applications={visibleApplications} />

          <section
            className="tactical-panel mt-6 rounded-lg border p-5 backdrop-blur"
            id="history"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-lime-200">
                  <BriefcaseBusiness size={17} />
                  Capture stream
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-zinc-50">
                  Captured jobs
                </h2>
                <p className="text-sm text-zinc-400">
                  {visibleApplications.length} visible from {applications.length} total
                </p>
              </div>
              <button
                aria-label="Add missed application"
                className="inline-flex items-center gap-2 rounded-md border border-lime-300/25 bg-lime-300/10 px-3 py-2.5 text-sm font-semibold text-lime-50 transition hover:bg-lime-300/20"
                onClick={() => setModalApplication(null)}
                title="Add missed application"
                type="button"
              >
                <CirclePlus size={18} />
                Add missed
              </button>
            </div>

            {loading ? (
              <section className="rounded-lg border border-lime-300/15 bg-black/25 p-10 text-center text-zinc-400">
                Loading captured jobs...
              </section>
            ) : null}
            {!loading && visibleApplications.length === 0 ? (
              <section className="rounded-lg border border-dashed border-lime-300/25 bg-black/25 p-10 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-lime-300/10 text-lime-100">
                  <Tag size={20} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-50">
                  No captured jobs in this view
                </h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Clear the search or source filter, then try again.
                </p>
              </section>
            ) : null}
            {!loading && visibleApplications.length > 0 ? (
              <div className="grid gap-4">
                {visibleApplications.map((application) => (
                  <JobCard
                    application={application}
                    key={application.id}
                    onDelete={() => setDeleteTarget(application)}
                    onEdit={() => setModalApplication(application)}
                    onView={() => setDetailsTarget(application)}
                  />
                ))}
              </div>
            ) : null}
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
      {detailsTarget ? (
        <ApplicationDetailsDialog
          application={detailsTarget}
          onClose={() => setDetailsTarget(null)}
          onEdit={() => {
            setModalApplication(detailsTarget);
            setDetailsTarget(null);
          }}
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
