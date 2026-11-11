import { ElMessage } from 'element-plus'
import { apiAuth, apiConfig, resolveApiSecret } from '../config/api'
import type { ApiResponse } from '../types/api'

/** 接口业务异常 */
export class ApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** code=302 无权限访问 */
export class NoPermissionError extends ApiError {
  constructor(message: string) {
    super('302', message)
    this.name = 'NoPermissionError'
  }
}

let lastToast = { message: '', at: 0 }

/** 全局错误提示（2 秒内相同文案不重复弹，避免首屏并发请求刷屏） */
function toastError(message: string) {
  const now = Date.now()
  if (lastToast.message === message && now - lastToast.at < 2000) return
  lastToast = { message, at: now }
  ElMessage.error(message)
}

/**
 * 统一 POST 请求
 * 所有接口均为 POST + JSON 请求体，请求体可省略（统一传 {}）
 * 携带 cookie 登录态（credentials: 'include'）
 * apiKey 构建模式下自动附加 apiKey + app_secret（位置见 apiAuth.placement）
 */
export async function post<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), apiConfig.timeout)

  // 开放接口鉴权：按接口查各自的 app_secret
  const secret = apiAuth.enabled ? resolveApiSecret(path) : ''
  const authQuery =
    apiAuth.enabled && apiAuth.placement === 'query'
      ? `${path.includes('?') ? '&' : '?'}${new URLSearchParams({
          [apiAuth.keyParam]: apiAuth.apiKey,
          [apiAuth.secretParam]: secret
        }).toString()}`
      : ''
  const payload =
    apiAuth.enabled && apiAuth.placement === 'body'
      ? { ...(body ?? {}), [apiAuth.keyParam]: apiAuth.apiKey, [apiAuth.secretParam]: secret }
      : body ?? {}

  try {
    const response = await fetch(`${apiConfig.baseURL}${path}${authQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    if (!response.ok) {
      const message = `接口请求失败（HTTP ${response.status}）`
      toastError(message)
      throw new ApiError(String(response.status), message)
    }

    const result = (await response.json()) as ApiResponse<T>

    if (result.code === '200') return result.data

    const message = result.message || '接口处理失败'
    if (result.code === '302') {
      toastError(message || '无权限访问')
      throw new NoPermissionError(message || '无权限访问')
    }
    toastError(message)
    throw new ApiError(result.code, message)
  } catch (error) {
    if (error instanceof ApiError) throw error

    const message =
      error instanceof DOMException && error.name === 'AbortError'
        ? '接口请求超时'
        : `接口请求异常：${(error as Error)?.message ?? error}`
    toastError(message)
    throw new ApiError('500', message)
  } finally {
    window.clearTimeout(timer)
  }
}
