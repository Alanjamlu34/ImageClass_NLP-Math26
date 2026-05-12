<script setup>
const imageInput = ref(null);
const fileName = ref('No file selected');
const imagePreview = ref('');

const selectedFile = ref(null);

const steps = ref({
  preprocessing: { status: 'idle', logs: [], running: false, data: null },
  predict:       { status: 'idle', logs: [], running: false, data: null },
  final:         { status: 'idle', result: null, running: false },
});

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    handleFile(file);
  }
};

const triggerFileUpload = () => {
  imageInput.value.click();
};

const handleDrop = (event) => {
  const file = event.dataTransfer.files[0];
  if (file) {
    selectedFile.value = file;
    handleFile(file);
  }
};

const handleFile = (file) => {
  if (file && file.type.startsWith('image/')) {
    fileName.value = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target.result;
    };
    reader.readAsDataURL(file);
    resetPipeline();
  } else if (file) {
    alert('Please upload an image file (e.g., JPG, PNG).');
  }
};

const resetPipeline = () => {
  steps.value = {
    preprocessing: { status: 'idle', logs: [], running: false, data: null },
    predict:       { status: 'idle', logs: [], running: false, data: null },
    final:         { status: 'idle', result: null, running: false },
  };
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const appendLog = async (stepKey, msg) => {
  steps.value[stepKey].logs.push(msg);
  await sleep(300);
};

// --- Check if a step can run (previous step must be done) ---
const canRun = (stepKey) => {
  if (!imagePreview.value) return false;
  const order = ['preprocessing', 'predict', 'final'];
  const idx = order.indexOf(stepKey);
  if (idx === 0) return true;
  return steps.value[order[idx - 1]].status === 'done';
};

// --- STEP 1: PREPROCESSING ---
const runPreprocessing = async () => {
  if (steps.value.preprocessing?.running || !selectedFile.value) return;
  steps.value.preprocessing = { status: 'running', logs: [], running: true, data: null };
  
  // Reset subsequent steps
  steps.value.predict  = { status: 'idle', logs: [], running: false, data: null };
  steps.value.final    = { status: 'idle', result: null, running: false };

  try {
    await appendLog('preprocessing', '📡 Sending image to backend...');
    
    const formData = new FormData();
    formData.append('image', selectedFile.value);

    const response = await fetch('https://postphlogistic-nonspaciously-leigh.ngrok-free.dev/preprocess/image', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Backend error');
    
    const data = await response.json();
    steps.value.preprocessing.data = data;

    await appendLog('preprocessing', '✅ Image received & processed by server.');
    await appendLog('preprocessing', `📏 Resized to: 224x224 (Base64 ready)`);
    await appendLog('preprocessing', `🔢 Generated array: [${data.preprocessed_array.length}x${data.preprocessed_array[0].length}x${data.preprocessed_array[0][0].length}]`);
    
    steps.value.preprocessing.status = 'done';
  } catch (error) {
    await appendLog('preprocessing', `❌ Error: ${error.message}`);
    steps.value.preprocessing.status = 'error';
  } finally {
    steps.value.preprocessing.running = false;
  }
};


// --- STEP 3: PREDICT ---
const runPredict = async () => {
  if (steps.value.predict?.running || !steps.value.preprocessing.data) return;
  steps.value.predict = { status: 'running', logs: [], running: true, data: null };
  
  // Reset subsequent step
  steps.value.final = { status: 'idle', result: null, running: false };

  try {
    await appendLog('predict', '📡 Sending preprocessed array to model...');
    
    const response = await fetch('https://postphlogistic-nonspaciously-leigh.ngrok-free.dev/predict/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preprocessed_array: steps.value.preprocessing.data.preprocessed_array
      })
    });

    if (!response.ok) throw new Error('Prediction error');
    
    const data = await response.json();
    steps.value.predict.data = data;

    await appendLog('predict', `📊 Model result: ${data.result}`);
    await appendLog('predict', `🎯 Confidence: ${(data.confidence * 100).toFixed(2)}%`);
    await appendLog('predict', '✅ Prediction complete.');
    
    steps.value.predict.status = 'done';
  } catch (error) {
    await appendLog('predict', `❌ Error: ${error.message}`);
    steps.value.predict.status = 'error';
  } finally {
    steps.value.predict.running = false;
  }
};

// --- STEP 4: FINAL ---
const runFinal = async () => {
  if (steps.value.final?.running || !steps.value.predict.data) return;
  steps.value.final = { status: 'running', result: null, running: true };

  await sleep(400);
  steps.value.final.result = steps.value.predict.data.result;
  steps.value.final.status = 'done';
  steps.value.final.running = false;
};

// Track if ANY step is currently running
const isAnyRunning = computed(() => {
  return steps.value.preprocessing.running
      || steps.value.predict.running
      || steps.value.final.running;
});
</script>

<template>
  <section id="image-seg" class="tab-content">
    <div class="card">
      <h2>Image Processing</h2>
      <p class="subtitle">Upload an image to run through the segmentation pipeline.</p>

      <!-- Upload Area -->
      <div
        class="upload-area"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <input
          type="file"
          ref="imageInput"
          accept="image/*"
          hidden
          @change="handleFileUpload"
        >
        <div class="upload-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <button @click="triggerFileUpload" class="secondary-btn">Select Image</button>
        <p class="file-name">{{ fileName }}</p>
        <div v-if="imagePreview" class="image-preview-container">
          <img :src="imagePreview" alt="Preview">
        </div>
      </div>

      <!-- Pipeline Steps -->
      <div class="pipeline-container">

        <!-- Section 1: Preprocessing -->
        <div :class="['pipeline-step', steps.preprocessing.status]">
          <div class="step-header">
            <div class="step-badge">1</div>
            <h3 class="step-title">Preprocessing</h3>
            <span class="step-status-icon">
              <span v-if="steps.preprocessing.running" class="mini-spinner"></span>
              <span v-else-if="steps.preprocessing.status === 'done'" class="check-icon">✓</span>
            </span>
            <button
              class="step-run-btn"
              :class="{ done: steps.preprocessing.status === 'done' }"
              :disabled="!canRun('preprocessing') || isAnyRunning"
              @click="runPreprocessing"
            >
              <span v-if="steps.preprocessing.running" class="mini-spinner dark"></span>
              <template v-else-if="steps.preprocessing.status === 'done'">↻ Re-run</template>
              <template v-else>▶ Run</template>
            </button>
          </div>
          <div v-if="steps.preprocessing.logs.length" class="step-body">
            <p class="step-desc">Image loading, resizing, normalization & augmentation</p>
            
            <!-- Preprocessing Visuals -->
            <div v-if="steps.preprocessing.data" class="preprocessing-visuals">
              <div class="visual-item">
                <p class="visual-label">Cropped & Resized (224x224)</p>
                <div class="cropped-image-container">
                  <img :src="'data:image/jpeg;base64,' + steps.preprocessing.data.cropped_image_base64" alt="Cropped">
                </div>
              </div>
              <div class="visual-item">
                <p class="visual-label">Normalized Array Snippet</p>
                <div class="array-visualizer">
                  <div class="array-grid">
                    <div 
                      v-for="(val, i) in steps.preprocessing.data.preprocessed_array[112][112].slice(0, 3)" 
                      :key="i"
                      class="array-cell"
                    >
                      {{ val.toFixed(4) }}
                    </div>
                  </div>
                  <p class="array-info">Center pixel (R,G,B values)</p>
                </div>
              </div>
            </div>

            <div class="log-box">
              <p v-for="(log, i) in steps.preprocessing.logs" :key="i" class="log-line">{{ log }}</p>
            </div>
          </div>
        </div>


        <!-- Section 2: Predict -->
        <div :class="['pipeline-step', steps.predict.status, { locked: !canRun('predict') }]">
          <div class="step-header">
            <div class="step-badge">2</div>
            <h3 class="step-title">Predict</h3>
            <span class="step-status-icon">
              <span v-if="steps.predict.running" class="mini-spinner"></span>
              <span v-else-if="steps.predict.status === 'done'" class="check-icon">✓</span>
              <span v-else-if="!canRun('predict')" class="lock-icon">🔒</span>
            </span>
            <button
              class="step-run-btn"
              :class="{ done: steps.predict.status === 'done' }"
              :disabled="!canRun('predict') || isAnyRunning"
              @click="runPredict"
            >
              <span v-if="steps.predict.running" class="mini-spinner dark"></span>
              <template v-else-if="steps.predict.status === 'done'">↻ Re-run</template>
              <template v-else>▶ Run</template>
            </button>
          </div>
          <div v-if="steps.predict.logs.length" class="step-body">
            <p class="step-desc">Forward pass, segmentation mask & softmax decoding</p>
            <div class="log-box">
              <p v-for="(log, i) in steps.predict.logs" :key="i" class="log-line">{{ log }}</p>
            </div>
          </div>
        </div>

        <!-- Section 3: Final -->
        <div :class="['pipeline-step', steps.final.status, { locked: !canRun('final') }]">
          <div class="step-header">
            <div class="step-badge">3</div>
            <h3 class="step-title">Final</h3>
            <span class="step-status-icon">
              <span v-if="steps.final.running" class="mini-spinner"></span>
              <span v-else-if="steps.final.status === 'done'" class="check-icon">✓</span>
              <span v-else-if="!canRun('final')" class="lock-icon">🔒</span>
            </span>
            <button
              class="step-run-btn"
              :class="{ done: steps.final.status === 'done' }"
              :disabled="!canRun('final') || isAnyRunning"
              @click="runFinal"
            >
              <span v-if="steps.final.running" class="mini-spinner dark"></span>
              <template v-else-if="steps.final.status === 'done'">↻ Re-run</template>
              <template v-else>▶ Run</template>
            </button>
          </div>
          <div v-if="steps.final.status === 'running' || steps.final.result" class="step-body">
            <p class="step-desc">Pipeline successfully completed</p>
            
            <div v-if="steps.final.result" class="final-result-display">
              <div class="result-card">
                <div class="result-icon-wrapper">
                  <div class="pulse-ring"></div>
                  <span class="result-icon">🎯</span>
                </div>
                <div class="result-content">
                  <h4 class="result-title">Segmentation Complete</h4>
                  <p class="result-text">Analysis finished with classification:</p>
                  <div :class="['result-badge', steps.final.result.includes('B') ? 'no' : 'yes']">
                    {{ steps.final.result }}
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="steps.final.running" class="log-box">
              <p class="log-line">⏳ Compiling final result...</p>
            </div>
          </div>
        </div>

      </div><!-- end pipeline-container -->
    </div>
  </section>
</template>

<style scoped>
/* --- Pipeline Layout --- */
.pipeline-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pipeline-step {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transition: border-color 0.4s, box-shadow 0.4s, opacity 0.4s;
}

.pipeline-step.locked {
  opacity: 0.45;
}

.pipeline-step.running {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.15);
}

.pipeline-step.done {
  border-color: rgba(74, 222, 128, 0.35);
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.08);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
}

.pipeline-step .step-body {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.step-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.step-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.step-status-icon {
  font-size: 1rem;
  color: #4ade80;
  font-weight: 700;
  min-width: 22px;
  text-align: center;
}

.check-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
  font-size: 0.75rem;
}

.lock-icon {
  font-size: 0.85rem;
  opacity: 0.6;
}

/* --- Step Run Button --- */
.step-run-btn {
  padding: 0.45rem 1.1rem;
  border-radius: 10px;
  border: none;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  background: var(--accent-gradient);
  color: white;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
  flex-shrink: 0;
}

.step-run-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
}

.step-run-btn:active:not(:disabled) {
  transform: translateY(0);
}

.step-run-btn:disabled {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.25);
  cursor: not-allowed;
  box-shadow: none;
}

.step-run-btn.done {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  box-shadow: none;
  border: 1px solid rgba(74, 222, 128, 0.2);
}

.step-run-btn.done:hover:not(:disabled) {
  background: rgba(74, 222, 128, 0.25);
  box-shadow: 0 2px 10px rgba(74, 222, 128, 0.15);
}

.step-body {
  padding: 1rem 1.25rem;
  animation: expandBody 0.3s ease-out;
}

@keyframes expandBody {
  from { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
  to   { opacity: 1; max-height: 500px; }
}

.step-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

/* --- Log Box --- */
.log-box {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.log-line {
  font-size: 0.82rem;
  font-family: 'Courier New', monospace;
  color: #93c5fd;
  animation: fadeInLog 0.3s ease-out;
}

@keyframes fadeInLog {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* --- Mini Spinner --- */
.mini-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.7s ease-in-out infinite;
}

.mini-spinner.dark {
  border-color: rgba(255,255,255,0.3);
  border-top-color: #fff;
}

/* --- Preprocessing Visuals --- */
.preprocessing-visuals {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.visual-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.visual-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.cropped-image-container {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.cropped-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.array-visualizer {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 1rem;
}

.array-grid {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.array-cell {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 0.5rem;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  color: #93c5fd;
}

.array-info {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-style: italic;
}

/* --- Final Result UI --- */
.final-result-display {
  margin-top: 0.5rem;
}

.result-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.08) 100%);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
}

.result-icon-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.result-icon {
  font-size: 2.5rem;
  z-index: 2;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

.result-content {
  flex: 1;
}

.result-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.result-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
}

.result-badge {
  display: inline-block;
  padding: 0.6rem 1.5rem;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.result-badge.yes {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.result-badge.no {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
