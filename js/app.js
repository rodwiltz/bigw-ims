(function () {
  "use strict";

  const loadingScreen = document.getElementById("loadingScreen");
  const summaryScreen = document.getElementById("summaryScreen");
  const pickupHandoffScreen = document.getElementById("pickupHandoffScreen");
  const errorScreen = document.getElementById("errorScreen");

  let currentOrder = null;

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

        currentOrder = response.orderSummary || {};
        renderSummary(currentOrder);
        showScreen(summaryScreen);
      })
      .catch(function (error) {
        showError(error && error.message ? error.message : "We could not load your order right now.");
      });
  });

  document.getElementById("primaryActionButton").addEventListener("click", function () {
    const action = this.dataset.action || "start_pickup";

    if (action === "start_pickup") {
      renderPickupHandoff(currentOrder || {});
      showScreen(pickupHandoffScreen);
      return;
    }
  });

  document.getElementById("openCameraButton").addEventListener("click", function () {
    this.textContent = "Camera opens in the next slice";
  });

  function renderSummary(order) {
    document.getElementById("agreement").textContent = order.agreementNumber || "—";
    document.getElementById("customer").textContent = order.customerName || "—";
    document.getElementById("pickupAt").textContent = formatDate(order.pickupAt);
    document.getElementById("returnDueAt").textContent = formatDate(order.returnDueAt);
    document.getElementById("orderStatus").textContent = order.orderStatus || "—";
    document.getElementById("itemSummary").textContent = order.itemSummary || "—";

    const actionLabel = order.primaryActionLabel || "Start Pickup";
    document.getElementById("primaryActionLabel").textContent = actionLabel;
    document.getElementById("primaryActionMessage").textContent =
      order.primaryActionMessage || "Start your pickup when you are ready.";
    document.getElementById("primaryActionButton").textContent = actionLabel;
    document.getElementById("primaryActionButton").dataset.action = order.primaryAction || "start_pickup";
  }

  function renderPickupHandoff(order) {
    document.getElementById("pickupAgreement").textContent = order.agreementNumber || "—";
    document.getElementById("pickupCustomer").textContent = order.customerName || "—";
    document.getElementById("pickupItems").textContent = order.itemSummary || "—";
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
    [loadingScreen, summaryScreen, pickupHandoffScreen, errorScreen].forEach(function (candidate) {
      candidate.classList.toggle("screen--active", candidate === screen);
    });
  }
})();
