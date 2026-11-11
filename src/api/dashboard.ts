/**
 * 大屏接口（对照《大屏接口文档》2.1 ~ 2.11）
 * 路径统一取自 apiConfig.paths，支持运行时覆盖
 */
import { apiAuth, apiConfig, FILL_COUNT_SECRET } from '../config/api'
import { post } from './request'
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

/** 2.1 用户情况统计 */
export function getUserSituation(regionCode?: string) {
  return post<UserSituationVO>(apiConfig.paths.userSituation, { regionCode: regionCode ?? '' })
}

/** 2.2 用户部门分布统计（分页）；pageNum/pageSize 走路径，regionCode 为 Body 必填 */
export function getDeptUserCount(pageNum: number, pageSize: number, regionCode: string) {
  const path = `${apiConfig.paths.deptUserCount}/${pageNum}/${pageSize}`
  return post<PageResult<DeptUserEntity>>(path, { regionCode })
}

/** 2.3 报表统计；taskSource=country 时统计国家侧 */
export function getReportStats(taskSource?: string, regionCode?: string) {
  return post<ReportStatsVO>(apiConfig.paths.reportStats, {
    taskSource: taskSource ?? '',
    regionCode: regionCode ?? ''
  })
}

/** 2.4 国家任务列表（分页）；pageNum/pageSize 走路径 */
export function getNationalTaskList(
  pageNum: number,
  pageSize: number,
  taskSource = 'country',
  regionCode?: string
) {
  const path = `${apiConfig.paths.nationalTaskList}/${pageNum}/${pageSize}`
  return post<PageResult<TaskMonitorDTO>>(path, { taskSource, regionCode: regionCode ?? '' })
}

/** 2.5 国家报表列表统计（无分页，返回全量列表） */
export function getReportListStats(regionCode?: string) {
  return post<NationalReportVO[]>(apiConfig.paths.reportListStats, { regionCode: regionCode ?? '' })
}

/** 2.6 数据填报率；文档提示 body 传 null 会 NPE，必须传 JSON */
export function getDataFillRate(regionCode?: string) {
  return post<DataFillRateVO>(apiConfig.paths.dataFillRate, { regionCode: regionCode ?? '' })
}

/** 2.7 系统使用情况 - 登录趋势 */
export function getAccessTrend(regionCode?: string) {
  return post<AccessTrendVO>(apiConfig.paths.accessTrend, { regionCode: regionCode ?? '' })
}

/** 2.8 系统使用情况 - 地区/部门使用情况；queryType: ''=全部，dept=按部门，region=按地市 */
export function getAccessList(timeType?: string, queryType?: string, regionCode?: string) {
  return post<AccessListVO>(apiConfig.paths.accessList, {
    timeType: timeType ?? '',
    queryType: queryType ?? '',
    regionCode: regionCode ?? ''
  })
}

/** 2.9 系统使用情况 - 总访问量&日活跃次数 */
export function getAccessLoginNum(regionCode?: string) {
  return post<AccessLoginNumVO>(apiConfig.paths.accessLoginNum, { regionCode: regionCode ?? '' })
}

/** 2.10 区划树；不传 regionCode 取当前登录用户区划，无权限返回 302 */
export function getRegionTree(regionCode?: string) {
  return post<RegionNode>(apiConfig.paths.regionTree, { regionCode: regionCode ?? '' })
}

/** 2.11 基础数据 - 人房企场所概览 */
export function getDaPingBasicDataOverview(regionCode?: string) {
  return post<BasicDataOverviewVO>(apiConfig.paths.basicDataOverview, { regionCode: regionCode ?? '' })
}

/**
 * 新增：自治区报表 / 基层精简保留清单共用接口
 * @param regionCode 区划代码（必填）
 * @param isExtended true=基层精简保留清单，false=自治区报表
 *
 * 该接口为独立开放接口，文档要求固定携带 appKey + appSecret 请求头，
 * 因此无论是否 apiKey 构建模式都显式附加，不依赖全局鉴权开关。
 */
export function getFillCount(regionCode: string, isExtended: boolean) {
  return post<FillCountVO>(
    apiConfig.paths.fillCount,
    { regionCode, isExtended },
    { appKey: apiAuth.apiKey, appSecret: FILL_COUNT_SECRET }
  )
}
