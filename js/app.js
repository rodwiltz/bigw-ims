(function () {
  "use strict";

  const loadingScreen = document.getElementById("loadingScreen");
  const summaryScreen = document.getElementById("summaryScreen");
  const errorScreen = document.getElementById("errorScreen");

  document.addEventListener("DOMContentLoaded", function () {
    const token = getTokenFromUrl();

    if (!token) {
      showError("This order link is missing its secure order token.");
      return;
    }

    Launch1Api.loadOrderSummaryByToken(token)
      .then(function (response) {
        if (!response || response.ok !== true) {
          throw new Error((response && response.message) || "Order could not be loaded.");
        }

        renderSummary(response.orderSummary || {});
        showScreen(summaryScreen);
      })
      .catch(function (error) {
        showError(error && error.message ? error.message : "We could not load your order right now.");
      });
  });

  function renderSummary(order) {
    document.getElementById("agreement").textContent = order.agreementNumber || "—";
    document.getElementById("customer").textContent = order.customerName || "—";
    document.getElementById("pickupAt").textContent = formatDate(order.pickupAt);
    document.getElementById("returnDueAt").textContent = formatDate(order.returnDueAt);
    document.getElementById("orderStatus").textContent = order.orderStatus || "—";
    document.getElementById("itemSummary").textContent = order.itemSummary || "—";

    document.getElementById("primaryActionLabel").textContent = order.primaryActionLabel || "Start Pickup";
    document.getElementById("primaryActionMessage").textContent = order.primaryActionMessage || "Start your pickup when you are ready.";
    document.getElementById("primaryActionButton").textContent = order.primaryActionLabel || "Start Pickup";
  }

  function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("token") || params.get("order") || params.get("t") || "").trim();
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function showError(message) {
    document.getElementById("errorMessage").textContent = message;
    showScreen(errorScreen);
  }

  function showScreen(screen) {
    [loadingScreen, summaryScreen, errorScreen].forEach(function (candidate) {
      candidate.classList.toggle("screen--active", candidate === screen);
    });
  }
})();
