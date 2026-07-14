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
  let activeFlow = "pickup";
  let scannerStarted = false;
  let scanInFlight = false;
  let lastSubmittedItemId = "";
  let lastSubmittedAt = 0;

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

      if (action === "start_pickup" || action === "start_return") {
        activeFlow = action === "start_return" ? "return" : "pickup";
        renderHandoff(currentOrder || {});
        showScreen(pickupHandoffScreen);
      }
    });

  document
    .getElementById("openCameraButton")
    .addEventListener("click", function () {
      renderScannerContext(currentOrder || {});
      showScreen(scannerScreen);

      /*
       * Resolve guidance immediately after the scanner screen becomes active.
       * This request runs independently of camera startup so it does not break
       * the direct user-gesture chain required by mobile Safari.
       */
      refreshGuidance();

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
    const now = Date.now();

    if (!itemId || scanInFlight) {
      return;
    }

    /*
     * html5-qrcode may report the same visible code repeatedly.
     * Suppress only the same item for a short period while allowing a
     * different item to be submitted immediately after confirmation.
     */
    if (
      itemId === lastSubmittedItemId &&
      now - lastSubmittedAt < 1500
    ) {
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
    lastSubmittedItemId = itemId;
    lastSubmittedAt = now;

    document.getElementById("lastScan").textContent =
      itemId + " detected";
    setScannerStatus(
      "QR detected. Confirming " + itemId + "…",
      "ready"
    );

    const scanRequest = {
      token: activeToken,
      agreementNumber: currentOrder.agreementNumber,
      itemId: itemId,
      customerName: currentOrder.customerName || "Customer"
    };

    const scanPromise = activeFlow === "return"
      ? Launch1Api.recordReturnScan(scanRequest)
      : Launch1Api.recordPickupScan(scanRequest);

    scanPromise
      .then(function (response) {
        if (!response) {
          throw new Error(
            activeFlow === "return"
              ? "The return scan returned no response."
              : "The pickup scan returned no response."
          );
        }

        if (response.guidance) {
          renderGuidance(response.guidance);
        }

        if (response.ok !== true) {
          document.getElementById("lastScan").textContent =
            "Not accepted: " + itemId;
          setScannerStatus(
            response.message || "This item is not ready to scan yet.",
            "error"
          );
          return;
        }

        document.getElementById("lastScan").textContent =
          itemId + " accepted";
        setScannerStatus(
          response.message || ("Accepted: " + itemId + "."),
          "success"
        );
      })
      .catch(function (error) {
        document.getElementById("lastScan").textContent =
          "Confirmation failed: " + itemId;
        setScannerStatus(
          (activeFlow === "return"
            ? "Return scan was not saved: "
            : "Pickup scan was not saved: ") +
            (error && error.message ? error.message : String(error)),
          "error"
        );
      })
      .finally(function () {
        /*
         * Release immediately after authoritative backend resolution.
         * Same-code repeat suppression prevents accidental duplicate requests,
         * so no fixed post-response cooldown is needed.
         */
        scanInFlight = false;
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

  function renderHandoff(order) {
    document.getElementById("pickupAgreement").textContent =
      order.agreementNumber || "—";
    document.getElementById("pickupCustomer").textContent =
      order.customerName || "—";

    const isReturn = activeFlow === "return";

    document.getElementById("handoffStageLabel").textContent =
      isReturn ? "Return" : "Pickup";
    document.getElementById("handoffTitle").textContent =
      isReturn ? "Let’s return your rental." : "Let’s get your rental.";
    document.getElementById("handoffCopy").textContent =
      isReturn
        ? "You’ll scan each item as you return it so we can confirm everything is back."
        : "You’ll scan each item as you load it so we can confirm everything is correct.";
    document.getElementById("handoffActionTitle").textContent =
      "Open Camera";
    document.getElementById("handoffActionCopy").textContent =
      isReturn
        ? "The next screen will open your camera so you can scan each returned item."
        : "The next screen will open your camera so you can scan each item.";
  }

  function renderScannerContext() {
    const isReturn = activeFlow === "return";

    document.getElementById("lastScan").textContent =
      "No item scanned yet.";
    document.getElementById("scannerStageLabel").textContent =
      isReturn ? "Return Scanner" : "Pickup Scanner";
    document.getElementById("scannerTitle").textContent =
      isReturn ? "Return your items." : "Scan your items.";
    document.getElementById("scannerLead").textContent =
      "Hold each QR code inside the camera view.";
    document.getElementById("currentTask").textContent =
      isReturn ? "Loading return task…" : "Loading pickup task…";
    document.getElementById("taskProgressText").textContent =
      "Checking what remains";
  }

  function refreshGuidance() {
    if (!activeToken || !currentOrder || !currentOrder.agreementNumber) {
      setScannerStatus(
        "Order context is missing. Reopen the order link and try again.",
        "error"
      );
      return;
    }

    const payload = {
      token: activeToken,
      agreementNumber: currentOrder.agreementNumber
    };

    const guidancePromise = activeFlow === "return"
      ? Launch1Api.loadReturnGuidance(payload)
      : Launch1Api.loadPickupGuidance(payload);

    guidancePromise
      .then(function (response) {
        if (!response || response.ok !== true || !response.guidance) {
          throw new Error(
            (response && response.message) ||
              (activeFlow === "return"
                ? "Return guidance could not be loaded."
                : "Pickup guidance could not be loaded.")
          );
        }

        renderGuidance(response.guidance);
      })
      .catch(function (error) {
        document.getElementById("currentTask").textContent =
          activeFlow === "return"
            ? "Return your rental items"
            : "Scan your pickup items";
        document.getElementById("taskProgressText").textContent =
          "Guidance unavailable";
        setScannerStatus(
          error && error.message
            ? error.message
            : (activeFlow === "return"
                ? "Return guidance could not be loaded."
                : "Pickup guidance could not be loaded."),
          "error"
        );
      });
  }

  function renderGuidance(guidance) {
    const task = document.getElementById("currentTask");
    const remaining = document.getElementById("taskProgressText");

    if (guidance.complete === true) {
      task.textContent =
        activeFlow === "return" ? "Return Complete" : "Pickup Complete";
      remaining.textContent =
        activeFlow === "return"
          ? "Everything has been returned."
          : "Everything has been scanned.";
      return;
    }

    task.textContent =
      guidance.taskLabel ||
      ((activeFlow === "return" ? "Return " : "Scan ") +
        (guidance.currentCategory || "items"));

    remaining.textContent =
      guidance.remainingLabel ||
      String(guidance.remaining || 0) + " remaining";
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
