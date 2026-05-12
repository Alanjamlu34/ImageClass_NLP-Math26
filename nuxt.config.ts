// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'ML AI Capabilities',
      meta: [
        { name: 'description', content: 'Machine Learning Presentation Showcase for Image Segmentation and NLP' }
      ],
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap' }
      ]
    }
  }
})
