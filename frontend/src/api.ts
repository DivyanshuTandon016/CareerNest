import type { Application, ApplicationPayload, ApplicationStats } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

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

export function getApplications(): Promise<Application[]> {
  return request<Application[]>("/applications");
}

export function getApplicationStats(): Promise<ApplicationStats> {
  return request<ApplicationStats>("/applications/stats/summary");
}

export function createApplication(payload: ApplicationPayload): Promise<Application> {
  return request<Application>("/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateApplication(
  id: number,
  payload: ApplicationPayload,
): Promise<Application> {
  return request<Application>(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteApplication(id: number): Promise<void> {
  return request<void>(`/applications/${id}`, {
    method: "DELETE",
  });
}

