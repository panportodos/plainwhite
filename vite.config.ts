import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 주소(https://panportodos.github.io/plainwhite/)에 맞춘 기본 경로
  base: '/plainwhite/',
  plugins: [react()],
})
