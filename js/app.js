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
  let pickupTasks = [];
  let genericAcceptedCount = 0;

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
        pickupTasks = buildPickupTasks(currentOrder.itemSummary);
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
      setGuidance(
        "Camera unavailable.",
        "Refresh the page and tap Open Camera again."
      );
      return;
    }

    if (typeof startScannerEngine !== "function") {
      setScannerStatus(
        "Scanner support is not available. Please refresh and try again.",
        "error"
      );
      setGuidance(
        "Camera unavailable.",
        "Refresh the page and tap Open Camera again."
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
        setGuidance(
          "Place the QR code inside the square.",
          "Keep the item steady until we confirm the scan."
        );
      })
      .catch(function (error) {
        scannerStarted = false;
        setScannerStatus(
          "Scanner could not start: " +
            (error && error.message ? error.message : String(error)),
          "error"
        );
        setGuidance(
          "Camera access is needed.",
          "Allow camera access, then reopen this order link and try again."
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
    setScannerStatus("Checking " + itemId + "…", "ready");

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
        applyAcceptedScanToTask(response.category);
        renderCurrentTask();

        setScannerStatus(
          "Confirmed: " + itemId + ".",
          "success"
        );
        setGuidance(
          "Item confirmed.",
          "Keep going with the current task."
        );
      })
      .catch(function (error) {
        setScannerStatus(
          "Pickup scan was not saved: " +
            (error && error.message ? error.message : String(error)),
          "error"
        );
        setGuidance(
          "That scan was not saved.",
          "Keep the QR code in the frame and try again."
        );
      })
      .finally(function () {
        window.setTimeout(function () {
          scanInFlight = false;
        }, 1200);
      });
  }

  function buildPickupTasks(itemSummary) {
    const source = String(itemSummary || "").trim();

    if (!source) {
      return [];
    }

    return source
      .split(/[,;]+/)
      .map(function (part) {
        const clean = part.trim();
        const match = clean.match(/^(\d+)\s+(.+)$/);

        if (!match) {
          return null;
        }

        return {
          total: Number(match[1]),
          label: match[2].trim(),
          scanned: 0
        };
      })
      .filter(Boolean);
  }

  function applyAcceptedScanToTask(category) {
    const normalizedCategory = normalizeCategory(category);
    let matchingTask = null;

    pickupTasks.some(function (task) {
      if (
        task.scanned < task.total &&
        categoriesMatch(normalizedCategory, normalizeCategory(task.label))
      ) {
        matchingTask = task;
        return true;
      }

      return false;
    });

    if (!matchingTask) {
      matchingTask = pickupTasks.find(function (task) {
        return task.scanned < task.total;
      });
    }

    if (matchingTask) {
      matchingTask.scanned = Math.min(
        matchingTask.total,
        matchingTask.scanned + 1
      );
    } else {
      genericAcceptedCount += 1;
    }
  }

  function categoriesMatch(first, second) {
    return first === second ||
      first.indexOf(second) !== -1 ||
      second.indexOf(first) !== -1;
  }

  function normalizeCategory(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .replace(/s$/, "");
  }

  function renderCurrentTask() {
    const task = pickupTasks.find(function (candidate) {
      return candidate.scanned < candidate.total;
    });

    const title = document.getElementById("currentTask");
    const progressText = document.getElementById("taskProgressText");
    const progress = document.getElementById("taskProgress");
    const bar = document.getElementById("taskProgressBar");

    if (!task) {
      title.textContent = pickupTasks.length
        ? "Current pickup task complete"
        : "Scan your pickup items";

      progressText.textContent = pickupTasks.length
        ? "All listed tasks confirmed"
        : genericAcceptedCount + " item" +
          (genericAcceptedCount === 1 ? "" : "s") + " confirmed";

      progress.setAttribute("aria-valuemax", "1");
      progress.setAttribute("aria-valuenow", pickupTasks.length ? "1" : "0");
      bar.style.width = pickupTasks.length ? "100%" : "0%";
      return;
    }

    const remaining = Math.max(0, task.total - task.scanned);
    const percentage = task.total
      ? Math.round((task.scanned / task.total) * 100)
      : 0;

    title.textContent = "Scan " + task.label;
    progressText.textContent =
      task.scanned + " of " + task.total + " scanned • " +
      remaining + " remaining";

    progress.setAttribute("aria-valuemax", String(task.total));
    progress.setAttribute("aria-valuenow", String(task.scanned));
    bar.style.width = percentage + "%";
  }

  function renderHandoffTask() {
    const task = pickupTasks.find(function (candidate) {
      return candidate.scanned < candidate.total;
    });

    document.getElementById("handoffTask").textContent = task
      ? "Scan " + task.label
      : "Scan your pickup items";

    document.getElementById("handoffRemaining").textContent = task
      ? task.total + " ready to scan"
      : "Your items are ready.";
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

    renderHandoffTask();
  }

  function renderScannerContext(order) {
    document.getElementById("scannerAgreement").textContent =
      order.agreementNumber || "—";
    document.getElementById("scannerCustomer").textContent =
      order.customerName || "—";
    document.getElementById("lastScan").textContent =
      "No item scanned yet.";

    renderCurrentTask();
  }

  function setScannerStatus(message, tone) {
    const status = document.getElementById("scannerStatus");

    status.textContent = message;
    status.classList.toggle("scanner-status--ready", tone === "ready");
    status.classList.toggle("scanner-status--success", tone === "success");
    status.classList.toggle("scanner-status--error", tone === "error");
  }

  function setGuidance(title, copy) {
    document.getElementById("guidanceTitle").textContent = title;
    document.getElementById("guidanceCopy").textContent = copy;
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
