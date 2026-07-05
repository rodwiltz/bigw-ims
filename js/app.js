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

  const startScreen = document.getElementById("startScreen");
  const cameraIntroScreen = document.getElementById("cameraIntroScreen");
  const scannerScreen = document.getElementById("scannerScreen");
  const agreementInput = document.getElementById("agreementInput");
  const customerInput = document.getElementById("customerInput");
  const flowTypeInput = document.getElementById("flowTypeInput");
  const startMessage = document.getElementById("startMessage");
  const introFlowLabel = document.getElementById("introFlowLabel");
  const introAgreement = document.getElementById("introAgreement");
  const introCustomer = document.getElementById("introCustomer");
  const introContext = document.getElementById("introContext");
  const introMessage = document.getElementById("introMessage");
  const scannerFlowLabel = document.getElementById("scannerFlowLabel");
  const scannerAgreement = document.getElementById("scannerAgreement");
  const scannerCustomer = document.getElementById("scannerCustomer");
  const acceptedCount = document.getElementById("acceptedCount");
  const acceptedScanList = document.getElementById("acceptedScanList");
  const eventList = document.getElementById("eventList");
  const scannerStatus = document.getElementById("scannerStatus");
  const diagnosticsOutput = document.getElementById("diagnosticsOutput");

  document.getElementById("continueButton").addEventListener("click", handleContinue);
  document.getElementById("backToStartButton").addEventListener("click", function () { showScreen(startScreen); });
  document.getElementById("enableCameraButton").addEventListener("click", handleEnableCameraTap);
  document.getElementById("resumeButton").addEventListener("click", handleResumeProgress);
  document.getElementById("doneButton").addEventListener("click", handleDone);
  document.getElementById("saveButton").addEventListener("click", handleSaveProgress);
  document.getElementById("restartButton").addEventListener("click", handleRestart);

  window.addEventListener("beforeunload", function (event) {
    if (state.scannerStarted && state.acceptedItems.size > 0) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  function handleContinue() {
    const agreement = agreementInput.value.trim();
    const customer = customerInput.value.trim();
    const flowType = flowTypeInput.value;

    if (!agreement) {
      startMessage.textContent = "Enter an agreement or order number to continue.";
      agreementInput.focus();
      return;
    }

    state.agreement = agreement;
    state.customer = customer;
    state.flowType = flowType;
    state.acceptedItems = new Set();
    state.eventMessages = [];

    startMessage.textContent = "Loading order context…";
    callBackend("loadScanContext", { agreement: agreement, flowType: flowType })
      .then(function(response) {
        if (!response || response.ok !== true) {
          state.lastErrorLayer = "backend returned a failure result";
          startMessage.textContent = readableMessage(response, "Could not load this order.");
          updateDiagnostics();
          return;
        }

        state.cartId = response.cartId || agreement;
        state.customer = customer || response.customer || "";
        introFlowLabel.textContent = flowType === "pickup" ? "Pickup Scan" : "Return Scan";
        scannerFlowLabel.textContent = flowType === "pickup" ? "Pickup Scanner" : "Return Scanner";
        introAgreement.textContent = agreement;
        introCustomer.textContent = state.customer || "Customer name not entered";
        introContext.textContent = (response.assignedItems || []).length + " assigned item(s) in this order";
        scannerAgreement.textContent = agreement;
        scannerCustomer.textContent = state.customer || "Customer name not entered";
        introMessage.textContent = response.resumableSession ? "Saved progress is available for this order." : "Order context loaded.";
        startMessage.textContent = "";
        updateScanDisplay();
        showScreen(cameraIntroScreen);
      })
      .catch(function(error) {
        state.lastErrorLayer = "frontend failed to call backend";
        startMessage.textContent = error.message;
        updateDiagnostics();
      });
  }

  function handleEnableCameraTap() {
    showScreen(scannerScreen);
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
      addEvent("Backend request failed: " + error.message);
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
    }).catch(function(error) {
      addEvent("Save failed: " + error.message);
      setScannerStatus("Could not save progress. Try again.", "error");
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
      introMessage.textContent = readableMessage(response, "Resume check complete.");
      updateDiagnostics();
    }).catch(function(error) {
      introMessage.textContent = "Could not resume saved progress: " + error.message;
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
        showScreen(cameraIntroScreen);
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
    acceptedCount.textContent = String(state.acceptedItems.size);
    acceptedScanList.innerHTML = "";
    Array.from(state.acceptedItems).forEach(function (item) {
      const li = document.createElement("li");
      li.textContent = item;
      acceptedScanList.appendChild(li);
    });
    eventList.innerHTML = "";
    state.eventMessages.slice(-8).forEach(function(message) {
      const li = document.createElement("li");
      li.textContent = message;
      eventList.appendChild(li);
    });
  }

  function addEvent(message) {
    state.eventMessages.push(new Date().toLocaleTimeString() + " — " + message);
    updateScanDisplay();
  }

  function setScannerStatus(message, tone) {
    scannerStatus.textContent = message;
    scannerStatus.classList.toggle("scanner-status--error", tone === "error");
    scannerStatus.classList.toggle("scanner-status--warning", tone === "warning");
    scannerStatus.classList.toggle("scanner-status--success", tone === "success");
  }

  function showScreen(screen) {
    [startScreen, cameraIntroScreen, scannerScreen].forEach(function (item) {
      item.classList.toggle("screen--active", item === screen);
    });
  }

  function readableMessage(response, fallback) {
    return response && response.message ? response.message : fallback;
  }

  function updateDiagnostics() {
    diagnosticsOutput.textContent = JSON.stringify({
      agreement: state.agreement,
      flowType: state.flowType,
      cartId: state.cartId,
      lastQrPayload: state.lastQrPayload,
      lastBackendAction: state.lastBackendAction,
      lastBackendResult: state.lastBackendResult,
      lastErrorLayer: state.lastErrorLayer,
      acceptedCount: state.acceptedItems.size
    }, null, 2);
  }
})();
