const PROJECT_VICTORY_API_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";

function projectVictoryApiCall(action, payload) {
  return new Promise(function(resolve, reject) {
    if (!action) {
      reject(new Error("Backend action is required."));
      return;
    }

    if (!PROJECT_VICTORY_API_URL || PROJECT_VICTORY_API_URL === "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE") {
      reject(new Error("Backend URL is not configured in js/api.js."));
      return;
    }

    let url;
    try {
      url = new URL(PROJECT_VICTORY_API_URL);
    } catch (error) {
      reject(new Error("Backend URL in js/api.js is not a valid URL."));
      return;
    }

    const callbackName = "pvScanCallback_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
    const script = document.createElement("script");

    const cleanup = function() {
      try {
        delete window[callbackName];
      } catch (error) {
        window[callbackName] = undefined;
      }
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timeout = window.setTimeout(function() {
      cleanup();
      reject(new Error("Backend request timed out. Confirm the Apps Script Web App URL is deployed and accessible."));
    }, 15000);

    window[callbackName] = function(response) {
      window.clearTimeout(timeout);
      cleanup();
      resolve(response);
    };

    url.searchParams.set("action", action);
    url.searchParams.set("payload", JSON.stringify(payload || {}));
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("_", String(Date.now()));

    script.onerror = function() {
      window.clearTimeout(timeout);
      cleanup();
      reject(new Error("Frontend failed to call backend. Confirm the Apps Script Web App deployment allows access."));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}
