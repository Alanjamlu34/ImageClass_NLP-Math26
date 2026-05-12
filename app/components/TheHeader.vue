<template>
  <header>
    <h1>Kelas Machine Learning Math-26</h1>
    <p>Pengenalan flow machine learnig</p>
  </header>
</template>

<style scoped>
header {
  text-align: center;
  animation: fadeInDown 0.6s ease-out;
}

header h1 {
  font-size: 2.8rem;
  font-weight: 800;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
  letter-spacing: -1px;
}

header p {
  color: var(--text-secondary);
  font-size: 1.1rem;
  font-weight: 500;
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
