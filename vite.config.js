import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualiserPlugin } from './visualiser-plugin'
export default defineConfig({ plugins: [vue(), visualiserPlugin()] })
