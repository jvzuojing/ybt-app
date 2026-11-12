import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

/**
 * 可选后端地址（运行命令切换，无需改代码）：
 *   npm run dev:69    线上环境 10.8.21.69:80
 *   npm run dev       默认地址（同样是 10.8.21.69:80）
 *
 * 测试环境 10.8.21.79 已停用，统一走 69。
 * 也可临时指定任意地址（PowerShell）：
 *   $env:VITE_API_TARGET='http://10.8.21.100:8080'; npm run dev
 *
 * 本地调试登录态（推荐）：把手动注入的 cookie 交给代理统一附加，不再依赖浏览器侧 cookie。
 *   浏览器里注入的 SESSION 常被后端返回的匿名 SESSION 顶掉（表现：接口返回未登录 + 响应带 Set-Cookie），
 *   由代理固定带上正确的会话 id 可彻底规避（填你手动登录后拿到的那条有效 SESSION）：
 *     $env:VITE_SESSION='<你的有效会话id>'; npm run dev
 */
const API_TARGETS: Record<string, string> = {
  // 线上环境
  api69: 'http://10.8.21.69:80'
}

/** 默认后端地址（npm run dev）—— 线上环境 69 */
const DEFAULT_API_TARGET = 'http://10.8.21.69:80'

export default defineConfig(({ mode }) => {
  const override = process.env.VITE_API_TARGET
  const target = override || API_TARGETS[mode] || DEFAULT_API_TARGET
  /** 可选：代理统一附加的会话 cookie 值（仅本地调试），设置后覆盖浏览器带来的 SESSION */
  const session = process.env.VITE_SESSION

  console.log(`[vite] 接口代理目标：${target}${override ? '（来自 VITE_API_TARGET 环境变量覆盖）' : ''}${session ? '（已启用 VITE_SESSION 登录态注入）' : ''}`)
  // 79 测试环境已停用：一旦被误指向，启动时就报警，避免静默用错环境
  if (target.includes('10.8.21.79')) {
    console.warn('[vite] ⚠️ 代理目标指向已停用的 10.8.21.79，请改用 10.8.21.69（检查 VITE_API_TARGET 环境变量）')
  }
  if (mode === 'apiKey') {
    console.log('[vite] apiKey 模式：路径前缀 /open/v1，每个请求附带 apiKey + app_secret')
  }

  /** 用指定值覆盖请求里的 SESSION，避免浏览器侧 cookie 被后端的匿名会话覆盖 */
  const withSession = (rawCookie: string | undefined) => {
    const rest = (rawCookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith('SESSION='))
    return [`SESSION=${session}`, ...rest].join('; ')
  }

  return {
    base: './',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5174,
      open: false,
      proxy: {
        '/gdp-odr-nm': {
          target,
          changeOrigin: true,
          headers: {
            // 与线上来源保持一致，防止后端按 Origin 判定为非法来源
            'Origin': 'http://localhost:5173',
            'Referer': 'http://localhost:5173/',
            // 伪装客户端环境（防止 Chrome Client Hints 泄露）
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // 关键：本地调试若配置了 VITE_SESSION，则强制覆盖为有效登录态
              if (session) {
                proxyReq.setHeader('cookie', withSession(req.headers.cookie))
              }

              const cookie = proxyReq.getHeader('cookie') as string | undefined
              const sessionPart = cookie
                ?.split(';')
                .map((part) => part.trim())
                .find((part) => part.startsWith('SESSION='))

              console.log(`\n[Request >>>] ${req.method} ${req.url}`)
              console.log(`  - 浏览器真实 Host: ${req.headers.host}`)
              console.log(`  - Cookie: ${cookie ? '✅ PRESENT' : '❌ MISSING'}`)
              console.log(`  - SESSION: ${sessionPart ?? '❌ 无 SESSION（后端会新建匿名会话）'}`)
            })
            proxy.on('proxyRes', (proxyRes) => {
              const setCookie = proxyRes.headers['set-cookie']
              if (setCookie) {
                console.log(`[Response <<<] ⚠️ 后端重设了 SESSION（本次请求被判定为未登录）`)
                console.log(`  - Set-Cookie: ${setCookie}`)
              } else {
                console.log(`[Response <<<] ✅ 登录态有效，后端未重设 SESSION`)
              }
            })
          }
        }
      }
    }
  }
})
