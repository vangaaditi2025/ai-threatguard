import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const repoName = env.GITHUB_REPOSITORY?.split('/')[1] || 'ai-threatguard'
  const basePath = env.BASE_PATH || (env.GITHUB_ACTIONS ? `/${repoName}/` : '/')

  return {
    base: basePath,
    plugins: [react()],
    resolve: {
      alias: {
        '~': path.resolve(__dirname, 'src')
      }
    }
  }
})
