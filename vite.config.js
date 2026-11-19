import { defineConfig } from 'vite'

const proxy = Object.fromEntries(['/feed', '/swipe', '/matches'].map(route => [route, 'http://127.0.0.1:3000']))
export default defineConfig({ server: { proxy } })
