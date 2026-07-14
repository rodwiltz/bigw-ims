const LAUNCH1_API_URL = "https://script.google.com/macros/s/AKfycbwmKZPRkM--y7nuxHfZ_7sHO-9kHLSupOjfLBnHIRTFdjUms5XE06ffJsNf_lrsp5OjUA/exec";

const Launch1Api = (function () {
  "use strict";

  function call(action, payload) {
    return new Promise(function (resolve, reject) {
      const callbackName = "lr1Callback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
      const script = document.createElement("script");
      let settled = false;

      const timeoutId = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Backend request timed out."));
      }, 15000);

      window[callbackName] = function (response) {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(response);
      };

      function cleanup() {
        window.clearTimeout(timeoutId);
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callbackName]; } catch (error) { window[callbackName] = undefined; }
      }

      script.onerror = function () {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Backend request failed."));
      };

      const url = new URL(LAUNCH1_API_URL);
      url.searchParams.set("action", action);
      url.searchParams.set("payload", JSON.stringify(payload || {}));
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("_", String(Date.now()));

      script.src = url.toString();
      document.body.appendChild(script);
    });
  }

  return {
    loadOrderSummaryByToken: function (token) {
      return call("loadOrderSummaryByToken", { token: token });
    },
    loadPickupGuidance: function (payload) {
      return call("loadPickupGuidance", payload);
    },
    recordPickupScan: function (payload) {
      return call("recordPickupScan", payload);
    }
  };
})();
