let scanner = null;

function startQrScanner(onSuccess, onError) {
  scanner = new Html5Qrcode("reader");

  Html5Qrcode.getCameras()
    .then(function(cameras) {
      if (!cameras || cameras.length === 0) {
        throw new Error("No camera found");
      }

      const cameraId = cameras[cameras.length - 1].id;

      return scanner.start(
        cameraId,
        { fps: 10, qrbox: 250 },
        onSuccess
      );
    })
    .catch(function(error) {
      onError(error);
    });
}

function stopQrScanner() {
  if (scanner) {
    scanner.stop().catch(function() {});
  }
}
