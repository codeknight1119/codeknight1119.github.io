Quagga.init({
  inputStream: {
    type: "LiveStream",
    target: document.querySelector("#scanner-container"),

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
    ],

    multiple: false
  },

  locate: true,

  frequency: 20

}, function (err) {

  if (err) {
    console.error("Quagga error:", err);
    return;
  }

  console.log("Quagga ready");
  Quagga.start();
});

let lastCode = null;
let codeCount = 0;

Quagga.onDetected(function (result) {

  const code = result.codeResult?.code;

  if (!code) return;

  console.log("Possible decode:", code);

  if (code === lastCode) {
    codeCount++;
  } else {
    lastCode = code;
    codeCount = 1;
  }

  console.log(`Seen ${codeCount} time(s)`);

  // Accept after seeing the same code 2 times
  if (codeCount >= 2) {

    console.log("================================");
    console.log("CONFIRMED BARCODE:", code);
    console.log("================================");

    alert("CAPID: " + code);

    // Prevent repeatedly accepting the same barcode
    codeCount = 0;
    lastCode = null;
  }
});