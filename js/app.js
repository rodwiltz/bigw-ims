(function () {
  "use strict";

  const screens = [
    {
      id: "welcome",
      screenId: "S-01",
      template: "introduction",
      illustration: "🎪",
      illustrationLabel: "Event rental setup illustration",
      heading: "Welcome.",
      copy: "Big W Events is ready to guide your rental pickup one step at a time.",
      actionLabel: "Start Pickup",
      next: "identity"
    },
    {
      id: "identity",
      screenId: "S-02",
      template: "introduction",
      illustration: "✓",
      illustrationLabel: "Identity verification illustration",
      heading: "Let’s confirm it’s you.",
      copy: "Enter your agreement number so we can open the right rental experience.",
      actionLabel: "Continue",
      next: "pickup-dashboard",
      hasIdentityForm: true
    },
    {
      id: "pickup-dashboard",
      screenId: "S-03",
      template: "guided",
      illustration: "📦",
      illustrationLabel: "Pickup preparation illustration",
      heading: "Let’s get your rental.",
      copy: "Start with the item shown below and Big W Events will guide the rest.",
      focusEyebrow: "Pickup Items",
      focusTask: "Load Chairs",
      remainingText: "6 Remaining",
      progress: 0,
      guidanceTitle: "Ready to begin.",
      guidanceCopy: "Scan each item as you load it.",
      actionLabel: "Open Scanner",
      next: "pickup-scanner"
    },
    {
      id: "pickup-scanner",
      screenId: "S-04",
      template: "guided",
      illustration: "📷",
      illustrationLabel: "Pickup scanner illustration",
      heading: "Scan as you load.",
      copy: "Keep scanning each rental item until the current task is complete.",
      focusEyebrow: "Current Task",
      focusTask: "Load Chairs",
      remainingText: "6 Remaining",
      progress: 0,
      cameraMessage: "Camera workspace ready.",
      guidanceTitle: "Scan each item.",
      guidanceCopy: "Routine scan results will appear inside the camera workspace.",
      actionLabel: "Placeholder Complete Pickup",
      next: "pickup-complete"
    },
    {
      id: "pickup-complete",
      screenId: "S-05",
      template: "completion",
      heading: "Your rental is ready.",
      copy: "Everything has been verified. Have a great event!",
      actionLabel: "Done",
      next: "return-dashboard"
    },
    {
      id: "return-dashboard",
      screenId: "S-06",
      template: "guided",
      illustration: "↩",
      illustrationLabel: "Return preparation illustration",
      heading: "Welcome back.",
      copy: "Let’s return your rental and make sure everything is checked in.",
      focusEyebrow: "Return Items",
      focusTask: "Return Chairs",
      remainingText: "6 Remaining",
      progress: 0,
      guidanceTitle: "Ready to return.",
      guidanceCopy: "Scan each item as you place it back.",
      actionLabel: "Open Scanner",
      next: "return-scanner"
    },
    {
      id: "return-scanner",
      screenId: "S-07",
      template: "guided",
      illustration: "📷",
      illustrationLabel: "Return scanner illustration",
      heading: "Scan as you return.",
      copy: "Keep scanning each rental item as you place it back.",
      focusEyebrow: "Current Task",
      focusTask: "Return Chairs",
      remainingText: "6 Remaining",
      progress: 0,
      cameraMessage: "Camera workspace ready.",
      guidanceTitle: "Scan each item.",
      guidanceCopy: "Routine scan results will appear inside the camera workspace.",
      actionLabel: "Placeholder Complete Return",
      next: "return-complete"
    },
    {
      id: "return-complete",
      screenId: "S-08",
      template: "completion",
      heading: "Everything has been returned.",
      copy: "Thank you for choosing Big W Events.",
      actionLabel: "Done",
      next: "welcome"
    }
  ];

  const state = {
    activeScreenId: "welcome"
  };

  function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (typeof textContent === "string") {
      element.textContent = textContent;
    }

    return element;
  }

  function renderExperienceHeader(screen) {
    const header = createElement("header", "experience-header");

    const illustration = createElement("div", "experience-header__illustration", screen.illustration);
    illustration.setAttribute("role", "img");
    illustration.setAttribute("aria-label", screen.illustrationLabel);

    const heading = createElement("h1", "", screen.heading);
    const copy = createElement("p", "", screen.copy);

    header.append(illustration, heading, copy);

    return header;
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
    input.setAttribute("aria-describedby", "agreement-number-guidance");

    const guidance = createElement(
      "p",
      "screen-meta",
      "Placeholder only. Agreement validation is not implemented in this package."
    );
    guidance.id = "agreement-number-guidance";

    form.append(label, input, guidance);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
    });

    return form;
  }

  function renderFocusCard(screen) {
    const card = createElement("section", "focus-card");
    card.setAttribute("aria-label", "Current rental task");

    const eyebrow = createElement("p", "focus-card__eyebrow", screen.focusEyebrow);
    const heading = createElement("h2", "", screen.focusTask);
    const remaining = createElement("p", "focus-card__remaining", screen.remainingText);

    const progress = createElement("div", "task-progress");
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Current task progress");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", String(screen.progress));

    const bar = createElement("div", "task-progress__bar");
    bar.style.setProperty("--progress-value", `${screen.progress}%`);

    progress.append(bar);
    card.append(eyebrow, heading, remaining, progress);

    return card;
  }

  function renderCameraWorkspace(screen) {
    const workspace = createElement("section", "camera-workspace");
    workspace.setAttribute("aria-label", "Camera workspace placeholder");

    const preview = createElement("div", "camera-workspace__preview");
    preview.setAttribute("aria-hidden", "true");

    const guide = createElement("div", "camera-workspace__guide");
    guide.setAttribute("aria-hidden", "true");

    const message = createElement("div", "camera-workspace__message", screen.cameraMessage || "Camera workspace ready.");
    message.setAttribute("role", "status");

    workspace.append(preview, guide, message);

    return workspace;
  }

  function renderGuidanceMessage(screen) {
    const message = createElement("section", "guidance-message");
    message.setAttribute("aria-label", "Guidance message");

    const title = createElement("strong", "", screen.guidanceTitle);
    const copy = createElement("p", "", screen.guidanceCopy);

    message.append(title, copy);

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

    const heading = createElement("h1", "", screen.heading);
    const copy = createElement("p", "", screen.copy);

    panel.append(icon, heading, copy);

    return panel;
  }

  function renderScreenMeta(screen) {
    return createElement("p", "screen-meta", screen.screenId);
  }

  function renderIntroductionTemplate(screen) {
    const template = createElement("div", "template template--introduction");

    template.append(renderExperienceHeader(screen));

    if (screen.hasIdentityForm) {
      template.append(renderIdentityForm());
    }

    template.append(renderPrimaryAction(screen), renderScreenMeta(screen));

    return template;
  }

  function renderGuidedTemplate(screen) {
    const template = createElement("div", "template template--guided");

    template.append(
      renderExperienceHeader(screen),
      renderFocusCard(screen)
    );

    if (screen.id.includes("scanner")) {
      template.append(renderCameraWorkspace(screen));
    }

    template.append(
      renderGuidanceMessage(screen),
      renderSupportActions(),
      renderPrimaryAction(screen),
      renderScreenMeta(screen)
    );

    return template;
  }

  function renderCompletionTemplate(screen) {
    const template = createElement("div", "template template--completion");

    template.append(
      renderCompletionPanel(screen),
      renderPrimaryAction(screen),
      renderScreenMeta(screen)
    );

    return template;
  }

  function renderScreen(screen) {
    const section = createElement("section", "screen");
    section.id = screen.id;
    section.dataset.screenId = screen.id;
    section.setAttribute("aria-labelledby", `${screen.id}-label`);

    const card = createElement("div", "screen-card");

    if (screen.template === "introduction") {
      card.append(renderIntroductionTemplate(screen));
    }

    if (screen.template === "guided") {
      card.append(renderGuidedTemplate(screen));
    }

    if (screen.template === "completion") {
      card.append(renderCompletionTemplate(screen));
    }

    const label = card.querySelector("h1");
    if (label) {
      label.id = `${screen.id}-label`;
    }

    section.append(card);

    return section;
  }

  function renderApp() {
    const app = document.getElementById("app");

    if (!app) {
      return;
    }

    app.innerHTML = "";

    screens.forEach(function (screen) {
      app.append(renderScreen(screen));
    });

    showScreen(state.activeScreenId, false);
  }

  function handlePrimaryAction(event) {
    const nextScreen = event.currentTarget.dataset.nextScreen;

    if (!nextScreen) {
      return;
    }

    showScreen(nextScreen, true);
  }

  function showScreen(screenId, moveFocus) {
    const targetScreen = document.querySelector(`[data-screen-id="${screenId}"]`);

    if (!targetScreen) {
      return;
    }

    state.activeScreenId = screenId;

    document.querySelectorAll(".screen").forEach(function (screen) {
      const isActive = screen.dataset.screenId === screenId;
      screen.classList.toggle("screen--active", isActive);
      screen.setAttribute("aria-hidden", String(!isActive));
    });

    if (moveFocus) {
      const heading = targetScreen.querySelector("h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
  }

  document.addEventListener("DOMContentLoaded", renderApp);
})();
