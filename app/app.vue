<script setup>
const activeTab = ref('image-seg');

const setTab = (tab) => {
  activeTab.value = tab;
};
</script>

<template>
  <div class="app-container">
    <TheHeader />

    <nav class="tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'image-seg' }"
        @click="setTab('image-seg')"
      >
        Image Segmentation
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'nlp' }"
        @click="setTab('nlp')"
      >
        NLP Analysis
      </button>
    </nav>

    <main>
      <Transition name="fade" mode="out-in">
        <ImageSegmentation v-if="activeTab === 'image-seg'" key="image-seg" />
        <NlpAnalysis v-else-if="activeTab === 'nlp'" key="nlp" />
      </Transition>
    </main>
  </div>
</template>

<style>
/* Global Transition for Tab Switching */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
