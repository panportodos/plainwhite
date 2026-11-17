import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 앱은 https://www.plainwhite.co.kr/solution/ 에 배포 (루트는 랜딩페이지)
  // 도메인을 바꾸거나 github.io 주소로 되돌리면 이 값도 함께 바꿔야 함
  base: '/solution/',
  plugins: [react()],
})
