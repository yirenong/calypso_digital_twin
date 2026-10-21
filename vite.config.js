import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualiserPlugin } from './visualiser-plugin'
import { backendPlugin } from './backend-plugin.js'
export default defineConfig(({ mode }) => ({ plugins: [vue(), visualiserPlugin(), backendPlugin(mode)] }))
