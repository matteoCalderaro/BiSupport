import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      // Per lo sviluppo locale, inoltriamo la chiamata alla funzione Netlify
      // direttamente a Groq, simulando il comportamento di produzione.
      '/.netlify/functions/chat': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => '/openai/v1/chat/completions',
      },
    },
  },
});
