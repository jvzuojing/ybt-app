/**
 * 大屏接口类型定义（对照《大屏接口文档》）
 */

/** 1.1 统一响应结构 */
export interface ApiResponse<T> {
  /** 200 成功；500 处理失败/系统异常；302 无权限访问；400 参数/格式错误 */
  code: string
  message: string
  data: T
}

/** 分页包装 */
export interface PageResult<T> {
  data: T[]
  total: number
  pages: number
  current: number
  size: number
}

/* ------------------------------------------------------------------ *
 * 2.1 用户情况统计  DashboardUserSituationVO
 * ------------------------------------------------------------------ */

export interface RegionalBarStats {
  regionName: string
  userCount: number
  rate: string
}

/** 覆盖率统计（街道 / 村社区） */
export interface CoverageRateVO {
  /** 已覆盖 */
  covered: number
  /** 未覆盖 */
  unCovered: number
  /** 总数 */
  count: number
}

export interface UserSituationVO {
  /** 用户总数 */
  totalUserCount: number
  /** 部门用户数 */
  departmentUserCount: number
  /** 基层用户数 */
  grassrootsUserCount: number
  /** 自治区级数 */
  autonomousRegionLevelCount: number
  /** 盟市级数 */
  leagueCityLevelCount: number
  /** 旗县区级数 */
  bannerCountyLevelCount: number
  /** 乡镇街道（苏木）覆盖率 */
  townshipCoverageRateVO: CoverageRateVO
  /** 村社区（嘎查）覆盖率 */
  villageCoverageRateVO: CoverageRateVO
  /** 区划柱状图列表 */
  regionalBarStatsVOList: RegionalBarStats[]
}

/* ------------------------------------------------------------------ *
 * 2.2 用户部门分布统计  DashboardUserSituationEntity
 * ------------------------------------------------------------------ */

export interface DeptUserEntity {
  id: string
  regionCode: string
  parentRegionCode: string
  deptCode: string
  deptName: string
  deptLevel: string
  accountCount: number
}

/* ------------------------------------------------------------------ *
 * 2.3 报表统计
 * ------------------------------------------------------------------ */

export interface DepartmentDistribution {
  deptName: string
  reportCount: number | null
  taskCount: number | null
}

export interface ReportStatsVO {
  reportTotalCount: number | null
  taskTotalCount: number | null
  dataTotalCount: number | null
  pendingForwardCount: number | null
  fillingCount: number | null
  pendingReportCount: number | null
  pendingReviewCount: number | null
  pendingSignCount: number | null
  completedCount: number | null
  pendingFillCount: number | null
  finishedCount: number | null
  departmentDistributionList: DepartmentDistribution[]
}

/* ------------------------------------------------------------------ *
 * 2.4 国家任务列表  TaskMonitorListDTO
 * ------------------------------------------------------------------ */

export interface TaskMonitorDTO {
  instanceId: string
  taskId: string
  reportId: string
  procdefId: string
  taskName: string
  status: string
  startTime: string
  endTime: string
  submitTime: string
  recvDeptCode: string
  recvDeptName: string
  handlerUserId: string
  handlerUserName: string
  issueDeptCode: string
  issueDeptName: string
  completeCondition: string
  dataCount: number
  isExpired: boolean
  hasChild: boolean
  fillingMode: string
  taskSource: string
  taskMode: number
  deptSystemUrl: string
  instanceHandlerUserId: string
  instanceHandlerUserName: string
  flowFillDeptMode: string
  fillingScope: string
}

/* ------------------------------------------------------------------ *
 * 2.5 国家报表列表统计  NationalReportVo
 * ------------------------------------------------------------------ */

export interface NationalReportVO {
  id: string
  reportCode: string
  reportName: string
  reportVersion: string
  /** 更新频率（字典值，清单文档未提供，前端原样展示） */
  updateFrequency: number | string
  /** 填报层级（字典值，清单文档未提供，前端原样展示） */
  fillLevel: number | string
  dispatchDeptCode: string
  dispatchDeptName: string
  recvDeptCode: string
  recvDeptName: string
  workBasis: string
  workBasisFile: string
  workBasisFileName: string
  workBasisFileRcId: string
  reportSampleFile: string
  reportSampleFileName: string
  reportSampleFileRcId: string
  dataItemFile: string
  dataItemFileName: string
  dataItemFileRcId: string
  dataItemOriginFile: string
  dataItemOriginFileName: string
  dataItemOriginFileRcId: string
  /** 下发方式：1-常态报表，2-临时报表 */
  distributionMethod: number
  /** 操作类型：1-新增报表，2-报表更新 */
  operation: number
  /** 状态：1-待签收，2-已签收，3-拒绝，4-完成建表 */
  status: number
  /** 数据项解析状态：0-待解析，1-已解析 */
  tableParseStatus: number
  /** 数据采集模式：1-一表通采集，2-外部系统采集 */
  dataCollectionMode: number
  exitReason: string
  receiveUserId: string
  receiveUserName: string
  receiveTime: string
  createTime: string
  updateTime: string
  ext: string
  deleted: string
}

/* ------------------------------------------------------------------ *
 * 2.6 数据填报率  DataFillRateVO（null 字段不序列化）
 * ------------------------------------------------------------------ */

export interface DataFillRateVO {
  autonomousRegionFillRate?: string | null
  leagueCityFillRate?: string | null
  bannerCountyFillRate?: string | null
  townshipFillRate?: string | null
  villageFillRate?: string | null
}

/* ------------------------------------------------------------------ *
 * 2.7 系统使用情况 - 登录趋势
 * ------------------------------------------------------------------ */

export interface TrendHourItem {
  time: string
  num: number
}

export interface TrendDayItem {
  date: string
  num: number
}

export interface TrendMonthItem {
  month: string
  num: number
}

export interface AccessTrendVO {
  /** 昨日逐小时访问次数（24 点，缺数补 0） */
  hour: TrendHourItem[]
  /** 近 31 天每日访问次数 */
  day: TrendDayItem[]
  /** 最近 7 天 */
  week: TrendDayItem[]
  /** 近 12 个月 */
  year: TrendMonthItem[]
  /** 本季度 3 个月 */
  quarter: TrendMonthItem[]
  weekTotal: number
  quarterTotal: number
}

/* ------------------------------------------------------------------ *
 * 2.8 系统使用情况 - 地区/部门使用情况
 * 文档仅说明"含 organCode、各项访问/登录指标等"，字段名未逐一列出，
 * 因此这里用宽松索引签名 + 适配层容错取值。
 * ------------------------------------------------------------------ */

export interface AccessOrganInfo {
  organCode?: string
  organName?: string
  [key: string]: unknown
}

export interface AccessRegionInfo {
  regionCode: string
  regionName: string
  [key: string]: unknown
}

export interface AccessListVO {
  organInfo: AccessOrganInfo[]
  regionInfo: AccessRegionInfo[]
  startDate: string
  endDate: string
}

/* ------------------------------------------------------------------ *
 * 2.9 系统使用情况 - 总访问量&日活跃次数
 * ------------------------------------------------------------------ */

export interface AccessLoginNumVO {
  totalVisits: number
  dailyActiveCount: number
}

/* ------------------------------------------------------------------ *
 * 2.10 区划树
 * ------------------------------------------------------------------ */

export interface RegionNode {
  regionCode: string
  regionName: string
  parentCode: string
  /** 区划层级：自治区=2，盟市=3，旗县区=4 */
  grade: string
  /** 兼容旧文档里的错误字段名 */
  gdrade?: string
  childrens: RegionNode[]
}

/* ------------------------------------------------------------------ *
 * 2.11 基础数据 - 人房企场所概览
 * ------------------------------------------------------------------ */

export interface BasicDataRegionItem {
  regionCode: string
  regionName: string
  dataCount: number
  dataRegionCommunityCount: number
  dataRegionCommunityCompletedCount: number
  /** 如 "65.00%" */
  dataRegionCommunityRatio: string
}

/** 分类分布明细项，不同类别字段名不统一，取宽松结构 */
export interface BasicDataCategoryItem {
  [key: string]: unknown
}

export interface BasicDataCategoryCount {
  bqCount?: number
  bqData?: BasicDataCategoryItem[] | string
  fwjzlxData?: BasicDataCategoryItem[] | string
  fwjzqkData?: BasicDataCategoryItem[] | string
  cslxData?: BasicDataCategoryItem[] | string
  [key: string]: unknown
}

export interface BasicDataItem {
  dataCount: number
  dataTypeCount: BasicDataCategoryCount
  regionList: BasicDataRegionItem[]
}

export interface BasicDataOverviewVO {
  population: BasicDataItem
  house: BasicDataItem
  company: BasicDataItem
  venue: BasicDataItem
}

/* ------------------------------------------------------------------ *
 * 新增：自治区报表 / 基层精简保留清单（getFillCount）
 * isExtended=false → 自治区报表；true → 基层精简保留清单
 * ------------------------------------------------------------------ */

/** 报表清单明细 */
export interface LedgerInfo {
  /** 该表累计数据量 */
  dataTotal: number
  /** 数据表名称 */
  ledgerName: string
  /** 发布部门名称 */
  orgName: string
  /** 填报周期（每半年 / 每年 / 每月 / 不定期 …） */
  reportCycleName: string
  /** 最后上线时间；后端字段名含拼写错误，同时兼容正确拼写 */
  lastOnlieTime?: string
  lastOnlineTime?: string
}

export interface FillCountVO {
  /** 下发部门总数 */
  ledgerIssueCount: number
  /** 按填报频率统计：{ 每半年: 10, 每月: 3, … } */
  cycleLedgerCount: Record<string, number>
  /** 累计数据量 */
  ledgerDataCount: number
  /** 数据表分布情况：{ 部门名: 张数 } */
  deptLedgerCount: Record<string, number>
  /** 数据表总数 */
  ledgerCount: number
  /** 明细列表 */
  ledgerListInfo: LedgerInfo[]
}
