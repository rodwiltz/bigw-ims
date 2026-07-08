(function () {
  "use strict";

  const loadingScreen = document.getElementById("loadingScreen");
  const summaryScreen = document.getElementById("summaryScreen");
  const pickupHandoffScreen = document.getElementById("pickupHandoffScreen");
  const scannerScreen = document.getElementById("scannerScreen");
  const errorScreen = document.getElementById("errorScreen");
  const allScreens = [loadingScreen, summaryScreen, pickupHandoffScreen, scannerScreen, errorScreen];

  let currentOrder = null;
  let scannerStarted = false;
  let scanInFlight = false;

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
    }
  });

  document.getElementById("openCameraButton").addEventListener("click", function () {
    renderScannerContext(currentOrder || {});
    showScreen(scannerScreen);
    startCameraFromUserTap();
  });

  window.addEventListener("beforeunload", function () {
    if (scannerStarted && typeof stopScannerEngine === "function") stopScannerEngine();
  });

  function startCameraFromUserTap() {
    setScannerStatus("Preparing camera…", "ready");

    if (typeof Html5Qrcode === "undefined") {
      setScannerStatus("Scanner library did not load. Please refresh and try again.", "error");
      return;
    }

    if (typeof startScannerEngine !== "function") {
      setScannerStatus("Scanner support is not available. Please refresh and try again.", "error");
      return;
    }

    scannerStarted = true;
    startScannerEngine(handleScanSuccess, handleScanError);

    window.setTimeout(function () {
      if (scannerStarted) setScannerStatus("Camera ready. Scan one pickup item.", "ready");
    }, 1200);
  }

  function handleScanSuccess(decodedText) {
    const itemId = normalizeScannedItemId(decodedText);
    if (!itemId || scanInFlight) return;

    scanInFlight = true;
    setScannerStatus("Checking item " + itemId + "…", "ready");

    Launch1Api.recordPickupScan({
      agreementNumber: currentOrder.agreementNumber,
      itemId: itemId,
      customerName: currentOrder.customerName || "Customer"
    })
      .then(function (response) {
        if (!response || response.ok !== true) {
          throw new Error((response && response.message) || "This item could not be accepted for pickup.");
        }
        document.getElementById("lastScan").textContent = itemId;
        setScannerStatus("Accepted: " + itemId + ". Pickup scan recorded.", "success");
      })
      .catch(function (error) {
        setScannerStatus(error && error.message ? error.message : "This item could not be accepted.", "error");
      })
      .finally(function () {
        window.setTimeout(function () { scanInFlight = false; }, 900);
      });
  }

  function normalizeScannedItemId(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    try {
      const parsed = JSON.parse(raw);
      if (parsed.itemId) return String(parsed.itemId).trim();
      if (parsed.item_id) return String(parsed.item_id).trim();
    } catch (error) {}

    const queryIndex = raw.indexOf("?");
    if (queryIndex !== -1) {
      try {
        const params = new URLSearchParams(raw.slice(queryIndex));
        return (params.get("itemId") || params.get("item") || params.get("id") || raw).trim();
      } catch (error) {}
    }

    return raw;
  }

  function handleScanError(error) {
    const message = error && (error.message || error.name)
      ? (error.name || "Error") + ": " + error.message
      : String(error || "");
    if (message) setScannerStatus("Camera error: " + message, "error");
  }

  function renderSummary(order) {
    document.getElementById("agreement").textContent = order.agreementNumber || "—";
    document.getElementById("customer").textContent = order.customerName || "—";
    document.getElementById("pickupAt").textContent = formatDate(order.pickupAt);
    document.getElementById("returnDueAt").textContent = formatDate(order.returnDueAt);
    document.getElementById("orderStatus").textContent = order.orderStatus || "—";
    document.getElementById("itemSummary").textContent = order.itemSummary || "—";

    const actionLabel = order.primaryActionLabel || "Start Pickup";
    const actionButton = document.getElementById("primaryActionButton");
    document.getElementById("primaryActionLabel").textContent = actionLabel;
    document.getElementById("primaryActionMessage").textContent = order.primaryActionMessage || "Start your pickup when you are ready.";
    actionButton.textContent = actionLabel;
    actionButton.dataset.action = order.primaryAction || "start_pickup";
  }

  function renderPickupHandoff(order) {
    document.getElementById("pickupAgreement").textContent = order.agreementNumber || "—";
    document.getElementById("pickupCustomer").textContent = order.customerName || "—";
    document.getElementById("pickupItems").textContent = order.itemSummary || "—";
  }

  function renderScannerContext(order) {
    document.getElementById("scannerAgreement").textContent = order.agreementNumber || "—";
    document.getElementById("scannerCustomer").textContent = order.customerName || "—";
    document.getElementById("scannerItems").textContent = order.itemSummary || "—";
    document.getElementById("lastScan").textContent = "No item scanned yet.";
  }

  function setScannerStatus(message, tone) {
    const status = document.getElementById("scannerStatus");
    status.textContent = message;
    status.classList.toggle("scanner-status--ready", tone === "ready");
    status.classList.toggle("scanner-status--success", tone === "success");
    status.classList.toggle("scanner-status--error", tone === "error");
  }

  function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("token") || params.get("order") || params.get("t") || "").trim();
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function showError(message) {
    document.getElementById("errorMessage").textContent = message;
    showScreen(errorScreen);
  }

  function showScreen(targetScreen) {
    allScreens.forEach(function (screen) {
      if (!screen) return;
      screen.classList.remove("screen-active");
      screen.classList.remove("screen--active");
      screen.style.display = "none";
      screen.setAttribute("aria-hidden", "true");
    });
    if (!targetScreen) return;
    targetScreen.classList.add("screen-active");
    targetScreen.style.display = "block";
    targetScreen.setAttribute("aria-hidden", "false");
  }
})();
