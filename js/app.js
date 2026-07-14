(function () {
  "use strict";

  const loadingScreen = document.getElementById("loadingScreen");
  const summaryScreen = document.getElementById("summaryScreen");
  const pickupHandoffScreen = document.getElementById("pickupHandoffScreen");
  const scannerScreen = document.getElementById("scannerScreen");
  const errorScreen = document.getElementById("errorScreen");

  const allScreens = [
    loadingScreen,
    summaryScreen,
    pickupHandoffScreen,
    scannerScreen,
    errorScreen
  ];

  let activeToken = "";
  let currentOrder = null;
  let scannerStarted = false;
  let scanInFlight = false;

  document.addEventListener("DOMContentLoaded", function () {
    activeToken = getTokenFromUrl();

    if (!activeToken) {
      showError("This order link is missing its secure order token.");
      return;
    }

    Launch1Api.loadOrderSummaryByToken(activeToken)
      .then(function (response) {
        if (!response || response.ok !== true) {
          throw new Error(
            (response && response.message) || "Order could not be loaded."
          );
        }

        currentOrder = response.orderSummary || {};
        renderSummary(currentOrder);
        showScreen(summaryScreen);
      })
      .catch(function (error) {
        showError(
          error && error.message
            ? error.message
            : "We could not load your order right now."
        );
      });
  });

  document
    .getElementById("primaryActionButton")
    .addEventListener("click", function () {
      const action = this.dataset.action || "start_pickup";

      if (action === "start_pickup") {
        renderPickupHandoff(currentOrder || {});
        showScreen(pickupHandoffScreen);
      }
    });

  document
    .getElementById("openCameraButton")
    .addEventListener("click", function () {
      renderScannerContext(currentOrder || {});
      showScreen(scannerScreen);

      /*
       * Keep the entire scanner startup inside the direct customer-tap path.
       * Reading layout synchronously confirms #reader is visible before the
       * scanner library measures and builds its qrbox overlay.
       */
      const reader = document.getElementById("reader");
      reader.getBoundingClientRect();
      window.scrollTo(0, 0);

      startCameraFromUserTap();
    });

  window.addEventListener("beforeunload", function () {
    if (scannerStarted && typeof stopScannerEngine === "function") {
      stopScannerEngine();
    }
  });

  function startCameraFromUserTap() {
    setScannerStatus("Preparing camera…", "ready");

    if (typeof Html5Qrcode === "undefined") {
      setScannerStatus(
        "Scanner library did not load. Please refresh and try again.",
        "error"
      );
      return;
    }

    if (typeof startScannerEngine !== "function") {
      setScannerStatus(
        "Scanner support is not available. Please refresh and try again.",
        "error"
      );
      return;
    }

    scannerStarted = false;

    startScannerEngine(handleScanSuccess)
      .then(function () {
        scannerStarted = true;
        setScannerStatus(
          "Camera ready. Place one QR code inside the highlighted square.",
          "ready"
        );
      })
      .catch(function (error) {
        scannerStarted = false;
        setScannerStatus(
          "Scanner could not start: " +
            (error && error.message ? error.message : String(error)),
          "error"
        );
      });
  }

  function handleScanSuccess(decodedText) {
    const itemId = normalizeScannedItemId(decodedText);

    if (!itemId || scanInFlight) {
      return;
    }

    if (!activeToken || !currentOrder || !currentOrder.agreementNumber) {
      setScannerStatus(
        "Order context is missing. Reopen the order link and try again.",
        "error"
      );
      return;
    }

    scanInFlight = true;
    setScannerStatus("Saving pickup scan for " + itemId + "…", "ready");

    Launch1Api.recordPickupScan({
      token: activeToken,
      agreementNumber: currentOrder.agreementNumber,
      itemId: itemId,
      customerName: currentOrder.customerName || "Customer"
    })
      .then(function (response) {
        if (!response || response.ok !== true) {
          throw new Error(
            (response && response.message) ||
              "The pickup scan could not be saved."
          );
        }

        document.getElementById("lastScan").textContent = itemId;
        setScannerStatus(
          "Accepted: " + itemId + ". Pickup scan saved.",
          "success"
        );
      })
      .catch(function (error) {
        setScannerStatus(
          "Pickup scan was not saved: " +
            (error && error.message ? error.message : String(error)),
          "error"
        );
      })
      .finally(function () {
        window.setTimeout(function () {
          scanInFlight = false;
        }, 1200);
      });
  }

  function normalizeScannedItemId(value) {
    const raw = String(value || "").trim();

    if (!raw) {
      return "";
    }

    try {
      const parsed = JSON.parse(raw);

      if (parsed.itemId) {
        return String(parsed.itemId).trim();
      }

      if (parsed.item_id) {
        return String(parsed.item_id).trim();
      }
    } catch (error) {
      // Plain-text QR value.
    }

    const queryIndex = raw.indexOf("?");

    if (queryIndex !== -1) {
      try {
        const params = new URLSearchParams(raw.slice(queryIndex));

        return (
          params.get("itemId") ||
          params.get("item") ||
          params.get("id") ||
          raw
        ).trim();
      } catch (error) {
        // Preserve original value.
      }
    }

    return raw;
  }

  function renderSummary(order) {
    document.getElementById("agreement").textContent =
      order.agreementNumber || "—";
    document.getElementById("customer").textContent =
      order.customerName || "—";
    document.getElementById("pickupAt").textContent =
      formatDate(order.pickupAt);
    document.getElementById("returnDueAt").textContent =
      formatDate(order.returnDueAt);
    document.getElementById("orderStatus").textContent =
      order.orderStatus || "—";
    document.getElementById("itemSummary").textContent =
      order.itemSummary || "—";

    const actionLabel = order.primaryActionLabel || "Start Pickup";
    const actionButton = document.getElementById("primaryActionButton");

    document.getElementById("primaryActionLabel").textContent = actionLabel;
    document.getElementById("primaryActionMessage").textContent =
      order.primaryActionMessage || "Start your pickup when you are ready.";

    actionButton.textContent = actionLabel;
    actionButton.dataset.action = order.primaryAction || "start_pickup";
  }

  function renderPickupHandoff(order) {
    document.getElementById("pickupAgreement").textContent =
      order.agreementNumber || "—";
    document.getElementById("pickupCustomer").textContent =
      order.customerName || "—";
  }

  function renderScannerContext(order) {
    document.getElementById("lastScan").textContent =
      "No item scanned yet.";

    const focusState = getFocusState(order.itemSummary);
    document.getElementById("currentTask").textContent = focusState.task;
    document.getElementById("taskProgressText").textContent =
      focusState.remaining;
  }

  function getFocusState(itemSummary) {
    const summary = String(itemSummary || "").trim();
    const firstGroup = summary.split(/[,;]+/)[0].trim();
    const match = firstGroup.match(/^(\d+)\s+(.+)$/);

    if (match) {
      const quantity = Number(match[1]);
      const label = match[2].trim();
      const singularLabel =
        quantity === 1 ? label.replace(/s$/i, "") : label;

      return {
        task: "Scan " + label,
        remaining: quantity + " " + singularLabel
      };
    }

    return {
      task: "Scan your pickup items",
      remaining: summary || "Your items are ready."
    };
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

    return (
      params.get("token") ||
      params.get("order") ||
      params.get("t") ||
      ""
    ).trim();
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return String(value);
    }

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

  function showScreen(targetScreen) {
    allScreens.forEach(function (screen) {
      if (!screen) {
        return;
      }

      screen.classList.remove("screen-active");
      screen.classList.remove("screen--active");
      screen.style.display = "none";
      screen.setAttribute("aria-hidden", "true");
    });

    if (!targetScreen) {
      return;
    }

    targetScreen.classList.add("screen-active");
    targetScreen.style.display = "block";
    targetScreen.setAttribute("aria-hidden", "false");
  }
})();
