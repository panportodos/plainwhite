import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 앱은 https://panportodos.github.io/plainwhite/solution/ 에 배포 (루트는 랜딩페이지)
  base: '/plainwhite/solution/',
  plugins: [react()],
})
