const scanner = document.querySelector("#scanner-container");

// --------------------------------------------------
// Debug display
// --------------------------------------------------

const debug = document.createElement("pre");

debug.style.fontFamily = "monospace";
debug.style.fontSize = "14px";
debug.style.padding = "10px";
debug.style.background = "#111";
debug.style.color = "#fff";
debug.style.whiteSpace = "pre-wrap";

document.body.appendChild(debug);


// --------------------------------------------------
// Decode tracking
// --------------------------------------------------

let lastCode = null;
let codeCount = 0;


// --------------------------------------------------
// Initialize Quagga
// --------------------------------------------------

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

        // Keep the full camera resolution
        halfSample: false
    },

    decoder: {

        readers: [
            "code_128_reader"
        ],

        multiple: false
    },

    locate: true,

    frequency: 10

}, function (err) {

    if (err) {

        console.error("Quagga initialization error:", err);

        debug.textContent =
            "ERROR INITIALIZING QUAGGA\n\n" +
            err;

        return;
    }

    console.log("Quagga initialized successfully.");

    debug.textContent =
        "Quagga initialized.\n" +
        "Starting camera...";

    Quagga.start();


    // --------------------------------------------------
    // Check actual camera resolution
    // --------------------------------------------------

    setTimeout(function () {

        const video = scanner.querySelector("video");

        if (video) {

            console.log(
                "Video resolution:",
                video.videoWidth,
                "x",
                video.videoHeight
            );

            debug.textContent =
                "Camera running\n" +
                "Resolution: " +
                video.videoWidth +
                " x " +
                video.videoHeight;
        }

    }, 1000);

});


// --------------------------------------------------
// Processed frame
//
// This fires even when Quagga DOES NOT decode
// a barcode.
// --------------------------------------------------

Quagga.onProcessed(function (result) {

    if (!result) {
        return;
    }


    // --------------------------------------------------
    // Debug information
    // --------------------------------------------------

    let status = "Camera running\n";


    // --------------------------------------------------
    // Possible barcode regions
    // --------------------------------------------------

    if (result.boxes && result.boxes.length > 0) {

        status +=
            "Possible regions: " +
            result.boxes.length +
            "\n";

        console.log(
            "Possible barcode regions:",
            result.boxes
        );

    } else {

        status +=
            "Possible regions: 0\n";
    }


    // --------------------------------------------------
    // Best region
    // --------------------------------------------------

    if (result.box) {

        status += "Best region detected!\n";

        console.log(
            "BEST BARCODE REGION:",
            result.box
        );

    }


    // --------------------------------------------------
    // Decode information
    // --------------------------------------------------

    if (result.codeResult) {

        status +=
            "Decoder returned something!\n";

        console.log(
            "CODE RESULT:",
            result.codeResult
        );

    }


    debug.textContent = status;


    // --------------------------------------------------
    // Draw regions on the camera
    // --------------------------------------------------

    const drawingCtx = Quagga.canvas.ctx.overlay;
    const drawingCanvas = Quagga.canvas.dom.overlay;

    if (!drawingCtx || !drawingCanvas) {
        return;
    }


    // Clear previous frame

    drawingCtx.clearRect(
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height
    );


    // --------------------------------------------------
    // Draw possible regions in GREEN
    // --------------------------------------------------

    if (result.boxes) {

        result.boxes
            .filter(function (box) {

                return box !== result.box;

            })
            .forEach(function (box) {

                Quagga.ImageDebug.drawPath(
                    box,
                    {
                        x: 0,
                        y: 1
                    },
                    drawingCtx,
                    {
                        color: "green",
                        lineWidth: 2
                    }
                );

            });
    }


    // --------------------------------------------------
    // Draw best region in RED
    // --------------------------------------------------

    if (result.box) {

        Quagga.ImageDebug.drawPath(
            result.box,
            {
                x: 0,
                y: 1
            },
            drawingCtx,
            {
                color: "red",
                lineWidth: 3
            }
        );
    }

});


// --------------------------------------------------
// Barcode successfully decoded
// --------------------------------------------------

Quagga.onDetected(function (result) {

    console.log(
        "================================"
    );

    console.log(
        "BARCODE DETECTED!"
    );

    console.log(
        result
    );

    console.log(
        "================================"
    );


    const code = result.codeResult?.code;


    if (!code) {

        console.log(
            "Detection occurred, but no code was returned."
        );

        return;
    }


    console.log(
        "Decoded Code:",
        code
    );


    // --------------------------------------------------
    // Track repeated successful decodes
    // --------------------------------------------------

    if (code === lastCode) {

        codeCount++;

    } else {

        lastCode = code;

        codeCount = 1;
    }


    console.log(
        "Same code seen:",
        codeCount,
        "time(s)"
    );


    // --------------------------------------------------
    // Update debug display
    // --------------------------------------------------

    debug.textContent +=
        "\n\nDECODED:\n" +
        code +
        "\n" +
        "Seen " +
        codeCount +
        " time(s)";


    // --------------------------------------------------
    // Confirm after two matching detections
    // --------------------------------------------------

    if (codeCount >= 2) {

        console.log(
            "================================"
        );

        console.log(
            "CONFIRMED BARCODE:",
            code
        );

        console.log(
            "================================"
        );


        alert(
            "CAPID: " + code
        );


        // Reset

        lastCode = null;

        codeCount = 0;
    }

});