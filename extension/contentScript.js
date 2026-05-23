const siteSelectors = {
  linkedin: {
    title: [
      ".job-details-jobs-unified-top-card__job-title h1",
      ".jobs-unified-top-card__job-title",
      "h1.top-card-layout__title",
    ],
    company: [
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name",
      ".topcard__org-name-link",
    ],
    location: [
      ".job-details-jobs-unified-top-card__primary-description-container",
      ".jobs-unified-top-card__bullet",
      ".topcard__flavor--bullet",
    ],
  },
  greenhouse: {
    title: ["h1.app-title", ".job__title h1", "#header h1", "h1"],
    company: [".company-name", "#header .company", "[data-mapped='organization']"],
    location: [".location", "[data-mapped='location']", ".job__location"],
  },
  lever: {
    title: [".posting-headline h2", ".posting-headline h1", "h1"],
    company: [".main-header-text", ".posting-category .sort-by-time", "[class*='company']"],
    location: [".posting-categories .location", ".location", "[class*='location']"],
  },
  workday: {
    title: [
      "[data-automation-id='jobPostingHeader']",
      "[data-automation-id='jobPostingTitle']",
      "h1",
    ],
    company: ["[data-automation-id='company']", "[class*='company']"],
    location: [
      "[data-automation-id='locations']",
      "[data-automation-id='location']",
      "[class*='location']",
    ],
  },
  indeed: {
    title: ["h1.jobsearch-JobInfoHeader-title", "[data-testid='jobsearch-JobInfoHeader-title']", "h1"],
    company: [
      "[data-testid='inlineHeader-companyName']",
      "[data-company-name='true']",
      ".jobsearch-InlineCompanyRating-companyHeader",
    ],
    location: [
      "[data-testid='job-location']",
      "[data-testid='inlineHeader-companyLocation']",
      ".jobsearch-JobInfoHeader-subtitle div",
    ],
  },
  handshake: {
    title: ["h1", "[data-testid*='job-title']", "[class*='job-title']"],
    company: ["[data-testid*='company']", "[class*='employer']", "[class*='company']"],
    location: ["[data-testid*='location']", "[class*='location']"],
  },
  generic: {
    title: [
      "[data-testid*='job-title']",
      "[data-automation*='job-title']",
      "[itemprop='title']",
      ".job-title",
      "[class*='job-title']",
      "main h1",
      "h1",
    ],
    company: [
      "[data-testid*='company']",
      "[data-automation*='company']",
      "[itemprop='hiringOrganization']",
      ".company-name",
      "[class*='company-name']",
      "[class*='employer']",
    ],
    location: [
      "[data-testid*='location']",
      "[data-automation*='location']",
      "[itemprop='jobLocation']",
      ".job-location",
      "[class*='location']",
    ],
  },
  clearcompany: {
    title: [
      "h1",
      "h2",
      ".job-title",
      "[class*='job-title']",
      "[class*='title']",
      "[class*='heading']",
    ],
    company: [".company-name", "[class*='company']", "[class*='brand']"],
    location: [".job-location", "[class*='location']"],
  },
};

const confirmationPatterns = [
  /\byour application (?:has been|was) (?:successfully )?(?:submitted|sent)\b/i,
  /\bapplication (?:has been|was) (?:successfully )?submitted\b/i,
  /\bapplication submitted\b/i,
  /\bwe (?:have )?(?:received|got) your application\b/i,
  /\byour application (?:has been|was) received\b/i,
  /\bthank you for applying\b/i,
  /\bthank you for applying\.?\b/i,
  /\bapplied on [a-z]+ \d{1,2}, \d{4}\b/i,
  /\bapplication received\b/i,
  /\bapplication sent\b/i,
  /\byou have applied\b/i,
];
const applyIntentPattern =
  /\b(apply|application|submit|send|continue to application|easy apply)\b/i;
const noticeId = "careernest-auto-save-notice";
let confirmationScanTimer = null;
let autoSaveAttempted = false;

function normalizeText(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function isVisible(element) {
  const style = window.getComputedStyle(element);
  return (
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    element.getClientRects().length > 0
  );
}

function visibleTextFrom(selectors) {
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      if (!isVisible(element)) {
        continue;
      }

      const text = normalizeText(element.innerText || element.textContent);
      if (text.length > 0 && text.length < 280) {
        return text;
      }
    }
  }

  return "";
}

function selectorsForCurrentSite() {
  const hostname = window.location.hostname.toLowerCase();

  if (hostname.includes("clearcompany.")) {
    return siteSelectors.clearcompany;
  }
  if (hostname.includes("linkedin.")) {
    return siteSelectors.linkedin;
  }
  if (hostname.includes("greenhouse.") || hostname.includes("boards.greenhouse")) {
    return siteSelectors.greenhouse;
  }
  if (hostname.includes("lever.co")) {
    return siteSelectors.lever;
  }
  if (hostname.includes("myworkdayjobs.") || hostname.includes("workday.")) {
    return siteSelectors.workday;
  }
  if (hostname.includes("indeed.")) {
    return siteSelectors.indeed;
  }
  if (hostname.includes("joinhandshake.") || hostname.includes("handshake.")) {
    return siteSelectors.handshake;
  }

  return siteSelectors.generic;
}

function cleanerLocation(value) {
  return normalizeText(value)
    .replace(/\b(?:posted|reposted)\b.*$/i, "")
    .replace(/\s*(?:\u00b7|\|)\s*.*$/i, "")
    .replace(/^onsite,\s*based in\s*/i, "")
    .replace(/^hybrid,\s*based in\s*/i, "")
    .replace(/^remote,\s*based in\s*/i, "")
    .trim();
}

function visibleLines() {
  return (document.body?.innerText || "")
    .split(/\n+/)
    .map(normalizeText)
    .filter(Boolean);
}

function metaContent(selector) {
  return normalizeText(document.querySelector(selector)?.getAttribute("content"));
}

function textFromAddress(address) {
  if (!address) {
    return "";
  }

  if (typeof address === "string") {
    return address;
  }

  return normalizeText(
    [
      address.addressLocality,
      address.addressRegion,
      address.addressCountry,
      address.streetAddress,
    ]
      .filter(Boolean)
      .join(", "),
  );
}

function structuredJobPosting() {
  const scripts = document.querySelectorAll(
    "script[type='application/ld+json'], script[type='application/json']",
  );

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || "{}");
      const entries = Array.isArray(parsed) ? parsed : [parsed, ...(parsed["@graph"] || [])];

      for (const entry of entries) {
        const type = Array.isArray(entry?.["@type"])
          ? entry["@type"].join(" ")
          : entry?.["@type"];

        if (!/JobPosting/i.test(type || "")) {
          continue;
        }

        const locationEntry = Array.isArray(entry.jobLocation)
          ? entry.jobLocation[0]
          : entry.jobLocation;

        return {
          title: normalizeText(entry.title),
          company: normalizeText(entry.hiringOrganization?.name || entry.organization?.name),
          location: textFromAddress(locationEntry?.address || locationEntry),
        };
      }
    } catch {
      // Some sites ship non-standard JSON in script tags; selectors still handle those pages.
    }
  }

  return {};
}

function cleanJobUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}

function readableFromSlug(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function titleFromPage() {
  const candidates = [
    document.title,
    document.querySelector("h1")?.innerText,
    document.querySelector("h2")?.innerText,
  ].map(normalizeText);

  for (const candidate of candidates) {
    const cleaned = candidate
      .replace(/\s*\|\s*.*$/i, "")
      .replace(/^Apply for a job at\s+/i, "")
      .trim();

    if (cleaned.length > 5 && !/^login$/i.test(cleaned)) {
      return cleaned;
    }
  }

  try {
    const url = new URL(window.location.href);
    const jobSegment = url.pathname.split("/jobs/")[1]?.split("/")[1];
    if (jobSegment) {
      return readableFromSlug(jobSegment);
    }
  } catch {
    return "";
  }

  return "";
}

function companyFromHostname(hostname) {
  const hostParts = hostname.replace(/^www\./, "").split(".");
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
}

function isHandshakePage() {
  const hostname = window.location.hostname.toLowerCase();
  return hostname.includes("joinhandshake.") || hostname.includes("handshake.");
}

function isHandshakeNoiseLine(line) {
  return (
    /^(jobs|search|saved|save|share|apply|filters?|sort by|at a glance|summary|beta)$/i.test(
      line,
    ) ||
    /^(explore|for you|career center|employers|events|messages|profile)$/i.test(line) ||
    /\b(movies|music|gaming|consulting|technology|financial services|health care|non-profit|education)\b/i.test(
      line,
    ) ||
    /^(posted|apply by|applied on|application submitted|withdraw application)/i.test(line) ||
    /\b(job|jobs) found\b/i.test(line) ||
    /^\$/.test(line) ||
    /^\d+\/\d+$/.test(line) ||
    /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(line)
  );
}

function isGenericHandshakeHeading(line) {
  return /^(jobs|search|saved|explore)$/i.test(line);
}

function isLikelyLocationLine(line) {
  return (
    /^(remote|hybrid|onsite)(?:\b|,)/i.test(line) ||
    (/^[A-Za-z .'-]+,\s*[A-Z]{2}(?:\b| ·)/.test(line) &&
      line.length < 60 &&
      !/\b(internship|engineer|analyst|developer|sales|program|representative|manager|obsessed)\b/i.test(
        line,
      ))
  );
}

function handshakeDetailsFromText() {
  if (!isHandshakePage()) {
    return {};
  }

  const lines = visibleLines();
  const heading = normalizeText(document.querySelector("h1")?.innerText);
  const title =
    (heading && !isGenericHandshakeHeading(heading) ? heading : "") ||
    lines.find((line, index) => /^posted\b/i.test(lines[index + 1] || "")) ||
    lines.find((line, index) => /^applied on\b/i.test(lines[index + 1] || "")) ||
    "";
  const titleIndex = lines.findIndex((line) => line === title);
  const beforeTitle =
    titleIndex > 0 ? lines.slice(Math.max(0, titleIndex - 8), titleIndex) : [];
  const company =
    [...beforeTitle]
      .reverse()
      .find((line) => !isHandshakeNoiseLine(line) && !line.includes(" - ")) || "";
  const locationLine =
    lines.find((line) => /\bbased in\b/i.test(line)) ||
    lines.find(isLikelyLocationLine) ||
    "";

  return {
    title,
    company,
    location: cleanerLocation(locationLine),
  };
}

function detectJobDetails() {
  const selectors = selectorsForCurrentSite();
  const generic = siteSelectors.generic;
  const sourceSite = window.location.hostname.replace(/^www\./, "");
  const handshake = handshakeDetailsFromText();
  const structured = structuredJobPosting();
  const metaTitle =
    metaContent("meta[property='og:title']") ||
    metaContent("meta[name='twitter:title']");
  const metaCompany =
    metaContent("meta[name='company']") ||
    metaContent("meta[property='og:site_name']");
  const metaLocation = metaContent("meta[name='job-location']");

  return {
    title:
      handshake.title ||
      structured.title ||
      visibleTextFrom([...selectors.title, ...generic.title]) ||
      metaTitle ||
      titleFromPage(),
    company:
      handshake.company ||
      structured.company ||
      visibleTextFrom([...selectors.company, ...generic.company]) ||
      metaCompany ||
      companyFromHostname(sourceSite),
    location: cleanerLocation(
      handshake.location ||
        structured.location ||
        visibleTextFrom([...selectors.location, ...generic.location]) ||
        metaLocation,
    ),
    url: cleanJobUrl(window.location.href),
    sourceSite,
  };
}

function controlText(element) {
  return normalizeText(
    [
      element.innerText,
      element.textContent,
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.value,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function hasJobDetails(details) {
  return Boolean(details.title && details.company && details.url);
}

function isLikelyJobUrl(value) {
  try {
    const url = new URL(value);
    const hostAndPath = `${url.hostname} ${url.pathname}`.toLowerCase();

    return /joinhandshake|handshake|myworkdayjobs|workday|greenhouse|lever\.co|linkedin.*jobs|indeed|smartrecruiters|icims|taleo|ashbyhq|workable|jobvite|\/jobs?\b|\/careers?\b|\/apply\b|\/positions?\b/.test(
      hostAndPath,
    );
  } catch {
    return false;
  }
}

function hasVisibleJobContext() {
  const text = visiblePageText();
  return /\b(job description|at a glance|job details|responsibilities|qualifications|salary|compensation|internship|full-time|part-time|apply by|applied on)\b/i.test(
    text,
  );
}

function isLikelyJobPage(details) {
  return hasJobDetails(details) && (isLikelyJobUrl(details.url) || hasVisibleJobContext());
}

let lastRememberedDetailsKey = "";

function detailsKey(details) {
  return [details.title, details.company, details.url].map(normalizeText).join("|");
}

async function rememberDetectedJobDetails() {
  const details = detectJobDetails();

  if (!isLikelyJobPage(details)) {
    return;
  }

  const key = detailsKey(details);
  if (key === lastRememberedDetailsKey) {
    return;
  }

  lastRememberedDetailsKey = key;

  try {
    await chrome.runtime.sendMessage({
      type: "CAREERNEST_REMEMBER_JOB_DETAILS",
      details,
    });
  } catch {
    // Saving still works when a confirmation page has enough details by itself.
  }
}

async function rememberApplyIntent() {
  const details = detectJobDetails();

  if (!isLikelyJobPage(details)) {
    return;
  }

  try {
    await chrome.runtime.sendMessage({
      type: "CAREERNEST_RECORD_APPLY_INTENT",
      details,
    });
  } catch {
    // Auto-save can still use details on a confirmation page when this buffer fails.
  }
}

function trackApplyClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const control = event.target.closest(
    "button, input[type='submit'], input[type='button'], a, [role='button']",
  );

  if (!control || !applyIntentPattern.test(controlText(control))) {
    return;
  }

  void rememberApplyIntent();
}

function visiblePageText() {
  const text = normalizeText(document.body?.innerText);

  if (text.length <= 80_000) {
    return text;
  }

  return `${text.slice(0, 40_000)} ${text.slice(-40_000)}`;
}

function hasSubmissionConfirmation() {
  const text = visiblePageText();
  const url = window.location.href.toLowerCase();

  return (
    confirmationPatterns.some((pattern) => pattern.test(text)) ||
    (url.includes("clearcompany.com") && url.includes("/apply/"))
  );
}

function pageStatus() {
  const details = detectJobDetails();

  return {
    details,
    hasConfirmation: hasSubmissionConfirmation(),
    canAutoSave: isLikelyJobPage(details) && hasSubmissionConfirmation(),
  };
}

function styleNoticeHost(host) {
  host.style.position = "fixed";
  host.style.right = "18px";
  host.style.top = "18px";
  host.style.zIndex = "2147483647";
}

function showNotice({ tone = "success", message, applicationId = null }) {
  document.getElementById(noticeId)?.remove();

  const host = document.createElement("section");
  const shadow = host.attachShadow({ mode: "open" });
  host.id = noticeId;
  host.setAttribute("aria-live", "polite");
  styleNoticeHost(host);
  shadow.innerHTML = `
    <style>
      * {
        box-sizing: border-box;
        letter-spacing: 0;
      }

      .notice {
        background: #ffffff;
        border: 1px solid ${tone === "error" ? "#fecdd3" : "#a7f3d0"};
        border-radius: 8px;
        box-shadow: 0 18px 48px rgb(9 9 11 / 0.2);
        color: #18181b;
        display: grid;
        font: 13px/1.45 Inter, ui-sans-serif, system-ui, -apple-system,
          BlinkMacSystemFont, "Segoe UI", sans-serif;
        gap: 10px;
        max-width: min(330px, calc(100vw - 36px));
        padding: 13px;
      }

      .topline {
        align-items: start;
        display: flex;
        gap: 10px;
        justify-content: space-between;
      }

      strong {
        color: ${tone === "error" ? "#9f1239" : "#065f46"};
        display: block;
        font-size: 13px;
        margin-bottom: 2px;
      }

      p {
        margin: 0;
      }

      button {
        background: transparent;
        border: 1px solid #d4d4d8;
        border-radius: 6px;
        color: #3f3f46;
        cursor: pointer;
        font: inherit;
        min-height: 30px;
        padding: 4px 9px;
      }

      .close {
        border: 0;
        font-size: 18px;
        line-height: 1;
        min-height: 24px;
        min-width: 24px;
        padding: 0;
      }

      .actions {
        display: flex;
        gap: 8px;
      }
    </style>
    <aside class="notice">
      <div class="topline">
        <div>
          <strong>${tone === "error" ? "CareerNest could not save" : "CareerNest tracked this"}</strong>
          <p></p>
        </div>
        <button class="close" aria-label="Close CareerNest notice" type="button">&times;</button>
      </div>
      ${applicationId ? '<div class="actions"><button class="undo" type="button">Undo</button></div>' : ""}
    </aside>
  `;

  shadow.querySelector("p").textContent = message;
  shadow.querySelector(".close").addEventListener("click", () => host.remove());
  shadow.querySelector(".undo")?.addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        type: "CAREERNEST_DELETE_APPLICATION",
        applicationId,
      });

      if (response?.ok) {
        host.remove();
        return;
      }

      showNotice({
        tone: "error",
        message: response?.error || "Remove it from the dashboard.",
      });
    } catch {
      showNotice({
        tone: "error",
        message: "Remove it from the CareerNest dashboard.",
      });
    }
  });

  document.documentElement.append(host);
}

async function autoSaveConfirmedApplication({ force = false } = {}) {
  const status = pageStatus();

  if (!force && autoSaveAttempted) {
    return { ok: false, skipped: true, reason: "Already checked this page.", ...status };
  }

  if (!status.hasConfirmation) {
    return {
      ok: false,
      skipped: true,
      reason: "No application confirmation found on this page.",
      ...status,
    };
  }

  autoSaveAttempted = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CAREERNEST_AUTO_SAVE_APPLIED",
      details: status.details,
    });

    if (response?.duplicate) {
      showNotice({ message: "This application was already saved." });
      return { ...response, ...status };
    }

    if (!response?.ok) {
      showNotice({
        tone: "error",
        message: response?.error || "CareerNest could not read this job page.",
      });
      return { ...response, ...status };
    }

    showNotice({
      applicationId: response.application.id,
      message: "Application saved to your history.",
    });
    return { ...response, ...status };
  } catch {
    const response = {
      ok: false,
      error: "Start the CareerNest backend before applying.",
      ...status,
    };
    showNotice({
      tone: "error",
      message: response.error,
    });
    return response;
  }
}

function scheduleConfirmationScan() {
  window.clearTimeout(confirmationScanTimer);
  confirmationScanTimer = window.setTimeout(() => {
    void autoSaveConfirmedApplication();
  }, 450);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "CAREERNEST_DETECT_JOB") {
    sendResponse(detectJobDetails());
  }

  if (message?.type === "CAREERNEST_PAGE_STATUS") {
    sendResponse(pageStatus());
  }

  if (message?.type === "CAREERNEST_CHECK_PAGE_NOW") {
    autoSaveConfirmedApplication({ force: true }).then(sendResponse);
    return true;
  }
});

document.addEventListener("click", trackApplyClick, true);
document.addEventListener("submit", () => void rememberApplyIntent(), true);

if (hasJobDetails(detectJobDetails())) {
  void rememberDetectedJobDetails();
}

const confirmationObserver = new MutationObserver(scheduleConfirmationScan);
confirmationObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

window.setTimeout(scheduleConfirmationScan, 1200);
window.setTimeout(() => void rememberDetectedJobDetails(), 1200);
window.setInterval(() => void rememberDetectedJobDetails(), 4000);
