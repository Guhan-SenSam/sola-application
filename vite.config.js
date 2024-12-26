import { defineConfig,loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      'process.env.OPEN_AI_API_KEY': JSON.stringify(env.OPEN_AI_API_KEY),
      'process.env.PRVI_APP_ID' : JSON.stringify(env.PRVI_APP_ID)
    },
    plugins: [react()],
  }
})