(function () {
  "use strict";

  const loadingScreen = document.getElementById("loadingScreen");
  const summaryScreen = document.getElementById("summaryScreen");
  const errorScreen = document.getElementById("errorScreen");

  const agreementNumber = document.getElementById("agreementNumber");
  const customerName = document.getElementById("customerName");
  const rentalWindow = document.getElementById("rentalWindow");
  const itemSummary = document.getElementById("itemSummary");
  const errorMessage = document.getElementById("errorMessage");

  document.getElementById("retryButton").addEventListener("click", loadOrderFromUrl);
  document.addEventListener("DOMContentLoaded", loadOrderFromUrl);

  function loadOrderFromUrl() {
    showScreen(loadingScreen);

    const token = getTokenFromUrl();
    if (!token) {
      showError("This order link is missing its secure order token. Please use the link provided by Big W Events.");
      return;
    }

    Launch1Api.loadOrderSummaryByToken(token)
      .then(function (response) {
        if (!response || response.ok !== true) {
          showError((response && response.message) || "This order link is invalid or expired.");
          return;
        }

        renderOrderSummary(response.orderSummary);
        showScreen(summaryScreen);
      })
      .catch(function () {
        showError("We could not load your order right now. Please try again or contact Big W Events.");
      });
  }

  function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("token") || params.get("order") || params.get("t") || "").trim();
  }

  function renderOrderSummary(summary) {
    const order = summary || {};
    agreementNumber.textContent = order.agreementNumber || "—";
    customerName.textContent = order.customerName || "—";
    rentalWindow.textContent = formatRentalWindow(order.pickupAt, order.returnDueAt);
    itemSummary.textContent = order.itemSummary || "Rental items will appear here when available.";
  }

  function formatRentalWindow(pickupAt, returnDueAt) {
    if (!pickupAt && !returnDueAt) return "—";
    return [formatDateTime(pickupAt), formatDateTime(returnDueAt)].filter(Boolean).join(" → ");
  }

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function showError(message) {
    errorMessage.textContent = message;
    showScreen(errorScreen);
  }

  function showScreen(screen) {
    [loadingScreen, summaryScreen, errorScreen].forEach(function (candidate) {
      candidate.classList.toggle("screen--active", candidate === screen);
    });
  }
})();
