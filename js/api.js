const PROJECT_VICTORY_API_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";

function projectVictoryApiCall(action, payload) {
  return new Promise(function(resolve, reject) {
    if (!PROJECT_VICTORY_API_URL || PROJECT_VICTORY_API_URL === "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE") {
      reject(new Error("Apps Script web app URL is not configured in js/api.js."));
      return;
    }

    const callbackName = "pvScanCallback_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
    const script = document.createElement("script");
    const cleanup = function() {
      delete window[callbackName];
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };

    const timeout = window.setTimeout(function() {
      cleanup();
      reject(new Error("Backend request timed out."));
    }, 15000);

    window[callbackName] = function(response) {
      window.clearTimeout(timeout);
      cleanup();
      resolve(response);
    };

    const url = new URL(PROJECT_VICTORY_API_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("payload", JSON.stringify(payload || {}));
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("_", String(Date.now()));

    script.onerror = function() {
      window.clearTimeout(timeout);
      cleanup();
      reject(new Error("Frontend failed to call backend."));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}
