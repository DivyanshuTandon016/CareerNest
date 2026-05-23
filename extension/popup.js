const tabStatus = document.querySelector("#tab-status");
const checkPageButton = document.querySelector("#check-page");
const pageDetails = document.querySelector("#page-details");
const detailTitle = document.querySelector("#detail-title");
const detailCompany = document.querySelector("#detail-company");
const detailConfirmation = document.querySelector("#detail-confirmation");

let currentTabId = null;
let currentTab = null;

function readableFromSlug(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function companyFromUrl(value) {
  try {
    const hostParts = new URL(value).hostname.replace(/^www\./, "").split(".");
    const ignoredSubdomains = new Set(["apply", "jobs", "careers", "boards"]);
    const candidate = hostParts.find((part) => part && !ignoredSubdomains.has(part));

    if (!candidate) {
      return "";
    }

    return readableFromSlug(candidate);
  } catch {
    return "";
  }
}

function titleFromTab(tab) {
  const title = tab?.title
    ?.replace(/\s*\|\s*.*$/i, "")
    .replace(/^Apply for a job at\s+/i, "")
    .trim();

  if (title && title.length > 5 && !/^login$/i.test(title)) {
    return title;
  }

  try {
    const url = new URL(tab.url);
    const jobSegment = url.pathname.split("/jobs/")[1]?.split("/")[1];
    return jobSegment ? readableFromSlug(jobSegment) : "";
  } catch {
    return "";
  }
}

function fallbackDetailsFromTab(tab) {
  return {
    title: titleFromTab(tab),
    company: companyFromUrl(tab?.url ?? ""),
    location: "",
    url: tab?.url ?? "",
    sourceSite: tab?.url ? new URL(tab.url).hostname.replace(/^www\./, "") : "",
  };
}

function mergeStatusWithTab(status, tab) {
  const fallbackDetails = fallbackDetailsFromTab(tab);
  const details = {
    ...fallbackDetails,
    ...(status?.details ?? {}),
  };

  details.title = status?.details?.title || fallbackDetails.title;
  details.company = status?.details?.company || fallbackDetails.company;
  details.url = status?.details?.url || fallbackDetails.url;
  details.sourceSite = status?.details?.sourceSite || fallbackDetails.sourceSite;

  const isClearCompanyApply =
    details.url.includes("clearcompany.com") && details.url.includes("/apply");
  const hasConfirmation = Boolean(status?.hasConfirmation || isClearCompanyApply);

  return {
    ...(status ?? {}),
    details,
    hasConfirmation,
    canAutoSave: Boolean(details.title && details.company && details.url && hasConfirmation),
  };
}

function renderStatus(status) {
  pageDetails.hidden = false;
  detailTitle.textContent = status.details?.title || "Not detected";
  detailCompany.textContent = status.details?.company || "Not detected";
  detailConfirmation.textContent = status.hasConfirmation ? "Found" : "Not found";

  if (status.canAutoSave) {
    tabStatus.textContent =
      "This page has enough information to save. Click the button below.";
    return;
  }

  tabStatus.textContent = status.hasConfirmation
    ? "Confirmation found, but job details are incomplete."
    : "No submitted confirmation found yet.";
}

async function describeActivePage() {
  if (!chrome.tabs?.query || !chrome.tabs?.sendMessage) {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab?.id ?? null;
  currentTab = tab ?? null;

  if (!tab?.id || !tab.url?.startsWith("http")) {
    tabStatus.textContent = "Open a job page in Chrome, then apply as usual.";
    return;
  }

  try {
    const rawStatus = await chrome.tabs.sendMessage(tab.id, {
      type: "CAREERNEST_PAGE_STATUS",
    });
    renderStatus(mergeStatusWithTab(rawStatus, tab));
    return;
  } catch {
    renderStatus(mergeStatusWithTab(null, tab));
    return;
  }

  tabStatus.textContent =
    "Watching the current page for a clear application submitted confirmation.";
}

checkPageButton.addEventListener("click", async () => {
  if (!currentTabId) {
    return;
  }

  checkPageButton.disabled = true;
  tabStatus.textContent = "Checking this page...";

  try {
    let result = null;

    try {
      result = await chrome.tabs.sendMessage(currentTabId, {
        type: "CAREERNEST_CHECK_PAGE_NOW",
      });
    } catch {
      result = null;
    }

    result = mergeStatusWithTab(result, currentTab);

    if (!result.ok && result.canAutoSave) {
      result = {
        ...(await chrome.runtime.sendMessage({
          type: "CAREERNEST_AUTO_SAVE_APPLIED",
          details: result.details,
        })),
        ...result,
      };
    }

    renderStatus(result);

    if (result.ok && result.application) {
      tabStatus.textContent = "Saved to CareerNest.";
    } else if (result.duplicate) {
      tabStatus.textContent = "This application was already saved.";
    } else if (result.reason) {
      tabStatus.textContent = result.reason;
    } else if (result.error) {
      tabStatus.textContent = result.error;
    }
  } catch {
    tabStatus.textContent = "CareerNest cannot read this tab. Reload the page and try again.";
  } finally {
    checkPageButton.disabled = false;
  }
});

void describeActivePage();
