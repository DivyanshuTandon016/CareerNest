const tabStatus = document.querySelector("#tab-status");

async function describeActivePage() {
  if (!chrome.tabs?.query || !chrome.tabs?.sendMessage) {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url?.startsWith("http")) {
    tabStatus.textContent = "Open a job page in Chrome, then apply as usual.";
    return;
  }

  try {
    const details = await chrome.tabs.sendMessage(tab.id, {
      type: "CAREERNEST_DETECT_JOB",
    });

    if (details?.title && details?.company) {
      tabStatus.textContent = `Watching ${details.title} at ${details.company}.`;
      return;
    }
  } catch {
    // Restricted browser pages do not host the content script.
  }

  tabStatus.textContent =
    "Watching the current page for a clear application submitted confirmation.";
}

void describeActivePage();
