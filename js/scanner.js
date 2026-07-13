let scanner = null;

function startScannerEngine(onSuccess) {
  const reader = document.getElementById("reader");

  if (!reader) {
    return Promise.reject(new Error("Scanner reader target was not found."));
  }

  const readerWidth = Math.floor(reader.getBoundingClientRect().width);

  if (!readerWidth) {
    return Promise.reject(new Error("Scanner reader target has no visible width."));
  }

  scanner = new Html5Qrcode("reader");

  return Html5Qrcode.getCameras()
    .then(function (cameras) {
      if (!cameras || cameras.length === 0) {
        throw new Error("No camera found.");
      }

      const cameraId = cameras[cameras.length - 1].id;

      return scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: function (viewfinderWidth, viewfinderHeight) {
            const edge = Math.max(
              180,
              Math.min(250, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72))
            );

            return {
              width: edge,
              height: edge
            };
          }
        },
        onSuccess
      );
    });
}

function stopScannerEngine() {
  if (!scanner) {
    return Promise.resolve();
  }

  const activeScanner = scanner;
  scanner = null;

  return activeScanner.stop()
    .catch(function () {})
    .then(function () {
      return activeScanner.clear().catch(function () {});
    });
}
