const LAUNCH1_API_URL = "PASTE_LAUNCH_1_APPS_SCRIPT_WEB_APP_URL_HERE";

const Launch1Api = (function () {
  "use strict";

  function readProof(token) {
    return new Promise(function (resolve, reject) {
      if (!LAUNCH1_API_URL || LAUNCH1_API_URL.indexOf("PASTE_LAUNCH_1_APPS_SCRIPT_WEB_APP_URL_HERE") !== -1) {
        reject(new Error("Launch 1 backend URL is not configured."));
        return;
      }

      const callbackName = "lr1aDiagCallback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
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
      url.searchParams.set("action", "readProof");
      url.searchParams.set("token", token);
      url.searchParams.set("callback", callbackName);

      script.src = url.toString();
      document.body.appendChild(script);
    });
  }

  return {
    readProof: readProof
  };
})();
