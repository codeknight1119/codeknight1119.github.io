const scanner = document.querySelector("#scanner-container");

Quagga.init({
  inputStream: {
    type: "LiveStream",
    target: scanner,

    constraints: {
      width: { min: 1280 },
      height: { min: 720 },
      facingMode: "user"
    }
  },

  locator: {
    patchSize: "large",
    halfSample: false
  },

  decoder: {
    readers: [
      "code_128_reader"
    ]
  },

  locate: true,

  frequency: 10
}, function (err) {
  if (err) {
    console.error("Quagga initialization error:", err);
    return;
  }

  console.log("Quagga initialized");
  Quagga.start();

  // Check what camera resolution we actually got
  setTimeout(() => {
    const video = scanner.querySelector("video");

    if (video) {
      console.log(
        "Video resolution:",
        video.videoWidth,
        "x",
        video.videoHeight
      );
    }
  }, 1000);
});


Quagga.onDetected(function (result) {
  const code = result.codeResult?.code;

  if (!code) {
    return;
  }

  console.log("================================");
  console.log("BARCODE DETECTED!");
  console.log("CAPID:", code);
  console.log("================================");

  alert("Barcode detected!\n\n" + code);
});