Quagga.init({
  inputStream: {
    type: "LiveStream",
    target: document.querySelector("#scanner-container"),

    constraints: {
      width: { min: 1280 },
      height: { min: 720 },
      facingMode: "environment"
    },

    area: {
      top: "20%",
      right: "10%",
      left: "10%",
      bottom: "20%"
    }
  },

locator: {
  patchSize: "medium",
  halfSample: false
},

  decoder: {
    readers: [
      "code_128_reader",
      "code_39_reader"
    ]
  },

  locate: true
}, function (err) {
  if (err) {
    console.error(err);
    return;
  }

  console.log("Initialization finished. Ready to start");
  Quagga.start();
});

Quagga.onDetected(function (result) {
  console.log(result);

  const code = result.codeResult.code;
  console.log("Barcode detected:", code);
});