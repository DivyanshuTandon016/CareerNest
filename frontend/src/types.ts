export const applicationStatuses = [
  "Applied",
  "Saved",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export type Application = {
  id: number;
  company: string;
  role_title: string;
  location: string | null;
  job_url: string;
  source_site: string | null;
  status: ApplicationStatus;
  date_applied: string | null;
  deadline: string | null;
  notes: string | null;
  resume_version: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationPayload = {
  company: string;
  role_title: string;
  location: string | null;
  job_url: string;
  source_site: string | null;
  status: ApplicationStatus;
  date_applied: string | null;
  deadline: string | null;
  notes: string | null;
  resume_version: string | null;
};

export type ApplicationStats = {
  total_applications: number;
  applications_this_week: number;
  unique_companies: number;
  source_sites: number;
  latest_application: string | null;
};
