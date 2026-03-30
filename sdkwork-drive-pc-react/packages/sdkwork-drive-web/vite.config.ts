import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3016,
  },
  preview: {
    host: '0.0.0.0',
    port: 3016,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('sdkwork-app-sdk-typescript')) {
            return 'app-sdk';
          }

          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react-router')) {
            return 'router-vendor';
          }

          if (id.includes('@radix-ui') || id.includes('class-variance-authority') || id.includes('tailwind-merge')) {
            return 'ui-vendor';
          }

          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n-vendor';
          }

          if (id.includes('lucide-react') || id.includes('sonner') || id.includes('motion')) {
            return 'experience-vendor';
          }

          return undefined;
        },
      },
    },
  },
});
