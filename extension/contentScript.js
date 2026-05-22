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
};

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

  return siteSelectors.generic;
}

function cleanerLocation(value) {
  return normalizeText(value)
    .replace(/\b(?:posted|reposted)\b.*$/i, "")
    .replace(/\s*(?:\u00b7|\|)\s*.*$/i, "")
    .trim();
}

function detectJobDetails() {
  const selectors = selectorsForCurrentSite();
  const generic = siteSelectors.generic;

  return {
    title: visibleTextFrom([...selectors.title, ...generic.title]),
    company: visibleTextFrom([...selectors.company, ...generic.company]),
    location: cleanerLocation(
      visibleTextFrom([...selectors.location, ...generic.location]),
    ),
    url: window.location.href,
    sourceSite: window.location.hostname.replace(/^www\./, ""),
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "CAREERNEST_DETECT_JOB") {
    sendResponse(detectJobDetails());
  }
});
