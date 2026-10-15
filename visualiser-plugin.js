import { createReadStream, existsSync, statSync, cpSync, mkdirSync } from 'node:fs'
import { resolve, relative, extname } from 'node:path'

// Keep the exported Unity build untouched by Vite's JS/HTML transformations.
export function visualiserPlugin() {
  const source = resolve('src/components/Visualiser')
  let output
  function serve(root) {
    return (req, res, next) => {
      const pathname = new URL(req.url, 'http://localhost').pathname
      if (!pathname.startsWith('/visualiser/')) return next()
      let name
      try { name = decodeURIComponent(pathname.slice('/visualiser/'.length)) || 'index.html' } catch { res.statusCode = 400; return res.end() }
      const file = resolve(root, name)
      const path = relative(root, file)
      if (path.startsWith('..') || (!['index.html'].includes(path) && !/^(Build|StreamingAssets)[\\/]/.test(path)) || !existsSync(file) || !statSync(file).isFile()) { res.statusCode = 404; return res.end('Not found') }
      const compressed = file.endsWith('.gz')
      const extension = extname(compressed ? file.slice(0, -3) : file)
      res.setHeader('Content-Type', { '.html':'text/html; charset=utf-8', '.js':'application/javascript', '.wasm':'application/wasm', '.json':'application/json' }[extension] || 'application/octet-stream')
      if (compressed) res.setHeader('Content-Encoding', 'gzip')
      res.setHeader('Content-Length', statSync(file).size)
      if (req.method === 'HEAD') return res.end()
      createReadStream(file).pipe(res)
    }
  }
  return {
    name: 'local-unity-visualiser',
    configResolved(config) { output = resolve(config.root, config.build.outDir, 'visualiser') },
    configureServer(server) { server.middlewares.use(serve(source)) },
    configurePreviewServer(server) { server.middlewares.use(serve(output)) },
    closeBundle() {
      mkdirSync(output, { recursive:true })
      for (const name of ['index.html','Build','StreamingAssets']) if (existsSync(resolve(source,name))) cpSync(resolve(source,name),resolve(output,name),{recursive:true})
    },
  }
}
