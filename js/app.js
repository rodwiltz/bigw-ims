(function () {
  "use strict";

  const BACKEND_SCAN_URL = "";

  const state = {
    agreement: "",
    customer: "",
    scannedItems: new Set(),
    scannerStarted: false
  };

  const startScreen = document.getElementById("startScreen");
  const cameraIntroScreen = document.getElementById("cameraIntroScreen");
  const scannerScreen = document.getElementById("scannerScreen");

  const agreementInput = document.getElementById("agreementInput");
  const customerInput = document.getElementById("customerInput");
  const startMessage = document.getElementById("startMessage");

  const introAgreement = document.getElementById("introAgreement");
  const introCustomer = document.getElementById("introCustomer");
  const scannerAgreement = document.getElementById("scannerAgreement");
  const scannerCustomer = document.getElementById("scannerCustomer");
  const scanCount = document.getElementById("scanCount");
  const scanList = document.getElementById("scanList");
  const scannerStatus = document.getElementById("scannerStatus");

  document.getElementById("continueButton").addEventListener("click", handleContinue);

  document.getElementById("backToStartButton").addEventListener("click", function () {
    showScreen(startScreen);
  });

  document.getElementById("enableCameraButton").addEventListener("click", handleEnableCameraTap);
  document.getElementById("doneButton").addEventListener("click", handleDone);
  document.getElementById("restartButton").addEventListener("click", handleRestart);

  function handleContinue() {
    const agreement = agreementInput.value.trim();
    const customer = customerInput.value.trim();

    if (!agreement) {
      startMessage.textContent = "Enter an agreement or order number to continue.";
      agreementInput.focus();
      return;
    }

    state.agreement = agreement;
    state.customer = customer;

    introAgreement.textContent = agreement;
    introCustomer.textContent = customer || "Customer name not entered";

    showScreen(cameraIntroScreen);
  }

  function handleEnableCameraTap() {
    scannerAgreement.textContent = state.agreement;
    scannerCustomer.textContent = state.customer || "Customer name not entered";
    updateScanDisplay();

    showScreen(scannerScreen);

    setScannerStatus("Camera is starting…");
    state.scannerStarted = true;

    if (typeof Html5Qrcode === "undefined") {
      setScannerStatus("Scanner library did not load.", true);
      return;
    }

    startScannerEngine(handleScanSuccess, handleScanError);
  }

  function handleScanSuccess(decodedText) {
    const value = String(decodedText || "").trim();

    if (!value) {
      return;
    }

    if (state.scannedItems.has(value)) {
      setScannerStatus("Already scanned: " + value);
      return;
    }

    state.scannedItems.add(value);
    updateScanDisplay();
    setScannerStatus("Scanned: " + value, false, true);
    recordScan(value);
  }

  function handleScanError(error) {
    const message = error && (error.message || error.name)
      ? (error.name || "Error") + ": " + error.message
      : String(error || "");

    if (message) {
      setScannerStatus(message, true);
    }
  }

  function handleDone() {
    stopScannerEngine().finally(function () {
      state.scannerStarted = false;
      setScannerStatus("Scanner stopped.");
      showScreen(cameraIntroScreen);
    });
  }

  function handleRestart() {
    stopScannerEngine().finally(function () {
      state.scannedItems.clear();
      updateScanDisplay();
      setScannerStatus("Camera is starting…");
      startScannerEngine(handleScanSuccess, handleScanError);
    });
  }

  function updateScanDisplay() {
    scanCount.textContent = String(state.scannedItems.size);
    scanList.innerHTML = "";

    Array.from(state.scannedItems).forEach(function (item) {
      const li = document.createElement("li");
      li.textContent = item;
      scanList.appendChild(li);
    });
  }

  function setScannerStatus(message, isError, isSuccess) {
    scannerStatus.textContent = message;
    scannerStatus.classList.toggle("scanner-status--error", Boolean(isError));
    scannerStatus.classList.toggle("scanner-status--success", Boolean(isSuccess));
  }

  function showScreen(screen) {
    [startScreen, cameraIntroScreen, scannerScreen].forEach(function (item) {
      item.classList.toggle("screen--active", item === screen);
    });
  }

  function recordScan(itemId) {
    if (!BACKEND_SCAN_URL) {
      console.log("Backend scan recording stubbed.", {
        agreement: state.agreement,
        customer: state.customer,
        itemId: itemId,
        scannedAt: new Date().toISOString()
      });
      return;
    }

    fetch(BACKEND_SCAN_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify({
        agreement: state.agreement,
        customer: state.customer,
        itemId: itemId,
        scannedAt: new Date().toISOString()
      })
    }).catch(function (error) {
      console.warn("Backend scan recording failed.", error);
    });
  }
})();

