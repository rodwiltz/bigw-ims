
let agreementNumber = "";
let customerName = "";
let sessionId = "";
let scannedItems = new Set();
let saving = false;

const STAFF_PIN = "1234";

function showScreen(id) {
  document.querySelectorAll(".card").forEach(function(card) {
    card.classList.add("hidden");
  });

  document.getElementById(id).classList.remove("hidden");
}

function goHome() {
  stopQrScanner();
  scannedItems.clear();
  saving = false;
  showScreen("home");
}

function showCustomerReturn() {
  showScreen("customerReturn");
}

function showStaffLogin() {
  showScreen("staffLogin");
}

function startCustomerReturn() {
  agreementNumber = document.getElementById("agreementNumber").value.trim();
  customerName = document.getElementById("customerName").value.trim();

  if (!agreementNumber) {
    alert("Please enter your agreement or order number.");
    return;
  }

  sessionId = "RET-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  scannedItems.clear();

  document.getElementById("agreementDisplay").innerText =
    "Agreement: " + agreementNumber;

  document.getElementById("scanCount").innerText = "0";
  document.getElementById("scanList").innerHTML = "";
  document.getElementById("status").innerText = "Starting camera...";

  showScreen("scannerScreen");

  startQrScanner(onScanSuccess, function() {
    document.getElementById("status").innerHTML =
      "<span class='error'>Camera access was blocked. Please open this page directly in Safari or Chrome and allow camera access.</span>";
  });
}

function onScanSuccess(decodedText) {
  const itemId = decodedText.trim();

  if (!itemId || saving) return;

  if (scannedItems.has(itemId)) {
    document.getElementById("status").innerHTML =
      "<span class='error'>Already scanned: " + itemId + "</span>";
    return;
  }

  saving = true;
  document.getElementById("status").innerText = "Saving " + itemId + "...";

  saveReturnScan({
    agreementNumber: agreementNumber,
    customerName: customerName,
    action: "Return",
    itemId: itemId,
    sessionId: sessionId
  })
    .then(function() {
      scannedItems.add(itemId);
      saving = false;

      document.getElementById("scanCount").innerText = scannedItems.size;
      document.getElementById("status").innerHTML =
        "<span class='success'>✅ " + itemId + " recorded</span>";
      document.getElementById("scanList").innerHTML += "✅ " + itemId + "<br>";

      if (navigator.vibrate) navigator.vibrate(150);
    })
    .catch(function() {
      saving = false;
      document.getElementById("status").innerHTML =
        "<span class='error'>Save failed. Please try again.</span>";
    });
}

function finishReturn() {
  stopQrScanner();
  document.getElementById("finalCount").innerText = scannedItems.size;
  showScreen("doneScreen");
}

function staffLogin() {
  const pin = document.getElementById("staffPin").value.trim();

  if (pin === STAFF_PIN) {
    showScreen("staffHome");
  } else {
    alert("Incorrect PIN");
  }
}
