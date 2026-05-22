const API_BASE_URL = "http://localhost:8000";
const AUTO_SAVE_WINDOW_MS = 30 * 60 * 1000;
const DEDUPE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_INTENTS_KEY = "recentApplyIntents";
const AUTO_SAVE_FINGERPRINTS_KEY = "autoSaveFingerprints";

async function saveApplication(payload) {
  const response = await fetch(`${API_BASE_URL}/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Save failed with status ${response.status}`);
  }

  return response.json();
}

async function deleteApplication(applicationId) {
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`, {
    method: "DELETE",
  });

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
    company: trimValue(details.company),
    role_title: trimValue(details.title),
    location: trimValue(details.location) || null,
    job_url: trimValue(details.url),
    source_site: trimValue(details.sourceSite) || sourceFromUrl(details.url) || null,
    status: "Applied",
    date_applied: localDateValue(),
    notes: "Automatically tracked after CareerNest detected a submission confirmation.",
  };
}

function hasRequiredDetails(details) {
  return Boolean(
    trimValue(details?.company) && trimValue(details?.title) && trimValue(details?.url),
  );
}

function mergeDetails(currentDetails, recentIntent) {
  const recentDetails = recentIntent?.details ?? {};

  return {
    company: trimValue(recentDetails.company) || trimValue(currentDetails?.company),
    title: trimValue(recentDetails.title) || trimValue(currentDetails?.title),
    location: trimValue(recentDetails.location) || trimValue(currentDetails?.location),
    url: trimValue(recentDetails.url) || trimValue(currentDetails?.url),
    sourceSite:
      trimValue(recentDetails.sourceSite) || trimValue(currentDetails?.sourceSite),
  };
}

async function recentIntents() {
  const stored = await chrome.storage.session.get(RECENT_INTENTS_KEY);
  return stored[RECENT_INTENTS_KEY] ?? {};
}

async function rememberApplyIntent(tabId, details) {
  if (!tabId || !hasRequiredDetails(details)) {
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
  const details = mergeDetails(currentDetails, recentIntent);

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

  if (message?.type === "CAREERNEST_SAVE_APPLICATION") {
    saveApplication(message.payload)
      .then((application) => sendResponse({ ok: true, application }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Could not save application.",
        }),
      );

    return true;
  }

  return false;
});
