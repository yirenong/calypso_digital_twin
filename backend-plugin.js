import { loadEnv } from 'vite'

export function backendPlugin(mode) {
  return {
    name: 'calypso-local-backend',
    async configureServer(server) {
      if (!mode.startsWith('backend')) return
      const env = loadEnv(mode, process.cwd(), '')
      for (const key of ['ST_SYNTHESIS_EMAIL', 'ST_SYNTHESIS_PASSWORD']) if (env[key]) process.env[key] = env[key]
      if (env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL
      const [{ default: auth }, { default: settings }, { default: powerplus }, { default: stSynthesis }] = await Promise.all([import('./api/auth.js'), import('./api/settings.js'), import('./api/powerplus.js'), import('./api/st-synthesis.js')])
      server.middlewares.use((req, res, next) => {
        const path = req.url.split('?')[0]
        if (path === '/api/st-synthesis') return stSynthesis(req, res)
        if (path === '/api/auth') return auth(req, res)
        if (path === '/api/settings') return settings(req, res)
        if (path === '/api/powerplus') return powerplus(req, res)
        if (path.startsWith('/api/')) { res.statusCode = 404; return res.end('{}') }
        next()
      })
    },
  }
}
