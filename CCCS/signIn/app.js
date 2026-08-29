const scanner = document.querySelector("#scanner-container");


// ==================================================
// DEBUG DISPLAY
// ==================================================

const debug = document.createElement("pre");

debug.style.fontFamily = "monospace";
debug.style.fontSize = "14px";
debug.style.padding = "10px";
debug.style.background = "#111";
debug.style.color = "#fff";
debug.style.whiteSpace = "pre-wrap";

document.body.appendChild(debug);


// ==================================================
// DECODE TRACKING
// ==================================================

let lastCode = null;
let codeCount = 0;


// ==================================================
// QUAGGA INITIALIZATION
// ==================================================

Quagga.init({

    inputStream: {

        type: "LiveStream",

        target: scanner,

        constraints: {
            width: { min: 1280 },
            height: { min: 720 },
            facingMode: "user"
        },

        // This makes Quagga consider the whole camera
        // rather than restricting the input area.
        area: {
            top: "0%",
            right: "0%",
            left: "0%",
            bottom: "0%"
        }
    },


    // ==================================================
    // LOCATOR
    // ==================================================

    locator: {

        patchSize: "medium",

        // Do NOT reduce the image
        halfSample: false
    },


    // ==================================================
    // DECODER
    // ==================================================

    decoder: {

        readers: [
            "code_128_reader"
        ],

        multiple: false
    },


    // ==================================================
    // GENERAL
    // ==================================================

    locate: true,

    frequency: 10

}, function (err) {

    if (err) {

        console.error(
            "Quagga initialization error:",
            err
        );

        debug.textContent =
            "QUAGGA ERROR\n\n" +
            err;

        return;
    }


    console.log(
        "Quagga initialized successfully."
    );

    debug.textContent =
        "Quagga initialized.\n" +
        "Starting camera...";


    Quagga.start();


    // ==================================================
    // CAMERA RESOLUTION
    // ==================================================

    setTimeout(function () {

        const video =
            scanner.querySelector("video");

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


// ==================================================
// PROCESSED FRAME
// ==================================================

Quagga.onProcessed(function (result) {

    if (!result) {
        return;
    }


    let status =
        "CAMERA RUNNING\n\n";


    // ==================================================
    // POSSIBLE REGIONS
    // ==================================================

    if (
        result.boxes &&
        result.boxes.length > 0
    ) {

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


    // ==================================================
    // BEST REGION
    // ==================================================

    if (result.box) {

        status +=
            "BEST REGION FOUND\n";

        console.log(
            "BEST REGION:",
            result.box
        );
    }


    // ==================================================
    // DRAW DEBUG BOXES
    // ==================================================

    const drawingCtx =
        Quagga.canvas.ctx.overlay;

    const drawingCanvas =
        Quagga.canvas.dom.overlay;


    if (
        drawingCtx &&
        drawingCanvas
    ) {

        drawingCtx.clearRect(
            0,
            0,
            drawingCanvas.width,
            drawingCanvas.height
        );


        // ----------------------------------------------
        // Green = possible regions
        // ----------------------------------------------

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


        // ----------------------------------------------
        // Red = best region
        // ----------------------------------------------

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
    }


    // ==================================================
    // UPDATE DEBUG TEXT
    // ==================================================

    debug.textContent = status;

});


// ==================================================
// DETECTION
// ==================================================

Quagga.onDetected(function (result) {

    console.log(
        "================================"
    );

    console.log(
        "DETECTION EVENT"
    );

    console.log(
        result
    );

    console.log(
        "================================"
    );


    const code =
        result.codeResult?.code;


    if (!code) {

        console.log(
            "Detection event had no code."
        );

        return;
    }


    console.log(
        "DECODED:",
        code
    );


    // ==================================================
    // TRACK REPEATED DECODES
    // ==================================================

    if (code === lastCode) {

        codeCount++;

    } else {

        lastCode = code;

        codeCount = 1;
    }


    console.log(
        "Same code seen:",
        codeCount
    );


    debug.textContent +=
        "\n\n====================\n" +
        "DECODED!\n" +
        "CODE: " +
        code +
        "\n" +
        "COUNT: " +
        codeCount +
        "\n" +
        "====================";


    // ==================================================
    // CONFIRM
    // ==================================================

    if (codeCount >= 2) {

        console.log(
            "CONFIRMED CAPID:",
            code
        );

        alert(
            "CAPID: " + code
        );

        lastCode = null;
        codeCount = 0;
    }

});