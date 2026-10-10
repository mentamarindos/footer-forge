import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/") || id.includes("node_modules/scheduler")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/zustand") || id.includes("node_modules/sonner") || id.includes("node_modules/lucide-react")) {
            return "ui-vendor";
          }
          return undefined;
        },
      },
    },
  },
})
