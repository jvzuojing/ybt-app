import { computed, inject, ref, type Ref } from 'vue'
import { apiConfig } from '../config/api'
import { useDashboardApi } from './useDashboardApi'
import type { BasicDataCategoryCount, BasicDataItem } from '../types/api'
import {
  userOverview as baseOverview,
  userTrendData as baseTrend,
  departmentList as baseDept,
  reportData as baseReport,
  fillRateData as baseFillRate,
  entityData as baseEntity,
  systemUsageAll as baseSysAll,
  systemUsageCity as baseSysCity,
  systemUsageDept as baseSysDept,
  rootDatabase as baseRootDb,
  backflowData as baseBackflow,
  politicalLegalData as basePolitical,
  nationalReportDetailList,
  nationalTaskDetailList,
  autonomousReportDetailList,
  autonomousTaskDetailList,
  sceneData as sceneDataMock,
  userLevelData as baseLevel
} from '../mock/data'

type RegionLevel = 1 | 2 | 3
type ReportTab = 'national' | 'autonomous'
type DetailType = 'report' | 'task'

const EMPTY = '--'

const REGION_AXIS_MAP: Record<RegionLevel, string[]> = {
  1: ['呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '锡林郭勒', '阿拉善'],
  2: ['新城区', '回民区', '玉泉区', '赛罕区', '土左旗', '托县', '和林格尔', '清水河', '武川'],
  3: ['东街', '西街', '南街', '北街', '新华路', '中山东路']
}

const STATUS_CARD_DEFS = [
  { key: 'pendingSign', field: 'pendingSignCount', label: '待签收' },
  { key: 'pendingReport', field: 'pendingReportCount', label: '待上报' },
  { key: 'pendingReview', field: 'pendingReviewCount', label: '待审核' },
  { key: 'pendingFill', field: 'pendingFillCount', label: '待填报' },
  { key: 'filling', field: 'fillingCount', label: '填报中' },
  { key: 'completed', field: 'completedCount', label: '已完成' },
  { key: 'finished', field: 'finishedCount', label: '已完结' }
] as const

const REPORT_STATUS_MAP: Record<number, string> = {
  1: '待签收',
  2: '已签收',
  3: '拒绝',
  4: '完成建表'
}

const REPORT_METHOD_MAP: Record<number, string> = {
  1: '常态报表',
  2: '临时报表'
}

const RADAR_METRIC_CONFIG = [
  { key: 'autonomous', label: '自治区级部门填报率', axisName: '自治区' },
  { key: 'city', label: '盟市级部门填报率', axisName: '盟市' },
  { key: 'county', label: '旗县区部门填报率', axisName: '旗县区' },
  { key: 'township', label: '乡镇（苏木）填报率', axisName: '镇街' },
  { key: 'village', label: '村社（嘎查）填报率', axisName: '村社' }
] as const

const CATEGORY_KEYS: Record<string, string[]> = {
  ren: ['bqData'],
  fang: ['fwjzlxData', 'fwjzqkData'],
  qi: ['qylxData', 'companyTypeData', 'typeData'],
  changsuo: ['cslxData']
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function scaleFromRegion(region: string[]): number {
  const key = region.join('-')
  const h = hashString(key)
  return 0.6 + (h % 80) / 100
}

function resolveRegionLevel(region: string[]): RegionLevel {
  if (region.length <= 1) return 1
  if (region.length === 2) return 2
  return 3
}

function num(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY
  return value.toLocaleString()
}

function toCount(value: number | null | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0
}

function wan(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY
  return value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value.toLocaleString()
}

/** 标签总数封顶 65：超过 65 显示 '65类'，<=65 正常；无效值返回 null（走回退逻辑） */
function clampTagTotal(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (Number.isNaN(n)) return null
  return `${Math.min(n, 65)}类`
}

function visits(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿次`
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万次`
  return `${value.toLocaleString()}次`
}

function text(value: unknown): string {
  if (value === null || value === undefined || value === '') return EMPTY
  return String(value)
}

function raw(value: unknown): string | number {
  if (value === null || value === undefined || value === '') return EMPTY
  return typeof value === 'number' ? value : String(value)
}

function dateOnly(value: unknown): string {
  const str = String(value ?? '')
  return str ? str.split(' ')[0] : EMPTY
}

/** 时间戳（毫秒/秒数字或纯数字字符串）→ 毫秒；无法解析返回 NaN */
function toTimeMs(value: unknown): number {
  if (value === null || value === undefined || value === '') return Number.NaN
  if (typeof value === 'number') return value < 1e12 ? value * 1000 : value
  const str = String(value).trim()
  if (/^\d{13}$/.test(str)) return Number(str)
  if (/^\d{10}$/.test(str)) return Number(str) * 1000
  return new Date(str.replace(/-/g, '/')).getTime()
}

/** 时间戳 / 日期字符串 → yyyy-MM-dd HH:mm；非时间戳字符串原样返回 */
function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === '') return EMPTY
  if (typeof value === 'number' || /^\d{10,13}$/.test(String(value).trim())) {
    const ms = toTimeMs(value)
    if (!Number.isNaN(ms)) {
      const d = new Date(ms)
      const p = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    }
  }
  return String(value)
}

function toRate(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const normalized = String(value).replace(/%/g, '').trim()
  const n = Number(normalized)
  return Number.isNaN(n) ? null : Math.max(0, Math.min(100, n))
}

function parseCategorySource(source: unknown): unknown[] {
  if (Array.isArray(source)) return source
  if (typeof source === 'string') {
    if (!source.trim()) return []
    try {
      return parseCategorySource(JSON.parse(source))
    } catch {
      return []
    }
  }
  if (!source || typeof source !== 'object') return []

  const row = source as Record<string, unknown>
  const singleName = pickStr(row, [
    'bqtype', 'name', 'type', 'label', 'jzlx', 'cslx', 'qylx', 'bqmc',
    'typeName', 'categoryName', 'venueType', 'venueTypeName', 'placeType', 'placeTypeName', 'lxmc'
  ])
  if (singleName) return [row]

  for (const key of ['list', 'rows', 'data', 'records', 'items', 'result']) {
    const nested = parseCategorySource(row[key])
    if (nested.length) return nested
  }

  const entries = Object.entries(row).filter(([, value]) => {
    if (value === null || value === undefined || value === '') return false
    if (typeof value === 'number') return true
    return typeof value === 'string' && !Number.isNaN(Number(value))
  })
  if (entries.length >= 2) {
    return entries.map(([name, value]) => ({ name, value }))
  }

  return []
}

function fitLength(source: number[], length: number): number[] {
  if (length <= 0) return []
  if (source.length >= length) return source.slice(0, length)
  const out: number[] = []
  for (let i = 0; i < length; i++) out.push(source[i % source.length])
  return out
}

function pickNum(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value))) return Number(value)
  }
  return 0
}

function pickStr(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value !== '') return value
    if (typeof value === 'number') return String(value)
  }
  return ''
}

function toCategoryList(source: unknown): Array<{ name: string; value: number }> {
  const list = parseCategorySource(source)
  if (!list.length) return []
  return list
    .map((item) => {
      const row = item as Record<string, unknown>
      const name = pickStr(row, [
        'bqtype', 'name', 'type', 'label', 'jzlx', 'cslx', 'qylx', 'bqmc',
        'typeName', 'categoryName', 'venueType', 'venueTypeName', 'placeType', 'placeTypeName', 'lxmc'
      ])
      const value = pickNum(row, [
        'bqdatacount', 'jzlxnum', 'value', 'count', 'num', 'dataCount',
        'typeCount', 'categoryCount', 'total', 'sl', 'lxsl'
      ])
      return { name, value }
    })
    .filter((item) => item.name && item.value > 0)
}

function pickCategoryArray(dataTypeCount: BasicDataCategoryCount, preferredKeys: string[]) {
  for (const key of preferredKeys) {
    const list = toCategoryList((dataTypeCount as Record<string, unknown>)[key])
    if (list.length) return list
  }
  for (const value of Object.values(dataTypeCount)) {
    const list = toCategoryList(value)
    if (list.length) return list
  }
  return []
}

function isUrgent(endTime: unknown): boolean {
  if (endTime === null || endTime === undefined || endTime === '') return false
  const end = toTimeMs(endTime)
  if (Number.isNaN(end)) return false
  const diff = end - Date.now()
  return diff > 0 && diff <= 24 * 60 * 60 * 1000
}

function slicePage<T>(all: T[], pageNum: number, pageSize: number) {
  const start = (pageNum - 1) * pageSize
  return { list: all.slice(start, start + pageSize), total: all.length }
}

function zeroAutonomousReport() {
  const categories = baseReport.autonomous.distribution.map((item) => item.name)
  return {
    cards: [
      { key: 'reportTotal', label: '报表总数', value: 0, detailType: 'report' as const },
      { key: 'taskTotal', label: '任务总数', value: 0, detailType: 'task' as const },
      { key: 'quantityTotal', label: '数据总量', value: 0 },
      { key: 'pendingFill', label: '待填报', value: 0 },
      { key: 'filling', label: '填报中', value: 0 },
      { key: 'completed', label: '已完成', value: 0 }
    ],
    distributionConfig: {
      categoryData: categories,
      legend: ['任务数'],
      series: [{ name: '任务数', type: 'bar', data: categories.map(() => 0), color: '#5dd3c8' }]
    }
  }
}

export interface DeptRow {
  id: string | number
  name: string
  count: number
}

export interface ReportRow {
  name: string
  dept: string
  /** 更新频次：优先取后端翻译好的名称，回退原始值 */
  freq: string | number
  /** 填报层级 */
  level: string
  /** 接收部门 */
  receiveDept: string
  /** 报表下发方式（常态/临时） */
  method: string
  /** 下发时间 */
  time: string
  status: string
}

export interface TaskRow {
  name: string
  issueDept: string
  receiveTime: string
  receiveDept: string
  progress: string
  dataCount: number | string
  deadline: string
  status: string
  urgent: boolean
}

export function useRegionData() {
  const selectedRegion = inject<Ref<string[]>>('selectedRegion', ref([]))
  const scaleVersion = inject<Ref<number>>('scaleVersion', ref(0))

  const scale = computed(() => scaleFromRegion(selectedRegion.value))
  const regionKey = computed(() => selectedRegion.value.join('-'))
  const regionLevel = computed<RegionLevel>(() => resolveRegionLevel(selectedRegion.value))
  const regionCode = computed(() => selectedRegion.value[selectedRegion.value.length - 1] ?? '')

  return { selectedRegion, scaleVersion, scale, regionKey, regionLevel, regionCode }
}

export function useScaledData() {
  const { scale, regionLevel } = useRegionData()
  const api = useDashboardApi()
  const useApi = apiConfig.useApi

  const userOverview = computed(() => {
    const situation = api.userSituation.value
    const countyCoverage = {
      total: Math.round(baseOverview.countyCoverage.total * scale.value),
      covered: Math.round(baseOverview.countyCoverage.covered * scale.value),
      uncovered: Math.round(baseOverview.countyCoverage.uncovered * (1 + (1 - scale.value)))
    }
    const township = situation?.townshipCoverageRateVO
    const village = situation?.villageCoverageRateVO
    const coverage = {
      countyCoverage,
      townshipCoverage: useApi
        ? { total: toCount(township?.count), covered: toCount(township?.covered) }
        : {
            total: Math.round(baseOverview.townshipCoverage.total * scale.value),
            covered: Math.round(baseOverview.townshipCoverage.covered * scale.value)
          },
      villageCoverage: useApi
        ? { total: toCount(village?.count), covered: toCount(village?.covered) }
        : {
            total: Math.round(baseOverview.villageCoverage.total * scale.value),
            covered: Math.round(baseOverview.villageCoverage.covered * scale.value)
          }
    }

    if (!useApi) {
      return {
        totalUsers: Math.round(baseOverview.totalUsers * scale.value),
        departmentUsers: Math.round(baseOverview.departmentUsers * scale.value),
        grassrootsUsers: Math.round(baseOverview.grassrootsUsers * scale.value),
        ...coverage
      }
    }

    return {
      totalUsers: num(situation?.totalUserCount),
      departmentUsers: num(situation?.departmentUserCount),
      grassrootsUsers: num(situation?.grassrootsUserCount),
      ...coverage
    }
  })

  const userLevelData = computed(() => {
    if (useApi) {
      const situation = api.userSituation.value
      return {
        autonomous: situation?.autonomousRegionLevelCount ?? 0,
        city: situation?.leagueCityLevelCount ?? 0,
        county: situation?.bannerCountyLevelCount ?? 0
      }
    }
    return {
      autonomous: Math.round(baseLevel.autonomous * scale.value),
      city: Math.round(baseLevel.city * scale.value),
      county: Math.round(baseLevel.county * scale.value)
    }
  })

  const userTrendData = computed(() => {
    if (useApi) {
      const list = api.userSituation.value?.regionalBarStatsVOList ?? []
      return {
        regions: list.map((item) => item.regionName),
        userCounts: list.map((item) => item.userCount ?? 0),
        coverageRates: list.some((item) => toRate(item.rate) !== null)
          ? list.map((item) => toRate(item.rate) ?? 0)
          : fitLength(baseTrend.coverageRates, list.length)
      }
    }

    const regions = REGION_AXIS_MAP[regionLevel.value]
    return {
      regions,
      userCounts: fitLength(baseTrend.userCounts, regions.length).map((item) => Math.round(item * scale.value)),
      coverageRates: fitLength(baseTrend.coverageRates, regions.length).map((item) =>
        Math.min(100, Math.max(30, Math.round(item * (0.8 + scale.value * 0.2))))
      )
    }
  })

  const toDeptRow = (item: { id: string; deptName: string; accountCount: number }): DeptRow => ({
    id: item.id,
    name: text(item.deptName),
    count: item.accountCount ?? 0
  })

  const mockDeptRows = (): DeptRow[] =>
    baseDept.map((item) => ({
      id: item.id,
      name: item.name,
      count: Math.max(5, Math.round(item.count * scale.value))
    }))

  const deptTopList = computed<DeptRow[]>(() => {
    if (useApi) return (api.deptTopPage.value?.data ?? []).map(toDeptRow)
    return mockDeptRows().slice(0, 6)
  })

  const fetchDeptUserPage = async (pageNum: number, pageSize: number): Promise<{ list: DeptRow[]; total: number }> => {
    if (!useApi) return slicePage(mockDeptRows(), pageNum, pageSize)
    const result = await api.fetchDeptUserPage(pageNum, pageSize)
    // 后端 total 返回的是字符串，需转成数字，否则分页计算会异常
    return { list: (result?.data ?? []).map(toDeptRow), total: Number(result?.total ?? 0) }
  }

  const buildStatusCards = () => {
    const stats = api.reportStats.value as unknown as Record<string, unknown> | null
    if (!stats) return []
    // 区划下钻到盟市/旗县（非自治区）时，不展示「待签收」「待上报」
    const HIDDEN_BELOW_AUTONOMOUS = new Set(['pendingSign', 'pendingReport'])
    return STATUS_CARD_DEFS.filter((def) => {
      if (regionLevel.value > 1 && HIDDEN_BELOW_AUTONOMOUS.has(def.key)) return false
      const value = stats[def.field]
      return value !== null && value !== undefined
    }).map((def) => ({
      key: def.key,
      label: def.label,
      value: stats[def.field] as number
    }))
  }

  const buildDistribution = () => {
    const list = api.reportStats.value?.departmentDistributionList ?? []
    const hasReport = list.some((item) => item.reportCount !== null && item.reportCount !== undefined)
    const hasTask = list.some((item) => item.taskCount !== null && item.taskCount !== undefined)

    const series: Array<{ name: string; type: 'bar'; data: number[]; color: string }> = []
    if (hasReport) {
      series.push({
        name: '报表数',
        type: 'bar',
        data: list.map((item) => item.reportCount ?? 0),
        color: '#3b82f6'
      })
    }
    if (hasTask) {
      series.push({
        name: '任务数',
        type: 'bar',
        data: list.map((item) => item.taskCount ?? 0),
        color: '#5dd3c8'
      })
    }

    return {
      categoryData: list.map((item) => item.deptName),
      legend: series.map((item) => item.name),
      series
    }
  }

  const reportData = computed(() => {
    if (!useApi) {
      const buildMockView = (source: typeof baseReport.national) => ({
        cards: [
          { key: 'reportTotal', label: '报表总数', value: source.reportTotal, detailType: 'report' as const },
          { key: 'taskTotal', label: '任务总数', value: source.taskTotal, detailType: 'task' as const },
          { key: 'quantityTotal', label: '数据总量', value: source.quantityTotal },
          { key: 'pendingSign', label: '待签收', value: source.pendingSign },
          { key: 'pendingFill', label: '待填报', value: source.pendingDestroy },
          { key: 'pendingReport', label: '待上报', value: source.specialReport },
          { key: 'filling', label: '填报中', value: source.rejecting },
          { key: 'completed', label: '已完成', value: source.completed }
          // 区划下钻到盟市/旗县（非自治区）时，不展示「待签收」「待上报」
        ].filter((card) => !(regionLevel.value > 1 && (card.key === 'pendingSign' || card.key === 'pendingReport'))),
        distributionConfig: {
          categoryData: source.distribution.map((item) => item.name),
          legend: ['报表数', '任务数'],
          series: [
            { name: '报表数', type: 'bar' as const, data: source.distribution.map((item) => item.value), color: '#3b82f6' },
            { name: '任务数', type: 'bar' as const, data: source.distribution.map((item) => item.taskCount), color: '#5dd3c8' }
          ]
        }
      })

      return {
        national: buildMockView(baseReport.national),
        autonomous: buildMockView(baseReport.autonomous)
      }
    }

    const stats = api.reportStats.value
    return {
      national: {
        cards: [
          { key: 'reportTotal', label: '报表总数', value: num(stats?.reportTotalCount), detailType: 'report' as const },
          { key: 'taskTotal', label: '任务总数', value: num(stats?.taskTotalCount), detailType: 'task' as const },
          // 数据总量按原始数字展示，不做「万」级换算（与 pc 端一致）
          { key: 'quantityTotal', label: '数据总量', value: num(stats?.dataTotalCount) },
          ...buildStatusCards()
        ],
        distributionConfig: buildDistribution()
      },
      autonomous: zeroAutonomousReport()
    }
  })

  const fillRateData = computed(() => {
    if (!useApi) return { ...baseFillRate }
    const rate = api.fillRate.value
    return {
      autonomous: toRate(rate?.autonomousRegionFillRate),
      city: toRate(rate?.leagueCityFillRate),
      county: toRate(rate?.bannerCountyFillRate),
      township: toRate(rate?.townshipFillRate),
      village: toRate(rate?.villageFillRate)
    }
  })

  const radarMetrics = computed(() => {
    const startIndex = regionLevel.value === 1 ? 0 : regionLevel.value === 2 ? 1 : 2
    return RADAR_METRIC_CONFIG.slice(startIndex).map((metric) => ({
      ...metric,
      value: fillRateData.value[metric.key] ?? 0
    }))
  })

  const buildEntity = (key: string, item: BasicDataItem | undefined, fallback: Record<string, unknown>) => {
    if (!item) {
      return {
        ...fallback,
        axisLabels: fallback.axisLabels as string[],
        governanceTrend: fallback.governanceTrend as number[],
        completionRates: fallback.completionRates as number[],
        cloudWords: fallback.cloudWords as Array<{ name: string; value: number }>,
        pieGroups: [] as Array<{ title: string; data: Array<{ name: string; value: number }> }>
      }
    }

    const regionList = item.regionList ?? []
    const dataTypeCount = item.dataTypeCount ?? {}
    const primary = pickCategoryArray(dataTypeCount, CATEGORY_KEYS[key] ?? [])

    const pieGroups: Array<{ title: string; data: Array<{ name: string; value: number }> }> = []
    if (key === 'fang') {
      const statusList = toCategoryList((dataTypeCount as Record<string, unknown>).fwjzqkData)
      const typeList = toCategoryList((dataTypeCount as Record<string, unknown>).fwjzlxData)
      if (statusList.length) pieGroups.push({ title: '居住状态分布', data: statusList })
      if (typeList.length) pieGroups.push({ title: '房屋类型分布', data: typeList })
    } else if (primary.length) {
      const title = key === 'qi' ? '企业类型分布' : key === 'changsuo' ? '场所类型分布' : '主要标签分布'
      pieGroups.push({ title, data: primary })
    }

    return {
      total: wan(item.dataCount),
      // 标签总数封顶 65：超过 65 显示 65，<=65 正常显示
      tagTotal: clampTagTotal(dataTypeCount.bqCount) ?? (primary.length ? `${Math.min(primary.length, 65)}类` : EMPTY),
      governanceTrend: regionList.map((row) => row.dataCount ?? 0),
      completionRates: regionList.map((row) => Math.round(Number.parseFloat(row.dataRegionCommunityRatio) || 0)),
      axisLabels: regionList.map((row) => row.regionName),
      cloudWords: primary,
      pieGroups
    }
  }

  const entityData = computed(() => {
    const mock = baseEntity as unknown as Record<string, Record<string, unknown>>

    if (!useApi) {
      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(mock)) {
        result[key] = {
          ...value,
          axisLabels: REGION_AXIS_MAP[regionLevel.value],
          governanceTrend: fitLength(value.governanceTrend as number[], REGION_AXIS_MAP[regionLevel.value].length).map((item) =>
            Math.round(item * scale.value)
          ),
          completionRates: fitLength(value.completionRates as number[], REGION_AXIS_MAP[regionLevel.value].length).map((item) =>
            Math.min(98, Math.max(50, Math.round(item * (0.8 + scale.value * 0.2))))
          ),
          pieGroups: []
        }
      }
      return result
    }

    const overview = api.basicData.value
    return {
      ren: buildEntity('ren', overview?.population, mock.ren),
      fang: buildEntity('fang', overview?.house, mock.fang),
      qi: buildEntity('qi', overview?.company, mock.qi),
      changsuo: buildEntity('changsuo', overview?.venue, mock.changsuo)
    }
  })

  const pickTrend = () => {
    const trend = api.accessTrend.value
    if (!trend) return { dates: [] as string[], visits: [] as number[] }
    const type = api.accessTimeType.value
    if (type === 'month') {
      const day = trend.day ?? []
      return { dates: day.map((item) => item.date), visits: day.map((item) => item.num) }
    }
    if (type === 'quarter') {
      const quarter = trend.quarter ?? []
      return { dates: quarter.map((item) => item.month), visits: quarter.map((item) => item.num) }
    }
    if (type === 'year') {
      const year = trend.year ?? []
      return { dates: year.map((item) => item.month), visits: year.map((item) => item.num) }
    }
    const week = trend.week ?? []
    return { dates: week.map((item) => item.date), visits: week.map((item) => item.num) }
  }

  const systemUsageAll = computed(() => {
    if (!useApi) {
      return {
        total: baseSysAll.total,
        dailyActive: baseSysAll.dailyActive,
        dates: baseSysAll.dates,
        visits: baseSysAll.visits.map((item) => Math.round(item * scale.value))
      }
    }
    const trend = pickTrend()
    return {
      total: visits(api.accessLoginNum.value?.totalVisits),
      dailyActive: num(api.accessLoginNum.value?.dailyActiveCount),
      dates: trend.dates,
      visits: trend.visits
    }
  })

  const systemUsageCity = computed(() => {
    if (!useApi) {
      return {
        cities: baseSysCity.cities,
        visits: baseSysCity.visits.map((item) => Math.round(item * scale.value))
      }
    }
    const list = api.accessList.value?.regionInfo ?? []
    return {
      cities: list.map((item) => pickStr(item as Record<string, unknown>, ['regionName']) || EMPTY),
      visits: list.map((item) =>
        pickNum(item as Record<string, unknown>, [
          'visitNum', 'visitCount', 'visits', 'accessCount', 'accessNum', 'useNum', 'useCount', 'num', 'count', 'totalVisits'
        ])
      )
    }
  })

  const systemUsageDept = computed(() => {
    if (!useApi) {
      return {
        departments: baseSysDept.departments,
        visits: baseSysDept.visits.map((item) => Math.round(item * scale.value))
      }
    }
    const list = api.accessList.value?.organInfo ?? []
    return {
      departments: list.map((item) => pickStr(item as Record<string, unknown>, ['organName', 'deptName', 'name', 'orgName']) || EMPTY),
      visits: list.map((item) =>
        pickNum(item as Record<string, unknown>, [
          'visitNum', 'visitCount', 'visits', 'accessCount', 'accessNum', 'useNum', 'useCount', 'num', 'count', 'loginNum', 'totalVisits'
        ])
      )
    }
  })

  const rootDatabase = computed(() => ({ ...baseRootDb }))
  const backflowData = computed(() => baseBackflow.map((item) => ({ ...item })))
  const politicalLegalData = computed(() => ({ ...basePolitical }))
  const sceneData = computed(() => sceneDataMock)

  const toReportRow = (item: Record<string, unknown>): ReportRow => ({
    name: text(item.reportName),
    dept: text(item.dispatchDeptName),
    // 频次：后端返回 updateFrequencyName（已翻译）优先，兼容旧的 updateFrequency
    freq: text(item.updateFrequencyName || item.updateFrequency),
    level: text(item.fillLevelName || item.fillLevel),
    receiveDept: text(item.recvDeptName),
    // 下发方式：distributionMethod 1-常态报表 2-临时报表
    method: REPORT_METHOD_MAP[Number(item.distributionMethod)] ?? text(item.distributionMethod),
    time: formatDateTime(item.createTime || item.receiveTime),
    status: REPORT_STATUS_MAP[item.status as number] ?? EMPTY
  })

  const toTaskRow = (item: Record<string, unknown>): TaskRow => ({
    name: text(item.taskName),
    issueDept: text(item.issueDeptName),
    receiveTime: formatDateTime(item.startTime),
    receiveDept: text(item.recvDeptName),
    progress: text(item.completeCondition),
    dataCount: raw(item.dataCount),
    deadline: formatDateTime(item.endTime),
    // 任务状态：后端返回 statusName（已翻译）优先，兼容旧的 status
    status: text(item.statusName || item.status),
    urgent: isUrgent(item.endTime)
  })

  const fetchDetailList = async (options: {
    tab: ReportTab
    type: DetailType
    pageNum: number
    pageSize: number
  }): Promise<{ list: unknown[]; total: number }> => {
    const { tab, type, pageNum, pageSize } = options

    if (tab === 'autonomous') {
      if (useApi) return { list: [], total: 0 }
      const all = type === 'report' ? autonomousReportDetailList : autonomousTaskDetailList
      return slicePage(all as unknown[], pageNum, pageSize)
    }

    if (type === 'report') {
      if (!useApi) return slicePage(nationalReportDetailList as unknown[], pageNum, pageSize)
      const list = await api.fetchReportList()
      return slicePage(
        list.map((item) => toReportRow(item as unknown as Record<string, unknown>)),
        pageNum,
        pageSize
      )
    }

    if (!useApi) return slicePage(nationalTaskDetailList as unknown[], pageNum, pageSize)
    const result = await api.fetchTaskPage(pageNum, pageSize)
    return {
      list: (result?.data ?? []).map((item) => toTaskRow(item as unknown as Record<string, unknown>)),
      total: Number(result?.total ?? 0)
    }
  }

  return {
    userOverview,
    userLevelData,
    userTrendData,
    deptTopList,
    fetchDeptUserPage,
    reportData,
    fillRateData,
    radarMetrics,
    entityData,
    systemUsageAll,
    systemUsageCity,
    systemUsageDept,
    rootDatabase,
    backflowData,
    politicalLegalData,
    sceneData,
    fetchDetailList,
    setAccessTimeType: api.setAccessTimeType,
    regionLevel
  }
}
