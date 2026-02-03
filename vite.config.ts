import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_BUILD_SHA': JSON.stringify(process.env.VITE_BUILD_SHA || 'unknown'),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(process.env.VITE_BUILD_VERSION || 'unknown'),
  },
})
