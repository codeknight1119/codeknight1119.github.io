Quagga.init({
  inputStream: {
    type: "LiveStream",
    target: document.querySelector('#scanner-container')
  },
  decoder: {
    readers: ["code_128_reader", "code_39_reader"]
  }
}, function(err) {
  if (err) {
    console.error(err);
    return;
  }
  console.log("Initialization finished. Ready to start");
  Quagga.start();
});

Quagga.onDetected(function(result) {
    console.log(result)
  const code = result.codeResult.code;
  console.log("Barcode detected:", code);
  //alert("Found barcode: " + code);
});