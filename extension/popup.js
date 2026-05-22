const form = document.querySelector("#application-form");
const statusMessage = document.querySelector("#status");
const saveButton = document.querySelector("#save-button");
const fields = {
  company: document.querySelector("#company"),
  roleTitle: document.querySelector("#role-title"),
  location: document.querySelector("#location"),
  jobUrl: document.querySelector("#job-url"),
  notes: document.querySelector("#notes"),
};

function localDateValue() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

function setStatus(message, tone = "") {
  statusMessage.textContent = message;
  statusMessage.className = tone ? `status ${tone}` : "status";
}

function trimValue(field) {
  return field.value.trim();
}

function sourceFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function detectCurrentJob() {
  const tab = await activeTab();

  if (!tab?.id) {
    setStatus("Open a job page to detect details.", "error");
    return;
  }

  if (tab.url) {
    fields.jobUrl.value = tab.url;
  }

  try {
    const details = await chrome.tabs.sendMessage(tab.id, {
      type: "CAREERNEST_DETECT_JOB",
    });

    fields.roleTitle.value = details?.title ?? "";
    fields.company.value = details?.company ?? "";
    fields.location.value = details?.location ?? "";
    fields.jobUrl.value = details?.url ?? tab.url ?? "";

    if (!details?.title || !details?.company) {
      setStatus("Review the detected fields and fill anything missing.");
    }
  } catch {
    setStatus("Detection is unavailable on this page. Fill the fields manually.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const company = trimValue(fields.company);
  const roleTitle = trimValue(fields.roleTitle);
  const jobUrl = trimValue(fields.jobUrl);

  if (!company || !roleTitle || !jobUrl) {
    setStatus("Company, job title, and job URL are required.", "error");
    return;
  }

  saveButton.disabled = true;
  setStatus("Saving to CareerNest...");

  const payload = {
    company,
    role_title: roleTitle,
    location: trimValue(fields.location) || null,
    job_url: jobUrl,
    status: "Saved",
    date_applied: localDateValue(),
    source_site: sourceFromUrl(jobUrl) || null,
    notes: trimValue(fields.notes) || null,
  };

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CAREERNEST_SAVE_APPLICATION",
      payload,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "The backend did not accept the save.");
    }

    setStatus("Saved. It is ready in the CareerNest dashboard.", "success");
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Could not reach the CareerNest backend.",
      "error",
    );
  } finally {
    saveButton.disabled = false;
  }
});

void detectCurrentJob();

