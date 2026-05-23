import type { Application, ApplicationPayload, ApplicationStats } from "./types";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");
const PAGE_STORAGE_KEY = "careernest.applications";
const DASHBOARD_SOURCE = "CAREERNEST_DASHBOARD";
const EXTENSION_SOURCE = "CAREERNEST_EXTENSION";

type ExtensionResponse<T> = {
  ok?: boolean;
  error?: string;
} & T;

function hasRemoteApi(): boolean {
  return API_BASE_URL.length > 0;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function extensionRequest<T>(
  type: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      reject(new Error("CareerNest extension is not connected."));
    }, 1200);

    function handleMessage(event: MessageEvent) {
      if (
        event.source !== window ||
        event.data?.source !== EXTENSION_SOURCE ||
        event.data?.requestId !== requestId
      ) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);

      const response = event.data.response as ExtensionResponse<T>;
      if (!response?.ok) {
        reject(new Error(response?.error || "CareerNest extension request failed."));
        return;
      }

      resolve(response);
    }

    window.addEventListener("message", handleMessage);
    window.postMessage(
      {
        source: DASHBOARD_SOURCE,
        type,
        requestId,
        ...payload,
      },
      window.location.origin,
    );
  });
}

function pageApplications(): Application[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PAGE_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setPageApplications(applications: Application[]) {
  window.localStorage.setItem(PAGE_STORAGE_KEY, JSON.stringify(applications));
}

function normalizedKey(value: string | null): string {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function normalizedUrl(value: string): string {
  const cleaned = value.trim().replace(/\/+$/, "");
  if (cleaned.includes("joinhandshake.")) {
    const parts = cleaned.split("?")[0].split("/");
    const index = parts.findIndex((part) => part === "job-search" || part === "jobs");
    if (index >= 0 && index + 1 < parts.length) {
      return [...parts.slice(0, index), "jobs", parts[index + 1]].join("/");
    }
  }

  return cleaned;
}

function matchingApplication(
  payload: ApplicationPayload,
  applications: Application[],
): Application | undefined {
  return applications.find((application) => {
    const sameJobUrl = normalizedUrl(application.job_url) === normalizedUrl(payload.job_url);
    const sameRole =
      normalizedKey(application.company) === normalizedKey(payload.company) &&
      normalizedKey(application.role_title) === normalizedKey(payload.role_title);

    return sameJobUrl || sameRole;
  });
}

function sortedApplications(applications: Application[]): Application[] {
  return [...applications].sort((left, right) => {
    const updatedComparison = right.updated_at.localeCompare(left.updated_at);
    return updatedComparison || right.id - left.id;
  });
}

function statsForApplications(applications: Application[]): ApplicationStats {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
  const day = localToday.getDay();
  const weekStart = new Date(localToday);
  weekStart.setDate(localToday.getDate() - ((day + 6) % 7));
  const weekStartValue = weekStart.toISOString().slice(0, 10);
  const appliedDates = applications
    .map((application) => application.date_applied)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    total_applications: applications.length,
    applications_this_week: applications.filter(
      (application) => application.date_applied && application.date_applied >= weekStartValue,
    ).length,
    unique_companies: new Set(
      applications.map((application) => normalizedKey(application.company)).filter(Boolean),
    ).size,
    source_sites: new Set(
      applications.map((application) => normalizedKey(application.source_site)).filter(Boolean),
    ).size,
    latest_application: appliedDates.at(-1) ?? null,
  };
}

async function localApplications(): Promise<Application[]> {
  try {
    const response = await extensionRequest<{ applications: Application[] }>(
      "CAREERNEST_LIST_APPLICATIONS",
    );
    return sortedApplications(response.applications);
  } catch {
    return sortedApplications(pageApplications());
  }
}

async function localStats(): Promise<ApplicationStats> {
  try {
    const response = await extensionRequest<{ stats: ApplicationStats }>(
      "CAREERNEST_APPLICATION_STATS",
    );
    return response.stats;
  } catch {
    return statsForApplications(pageApplications());
  }
}

async function localCreateApplication(payload: ApplicationPayload): Promise<Application> {
  try {
    const response = await extensionRequest<{ application: Application }>(
      "CAREERNEST_CREATE_APPLICATION",
      { payload },
    );
    return response.application;
  } catch {
    const applications = pageApplications();
    const now = new Date().toISOString();
    const existingApplication = matchingApplication(payload, applications);

    if (existingApplication) {
      Object.assign(existingApplication, payload, { updated_at: now });
      setPageApplications(applications);
      return existingApplication;
    }

    const nextId =
      applications.reduce((maximum, application) => Math.max(maximum, application.id), 0) + 1;
    const application = {
      id: nextId,
      ...payload,
      created_at: now,
      updated_at: now,
    };
    applications.push(application);
    setPageApplications(applications);
    return application;
  }
}

async function localUpdateApplication(
  id: number,
  payload: ApplicationPayload,
): Promise<Application> {
  try {
    const response = await extensionRequest<{ application: Application }>(
      "CAREERNEST_UPDATE_APPLICATION",
      { applicationId: id, payload },
    );
    return response.application;
  } catch {
    const applications = pageApplications();
    const application = applications.find((item) => item.id === id);

    if (!application) {
      throw new Error("Application not found");
    }

    Object.assign(application, payload, { updated_at: new Date().toISOString() });
    setPageApplications(applications);
    return application;
  }
}

async function localDeleteApplication(id: number): Promise<void> {
  try {
    await extensionRequest("CAREERNEST_DELETE_APPLICATION", { applicationId: id });
    return;
  } catch {
    const applications = pageApplications();
    setPageApplications(applications.filter((application) => application.id !== id));
  }
}

export function getApplications(): Promise<Application[]> {
  return hasRemoteApi() ? request<Application[]>("/applications") : localApplications();
}

export function getApplicationStats(): Promise<ApplicationStats> {
  return hasRemoteApi()
    ? request<ApplicationStats>("/applications/stats/summary")
    : localStats();
}

export function createApplication(payload: ApplicationPayload): Promise<Application> {
  return hasRemoteApi()
    ? request<Application>("/applications", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    : localCreateApplication(payload);
}

export function updateApplication(
  id: number,
  payload: ApplicationPayload,
): Promise<Application> {
  return hasRemoteApi()
    ? request<Application>(`/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    : localUpdateApplication(id, payload);
}

export function deleteApplication(id: number): Promise<void> {
  return hasRemoteApi()
    ? request<void>(`/applications/${id}`, {
        method: "DELETE",
      })
    : localDeleteApplication(id);
}
