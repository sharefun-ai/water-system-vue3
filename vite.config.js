import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// Local development exports write only these two fixed artifact paths.
function localArtifacts() {
  return {
    name: 'scada-local-artifacts',
    configureServer(server) {
      server.middlewares.use('/__scada-artifact', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        if (req.headers.origin !== 'http://' + req.headers.host) { res.statusCode = 403; res.end('Same-origin export required'); return }
        const kind = new URL(req.url, 'http://localhost').searchParams.get('kind')
        const file = ({glb:'models/aquatic-scada-3d.glb',png:'docs/screenshots/aquatic-scada-scene.png',png2d:'docs/screenshots/aquatic-scada-2d.png',svg2d:'models/aquatic-scada-2d.svg'})[kind] || null
        if (!file) { res.statusCode = 400; res.end('Unsupported artifact'); return }
        try {
          const chunks = []; let size = 0
          for await (const chunk of req) { size += chunk.length; if (size > 32 * 1024 * 1024) throw new Error('Artifact too large'); chunks.push(chunk) }
          const bytes = Buffer.concat(chunks)
          if ((kind === 'glb' && bytes.subarray(0,4).toString() !== 'glTF') || (kind.startsWith('png') && bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') || (kind === 'svg2d' && !bytes.toString('utf8').startsWith('<svg'))) throw new Error('Invalid artifact format')
          const dest = path.resolve(server.config.root, file)
          fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, bytes)
          res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ href: '/' + file, name: path.basename(file) }))
        } catch (e) { res.statusCode = 400; res.end(e.message) }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  base: env.VITE_PUBLIC_SITE === 'true' ? '/' : './',
  plugins: [vue(), tailwindcss(), localArtifacts()],
  server: {
    port: 5188,
    host: '127.0.0.1',
    open: false,
    watch: { ignored: ['**/models/**', '**/docs/**'] },
    proxy: {
      '/backend': {
        target: env.SCADA_PROXY_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: path => '/' + encodeURIComponent('水系統3.0') + path,
      },
    },
  },
  build: { rollupOptions: { output: { manualChunks: id => id.includes('/node_modules/three/') ? 'three' : undefined } } },
  }
})
