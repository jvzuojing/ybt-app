/**
 * 大屏接口全局配置
 *
 * 默认值可被 localStorage('ybt_api_config') 运行时覆盖，改地址/开关无需重新构建：
 *   setApiConfig({ baseURL: 'http://x.x.x.x:8080/gdp-odr-nm' })
 *   setApiConfig({ useApi: false })  // 全部回退本地 mock
 *   resetApiConfig()                 // 恢复默认
 */

/** 接口前缀：开发环境由 vite proxy 转发 */
const DEFAULT_BASE_URL = '/gdp-odr-nm'
/** 默认策略：本地开发与上线构建均走真实接口（mock 仅作运行时降级，可 setApiConfig({ useApi: false }) 切回） */
const DEFAULT_USE_API = true

/**
 * ===== 开放接口模式（apiKey 鉴权）=====
 * 构建命令：npm run dev:apiKey / npm run build:apiKey（vite --mode apiKey）
 *
 * 与默认模式的区别：
 *   1. 路径前缀多一段 /open/v1（基础数据接口同时改名为 performStatisticsBaseData）
 *   2. 每个请求都要带上 apiKey + app_secret 两个参数（值见下方 API_SECRETS，按接口一一对应）
 */
export const API_AUTH_ENABLED = import.meta.env.MODE === 'apiKey'

/** 开放接口路径前缀 */
const OPEN_PREFIX = API_AUTH_ENABLED ? '/open/v1' : ''

/** 接口路径（可运行时覆盖） */
export const API_PATHS = {
  /** 用户情况统计 */
  userSituation: `${OPEN_PREFIX}/dataDashboard/getUserSituation`,
  /** 用户部门分布统计（分页） */
  deptUserCount: `${OPEN_PREFIX}/dataDashboard/getDeptUserCount`,
  /** 报表统计 */
  reportStats: `${OPEN_PREFIX}/dataDashboard/getReportStats`,
  /** 国家任务列表（分页，pageNum/pageSize 走路径） */
  nationalTaskList: `${OPEN_PREFIX}/dataDashboard/nationalTaskList`,
  /** 国家报表列表统计 */
  reportListStats: `${OPEN_PREFIX}/dataDashboard/getReportListStats`,
  /** 数据填报率 */
  dataFillRate: `${OPEN_PREFIX}/dataDashboard/getDataFillRate`,
  /** 系统使用情况 - 登录趋势 */
  accessTrend: `${OPEN_PREFIX}/dataDashboard/getAccessTrend`,
  /** 系统使用情况 - 地区/部门使用情况 */
  accessList: `${OPEN_PREFIX}/dataDashboard/getAccessList`,
  /** 系统使用情况 - 总访问量&日活跃次数 */
  accessLoginNum: `${OPEN_PREFIX}/dataDashboard/getAccessLoginNum`,
  /** 区划树 */
  regionTree: `${OPEN_PREFIX}/dataDashboard/getRegionTree`,
  /** 基础数据 - 人房企场所概览（开放接口下路径/名称不同：performStatisticsBaseData） */
  basicDataOverview: API_AUTH_ENABLED
    ? '/open/v1/dataDashboard/performStatisticsBaseData'
    : '/dataDashboard/getDaPingBasicDataOverview',
  /**
   * 自治区报表 / 基层精简保留清单（新增接口）
   * 文档只提供 /open/v1 这一个地址且固定要求 appKey/appSecret，故不随构建模式切换前缀
   */
  fillCount: '/open/v1/dataDashboard/getFillCount'
}

export type ApiPathKey = keyof typeof API_PATHS

/** 所有接口共用的 apiKey（接口台账 app_key 列，可用 VITE_API_KEY 覆盖） */
const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY || 'daping-share'

/** 新增 getFillCount 接口的独立 appSecret（来自《自治区报表，基层精简保留新增接口》文档） */
export const FILL_COUNT_SECRET = '87825d6b554e44b2bad3d16903e3670b'

/** 各接口独立的 app_secret（来自《gdp_odr_nm_share_api》接口台账，按接口一一对应） */
export const API_SECRETS: Record<ApiPathKey, string> = {
  userSituation: '0835aed568504cdc95e23d523aa4d9fb',
  basicDataOverview: '53c243a59e2a4d028dd6a9bd3b326890',
  deptUserCount: 'ac06bf46d2a0439cad0f1093fb7faf33',
  reportStats: '14a8b55704de446fb289aec51cae4b95',
  nationalTaskList: 'be242ed7659e4a5db4318c21d48e32d6',
  reportListStats: '7327513ae3d84385a185ea329e82f8de',
  dataFillRate: 'a881081e8bc645d2ae9419a3792b2df7',
  accessTrend: 'd0ad841163624cb8904393fa375073e1',
  accessList: '7bdf30bc8428486d88f2de598b5bd786',
  accessLoginNum: '7d75c5291b654a92b9319c991cc311dc',
  regionTree: '8e861cb48dae4616b6ed9a3bda2d578a',
  fillCount: FILL_COUNT_SECRET
}

/**
 * 鉴权参数配置
 * placement 默认 'query'（?apiKey=xxx&app_secret=xxx）；后端若要求放请求体，改成 'body' 即可
 */
export const apiAuth = {
  enabled: API_AUTH_ENABLED,
  apiKey: DEFAULT_API_KEY,
  keyParam: 'apiKey',
  secretParam: 'app_secret',
  placement: 'query' as 'query' | 'body'
}

/** 按请求路径反查该接口的 app_secret（最长前缀匹配，兼容分页路径参数） */
export function resolveApiSecret(path: string): string {
  let matched: ApiPathKey | undefined
  let matchedLength = -1
  for (const key of Object.keys(API_PATHS) as ApiPathKey[]) {
    const prefix = API_PATHS[key]
    if (path.startsWith(prefix) && prefix.length > matchedLength) {
      matched = key
      matchedLength = prefix.length
    }
  }
  return matched ? API_SECRETS[matched] ?? '' : ''
}

export interface ApiConfig {
  /** 接口前缀 */
  baseURL: string
  /** 总开关：true 走真实接口；false 全部走本地 mock */
  useApi: boolean
  /** 请求超时（毫秒） */
  timeout: number
  /** 接口路径覆盖 */
  paths: Record<ApiPathKey, string>
}

const STORAGE_KEY = 'ybt_api_config'

const DEFAULT_CONFIG: ApiConfig = {
  baseURL: DEFAULT_BASE_URL,
  useApi: DEFAULT_USE_API,
  timeout: 15000,
  paths: { ...API_PATHS }
}

function readOverride(): Partial<ApiConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<ApiConfig>
    // apiKey 模式下接口路径由构建模式决定，忽略历史持久化的路径覆盖，避免退回旧地址导致鉴权失败
    if (API_AUTH_ENABLED) delete parsed.paths
    return parsed
  } catch {
    return {}
  }
}

const override = readOverride()

/** 当前生效配置 */
export const apiConfig: ApiConfig = {
  ...DEFAULT_CONFIG,
  ...override,
  paths: { ...DEFAULT_CONFIG.paths, ...(override.paths || {}) }
}

/** 运行时修改配置，并持久化到 localStorage */
export function setApiConfig(patch: Partial<ApiConfig>) {
  const nextPaths = patch.paths ? { ...apiConfig.paths, ...patch.paths } : apiConfig.paths
  Object.assign(apiConfig, patch, { paths: nextPaths })
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...patch, paths: nextPaths }))
  } catch {
    /* 忽略隐私模式等写入失败 */
  }
}

/** 清除运行时覆盖，恢复默认配置 */
export function resetApiConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  Object.assign(apiConfig, { ...DEFAULT_CONFIG, paths: { ...API_PATHS } })
}
