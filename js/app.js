<script>
(function () {
  "use strict";

  const screens = [
    { id: "welcome", screenId: "S-01", landmark: "Rentals Made Easy", template: "introduction", variant: "arrival", illustration: "W", illustrationLabel: "Big W Events shield logo", heading: "Big W Events", copy: "Rentals made easy.", promiseTitle: "Our Promise", promiseCopy: "We make renting for your event surprisingly easy.", actionLabel: "Start Pickup", next: "identity" },
    { id: "identity", screenId: "S-02", landmark: "Orientation", template: "introduction", illustration: "ID", illustrationLabel: "Identity verification illustration", heading: "Let’s confirm it’s you.", copy: "Enter your agreement number so we can open the right rental experience.", actionLabel: "Continue", next: "pickup-dashboard", hasIdentityForm: true },
    { id: "pickup-dashboard", screenId: "S-03", landmark: "Guided Pickup", template: "guided", illustration: "PK", illustrationLabel: "Pickup preparation illustration", heading: "Welcome, John.", copy: "Let’s get your rental.", focusEyebrow: "Pickup Items", focusTask: "Grab 6 Chairs", remainingText: "6 Remaining", progress: 0, cameraMessage: "Camera will prepare when scanning begins.", guidanceTitle: "Start with chairs.", guidanceCopy: "Project Victory will guide one task at a time.", actionLabel: "Continue Pickup", next: "pickup-scanner" },
    { id: "pickup-scanner", screenId: "S-04", landmark: "Guided Pickup", template: "guided", scannerEnabled: true, illustration: "PK", illustrationLabel: "Pickup guidance illustration", heading: "Welcome, John.", copy: "Let’s get your rental.", focusEyebrow: "Pickup Items", focusTask: "Grab 6 Chairs", remainingText: "6 Remaining", progress: 0, cameraMessage: "Tap Start Scanner when you are ready.", guidanceTitle: "Scan each item.", guidanceCopy: "Hold the QR code inside the frame after the camera starts.", actionLabel: "Placeholder Complete Pickup", next: "pickup-complete" },
    { id: "pickup-complete", screenId: "S-05", landmark: "Ready", template: "completion", variant: "completion", heading: "Your rental is ready.", copy: "Everything has been verified. Have an amazing event.", actionLabel: "Done", next: "return-dashboard" },
    { id: "return-dashboard", screenId: "S-06", landmark: "Guided Return", template: "guided", illustration: "RT", illustrationLabel: "Return preparation illustration", heading: "Welcome back, John.", copy: "Let’s return your rental.", focusEyebrow: "Return Items", focusTask: "Return 6 Chairs", remainingText: "6 Remaining", progress: 0, cameraMessage: "Camera will prepare when scanning begins.", guidanceTitle: "Start with chairs.", guidanceCopy: "Project Victory will guide one task at a time.", actionLabel: "Continue Return", next: "return-scanner" },
    { id: "return-scanner", screenId: "S-07", landmark: "Guided Return", template: "guided", scannerEnabled: true, illustration: "RT", illustrationLabel: "Return guidance illustration", heading: "Welcome back, John.", copy: "Let’s return your rental.", focusEyebrow: "Return Items", focusTask: "Return 6 Chairs", remainingText: "6 Remaining", progress: 0, cameraMessage: "Tap Start Scanner when you are ready.", guidanceTitle: "Scan each item.", guidanceCopy: "Hold the QR code inside the frame after the camera starts.", actionLabel: "Placeholder Complete Return", next: "return-complete" },
    { id: "return-complete", screenId: "S-08", landmark: "Complete", template: "completion", variant: "completion", heading: "Everything has been returned.", copy: "Thank you for choosing Big W Events.", actionLabel: "Done", next: "welcome" }
  ];

  const state = {
    activeScreenId: "welcome",
    scannerStatus: "idle",
    scannerScreenId: null,
    scannerReadyTimer: null,
    scannerLastResult: null,
    scannerStartRequested: false,
    rawCameraStream: null
  };

  const diagnostics = {
    browser: "",
    platform: "",
    secureContext: "unknown",
    mediaDevices: "unknown",
    getUserMedia: "unknown",
    permissionQuery: "not checked",
    permissionState: "unknown",
    html5Qrcode: "unknown",
    startQrScanner: "unknown",
    stopQrScanner: "unknown",
    readerDetected: "no",
    activeScannerScreenId: "none",
    scannerState: "idle",
    lastScannerError: "none",
    startupAttempted: "no",
    startupSucceeded: "no",
    startupFailed: "no",
    scanCallbackFired: "no",
    videoStarted: "not detected",
    lastRuntimeError: "none",
    rawGetUserMediaAttempted: "no",
    rawGetUserMediaSucceeded: "no",
    rawGetUserMediaError: "none",
    trustedGesturePath: "no"
  };

  window.addEventListener("error", function (event) {
    diagnostics.lastRuntimeError = event.message || "Runtime error captured.";
    renderDiagnostics();
  });

  window.addEventListener("unhandledrejection", function (event) {
    const reason = event.reason && (event.reason.message || event.reason.name || String(event.reason));
    diagnostics.lastRuntimeError = reason || "Unhandled promise rejection captured.";
    renderDiagnostics();
  });

  function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (typeof textContent === "string") element.textContent = textContent;
    return element;
  }

  function isValidScreenId(screenId) {
    return screens.some(function (screen) { return screen.id === screenId; });
  }

  function getScreenConfig(screenId) {
    return screens.find(function (screen) { return screen.id === screenId; });
  }

  function renderExperienceLandmark(screen) {
    return createElement("p", "experience-landmark", screen.landmark);
  }

  function renderExperienceHeader(screen) {
    const header = createElement("header", "experience-header");
    const illustrationClass = screen.variant === "arrival"
      ? "experience-header__illustration experience-header__illustration--brand"
      : "experience-header__illustration";
    const illustration = createElement("div", illustrationClass, screen.illustration);
    illustration.setAttribute("role", "img");
    illustration.setAttribute("aria-label", screen.illustrationLabel);
    header.append(illustration, createElement("h1", "", screen.heading), createElement("p", "", screen.copy));
    return header;
  }

  function renderBrandPromise(screen) {
    const promise = createElement("section", "brand-promise");
    promise.setAttribute("aria-label", "Big W Events promise");
    promise.append(createElement("strong", "", screen.promiseTitle), createElement("p", "", screen.promiseCopy));
    return promise;
  }

  function renderPrimaryAction(screen) {
    const button = createElement("button", "primary-action", screen.actionLabel);
    button.type = "button";
    button.dataset.nextScreen = screen.next;
    button.addEventListener("click", handlePrimaryAction);
    return button;
  }

  function renderIdentityForm() {
    const form = createElement("form", "identity-form");
    form.setAttribute("aria-label", "Agreement verification placeholder");

    const label = createElement("label", "identity-label", "Agreement Number");
    label.setAttribute("for", "agreement-number");

    const input = createElement("input", "identity-input");
    input.id = "agreement-number";
    input.name = "agreementNumber";
    input.type = "text";
    input.inputMode = "text";
    input.autocomplete = "off";
    input.placeholder = "Example: 134DA11";

    const guidance = createElement("p", "screen-meta", "Placeholder only. Agreement validation is not implemented in this package.");
    guidance.id = "agreement-number-guidance";
    input.setAttribute("aria-describedby", "agreement-number-guidance");

    form.append(label, input, guidance);
    form.addEventListener("submit", function (event) { event.preventDefault(); });
    return form;
  }

  function renderFocusCard(screen) {
    const card = createElement("section", "focus-card");
    card.setAttribute("aria-label", "Current rental task");

    const progress = createElement("div", "task-progress");
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Current task progress");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", String(screen.progress));

    const bar = createElement("div", "task-progress__bar");
    bar.style.setProperty("--progress-value", screen.progress + "%");
    progress.append(bar);

    card.append(
      createElement("p", "focus-card__eyebrow", screen.focusEyebrow),
      createElement("h2", "", screen.focusTask),
      createElement("p", "focus-card__remaining", screen.remainingText),
      progress
    );

    return card;
  }

  function renderCameraWorkspace(screen) {
    const workspace = createElement("section", "camera-workspace");
    workspace.setAttribute("aria-label", "Camera workspace");
    workspace.dataset.scannerState = "idle";

    const reader = createElement("div", "camera-workspace__reader");
    reader.dataset.readerTarget = "true";
    reader.setAttribute("aria-hidden", "true");

    const preview = createElement("div", "camera-workspace__preview");
    preview.setAttribute("aria-hidden", "true");

    const guide = createElement("div", "camera-workspace__guide");
    guide.setAttribute("aria-hidden", "true");

    const message = createElement("div", "camera-workspace__message", screen.cameraMessage);
    message.setAttribute("role", "status");

    workspace.append(reader, preview, guide, message);
    return workspace;
  }

  function renderScannerStartControl() {
    const button = createElement("button", "scanner-start scanner-start-button scanner-start--visible", "Start Scanner");
    button.type = "button";

    button.addEventListener("click", function () {
      directTapStartScanner();
    });

    return button;
  }

  function directTapStartScanner() {
    const screenConfig = getScreenConfig(state.activeScreenId);
    const activeScreen = document.querySelector('[data-screen-id="' + state.activeScreenId + '"]');

    diagnostics.trustedGesturePath = "yes";

    if (!screenConfig || !screenConfig.scannerEnabled || !activeScreen) {
      diagnostics.lastScannerError = "Scanner screen is not active.";
      diagnostics.startupFailed = "yes";
      setScannerStatus("error", "Scanner screen is not active.");
      return;
    }

    if (!prepareReaderTarget(activeScreen)) {
      diagnostics.lastScannerError = "Missing active reader target.";
      diagnostics.startupFailed = "yes";
      setScannerStatus("error", "Scanner target is missing.");
      return;
    }

    state.scannerStartRequested = true;
    state.scannerScreenId = state.activeScreenId;
    state.scannerStatus = "loading";

    diagnostics.activeScannerScreenId = state.scannerScreenId;
    diagnostics.startupAttempted = "yes";
    diagnostics.startupSucceeded = "no";
    diagnostics.startupFailed = "no";
    diagnostics.scanCallbackFired = "no";
    diagnostics.lastScannerError = "none";

    updateScannerStartVisibility(false);
    setScannerStatus("loading", "Starting camera…");

    if (typeof window.startQrScanner !== "function" || typeof window.Html5Qrcode === "undefined") {
      diagnostics.startupFailed = "yes";
      diagnostics.lastScannerError = "Scanner support missing: startQrScanner or Html5Qrcode unavailable.";
      updateScannerStartVisibility(true);
      setScannerStatus("error", "Scanner support is missing or still loading.");
      return;
    }

    try {
      window.startQrScanner(handleScanSuccess, handleScannerError);

      window.clearTimeout(state.scannerReadyTimer);
      state.scannerReadyTimer = window.setTimeout(function () {
        if (state.scannerScreenId === state.activeScreenId && state.scannerStatus === "loading") {
          diagnostics.startupSucceeded = "yes";
          setScannerStatus("ready", "Camera ready. Hold the QR code inside the frame.");
        }
      }, 1200);
    } catch (error) {
      handleScannerError(error);
    }
  }

  function renderRawCameraTestControl() {
    const button = createElement("button", "scanner-start raw-camera-test-button scanner-start--visible", "Test Camera Access");
    button.type = "button";

    button.addEventListener("click", function () {
      diagnostics.rawGetUserMediaAttempted = "yes";
      diagnostics.rawGetUserMediaSucceeded = "no";
      diagnostics.rawGetUserMediaError = "none";
      diagnostics.trustedGesturePath = "yes";
      setScannerStatus("loading", "Testing raw camera access…");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        diagnostics.rawGetUserMediaError = "NotSupportedError: navigator.mediaDevices.getUserMedia is unavailable";
        renderDiagnostics();
        return;
      }

      navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      }).then(function (stream) {
        diagnostics.rawGetUserMediaSucceeded = "yes";
        diagnostics.rawGetUserMediaError = "none";

        if (state.rawCameraStream) {
          state.rawCameraStream.getTracks().forEach(function (track) { track.stop(); });
        }

        state.rawCameraStream = stream;

        const activeScreen = document.querySelector('[data-screen-id="' + state.activeScreenId + '"]');
        const workspace = activeScreen && activeScreen.querySelector(".camera-workspace");

        if (workspace) {
          const existingVideo = workspace.querySelector('[data-raw-camera-video="true"]');
          if (existingVideo) existingVideo.remove();

          const video = document.createElement("video");
          video.setAttribute("playsinline", "");
          video.setAttribute("autoplay", "");
          video.setAttribute("muted", "");
          video.dataset.rawCameraVideo = "true";
          video.style.position = "absolute";
          video.style.inset = "0";
          video.style.zIndex = "1";
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.objectFit = "cover";
          video.srcObject = stream;
          workspace.append(video);
        }

        setScannerStatus("ready", "Raw camera access succeeded.");
      }).catch(function (error) {
        diagnostics.rawGetUserMediaSucceeded = "no";
        diagnostics.rawGetUserMediaError =
          (error && error.name ? error.name : "Error") + ": " +
          (error && error.message ? error.message : String(error));
        setScannerStatus("blocked", "Raw camera access failed.");
      });
    });

    return button;
  }

  function renderDiagnosticPanel() {
    const panel = createElement("section", "diagnostic-panel");
    panel.setAttribute("aria-label", "Camera runtime diagnostics");
    panel.append(createElement("h2", "diagnostic-panel__title", "Camera Diagnostics"), createElement("div", "diagnostic-panel__grid"));
    panel.querySelector(".diagnostic-panel__grid").dataset.diagnosticGrid = "true";
    return panel;
  }

  function renderGuidanceMessage(screen) {
    const message = createElement("section", "guidance-message");
    message.setAttribute("aria-label", "Guidance message");
    message.append(createElement("strong", "", screen.guidanceTitle), createElement("p", "", screen.guidanceCopy));
    return message;
  }

  function renderSupportActions() {
    const support = createElement("section", "support-actions");
    support.setAttribute("aria-label", "Support actions");
    const button = createElement("button", "secondary-action", "Need Help?");
    button.type = "button";
    button.addEventListener("click", function () {
      window.alert("Support experience placeholder. No support integration is implemented in this package.");
    });
    support.append(button);
    return support;
  }

  function renderCompletionPanel(screen) {
    const panel = createElement("section", "completion-panel");
    panel.setAttribute("tabindex", "-1");
    const icon = createElement("div", "completion-panel__icon", "✓");
    icon.setAttribute("aria-hidden", "true");
    panel.append(icon, createElement("h1", "", screen.heading), createElement("p", "", screen.copy));
    return panel;
  }

  function renderScreenMeta(screen) {
    return createElement("p", "screen-meta", screen.screenId);
  }

  function renderIntroductionTemplate(screen) {
    const template = createElement("div", screen.variant === "arrival" ? "template template--introduction template--arrival" : "template template--introduction");
    template.append(renderExperienceLandmark(screen), renderExperienceHeader(screen));
    if (screen.promiseTitle && screen.promiseCopy) template.append(renderBrandPromise(screen));
    if (screen.hasIdentityForm) template.append(renderIdentityForm());
    template.append(renderPrimaryAction(screen), renderScreenMeta(screen));
    return template;
  }

  function renderGuidedTemplate(screen) {
    const template = createElement("div", "template template--guided");
    template.append(
      renderExperienceLandmark(screen),
      renderExperienceHeader(screen),
      renderFocusCard(screen),
      renderCameraWorkspace(screen),
      renderGuidanceMessage(screen),
      renderSupportActions()
    );

    if (screen.scannerEnabled) {
      template.append(renderScannerStartControl(), renderRawCameraTestControl(), renderDiagnosticPanel());
    }

    template.append(renderPrimaryAction(screen), renderScreenMeta(screen));
    return template;
  }

  function renderCompletionTemplate(screen) {
    const template = createElement("div", "template template--completion");
    template.append(renderExperienceLandmark(screen), renderCompletionPanel(screen), renderPrimaryAction(screen), renderScreenMeta(screen));
    return template;
  }

  function renderScreen(screen) {
    const section = createElement("section", "screen");
    section.id = screen.id;
    section.dataset.screenId = screen.id;
    section.setAttribute("aria-labelledby", screen.id + "-label");

    let cardClass = "screen-card";
    if (screen.variant === "arrival") cardClass += " screen-card--arrival";
    if (screen.variant === "completion") cardClass += " screen-card--completion";

    const card = createElement("div", cardClass);

    if (screen.template === "introduction") card.append(renderIntroductionTemplate(screen));
    if (screen.template === "guided") card.append(renderGuidedTemplate(screen));
    if (screen.template === "completion") card.append(renderCompletionTemplate(screen));

    const label = card.querySelector("h1");
    if (label) label.id = screen.id + "-label";

    section.append(card);
    return section;
  }

  function renderApp() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = "";
    screens.forEach(function (screen) {
      app.append(renderScreen(screen));
    });

    initializeDiagnostics();
    initializeHistory();
    bindScannerLifecycleEvents();
    showScreen(state.activeScreenId, false, false);
  }

  function initializeDiagnostics() {
    diagnostics.browser = navigator.userAgent || "unknown";
    diagnostics.platform = navigator.platform || "unknown";
    diagnostics.secureContext = window.isSecureContext ? "true" : "false";
    diagnostics.mediaDevices = navigator.mediaDevices ? "available" : "missing";
    diagnostics.getUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? "available" : "missing";
    updateRuntimeDiagnostics();
    queryCameraPermission();
  }

  function updateRuntimeDiagnostics() {
    diagnostics.html5Qrcode = typeof window.Html5Qrcode === "undefined" ? "missing" : "available";
    diagnostics.startQrScanner = typeof window.startQrScanner === "function" ? "available" : "missing";
    diagnostics.stopQrScanner = typeof window.stopQrScanner === "function" ? "available" : "missing";
    diagnostics.readerDetected = document.getElementById("reader") ? "yes" : "no";
    diagnostics.activeScannerScreenId = state.scannerScreenId || "none";
    diagnostics.scannerState = state.scannerStatus;
    detectVideoStarted();
    renderDiagnostics();
  }

  function queryCameraPermission() {
    if (!navigator.permissions || !navigator.permissions.query) {
      diagnostics.permissionQuery = "not supported";
      diagnostics.permissionState = "unknown";
      renderDiagnostics();
      return;
    }

    navigator.permissions.query({ name: "camera" }).then(function (result) {
      diagnostics.permissionQuery = "supported";
      diagnostics.permissionState = result.state || "unknown";
      renderDiagnostics();

      result.onchange = function () {
        diagnostics.permissionState = result.state || "unknown";
        renderDiagnostics();
      };
    }).catch(function (error) {
      diagnostics.permissionQuery = "failed";
      diagnostics.permissionState = error && error.message ? error.message : "unknown";
      renderDiagnostics();
    });
  }

  function detectVideoStarted() {
    const activeScreen = document.querySelector('[data-screen-id="' + state.activeScreenId + '"]');
    const video = activeScreen && activeScreen.querySelector(".camera-workspace video");

    if (!video) {
      diagnostics.videoStarted = "no video element";
      return;
    }

    diagnostics.videoStarted = video.readyState >= 2 && video.videoWidth > 0
      ? "yes"
      : "video element present, not playing";
  }

  function renderDiagnostics() {
    document.querySelectorAll('[data-diagnostic-grid="true"]').forEach(function (grid) {
      grid.innerHTML = "";

      [
        ["Browser", diagnostics.browser],
        ["Platform", diagnostics.platform],
        ["Secure context", diagnostics.secureContext],
        ["mediaDevices", diagnostics.mediaDevices],
        ["getUserMedia", diagnostics.getUserMedia],
        ["Permission query", diagnostics.permissionQuery],
        ["Permission state", diagnostics.permissionState],
        ["Html5Qrcode", diagnostics.html5Qrcode],
        ["startQrScanner", diagnostics.startQrScanner],
        ["stopQrScanner", diagnostics.stopQrScanner],
        ["#reader detected", diagnostics.readerDetected],
        ["Scanner screen", diagnostics.activeScannerScreenId],
        ["Scanner state", diagnostics.scannerState],
        ["Last scanner error", diagnostics.lastScannerError],
        ["Startup attempted", diagnostics.startupAttempted],
        ["Startup succeeded", diagnostics.startupSucceeded],
        ["Startup failed", diagnostics.startupFailed],
        ["Scan callback fired", diagnostics.scanCallbackFired],
        ["Video started", diagnostics.videoStarted],
        ["Raw getUserMedia attempted", diagnostics.rawGetUserMediaAttempted],
        ["Raw getUserMedia succeeded", diagnostics.rawGetUserMediaSucceeded],
        ["Raw getUserMedia error", diagnostics.rawGetUserMediaError],
        ["Trusted gesture path", diagnostics.trustedGesturePath],
        ["Runtime error", diagnostics.lastRuntimeError]
      ].forEach(function (item) {
        const row = createElement("div", "diagnostic-row");
        row.append(
          createElement("div", "diagnostic-row__label", item[0]),
          createElement("div", "diagnostic-row__value", String(item[1]))
        );
        grid.append(row);
      });
    });
  }

  function initializeHistory() {
    const initialScreenId = getScreenIdFromHistory();
    if (initialScreenId && isValidScreenId(initialScreenId)) {
      state.activeScreenId = initialScreenId;
    }

    if (window.history && window.history.replaceState) {
      window.history.replaceState({ screenId: state.activeScreenId }, "", buildScreenUrl(state.activeScreenId));
    }

    window.addEventListener("popstate", handlePopState);
  }

  function bindScannerLifecycleEvents() {
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopScannerRuntime();
        return;
      }
      prepareScannerScreen();
    });

    window.addEventListener("beforeunload", stopScannerRuntime);
  }

  function getScreenIdFromHistory() {
    const params = new URLSearchParams(window.location.search);
    return params.get("screen");
  }

  function buildScreenUrl(screenId) {
    const url = new URL(window.location.href);
    url.searchParams.set("screen", screenId);
    return url.pathname + url.search + url.hash;
  }

  function pushScreenHistory(screenId) {
    if (!window.history || !window.history.pushState) return;
    window.history.pushState({ screenId: screenId }, "", buildScreenUrl(screenId));
  }

  function handlePopState(event) {
    const screenId = event.state && event.state.screenId;
    if (screenId && isValidScreenId(screenId)) {
      showScreen(screenId, true, false);
      return;
    }
    showScreen("welcome", true, false);
  }

  function handlePrimaryAction(event) {
    const nextScreen = event.currentTarget.dataset.nextScreen;
    if (!nextScreen) return;
    showScreen(nextScreen, true, true);
  }

  function showScreen(screenId, moveFocus, updateHistory) {
    const targetScreen = document.querySelector('[data-screen-id="' + screenId + '"]');
    if (!targetScreen) return;

    const previousScreen = getScreenConfig(state.activeScreenId);
    const nextScreen = getScreenConfig(screenId);

    if (previousScreen && previousScreen.scannerEnabled && (!nextScreen || !nextScreen.scannerEnabled || previousScreen.id !== nextScreen.id)) {
      stopScannerRuntime();
    }

    state.activeScreenId = screenId;
    state.scannerStartRequested = false;

    document.querySelectorAll(".screen").forEach(function (screen) {
      const isActive = screen.dataset.screenId === screenId;
      screen.classList.toggle("screen--active", isActive);
      screen.setAttribute("aria-hidden", String(!isActive));
    });

    if (updateHistory) pushScreenHistory(screenId);

    if (moveFocus) {
      const heading = targetScreen.querySelector("h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }

    prepareScannerScreen();
  }

  function prepareReaderTarget(screenElement) {
    document.querySelectorAll('[data-reader-target="true"]').forEach(function (target) {
      if (target.id === "reader") target.removeAttribute("id");
    });

    const readerTarget = screenElement.querySelector('[data-reader-target="true"]');
    if (readerTarget) readerTarget.id = "reader";

    diagnostics.readerDetected = readerTarget ? "yes" : "no";
    renderDiagnostics();
    return readerTarget;
  }

  function prepareScannerScreen() {
    const screenConfig = getScreenConfig(state.activeScreenId);
    const activeScreen = document.querySelector('[data-screen-id="' + state.activeScreenId + '"]');

    if (!screenConfig || !screenConfig.scannerEnabled || !activeScreen) {
      updateRuntimeDiagnostics();
      return;
    }

    prepareReaderTarget(activeScreen);
    setScannerStatus("idle", "Tap Start Scanner when you are ready.");
    updateScannerStartVisibility(true);
    updateRuntimeDiagnostics();
  }

  function updateScannerStartVisibility(isVisible) {
    const activeScreen = document.querySelector('[data-screen-id="' + state.activeScreenId + '"]');
    const startButton = activeScreen && activeScreen.querySelector(".scanner-start-button");
    if (startButton) startButton.classList.toggle("scanner-start--visible", Boolean(isVisible));
  }

  function setScannerStatus(status, detail) {
    state.scannerStatus = status;
    diagnostics.scannerState = status;

    const activeScreen = document.querySelector('[data-screen-id="' + state.activeScreenId + '"]');
    if (!activeScreen) {
      renderDiagnostics();
      return;
    }

    const workspace = activeScreen.querySelector(".camera-workspace");
    if (!workspace) {
      renderDiagnostics();
      return;
    }

    const message = workspace.querySelector(".camera-workspace__message");

    workspace.classList.remove(
      "camera-workspace--loading",
      "camera-workspace--ready",
      "camera-workspace--success",
      "camera-workspace--error"
    );

    if (status === "loading") workspace.classList.add("camera-workspace--loading");
    if (status === "ready") workspace.classList.add("camera-workspace--ready");
    if (status === "success") workspace.classList.add("camera-workspace--success");
    if (status === "error" || status === "blocked" || status === "unavailable") workspace.classList.add("camera-workspace--error");

    if (message) message.textContent = detail || status;

    updateRuntimeDiagnostics();
  }

  function classifyScannerError(error) {
    const text = String((error && (error.message || error.name)) || error || "").toLowerCase();
    diagnostics.lastScannerError = text || "unknown scanner error";

    if (
      text.indexOf("permission") !== -1 ||
      text.indexOf("notallowed") !== -1 ||
      text.indexOf("denied") !== -1 ||
      text.indexOf("not allowed") !== -1 ||
      text.indexOf("user agent") !== -1 ||
      text.indexOf("platform") !== -1
    ) return "blocked";

    if (text.indexOf("camera") !== -1 && text.indexOf("found") !== -1) return "unavailable";

    return "error";
  }

  function stopScannerRuntime() {
    window.clearTimeout(state.scannerReadyTimer);
    state.scannerReadyTimer = null;

    if (state.rawCameraStream) {
      state.rawCameraStream.getTracks().forEach(function (track) { track.stop(); });
      state.rawCameraStream = null;
    }

    if (typeof window.stopQrScanner === "function") {
      try {
        window.stopQrScanner();
      } catch (error) {
        diagnostics.lastScannerError = error && error.message ? error.message : "stopQrScanner failed.";
      }
    }

    state.scannerScreenId = null;
    diagnostics.activeScannerScreenId = "none";
    state.scannerStatus = "idle";
    diagnostics.scannerState = "idle";
    updateRuntimeDiagnostics();
  }

  function handleScanSuccess(decodedText) {
    state.scannerLastResult = decodedText;
    diagnostics.scanCallbackFired = "yes";
    diagnostics.startupSucceeded = "yes";
    setScannerStatus("success", "Scan received.");
  }

  function handleScannerError(error) {
    diagnostics.startupFailed = "yes";
    updateScannerStartVisibility(true);
    const status = classifyScannerError(error);
    setScannerStatus(status, "Scanner startup failed.");
  }

  document.addEventListener("DOMContentLoaded", renderApp);
})();
</script>
