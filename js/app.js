(function () {
  "use strict";

  const state = {
    agreement: "",
    customer: "",
    flowType: "pickup",
    cartId: "",
    acceptedItems: new Set(),
    eventMessages: [],
    scannerStarted: false,
    lastQrPayload: "none",
    lastBackendAction: "none",
    lastBackendResult: "none",
    lastErrorLayer: "none"
  };

  const els = {};

  window.addEventListener("error", function(event) {
    state.lastErrorLayer = "runtime error";
    showEntryError("Project Victory could not start correctly: " + (event.message || "Runtime error."));
    updateDiagnostics();
  });

  window.addEventListener("unhandledrejection", function(event) {
    const reason = event.reason && (event.reason.message || event.reason.name || String(event.reason));
    state.lastErrorLayer = "unhandled promise rejection";
    showEntryError("Project Victory request failed: " + (reason || "Unknown request error."));
    updateDiagnostics();
  });

  document.addEventListener("DOMContentLoaded", initializeApp);

  function initializeApp() {
    cacheElements();

    const missing = requiredElementNames().filter(function(name) { return !els[name]; });
    if (missing.length > 0) {
      state.lastErrorLayer = "frontend initialization";
      showEntryError("Project Victory did not load correctly. Missing screen element(s): " + missing.join(", "));
      return;
    }

    els.continueButton.addEventListener("click", handleContinue);
    els.backToStartButton.addEventListener("click", function () { showScreen(els.startScreen); });
    els.enableCameraButton.addEventListener("click", handleEnableCameraTap);
    els.resumeButton.addEventListener("click", handleResumeProgress);
    els.doneButton.addEventListener("click", handleDone);
    els.saveButton.addEventListener("click", handleSaveProgress);
    els.restartButton.addEventListener("click", handleRestart);

    window.addEventListener("beforeunload", function (event) {
      if (state.scannerStarted && state.acceptedItems.size > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    });

    setEntryMessage("Ready. Enter an agreement number to continue.");
    updateDiagnostics();
  }

  function cacheElements() {
    [
      "startScreen", "cameraIntroScreen", "scannerScreen", "agreementInput", "customerInput", "flowTypeInput",
      "startMessage", "introFlowLabel", "introAgreement", "introCustomer", "introContext", "introMessage",
      "scannerFlowLabel", "scannerAgreement", "scannerCustomer", "acceptedCount", "acceptedScanList",
      "eventList", "scannerStatus", "diagnosticsOutput", "continueButton", "backToStartButton",
      "enableCameraButton", "resumeButton", "doneButton", "saveButton", "restartButton"
    ].forEach(function(id) {
      els[id] = document.getElementById(id);
    });
  }

  function requiredElementNames() {
    return [
      "startScreen", "cameraIntroScreen", "scannerScreen", "agreementInput", "customerInput", "flowTypeInput",
      "startMessage", "introFlowLabel", "introAgreement", "introCustomer", "introContext", "introMessage",
      "scannerFlowLabel", "scannerAgreement", "scannerCustomer", "acceptedCount", "acceptedScanList",
      "eventList", "scannerStatus", "diagnosticsOutput", "continueButton", "backToStartButton",
      "enableCameraButton", "resumeButton", "doneButton", "saveButton", "restartButton"
    ];
  }

  function handleContinue() {
    setEntryMessage("Continue pressed. Reading agreement…");
    state.lastErrorLayer = "none";
    state.lastBackendAction = "none";
    state.lastBackendResult = "none";
    updateDiagnostics();

    const agreement = String(els.agreementInput.value || "").trim();
    const customer = String(els.customerInput.value || "").trim();
    const flowType = String(els.flowTypeInput.value || "pickup").trim() || "pickup";

    if (!agreement) {
      state.lastErrorLayer = "frontend validation";
      showEntryError("Enter an agreement or order number to continue.");
      els.agreementInput.focus();
      updateDiagnostics();
      return;
    }

    state.agreement = agreement;
    state.customer = customer;
    state.flowType = flowType;
    state.cartId = "";
    state.acceptedItems = new Set();
    state.eventMessages = [];

    setEntryMessage("Loading order context for " + agreement + "…");
    updateDiagnostics();

    if (typeof projectVictoryApiCall !== "function") {
      state.lastErrorLayer = "frontend api bridge missing";
      showEntryError("Project Victory API bridge did not load. Confirm js/api.js is published in the GitHub repo.");
      updateDiagnostics();
      return;
    }

    callBackend("loadScanContext", { agreement: agreement, flowType: flowType })
      .then(function(response) {
        if (!response || typeof response !== "object") {
          state.lastErrorLayer = "malformed backend response";
          showEntryError("Project Victory returned an unexpected order response. Please retry after confirming the Apps Script deployment.");
          updateDiagnostics();
          return;
        }

        if (response.ok !== true) {
          state.lastErrorLayer = "backend returned a failure result";
          showEntryError(readableMessage(response, "Could not load this order. Confirm the agreement number and backend deployment."));
          updateDiagnostics();
          return;
        }

        state.cartId = response.cartId || agreement;
        state.customer = customer || response.customer || "";

        els.introFlowLabel.textContent = flowType === "pickup" ? "Pickup Scan" : "Return Scan";
        els.scannerFlowLabel.textContent = flowType === "pickup" ? "Pickup Scanner" : "Return Scanner";
        els.introAgreement.textContent = agreement;
        els.introCustomer.textContent = state.customer || "Customer name not entered";
        els.introContext.textContent = (response.assignedItems || []).length + " assigned item(s) in this order";
        els.scannerAgreement.textContent = agreement;
        els.scannerCustomer.textContent = state.customer || "Customer name not entered";
        els.introMessage.textContent = response.resumableSession ? "Saved progress is available for this order." : "Order context loaded.";

        setEntryMessage("");
        updateScanDisplay();
        updateDiagnostics();
        showScreen(els.cameraIntroScreen);
      })
      .catch(function(error) {
        state.lastErrorLayer = "frontend failed to call backend";
        showEntryError(error && error.message ? error.message : "Could not call Project Victory backend.");
        updateDiagnostics();
      });
  }

  function handleEnableCameraTap() {
    showScreen(els.scannerScreen);
    setScannerStatus("Camera is starting…");
    state.scannerStarted = true;

    if (typeof Html5Qrcode === "undefined") {
      state.lastErrorLayer = "scanner library missing";
      setScannerStatus("Scanner library did not load.", "error");
      updateDiagnostics();
      return;
    }

    startScannerEngine(handleScanSuccess, handleScanError);
  }

  function handleScanSuccess(decodedText) {
    const itemId = String(decodedText || "").trim();
    state.lastQrPayload = itemId || "empty";

    if (!itemId) {
      state.lastErrorLayer = "scanner produced no QR payload";
      setScannerStatus("No QR value was found. Try again.", "warning");
      updateDiagnostics();
      return;
    }

    const action = state.flowType === "return" ? "recordReturnScan" : "recordPickupScan";
    state.lastBackendAction = action;
    setScannerStatus("Checking item with Project Victory…");
    updateDiagnostics();

    callBackend(action, {
      agreement: state.agreement,
      cartId: state.cartId || state.agreement,
      itemId: itemId,
      user: "Customer"
    }).then(function(response) {
      handleBackendScanResponse(itemId, response);
    }).catch(function(error) {
      state.lastErrorLayer = "frontend failed to call backend";
      state.lastBackendResult = "request_failed";
      addEvent("Backend request failed: " + (error.message || String(error)));
      setScannerStatus("Could not reach Project Victory. Try again.", "error");
      updateDiagnostics();
    });
  }

  function handleBackendScanResponse(itemId, response) {
    if (!response || typeof response.result !== "string") {
      state.lastErrorLayer = "frontend received malformed backend response";
      state.lastBackendResult = "malformed";
      addEvent("Unexpected backend response for " + itemId);
      setScannerStatus("Project Victory returned an unexpected response. Try again.", "error");
      updateDiagnostics();
      return;
    }

    state.lastBackendResult = response.result;

    if (response.result === "success" && response.ok === true) {
      state.acceptedItems.add(itemId);
      addEvent("Accepted: " + itemId);
      updateScanDisplay();
      setScannerStatus("Accepted: " + itemId, "success");
      updateDiagnostics();
      return;
    }

    if (response.result === "duplicate") {
      addEvent("Duplicate: " + itemId);
      setScannerStatus(readableMessage(response, "That item was already scanned."), "warning");
      updateDiagnostics();
      return;
    }

    if (response.result === "incorrect_item") {
      addEvent("Wrong item: " + itemId);
      setScannerStatus(readableMessage(response, "That item does not belong to this order."), "error");
      updateDiagnostics();
      return;
    }

    if (response.result === "not_found") {
      addEvent("Item not found: " + itemId);
      setScannerStatus(readableMessage(response, "That item was not found."), "error");
      updateDiagnostics();
      return;
    }

    if (response.result === "not_checked_out") {
      addEvent("Not checked out: " + itemId);
      setScannerStatus(readableMessage(response, "That item was not checked out on this order."), "error");
      updateDiagnostics();
      return;
    }

    addEvent("Backend result: " + response.result + " for " + itemId);
    setScannerStatus(readableMessage(response, "Project Victory could not accept this scan."), "error");
    updateDiagnostics();
  }

  function handleScanError(error) {
    const message = error && (error.message || error.name) ? (error.name || "Error") + ": " + error.message : String(error || "");
    if (message) {
      setScannerStatus(message, "error");
    }
  }

  function handleSaveProgress() {
    callBackend("saveScanProgress", {
      agreement: state.agreement,
      cartId: state.cartId || state.agreement,
      flowType: state.flowType,
      progress: { acceptedItemIds: Array.from(state.acceptedItems), savedAt: new Date().toISOString() }
    }).then(function(response) {
      addEvent(readableMessage(response, "Scan progress saved."));
      setScannerStatus(readableMessage(response, "Scan progress saved."), response && response.ok ? "success" : "error");
      updateDiagnostics();
    }).catch(function(error) {
      addEvent("Save failed: " + (error.message || String(error)));
      setScannerStatus("Could not save progress. Try again.", "error");
      updateDiagnostics();
    });
  }

  function handleResumeProgress() {
    callBackend("resumeScanProgress", {
      agreement: state.agreement,
      cartId: state.cartId || state.agreement,
      flowType: state.flowType
    }).then(function(response) {
      if (response && response.result === "resumed" && response.progress) {
        const savedIds = response.progress.acceptedItemIds || response.progress.scannedItemIds || [];
        state.acceptedItems = new Set(savedIds);
        updateScanDisplay();
      }
      els.introMessage.textContent = readableMessage(response, "Resume check complete.");
      updateDiagnostics();
    }).catch(function(error) {
      els.introMessage.textContent = "Could not resume saved progress: " + (error.message || String(error));
      updateDiagnostics();
    });
  }

  function handleDone() {
    callBackend("completeScanProgress", {
      agreement: state.agreement,
      cartId: state.cartId || state.agreement,
      flowType: state.flowType
    }).finally(function() {
      stopScannerEngine().finally(function () {
        state.scannerStarted = false;
        setScannerStatus("Scanner stopped.");
        showScreen(els.cameraIntroScreen);
      });
    });
  }

  function handleRestart() {
    stopScannerEngine().finally(function () {
      setScannerStatus("Camera is starting…");
      startScannerEngine(handleScanSuccess, handleScanError);
    });
  }

  function callBackend(action, payload) {
    state.lastBackendAction = action;
    updateDiagnostics();
    return projectVictoryApiCall(action, payload).then(function(response) {
      state.lastBackendResult = response && response.result ? response.result : "response_received";
      updateDiagnostics();
      return response;
    });
  }

  function updateScanDisplay() {
    els.acceptedCount.textContent = String(state.acceptedItems.size);
    els.acceptedScanList.innerHTML = "";
    Array.from(state.acceptedItems).forEach(function (item) {
      const li = document.createElement("li");
      li.textContent = item;
      els.acceptedScanList.appendChild(li);
    });
    els.eventList.innerHTML = "";
    state.eventMessages.slice(-8).forEach(function(message) {
      const li = document.createElement("li");
      li.textContent = message;
      els.eventList.appendChild(li);
    });
  }

  function addEvent(message) {
    state.eventMessages.push(new Date().toLocaleTimeString() + " — " + message);
    updateScanDisplay();
  }

  function setScannerStatus(message, tone) {
    if (!els.scannerStatus) return;
    els.scannerStatus.textContent = message;
    els.scannerStatus.classList.toggle("scanner-status--error", tone === "error");
    els.scannerStatus.classList.toggle("scanner-status--warning", tone === "warning");
    els.scannerStatus.classList.toggle("scanner-status--success", tone === "success");
  }

  function showScreen(screen) {
    [els.startScreen, els.cameraIntroScreen, els.scannerScreen].forEach(function (item) {
      item.classList.toggle("screen--active", item === screen);
    });
  }

  function readableMessage(response, fallback) {
    return response && response.message ? response.message : fallback;
  }

  function setEntryMessage(message) {
    if (els.startMessage) {
      els.startMessage.textContent = message;
      els.startMessage.classList.remove("helper-text--error");
    }
  }

  function showEntryError(message) {
    if (els.startMessage) {
      els.startMessage.textContent = message;
      els.startMessage.classList.add("helper-text--error");
    }
  }

  function updateDiagnostics() {
    if (!els.diagnosticsOutput) return;
    els.diagnosticsOutput.textContent = JSON.stringify({
      agreement: state.agreement,
      flowType: state.flowType,
      cartId: state.cartId,
      lastQrPayload: state.lastQrPayload,
      lastBackendAction: state.lastBackendAction,
      lastBackendResult: state.lastBackendResult,
      lastErrorLayer: state.lastErrorLayer,
      acceptedCount: state.acceptedItems ? state.acceptedItems.size : 0
    }, null, 2);
  }
})();
