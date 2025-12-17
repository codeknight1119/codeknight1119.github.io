<template>
  <dialog id="my_modal_1" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">{{ modalTitle }}</h3>
      <p class="py-4">{{ modalContent }}</p>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn">Close</button>
        </form>
      </div>
    </div>
  </dialog>

  <nav class="navbar px-6">
    <div class="flex-1">
      <img src="/logo.svg" alt="DynamiK team logo" class="h-8 auto" v-if="!isDarkTheme" />
      <img src="/logo-dark.svg" alt="DynamiK team logo" class="h-8 auto" v-else />
    </div>

    <div class="flex-1 flex justify-end space-x-2">
      <button
        class="btn btn-sm btn-ghost"
        aria-labelledby="Go to github repository"
        onclick="window.open('https://github.com/SuhJae/vex-image')"
      >
        <Github :size="20" />
      </button>

      <label class="cursor-pointer grid place-items-center">
        <input
          type="checkbox"
          v-model="isDarkTheme"
          class="toggle bg-base-content row-start-1 col-start-1 col-span-2"
        />
        <Sun :size="14" color="currentColor" class="col-start-1 row-start-1" />
        <Moon :size="14" class="col-start-2 row-start-1" />
      </label>
    </div>
  </nav>

  <section class="h-[30vh] px-8 pt-[5vh]">
    <div class="flex justify-center items-center h-full flex-col">
      <h1 class="font-bold text-center text-2xl sm:text-4xl">VEX Robotics Image Converter</h1>
      <p class="font-light text-center text-sm sm:text-lg">
        Convert PNG images into ready-to-use VEX Robotics code
      </p>
    </div>
  </section>

  <section class="flex justify-center items-center p-4">
    <div class="p-3 md:p-6 bg-base rounded-lg border max-w-4xl w-full">
      <h2 class="font-bold text-2xl md:text-3xl">How to use</h2>
      <p class="pb-4 text-sm md:text-base">
        Use any image editing software you like to create a 480×240 pixel PNG image that you want to
        display on the VEX Brain's whole screen (Transparency is supported). Then, upload the image
        using the file input below. The code will be generated and displayed for you to copy or
        download. Insert the code into your VEX C++ project and call the
        <code class="border rounded-md text-primary">drawLogo()</code> method to display the image.
      </p>

      <div class="flex space-x-2 justify-between">
        <input
          type="file"
          class="file-input w-full max-w-xs file-input-ghost file-input-bordered"
          @change="handleFileUpload"
          accept="image/png"
          multiple
        />

        <div class="flex space-x-2">
          <button
            class="btn btn-accent btn-square btn-outline"
            @click="copyCode"
            aria-labelledby="copy generated code"
            :disabled="!generatedCode"
          >
            <Clipboard :size="20" v-if="!recentlyCopied" />
            <ClipboardCheck :size="20" v-else />
          </button>

          <button
            class="btn btn-accent btn-square btn-outline"
            @click="downloadCode"
            aria-labelledby="download generated code"
            :disabled="!generatedCode"
          >
            <Download :size="20" />
          </button>
        </div>
      </div>

      <div v-if="debugStats.hasData" class="mt-4 text-xs font-mono break-all p-4 bg-base-200 rounded">
        <p class="font-bold">Debug Stats:</p>
        <p><strong>Color Indices:</strong> {{ debugStats.colorIndices.join(', ') }}</p>
        <br>
        <p><strong>Image Indices:</strong> {{ debugStats.imageIndices.join(', ') }}</p>
        <br>
        <p><strong>Image Counts:</strong> {{ debugStats.imageCounts.join(', ') }}</p>
      </div>

      <div v-if="generatedCode">
        <div class="mt-2 md:mt-4 p-6 rounded-lg max-h-96 overflow-scroll justify-center border code-block">
          <pre v-html="highlightedCode" class="language-cpp"></pre>
        </div>

        <p class="pt-2">
          Code size:
          <span class=" font-mono">{{ generatedCode.length.toLocaleString() }}</span> bytes
        </p>
      </div>
      <p class="text-sm text-gray-500 mt-3">
        <span class="font-bold">Note:</span> All data is processed locally in your browser. No data
        ever leaves your device.
      </p>
    </div>
  </section>
</template>

<style>
[data-theme='light'] .code-block {
  scrollbar-color: #e5e7eb transparent;
  scrollbar-width: thin;
}

[data-theme='dark'] .code-block {
  scrollbar-color: #1b1f25 transparent;
  scrollbar-width: thin;
}
</style>

<script setup>
import { watch, ref, onMounted } from 'vue'
import { Sun, Moon, Download, Clipboard, ClipboardCheck, Github } from 'lucide-vue-next'
import hljs from 'highlight.js'
// import '/src/assets/code.css' // Ensure this path is correct for your project structure

// ========== Theme Management ==========
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
const isDarkTheme = ref(prefersDark)

// Handle media query listeners safely
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      isDarkTheme.value = event.matches
    })
}

onMounted(() => {
  watch(
    isDarkTheme,
    (newValue) => {
      document.documentElement.setAttribute('data-theme', newValue ? 'dark' : 'light')
    },
    { immediate: true }
  )
})

// ========== Code Generation ==========
const uploadedImage = ref(null)
const generatedCode = ref('')
const highlightedCode = ref('')

const modalTitle = ref('')
const modalContent = ref('')

// FIXED: Created a reactive object to store debug stats instead of document.getElementById
const debugStats = ref({
    hasData: false,
    colorIndices: [],
    imageIndices: [],
    imageCounts: []
})

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (file) {
    const img = new Image()
    img.onload = function () {
      if (img.width === 480 && img.height === 240) {
        uploadedImage.value = img
        processImage()
      } else {
        modalTitle.value = 'Invalid Image Size'
        modalContent.value = `Image must be PNG format and have a size of 480×240 pixels. Your image is ${img.width}×${img.height} pixels.`
        document.getElementById('my_modal_1').showModal()
        event.target.value = ''
      }
    }
    img.src = URL.createObjectURL(file)
  }
}

function processImage() {
  const canvas = document.createElement('canvas')
  canvas.width = uploadedImage.value.width
  canvas.height = uploadedImage.value.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(uploadedImage.value, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data

  const encodedImage = encodeImage(imageData, canvas.width, canvas.height)
  generatedCode.value = generateCpp(encodedImage)
}

function encodeImage(imageData, width, height) {
  let encodedImage = []
  let currentColor = null
  let repeatCount = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      const r = imageData[index]
      const g = imageData[index + 1]
      const b = imageData[index + 2]
      const a = imageData[index + 3]
      let color = ''

      if (a !== 0) {
        // Hex conversion
        color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      }

      if (color === currentColor) {
        repeatCount++
      } else {
        if (currentColor !== null) {
          encodedImage.push([currentColor, repeatCount])
        }
        currentColor = color
        repeatCount = 1
      }
    }
  }

  encodedImage.push([currentColor, repeatCount])
  return encodedImage
}

function generateCpp(encodedImage) {
  // Local variables to track stats
  var l_gifData_colorIndices = [];
  var l_gifData_imageIndices = [];
  var l_gifData_imageCounts = [];

  let cppCode = '#include "vex.h"\n\nusing namespace vex;\n\nvoid drawLogo() {\n'
  cppCode += '    static const char* imageColors[] = {\n        '

  const uniqueColors = [
    ...new Set(encodedImage.map((item) => item[0]).filter((color) => color !== ''))
  ]
  const colorIndices = {}
  
  uniqueColors.forEach((color, index) => {
    colorIndices[color] = index
    cppCode += `"${color}", `
    if(!l_gifData_colorIndices.includes(color)){
      l_gifData_colorIndices.push(color)
    }
  })

  cppCode += '\n    };\n\n    static const int imageIndices[] = {\n        '
  encodedImage.forEach((item) => {
    const index = item[0] === '' ? -1 : colorIndices[item[0]]
    cppCode += `${index}, `
    if(!l_gifData_imageIndices.includes(index)){
      l_gifData_imageIndices.push(index)
    }
  })

  cppCode += '\n    };\n\n    static const int imageCounts[] = {\n        '
  encodedImage.forEach((item) => {
    cppCode += `${item[1]}, `
    if(!l_gifData_imageCounts.includes(item[1])){
      l_gifData_imageCounts.push(item[1])
    }
  })

  cppCode += '\n    };\n'
  cppCode += '    int x = 0, y = 0;\n'
  cppCode += '    for(int i = 0; i < sizeof(imageIndices) / sizeof(imageIndices[0]); ++i) {\n'
  cppCode += '        int index = imageIndices[i];\n'
  cppCode += '        int count = imageCounts[i];\n'
  cppCode += '        if(index >= 0) {\n'
  cppCode += '            const char* color = imageColors[index];\n'
  cppCode += '            Brain.Screen.setPenColor(color);\n'
  // Optimization Tip: Drawing lines/rects is faster than pixels for VEX V5
  cppCode += '            for(int j = 0; j < count; ++j) {\n'
  cppCode += '                Brain.Screen.drawPixel(x++, y);\n'
  cppCode += '                if(x >= 480) { x = 0; y++; }\n'
  cppCode += '            }\n'
  cppCode += '        } else {\n'
  cppCode += '            x += count;\n'
  cppCode += '            while(x >= 480) { x -= 480; y++; }\n'
  cppCode += '        }\n'
  cppCode += '    }\n'
  cppCode += '}\n'

  // FIXED: Update the reactive debug stats BEFORE returning
  debugStats.value = {
      hasData: true,
      colorIndices: l_gifData_colorIndices,
      imageIndices: l_gifData_imageIndices,
      imageCounts: l_gifData_imageCounts
  }

  return cppCode
}

function downloadCode() {
  const blob = new Blob([generatedCode.value], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'imageCode.cpp'
  link.click()
}

watch(generatedCode, (newValue) => {
  if (newValue) {
    highlightedCode.value = hljs.highlight(newValue, { language: 'cpp' }).value
  }
})

onMounted(() => {
  hljs.highlightAll()
})

const recentlyCopied = ref(false)

const copyCode = () => {
  navigator.clipboard.writeText(generatedCode.value)
  recentlyCopied.value = true
  setTimeout(() => {
    recentlyCopied.value = false
  }, 1500)
}
</script>