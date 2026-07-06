(function () {
  "use strict";

  const TEST_TOKEN = "LR1A-TEST-001";

  document.addEventListener("DOMContentLoaded", function () {
    const token = getTokenFromUrl() || TEST_TOKEN;

    document.getElementById("token").textContent = token;

    Launch1Api.loadOrderSummaryByToken(token)
      .then(function (response) {
        if (!response || response.ok !== true) {
          throw new Error((response && response.message) || "Spreadsheet read failed.");
        }

        const summary = response.orderSummary || {};

        document.getElementById("status").textContent = "Success";
        document.getElementById("agreement").textContent = summary.agreementNumber || "—";
        document.getElementById("customer").textContent = summary.customerName || "—";
        document.getElementById("itemSummary").textContent = summary.itemSummary || "—";
      })
      .catch(function (error) {
        document.getElementById("status").textContent =
          "Failed: " + (error && error.message ? error.message : String(error));
      });
  });

  function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("token") || params.get("order") || params.get("t") || "").trim();
  }
})();
