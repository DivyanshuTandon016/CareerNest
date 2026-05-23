const API_BASE_URL_KEY = "apiBaseUrl";
const APPLICATIONS_KEY = "applications";
const AUTO_SAVE_WINDOW_MS = 30 * 60 * 1000;
const DEDUPE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_JOB_DETAILS_WINDOW_MS = 4 * 60 * 60 * 1000;
const RECENT_INTENTS_KEY = "recentApplyIntents";
const RECENT_JOB_DETAILS_KEY = "recentJobDetails";
const AUTO_SAVE_FINGERPRINTS_KEY = "autoSaveFingerprints";

function cleanApiBaseUrl(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.replace(/\/+$/, "");
}

async function apiBaseUrl() {
  const stored = await chrome.storage.sync.get(API_BASE_URL_KEY);
  return cleanApiBaseUrl(stored[API_BASE_URL_KEY]);
}

async function apiFetch(path, init) {
  const baseUrl = await apiBaseUrl();
  if (!baseUrl) {
    return null;
  }

  return fetch(`${baseUrl}${path}`, init);
}

async function storedApplications() {
  const stored = await chrome.storage.local.get(APPLICATIONS_KEY);
  return Array.isArray(stored[APPLICATIONS_KEY]) ? stored[APPLICATIONS_KEY] : [];
}

async function setStoredApplications(applications) {
  await chrome.storage.local.set({ [APPLICATIONS_KEY]: applications });
}

function normalizedUrl(value) {
  const cleaned = trimValue(value).replace(/\/+$/, "");
  if (cleaned.includes("joinhandshake.")) {
    const parts = cleaned.split("?")[0].split("/");
    const index = parts.findIndex((part) => part === "job-search" || part === "jobs");
    if (index >= 0 && index + 1 < parts.length) {
      return [...parts.slice(0, index), "jobs", parts[index + 1]].join("/");
    }
  }

  return cleaned;
}

function matchingApplication(payload, applications) {
  return applications.find((application) => {
    const sameJobUrl = normalizedUrl(application.job_url) === normalizedUrl(payload.job_url);
    const sameRole =
      normalizedKey(application.company) === normalizedKey(payload.company) &&
      normalizedKey(application.role_title) === normalizedKey(payload.role_title);

    return sameJobUrl || sameRole;
  });
}

function statsForApplications(applications) {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
  const day = localToday.getDay();
  const weekStart = new Date(localToday);
  weekStart.setDate(localToday.getDate() - ((day + 6) % 7));
  const weekStartValue = weekStart.toISOString().slice(0, 10);
  const companies = new Set(
    applications.map((application) => normalizedKey(application.company)).filter(Boolean),
  );
  const sourceSites = new Set(
    applications.map((application) => normalizedKey(application.source_site)).filter(Boolean),
  );
  const appliedDates = applications
    .map((application) => application.date_applied)
    .filter(Boolean)
    .sort();

  return {
    total_applications: applications.length,
    applications_this_week: applications.filter(
      (application) => application.date_applied && application.date_applied >= weekStartValue,
    ).length,
    unique_companies: companies.size,
    source_sites: sourceSites.size,
    latest_application: appliedDates.at(-1) || null,
  };
}

async function listStoredApplications() {
  const applications = await storedApplications();
  return applications.sort((left, right) => {
    const updatedComparison = right.updated_at.localeCompare(left.updated_at);
    return updatedComparison || right.id - left.id;
  });
}

async function saveStoredApplication(payload) {
  const applications = await storedApplications();
  const now = new Date().toISOString();
  const existingApplication = matchingApplication(payload, applications);

  if (existingApplication) {
    Object.assign(existingApplication, payload, { updated_at: now });
    await setStoredApplications(applications);
    return existingApplication;
  }

  const nextId =
    applications.reduce((maximum, application) => Math.max(maximum, application.id || 0), 0) + 1;
  const application = {
    id: nextId,
    ...payload,
    deadline: payload.deadline ?? null,
    resume_version: payload.resume_version ?? null,
    created_at: now,
    updated_at: now,
  };
  applications.push(application);
  await setStoredApplications(applications);
  return application;
}

async function updateStoredApplication(applicationId, payload) {
  const applications = await storedApplications();
  const application = applications.find((item) => item.id === applicationId);

  if (!application) {
    throw new Error("Application not found");
  }

  Object.assign(application, payload, { updated_at: new Date().toISOString() });
  await setStoredApplications(applications);
  return application;
}

async function deleteStoredApplication(applicationId) {
  const applications = await storedApplications();
  const nextApplications = applications.filter((application) => application.id !== applicationId);

  if (applications.length === nextApplications.length) {
    throw new Error("Application not found");
  }

  await setStoredApplications(nextApplications);
}

async function saveApplication(payload) {
  const response = await apiFetch("/applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response) {
    return saveStoredApplication(payload);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Save failed with status ${response.status}`);
  }

  return response.json();
}

async function deleteApplication(applicationId) {
  const response = await apiFetch(`/applications/${applicationId}`, {
    method: "DELETE",
  });

  if (!response) {
    await deleteStoredApplication(applicationId);
    return;
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Delete failed with status ${response.status}`);
  }
}

function trimValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedKey(value) {
  return trimValue(value).toLowerCase().replace(/\s+/g, " ");
}

function comparableUrl(value) {
  try {
    const url = new URL(value);
    const handshakeJobId =
      url.hostname.includes("joinhandshake.") &&
      url.pathname.match(/\/(?:job-search|jobs)\/(\d+)/)?.[1];

    if (handshakeJobId) {
      return `${url.hostname.replace(/^www\./, "")}/jobs/${handshakeJobId}`.toLowerCase();
    }

    return `${url.hostname.replace(/^www\./, "")}${url.pathname}`.toLowerCase();
  } catch {
    return normalizedKey(value);
  }
}

function sourceFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function keyFromDetails(details) {
  const source = trimValue(details?.sourceSite) || sourceFromUrl(details?.url);
  return normalizedKey(source);
}

function isLikelyJobUrl(value, sourceSite = "") {
  try {
    const url = new URL(value);
    const hostAndPath = `${sourceSite || url.hostname} ${url.hostname} ${url.pathname}`.toLowerCase();

    return /joinhandshake|handshake|myworkdayjobs|workday|greenhouse|lever\.co|linkedin.*jobs|indeed|smartrecruiters|icims|taleo|ashbyhq|workable|jobvite|\/jobs?\b|\/careers?\b|\/apply\b|\/positions?\b/.test(
      hostAndPath,
    );
  } catch {
    return false;
  }
}

function cleanJobUrl(value) {
  try {
    const url = new URL(value);
    const handshakeJobId =
      url.hostname.includes("joinhandshake.") &&
      url.pathname.match(/\/(?:job-search|jobs)\/(\d+)/)?.[1];

    if (handshakeJobId) {
      url.pathname = `/jobs/${handshakeJobId}`;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return trimValue(value);
  }
}

function companyFromUrl(value) {
  try {
    const hostParts = new URL(value).hostname.replace(/^www\./, "").split(".");
    const ignoredSubdomains = new Set(["apply", "jobs", "careers", "boards"]);
    const candidate = hostParts.find((part) => part && !ignoredSubdomains.has(part));

    if (!candidate) {
      return "";
    }

    return candidate
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return "";
  }
}

function fingerprintFor(details) {
  return [
    normalizedKey(details.company),
    normalizedKey(details.title),
    comparableUrl(details.url),
  ].join("|");
}

function localDateValue() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

function applicationPayload(details) {
  return {
    company: trimValue(details.company) || companyFromUrl(details.url),
    role_title: trimValue(details.title),
    location: trimValue(details.location) || null,
    job_url: cleanJobUrl(details.url),
    source_site: trimValue(details.sourceSite) || sourceFromUrl(details.url) || null,
    status: "Applied",
    date_applied: localDateValue(),
    notes: "Automatically tracked after CareerNest detected a submission confirmation.",
  };
}

function hasRequiredDetails(details) {
  const title = trimValue(details?.title);
  const company = trimValue(details?.company);

  return Boolean(
    (company || companyFromUrl(details?.url)) &&
      title &&
      trimValue(details?.url) &&
      isLikelyJobUrl(details?.url, details?.sourceSite),
  ) && !/^(jobs|search|saved|explore)$/i.test(title) && !/^(explore|jobs)$/i.test(company);
}

function mergeDetails(currentDetails, recentIntent, rememberedDetails = {}) {
  const recentDetails = recentIntent?.details ?? {};

  return {
    company:
      trimValue(recentDetails.company) ||
      trimValue(rememberedDetails.company) ||
      trimValue(currentDetails?.company) ||
      companyFromUrl(recentDetails.url || rememberedDetails.url || currentDetails?.url),
    title:
      trimValue(recentDetails.title) ||
      trimValue(rememberedDetails.title) ||
      trimValue(currentDetails?.title),
    location:
      trimValue(recentDetails.location) ||
      trimValue(rememberedDetails.location) ||
      trimValue(currentDetails?.location),
    url:
      trimValue(recentDetails.url) ||
      trimValue(rememberedDetails.url) ||
      trimValue(currentDetails?.url),
    sourceSite:
      trimValue(recentDetails.sourceSite) ||
      trimValue(rememberedDetails.sourceSite) ||
      trimValue(currentDetails?.sourceSite),
  };
}

async function recentIntents() {
  const stored = await chrome.storage.session.get(RECENT_INTENTS_KEY);
  return stored[RECENT_INTENTS_KEY] ?? {};
}

async function recentJobDetails() {
  const stored = await chrome.storage.session.get(RECENT_JOB_DETAILS_KEY);
  return stored[RECENT_JOB_DETAILS_KEY] ?? {};
}

async function rememberRecentJobDetails(details) {
  if (!hasRequiredDetails(details)) {
    return;
  }

  const jobs = await recentJobDetails();
  const key = keyFromDetails(details);
  const value = {
    details,
    recordedAt: Date.now(),
  };

  if (key) {
    jobs[key] = value;
  }

  jobs.latest = value;
  await chrome.storage.session.set({ [RECENT_JOB_DETAILS_KEY]: jobs });
}

async function getRecentJobDetails(currentDetails) {
  const jobs = await recentJobDetails();
  const now = Date.now();

  for (const [key, value] of Object.entries(jobs)) {
    if (!value?.recordedAt || now - value.recordedAt > RECENT_JOB_DETAILS_WINDOW_MS) {
      delete jobs[key];
    }
  }

  await chrome.storage.session.set({ [RECENT_JOB_DETAILS_KEY]: jobs });

  const key = keyFromDetails(currentDetails);
  const matchingJob = key ? jobs[key] : null;

  if (matchingJob?.details) {
    return matchingJob.details;
  }

  if (jobs.latest?.details) {
    return jobs.latest.details;
  }

  return {};
}

async function rememberApplyIntent(tabId, details) {
  if (!hasRequiredDetails(details)) {
    return;
  }

  await rememberRecentJobDetails(details);

  if (!tabId) {
    return;
  }

  const intents = await recentIntents();
  intents[tabId] = {
    details,
    recordedAt: Date.now(),
  };

  await chrome.storage.session.set({ [RECENT_INTENTS_KEY]: intents });
}

async function getRecentApplyIntent(tabId) {
  if (!tabId) {
    return null;
  }

  const intents = await recentIntents();
  const intent = intents[tabId];

  if (!intent || Date.now() - intent.recordedAt > AUTO_SAVE_WINDOW_MS) {
    delete intents[tabId];
    await chrome.storage.session.set({ [RECENT_INTENTS_KEY]: intents });
    return null;
  }

  return intent;
}

async function removeRecentApplyIntent(tabId) {
  if (!tabId) {
    return;
  }

  const intents = await recentIntents();
  delete intents[tabId];
  await chrome.storage.session.set({ [RECENT_INTENTS_KEY]: intents });
}

async function hasRecentFingerprint(details) {
  const stored = await chrome.storage.local.get(AUTO_SAVE_FINGERPRINTS_KEY);
  const fingerprints = stored[AUTO_SAVE_FINGERPRINTS_KEY] ?? {};
  const now = Date.now();

  for (const [fingerprint, savedAt] of Object.entries(fingerprints)) {
    if (now - savedAt > DEDUPE_WINDOW_MS) {
      delete fingerprints[fingerprint];
    }
  }

  const currentFingerprint = fingerprintFor(details);
  const duplicate = Boolean(fingerprints[currentFingerprint]);

  await chrome.storage.local.set({ [AUTO_SAVE_FINGERPRINTS_KEY]: fingerprints });
  return duplicate;
}

async function rememberFingerprint(details) {
  const stored = await chrome.storage.local.get(AUTO_SAVE_FINGERPRINTS_KEY);
  const fingerprints = stored[AUTO_SAVE_FINGERPRINTS_KEY] ?? {};
  fingerprints[fingerprintFor(details)] = Date.now();
  await chrome.storage.local.set({ [AUTO_SAVE_FINGERPRINTS_KEY]: fingerprints });
}

async function autoSaveApplication(tabId, currentDetails) {
  const recentIntent = await getRecentApplyIntent(tabId);
  const rememberedDetails = await getRecentJobDetails(currentDetails);
  const details = mergeDetails(currentDetails, recentIntent, rememberedDetails);

  if (!hasRequiredDetails(details)) {
    return {
      ok: false,
      error: "CareerNest saw a submission but could not read the job details.",
    };
  }

  if (await hasRecentFingerprint(details)) {
    await removeRecentApplyIntent(tabId);
    return { ok: true, duplicate: true };
  }

  const application = await saveApplication(applicationPayload(details));
  await rememberFingerprint(details);
  await removeRecentApplyIntent(tabId);
  return { ok: true, application };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const senderTabId = _sender.tab?.id;

  if (message?.type === "CAREERNEST_RECORD_APPLY_INTENT") {
    rememberApplyIntent(senderTabId, message.details)
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Could not remember this job.",
        }),
      );

    return true;
  }

  if (message?.type === "CAREERNEST_REMEMBER_JOB_DETAILS") {
    rememberRecentJobDetails(message.details)
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Could not remember this job.",
        }),
      );

    return true;
  }

  if (message?.type === "CAREERNEST_AUTO_SAVE_APPLIED") {
    autoSaveApplication(senderTabId, message.details)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Could not save application.",
        }),
      );

    return true;
  }

  if (message?.type === "CAREERNEST_DELETE_APPLICATION") {
    deleteApplication(message.applicationId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Could not remove application.",
        }),
      );

    return true;
  }

  if (message?.type === "CAREERNEST_LIST_APPLICATIONS") {
    listStoredApplications()
      .then((applications) => sendResponse({ ok: true, applications }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Could not load applications.",
        }),
      );

    return true;
  }

  if (message?.type === "CAREERNEST_APPLICATION_STATS") {
    listStoredApplications()
      .then((applications) => sendResponse({ ok: true, stats: statsForApplications(applications) }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Could not load application stats.",
        }),
      );

    return true;
  }

  if (message?.type === "CAREERNEST_CREATE_APPLICATION") {
    saveStoredApplication(message.payload)
      .then((application) => sendResponse({ ok: true, application }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Could not save application.",
        }),
      );

    return true;
  }

  if (message?.type === "CAREERNEST_UPDATE_APPLICATION") {
    updateStoredApplication(message.applicationId, message.payload)
      .then((application) => sendResponse({ ok: true, application }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Could not update application.",
        }),
      );

    return true;
  }

  return false;
});
