/**
 * 大屏接口数据源（单例）
 *
 * 只负责「怎么调接口、拿到什么原始数据」，不关心 mock，也不做页面结构适配。
 * 适配（把接口结构转成组件结构、无接口模块走 mock）统一在 useRegionData.ts 的 useScaledData() 里做。
 */
import { reactive, ref } from 'vue'
import * as dashboardApi from '../api/dashboard'
import { NoPermissionError } from '../api/request'
import type {
  AccessListVO,
  AccessLoginNumVO,
  AccessTrendVO,
  BasicDataOverviewVO,
  DataFillRateVO,
  DeptUserEntity,
  FillCountVO,
  NationalReportVO,
  PageResult,
  RegionNode,
  ReportStatsVO,
  TaskMonitorDTO,
  UserSituationVO
} from '../types/api'

/** 级联选择器选项 */
export interface RegionCascaderOption {
  value: string
  label: string
  children?: RegionCascaderOption[]
}

/* ------------------------------------------------------------------ *
 * 模块级单例状态（三个面板共享同一份数据）
 * ------------------------------------------------------------------ */

const regionCode = ref('')
const regionRoot = ref<RegionNode | null>(null)
const regionCascaderOptions = ref<RegionCascaderOption[]>([])

const userSituation = ref<UserSituationVO | null>(null)
const reportStats = ref<ReportStatsVO | null>(null)
const fillRate = ref<DataFillRateVO | null>(null)
const accessTrend = ref<AccessTrendVO | null>(null)
const accessList = ref<AccessListVO | null>(null)
const accessLoginNum = ref<AccessLoginNumVO | null>(null)
const basicData = ref<BasicDataOverviewVO | null>(null)
const deptTopPage = ref<PageResult<DeptUserEntity> | null>(null)
/** 自治区报表（getFillCount isExtended=false）与基层精简保留清单（isExtended=true） */
const autonomousFillCount = ref<FillCountVO | null>(null)
const simplifyFillCount = ref<FillCountVO | null>(null)

/** 系统使用情况「地区/部门」查询周期：'' 昨日 / week / month / quarter / year */
const accessTimeType = ref('week')

/**
 * 区划切换全程标记：从选中区划（loadRegionData 开始）到 loadGlobalData 结束都为 true。
 * 横跨两个请求阶段的页签（如报表情况：fillRate 在阶段 1、reportStats 在阶段 2）
 * 用它兜底，避免阶段之间 loading 闪灭、数据分两波跳。
 */
const regionSwitching = ref(false)

/**
 * 每个接口各自的 loading 状态（key → 是否请求中）。
 * 组件按图表/区域绑定对应的 key，实现「哪个接口在跑，哪个区域转圈」。
 */
const apiLoading = reactive<Record<string, boolean>>({
  userSituation: false,
  fillRate: false,
  basicData: false,
  deptTop: false,
  reportStats: false,
  accessTrend: false,
  accessRegion: false,
  accessDept: false,
  accessLogin: false
})

/** 包装单个请求：请求期间置位对应 key 的 loading */
function track<T>(key: string, p: Promise<T>): Promise<T> {
  apiLoading[key] = true
  return p.finally(() => {
    apiLoading[key] = false
  })
}

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

function settledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null
}

function hasPermissionError(results: PromiseSettledResult<unknown>[]): boolean {
  return results.some(
    (r) => r.status === 'rejected' && r.reason instanceof NoPermissionError
  )
}

function getNodeGrade(node: RegionNode): number {
  const raw = node.grade ?? node.gdrade ?? ''
  const grade = Number(raw)
  return Number.isNaN(grade) ? 4 : grade
}

function trimRegionTree(node: RegionNode, maxDepth: number, depth = 1): RegionNode {
  const children =
    depth >= maxDepth ? [] : (node.childrens || []).map((child) => trimRegionTree(child, maxDepth, depth + 1))

  return {
    ...node,
    grade: String(getNodeGrade(node)),
    childrens: children
  }
}

function findRegionPath(node: RegionNode | null, code: string): string[] {
  if (!node || !code) return []
  if (node.regionCode === code) return [node.regionCode]

  for (const child of node.childrens || []) {
    const childPath = findRegionPath(child, code)
    if (childPath.length) return [node.regionCode, ...childPath]
  }

  return []
}

function toCascaderOption(node: RegionNode): RegionCascaderOption {
  const children = (node.childrens || []).map(toCascaderOption)
  return {
    value: node.regionCode,
    label: node.regionName,
    ...(children.length ? { children } : {})
  }
}

function mergeAccessList(
  regionRes: AccessListVO | null,
  deptRes: AccessListVO | null
): AccessListVO | null {
  if (!regionRes && !deptRes) return null

  return {
    organInfo: deptRes?.organInfo ?? regionRes?.organInfo ?? [],
    regionInfo: regionRes?.regionInfo ?? deptRes?.regionInfo ?? [],
    startDate: regionRes?.startDate ?? deptRes?.startDate ?? '',
    endDate: regionRes?.endDate ?? deptRes?.endDate ?? ''
  }
}

/* ------------------------------------------------------------------ *
 * 区划树
 * ------------------------------------------------------------------ */

/**
 * 初始化区划树（一次拉全树，默认到旗县区级）
 * @returns 默认选中的区划路径（根节点）
 */
export async function initRegionTree(): Promise<string[]> {
  const rawRoot = await dashboardApi.getRegionTree()
  // 与 pc 端一致：按登录用户根节点层级裁剪树深（自治区=3 层 / 盟市=2 层 / 旗县区=1 层）
  const root = rawRoot ? trimRegionTree(rawRoot, Math.max(1, 5 - getNodeGrade(rawRoot))) : null
  regionRoot.value = root
  regionCascaderOptions.value = root ? [toCascaderOption(root)] : []
  return root ? findRegionPath(root, root.regionCode) : []
}

/* ------------------------------------------------------------------ *
 * 区划相关数据（带 regionCode 参数）
 * ------------------------------------------------------------------ */

/**
 * 加载与区划相关的数据
 * @returns 是否具备该区划权限（false 时调用方应回退区划选择）
 */
export async function loadRegionData(code: string): Promise<boolean> {
  regionCode.value = code

  const results = await Promise.allSettled([
    track('userSituation', dashboardApi.getUserSituation(code)),
    track('fillRate', dashboardApi.getDataFillRate(code)),
    track('basicData', dashboardApi.getDaPingBasicDataOverview(code)),
    track('deptTop', dashboardApi.getDeptUserCount(1, 6, code))
  ])

  userSituation.value = settledValue(results[0] as PromiseSettledResult<UserSituationVO>)
  fillRate.value = settledValue(results[1] as PromiseSettledResult<DataFillRateVO>)
  basicData.value = settledValue(results[2] as PromiseSettledResult<BasicDataOverviewVO>)
  deptTopPage.value = settledValue(
    results[3] as PromiseSettledResult<PageResult<DeptUserEntity>>
  )

  return !hasPermissionError(results)
}

/* ------------------------------------------------------------------ *
 * 全局数据（按当前选中区划 regionCode 过滤）
 * ------------------------------------------------------------------ */

/** 加载报表统计、系统使用情况等数据（带当前区划 regionCode） */
export async function loadGlobalData(): Promise<void> {
  const code = regionCode.value
  const results = await Promise.allSettled([
    track('reportStats', dashboardApi.getReportStats('country', code)),
    track('accessTrend', dashboardApi.getAccessTrend(code)),
    track('accessRegion', dashboardApi.getAccessList(accessTimeType.value, 'region', code)),
    track('accessDept', dashboardApi.getAccessList(accessTimeType.value, 'dept', code)),
    track('accessLogin', dashboardApi.getAccessLoginNum(code)),
    // 自治区报表 / 基层精简保留清单：同一接口按 isExtended 取两份
    dashboardApi.getFillCount(code, false),
    dashboardApi.getFillCount(code, true)
  ])

  reportStats.value = settledValue(results[0] as PromiseSettledResult<ReportStatsVO>)
  accessTrend.value = settledValue(results[1] as PromiseSettledResult<AccessTrendVO>)
  accessList.value = mergeAccessList(
    settledValue(results[2] as PromiseSettledResult<AccessListVO>),
    settledValue(results[3] as PromiseSettledResult<AccessListVO>)
  )
  accessLoginNum.value = settledValue(results[4] as PromiseSettledResult<AccessLoginNumVO>)
  autonomousFillCount.value = settledValue(results[5] as PromiseSettledResult<FillCountVO>)
  simplifyFillCount.value = settledValue(results[6] as PromiseSettledResult<FillCountVO>)
}

/** 切换「地区/部门使用情况」的查询周期并重新拉取 */
export async function setAccessTimeType(timeType: string): Promise<void> {
  accessTimeType.value = timeType
  const code = regionCode.value
  const res = await Promise.allSettled([
    track('accessRegion', dashboardApi.getAccessList(timeType, 'region', code)),
    track('accessDept', dashboardApi.getAccessList(timeType, 'dept', code))
  ])
  accessList.value = mergeAccessList(
    settledValue(res[0] as PromiseSettledResult<AccessListVO>),
    settledValue(res[1] as PromiseSettledResult<AccessListVO>)
  )
}

/** 首次加载 */
export async function loadAll(code: string): Promise<void> {
  await Promise.allSettled([loadRegionData(code), loadGlobalData()])
}

/** 手动刷新：重拉当前区划的全部数据 */
export async function refreshAll(): Promise<void> {
  await loadAll(regionCode.value)
}

/* ------------------------------------------------------------------ *
 * 弹窗分页查询（纯接口调用，mock 回退由适配层决定）
 * ------------------------------------------------------------------ */

/** 用户部门分布统计（分页） */
export function fetchDeptUserPage(
  pageNum: number,
  pageSize: number
): Promise<PageResult<DeptUserEntity> | null> {
  return dashboardApi
    .getDeptUserCount(pageNum, pageSize, regionCode.value)
    .then((res) => res ?? null)
    .catch(() => null)
}

/** 国家报表列表（接口无分页，返回全量） */
export function fetchReportList(): Promise<NationalReportVO[]> {
  return dashboardApi
    .getReportListStats(regionCode.value)
    .then((res) => res ?? [])
    .catch(() => [] as NationalReportVO[])
}

/** 国家任务列表（分页） */
export function fetchTaskPage(
  pageNum: number,
  pageSize: number
): Promise<PageResult<TaskMonitorDTO> | null> {
  return dashboardApi
    .getNationalTaskList(pageNum, pageSize, 'country', regionCode.value)
    .then((res) => res ?? null)
    .catch(() => null)
}

/* ------------------------------------------------------------------ *
 * 对外
 * ------------------------------------------------------------------ */

export function useDashboardApi() {
  return {
    // 区划
    regionCode,
    regionRoot,
    regionCascaderOptions,
    getRegionPath: (code: string) => findRegionPath(regionRoot.value, code),
    initRegionTree,
    loadRegionData,
    // 主数据
    userSituation,
    reportStats,
    fillRate,
    accessTrend,
    accessList,
    accessLoginNum,
    basicData,
    deptTopPage,
    autonomousFillCount,
    simplifyFillCount,
    accessTimeType,
    // 每个接口各自的 loading 状态
    apiLoading,
    regionSwitching,
    // 加载 / 刷新
    loadGlobalData,
    setAccessTimeType,
    loadAll,
    refreshAll,
    // 分页
    fetchDeptUserPage,
    fetchReportList,
    fetchTaskPage
  }
}
