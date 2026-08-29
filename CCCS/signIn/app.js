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
    ]
  },

  locate: true
}, function (err) {

  if (err) {
    console.error("Quagga error:", err);
    return;
  }

  console.log("Quagga ready");
  Quagga.start();
});


/*
 * This fires for EVERY processed frame,
 * even when a barcode wasn't decoded.
 */
Quagga.onProcessed(function (result) {

  if (!result) {
    return;
  }

  console.log("Frame processed");

  if (result.boxes) {
    console.log("Possible barcode regions:", result.boxes);
  }

  if (result.box) {
    console.log("Best barcode region:", result.box);
  }

  if (result.codeResult) {
    console.log("Code result:", result.codeResult);
  }
});


/*
 * This ONLY fires when Quagga actually decodes something.
 */
Quagga.onDetected(function (result) {

  console.log("================================");
  console.log("BARCODE DETECTED");
  console.log(result);
  console.log("================================");

  const code = result.codeResult?.code;

  if (code) {
    alert("Barcode detected: " + code);
  }
});

const debug = document.querySelector("#debug");

Quagga.onProcessed(function (result) {

  if (!result) return;

  let text = "Processing camera...\n";

  if (result.boxes && result.boxes.length > 0) {
    text += `Possible regions: ${result.boxes.length}\n`;
  } else {
    text += "No barcode regions found\n";
  }

  if (result.codeResult) {
    text += `Decoded: ${result.codeResult.code}\n`;
  }

  debug.textContent = text;
});

Quagga.onProcessed(function (result) {

  const drawingCtx = Quagga.canvas.ctx.overlay;
  const drawingCanvas = Quagga.canvas.dom.overlay;

  if (!drawingCtx || !drawingCanvas) {
    return;
  }

  drawingCtx.clearRect(
    0,
    0,
    drawingCanvas.width,
    drawingCanvas.height
  );

  if (result) {

    if (result.boxes) {
      result.boxes
        .filter(function (box) {
          return box !== result.box;
        })
        .forEach(function (box) {
          Quagga.ImageDebug.drawPath(
            box,
            { x: 0, y: 1 },
            drawingCtx,
            {
              color: "green",
              lineWidth: 2
            }
          );
        });
    }

    if (result.box) {
      Quagga.ImageDebug.drawPath(
        result.box,
        { x: 0, y: 1 },
        drawingCtx,
        {
          color: "red",
          lineWidth: 3
        }
      );
    }
  }
});