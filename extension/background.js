const API_BASE_URL = "http://localhost:8000";

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "CAREERNEST_SAVE_APPLICATION") {
    return false;
  }

  saveApplication(message.payload)
    .then((application) => sendResponse({ ok: true, application }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Could not save application.",
      }),
    );

  return true;
});

