const LAUNCH1_API_URL = "https://script.google.com/macros/s/AKfycbwmKZPRkM--y7nuxHfZ_7sHO-9kHLSupOjfLBnHIRTFdjUms5XE06ffJsNf_lrsp5OjUA/exec";

const Launch1Api = (function () {
  "use strict";

  function call(action, payload) {
    if (!LAUNCH1_API_URL || LAUNCH1_API_URL.indexOf("https://script.google.com/macros/s/AKfycbwmKZPRkM--y7nuxHfZ_7sHO-9kHLSupOjfLBnHIRTFdjUms5XE06ffJsNf_lrsp5OjUA/exec") !== -1) {
      return Promise.reject(new Error("Launch 1 backend URL is not configured in js/api.js."));
    }

    return new Promise(function (resolve, reject) {
      const callbackName = "launch1Callback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
      const script = document.createElement("script");

      window[callbackName] = function (response) {
        cleanup();
        resolve(response);
      };

      function cleanup() {
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
      }

      script.onerror = function () {
        cleanup();
        reject(new Error("Backend request failed."));
      };

      const url = new URL(LAUNCH1_API_URL);
      url.searchParams.set("action", action);
      url.searchParams.set("payload", JSON.stringify(payload || {}));
      url.searchParams.set("callback", callbackName);

      script.src = url.toString();
      document.body.appendChild(script);
    });
  }

  return {
    loadOrderSummaryByToken: function (token) {
      return call("loadOrderSummaryByToken", { token: token });
    }
  };
})();
