const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwmKZPRkM--y7nuxHfZ_7sHO-9kHLSupOjfLBnHIRTFdjUms5XE06ffJsNf_lrsp5OjUA/exec";

function saveReturnScan(data) {
  return fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain"
    },
    body: JSON.stringify(data)
  });
}
