let scanner = null;

function startScannerEngine(onSuccess, onError) {
  scanner = new Html5Qrcode("reader");

  return Html5Qrcode.getCameras()
    .then(function(cameras) {
      if (!cameras || cameras.length === 0) throw new Error("No camera found");
      const cameraId = cameras[cameras.length - 1].id;
      return scanner.start(cameraId, { fps: 10, qrbox: 250 }, onSuccess);
    })
    .catch(function(error) {
      onError(error);
    });
}

function stopScannerEngine() {
  if (!scanner) return Promise.resolve();
  return scanner.stop().catch(function() {}).finally(function() { scanner = null; });
}
