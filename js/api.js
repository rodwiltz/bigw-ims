const LAUNCH1_API_URL = "PASTE_LAUNCH_1_APPS_SCRIPT_WEB_APP_URL_HERE";

const Launch1Api = (function () {
  "use strict";

  function call(action, payload) {
    if (!LAUNCH1_API_URL || LAUNCH1_API_URL.indexOf("PASTE_LAUNCH_1_APPS_SCRIPT_WEB_APP_URL_HERE") !== -1) {
      return Promise.reject(new Error("Launch 1 backend URL is not configured in js/api.js."));
    }

    return fetch(LAUNCH1_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: action, payload: payload || {} })
    })
      .then(function (response) { return response.text(); })
      .then(function (text) {
        if (!text) throw new Error("Backend returned an empty response.");
        try {
          return JSON.parse(text);
        } catch (error) {
          throw new Error("Backend returned malformed JSON.");
        }
      });
  }

  return {
    loadOrderSummaryByToken: function (token) {
      return call("loadOrderSummaryByToken", { token: token });
    }
  };
})();
