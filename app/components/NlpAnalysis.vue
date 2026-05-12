<script setup>
const textInput = ref('');
const inputError = ref(false);

const steps = ref({
  preprocessing: { status: 'idle', logs: [], running: false, data: null },
  predict:       { status: 'idle', logs: [], running: false, data: null },
  final:         { status: 'idle', result: null, running: false },
});

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

const getSentimentColor = (sentiment) => {
  if (sentiment === 'Positive') return '#4ade80';
  if (sentiment === 'Negative') return '#f87171';
  return '#94a3b8';
};

// --- Check if a step can run (previous step must be done, and text must exist) ---
const canRun = (stepKey) => {
  const text = textInput.value.trim();
  if (!text) return false;
  const order = ['preprocessing', 'predict', 'final'];
  const idx = order.indexOf(stepKey);
  if (idx === 0) return true;
  return steps.value[order[idx - 1]].status === 'done';
};

// Track if ANY step is running
const isAnyRunning = computed(() => {
  return steps.value.preprocessing.running
      || steps.value.predict.running
      || steps.value.final.running;
});

// --- STEP 1: PREPROCESSING ---
const runPreprocessing = async () => {
  const text = textInput.value.trim();
  if (!text) {
    inputError.value = true;
    setTimeout(() => { inputError.value = false; }, 1000);
    return;
  }

  if (steps.value.preprocessing.running) return;
  steps.value.preprocessing = { status: 'running', logs: [], running: true, data: null };
  
  // Reset subsequent steps
  steps.value.predict  = { status: 'idle', logs: [], running: false, data: null };
  steps.value.final    = { status: 'idle', result: null, running: false };

  try {
    await appendLog('preprocessing', '📡 Sending text to backend...');
    
    const response = await fetch('https://postphlogistic-nonspaciously-leigh.ngrok-free.dev/preprocess/nlp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) throw new Error('Backend error');
    
    const data = await response.json();
    steps.value.preprocessing.data = data;

    await appendLog('preprocessing', `📝 Raw: "${data.text_lower.substring(0, 30)}${data.text_lower.length > 30 ? '...' : ''}"`);
    await appendLog('preprocessing', `🧹 Cleaned: "${data.clean_text}"`);
    await appendLog('preprocessing', `🔢 Padded Sequence: [${data.padded_sequence[0].slice(0, 10).join(', ')} ...]`);
    await appendLog('preprocessing', '✅ Preprocessing complete.');
    
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
  if (steps.value.predict.running || !steps.value.preprocessing.data) return;
  steps.value.predict = { status: 'running', logs: [], running: true, data: null };
  
  // Reset subsequent step
  steps.value.final = { status: 'idle', result: null, running: false };

  try {
    await appendLog('predict', '📡 Sending padded sequence to model to predict...');
    await appendLog('predict', '⏳ Waiting for model to predict...');
    const response = await fetch('https://postphlogistic-nonspaciously-leigh.ngrok-free.dev/predict/nlp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        padded_sequence: steps.value.preprocessing.data.padded_sequence
      })
    });

    if (!response.ok) throw new Error('Prediction error');
    
    const data = await response.json();
    steps.value.predict.data = data;

    await appendLog('predict', '✅ Predict done.');
    await appendLog('predict', `🏷️  Sentiment: ${data.sentiment}`);
    await appendLog('predict', `🎯 Confidence: ${(data.confidence * 100).toFixed(2)}%`);
    
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
  if (steps.value.final.running || !steps.value.predict.data) return;
  steps.value.final = { status: 'running', result: null, running: true };

  await sleep(400);
  steps.value.final.result = steps.value.predict.data.sentiment;
  steps.value.final.status = 'done';
  steps.value.final.running = false;
};
</script>

<template>
  <section id="nlp" class="tab-content">
    <div class="card">
      <h2>Natural Language Processing</h2>
      <p class="subtitle">Enter a sentence to run through the NLP analysis pipeline.</p>

      <!-- Input Area -->
      <div class="input-area">
        <textarea
          v-model="textInput"
          placeholder="Type your sentence here..."
          rows="5"
          :style="inputError ? 'border-color: #f87171; box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.2);' : ''"
        ></textarea>
      </div>

      <!-- Pipeline Steps -->
      <div class="pipeline-container">

        <!-- Section 1: Preprocessing -->
        <div :class="['pipeline-step', steps.preprocessing.status]">
          <div class="step-header">
            <div class="step-badge">1</div>
<h3 class="step-title">Preprocessing</h3>
                <span class="info-icon" title="Tokenization, lowercasing, punctuation removal, and padding to a fixed length.">ℹ️</span>
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
            <p class="step-desc">Tokenization, normalization, and sequence padding</p>
            
            <!-- Visual Transformation Flow -->
            <div v-if="steps.preprocessing.data" class="transformation-flow">
              <div class="flow-item">
                <div class="flow-marker">
                  <span class="marker-dot"></span>
                  <span class="marker-label">Raw Input</span>
                </div>
                <div class="flow-card">
                  {{ textInput }}
                </div>
              </div>

              <div class="flow-connector">
                <div class="connector-line"></div>
                <div class="connector-info">Normalize & Clean</div>
              </div>

              <div class="flow-item">
                <div class="flow-marker">
                  <span class="marker-dot"></span>
                  <span class="marker-label">Preprocessed Text</span>
                </div>
                <div class="flow-card highlight">
                  {{ steps.preprocessing.data.clean_text }}
                </div>
              </div>

              <div class="flow-connector">
                <div class="connector-line"></div>
                <div class="connector-info">Tokenization</div>
              </div>

              <div class="flow-item">
                <div class="flow-marker">
                  <span class="marker-dot"></span>
                  <span class="marker-label">Numerical Sequence</span>
                </div>
                <div class="flow-card tokens">
                  [ {{ steps.preprocessing.data.padded_sequence[0].slice(0, 12).join(', ') }} ... ]
                </div>
              </div>
            </div>

            <div class="log-box-mini">
              <p v-for="(log, i) in steps.preprocessing.logs" :key="i" class="log-line">{{ log }}</p>
            </div>
          </div>
        </div>


        <!-- Section 2: Predict -->
        <div :class="['pipeline-step', steps.predict.status, { locked: !canRun('predict') }]">
          <div class="step-header">
            <div class="step-badge">2</div>

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
            <p class="step-desc">Neural Network forward pass & confidence estimation</p>
            
            <!-- Predict Visuals -->
            <div v-if="steps.predict.data" class="predict-visuals">
              <div class="confidence-section">
                <div class="confidence-header">
                  <span class="label">Model Confidence</span>
                  <span class="value" :style="{ color: getSentimentColor(steps.predict.data.sentiment) }">
                    {{ (steps.predict.data.confidence * 100).toFixed(1) }}%
                  </span>
                </div>
                <div class="confidence-track">
                  <div 
                    class="confidence-fill" 
                    :style="{ 
                      width: (steps.predict.data.confidence * 100) + '%',
                      background: getSentimentColor(steps.predict.data.sentiment),
                      boxShadow: `0 0 15px ${getSentimentColor(steps.predict.data.sentiment)}44`
                    }"
                  ></div>
                </div>
              </div>

              <div class="sentiment-result">
                <span class="sentiment-label">Detected Sentiment</span>
                <div class="sentiment-value" :style="{ color: getSentimentColor(steps.predict.data.sentiment) }">
                  <span class="sentiment-icon">
                    {{ steps.predict.data.sentiment === 'Positive' ? '😊' : (steps.predict.data.sentiment === 'Negative' ? '☹️' : '😐') }}
                  </span>
                  {{ steps.predict.data.sentiment }}
                </div>
              </div>
            </div>

            <div class="log-box-mini">
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
                  <div class="pulse-ring" :style="{ background: getSentimentColor(steps.final.result) + '33' }"></div>
                  <span class="result-icon">
                    {{ steps.final.result === 'Positive' ? '😊' : (steps.final.result === 'Negative' ? '☹️' : '😐') }}
                  </span>
                </div>
                <div class="result-content">
                  <h4 class="result-title">Analysis Complete</h4>
                  <p class="result-text">The model has determined the sentiment to be:</p>
                  <div 
                    class="result-badge" 
                    :style="{ 
                      background: getSentimentColor(steps.final.result) + '22',
                      color: getSentimentColor(steps.final.result),
                      borderColor: getSentimentColor(steps.final.result) + '44'
                    }"
                  >
                    {{ steps.final.result }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="steps.final.running" class="log-box-mini">
              <p class="log-line">⏳ Finalizing report...</p>
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
  gap: 1.25rem;
}

.pipeline-step {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.3);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.pipeline-step.locked {
  opacity: 0.4;
  filter: grayscale(0.5);
}

.pipeline-step.running {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 25px rgba(59, 130, 246, 0.15);
  background: rgba(59, 130, 246, 0.03);
}

.pipeline-step.done {
  border-color: rgba(74, 222, 128, 0.3);
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.05);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
}

.pipeline-step .step-body {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 1.5rem;
  animation: expandBody 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes expandBody {
  from { opacity: 0; transform: translateY(-10px); max-height: 0; }
  to   { opacity: 1; transform: translateY(0); max-height: 1000px; }
}

/* --- Transformation Flow --- */
.transformation-flow {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 1.5rem 0;
}

.flow-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.flow-marker {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}

.marker-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
}

.flow-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1rem;
  font-size: 0.95rem;
  line-height: 1.4;
  color: var(--text-primary);
}

.flow-card.highlight {
  border-color: rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.05);
}

.flow-card.tokens {
  font-family: 'Fira Code', 'Courier New', monospace;
  color: #fbbf24;
  font-size: 0.85rem;
}

.flow-connector {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-left: 3px;
  height: 40px;
}

.connector-line {
  width: 2px;
  height: 100%;
  background: linear-gradient(to bottom, var(--accent), transparent);
  margin-left: 3px;
}

.connector-info {
  font-size: 0.7rem;
  font-style: italic;
  color: rgba(255, 255, 255, 0.3);
}

/* --- Predict Visuals --- */
.predict-visuals {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.confidence-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.confidence-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.confidence-header .label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.confidence-header .value {
  font-size: 1.5rem;
  font-weight: 800;
}

.confidence-track {
  height: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sentiment-result {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.sentiment-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
}

.sentiment-value {
  font-size: 2.5rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.sentiment-icon {
  font-size: 3rem;
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
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  border: 1px solid transparent;
}

/* --- Misc --- */
.step-badge {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.step-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.info-icon {
  font-size: 0.9rem;
  margin-left: 0.4rem;
  cursor: help;
  color: var(--text-secondary);
  opacity: 0.8;
  transition: opacity 0.3s;
}
.info-icon:hover {
  opacity: 1;
}

.preprocess-details {
  margin: 0.75rem 0 0 0;
  padding-left: 1.2rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  list-style-type: disc;
}
.preprocess-details li {
  margin-bottom: 0.25rem;
}

@keyframes fadeInFlow {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.flow-item, .flow-connector {
  animation: fadeInFlow 0.4s ease-out;
  font-size: 0.9rem;
  margin-left: 0.4rem;
  cursor: help;
  color: var(--text-secondary);
  opacity: 0.8;
}



.step-run-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 12px;
  border: none;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  background: var(--accent-gradient);
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.log-box-mini {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  margin-top: 1rem;
  border-left: 3px solid var(--accent);
}

.log-line {
  font-size: 0.75rem;
  font-family: 'Fira Code', monospace;
  color: #94a3b8;
  margin: 0;
}

.mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
