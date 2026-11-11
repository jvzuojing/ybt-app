// 区域级联数据
export const regionOptions = [
  {
    value: 'neimenggu',
    label: '内蒙古自治区',
    children: [
      {
        value: 'huhehaote',
        label: '呼和浩特市',
        children: [
          { value: 'xincheng', label: '新城区' },
          { value: '回民', label: '回民区' },
          { value: '玉泉', label: '玉泉区' },
          { value: '赛罕', label: '赛罕区' },
          { value: '土默特左', label: '土默特左旗' },
          { value: '托克托', label: '托克托县' },
          { value: '和林格尔', label: '和林格尔县' },
          { value: '清水河', label: '清水河县' },
          { value: '武川', label: '武川县' }
        ]
      },
      {
        value: 'baotou',
        label: '包头市',
        children: [
          { value: 'kunlun', label: '昆都仑区' },
          { value: 'qingshan', label: '青山区' },
          { value: 'donghe', label: '东河区' },
          { value: 'jiuyuan', label: '九原区' },
          { value: 'baogang', label: '包头市稀土高新区' }
        ]
      },
      {
        value: 'wulanqab',
        label: '乌兰察布市',
        children: [
          { value: '集宁', label: '集宁区' },
          { value: 'zhuozishan', label: '卓资县' },
          { value: 'xinghe', label: '兴和县' }
        ]
      }
    ]
  }
]

// 用户情况 - 概览
export const userOverview = {
  totalUsers: 79725,
  departmentUsers: 21212,
  grassrootsUsers: 21212,
  countyCoverage: {
    total: 5244,
    covered: 4321,
    uncovered: 450
  },
  townshipCoverage: {
    total: 1041,
    covered: 1041
  },
  villageCoverage: {
    total: 13942,
    covered: 13942
  }
}

// 用户层级分布（自治区级/盟市级/旗县区级）
export const userLevelData = {
  autonomous: 678,
  city: 2234,
  county: 4321
}

// 用户数+村社覆盖率趋势（最近12个月）
export const userTrendData = {
  months: ['2025-06', '2025-07', '2025-08'],
  userCounts: [800, 1000, 1400, 1800, 1200, 1600, 1100, 1900, 1700, 1300, 1500, 2000],
  coverageRates: [60, 65, 70, 75, 68, 72, 78, 80, 82, 76, 85, 90]
}

// 用户部门分布
export const departmentList = [
  { id: 1, name: '新城区民政局', count: 60 },
  { id: 2, name: '新城区社会保障局', count: 50 },
  { id: 3, name: '新城区应急管理局', count: 40 },
  { id: 4, name: '新城区医疗保障局', count: 30 },
  { id: 5, name: '新城区邮政公司', count: 20 },
  { id: 6, name: '新城区公安局', count: 55 },
  { id: 7, name: '新城区司法局', count: 25 },
  { id: 8, name: '新城区财政局', count: 35 },
  { id: 9, name: '新城区教育局', count: 45 },
  { id: 10, name: '新城区卫健委', count: 52 },
  { id: 11, name: '新城区住建局', count: 38 },
  { id: 12, name: '新城区交通局', count: 28 },
  { id: 13, name: '新城区生态环境局', count: 22 },
  { id: 14, name: '新城区水务局', count: 18 },
  { id: 15, name: '新城区农牧林业局', count: 32 },
  { id: 16, name: '新城区文旅局', count: 15 },
  { id: 17, name: '新城区市场监管局', count: 42 },
  { id: 18, name: '新城区统计局', count: 12 },
  { id: 19, name: '新城区退役军人事务局', count: 20 },
  { id: 20, name: '新城区信访局', count: 16 }
]

// 报表数据
export const reportData = {
  national: {
    reportTotal: 32,
    taskTotal: 40,
    quantityTotal: '12万',
    pendingSign: 2,
    pendingDestroy: 4,
    specialReport: 0,
    rejecting: 1,
    completed: 26,
    distribution: [
      { name: '住房城乡建设部', value: 12, taskCount: 15 },
      { name: '中华全国总工会', value: 7, taskCount: 9 },
      { name: '农业农村部', value: 2, taskCount: 3 },
      { name: '人力资源社会保障部', value: 11, taskCount: 13 },
      { name: '民政部', value: 1, taskCount: 2 },
      { name: '卫健委', value: 2, taskCount: 2 },
      { name: '团中央', value: 7, taskCount: 8 },
      { name: '其他', value: 1, taskCount: 1 }
    ]
  },
  autonomous: {
    reportTotal: 109,
    taskTotal: 109,
    quantityTotal: '10万',
    pendingSign: 3,
    pendingDestroy: 2,
    specialReport: 1,
    rejecting: 2,
    completed: 20,
    distribution: [
      { name: '自治区民政厅', value: 10, taskCount: 12 },
      { name: '自治区人社厅', value: 18, taskCount: 20 },
      { name: '自治区卫健委', value: 8, taskCount: 9 },
      { name: '自治区住建厅', value: 6, taskCount: 7 },
      { name: '自治区农牧厅', value: 3, taskCount: 4 },
      { name: '其他', value: 4, taskCount: 5 }
    ]
  }
}

function padNumber(num: number, length = 3) {
  return String(num).padStart(length, '0')
}

function repeatSeed<T>(seed: T[], total: number, extend: (item: T, index: number) => T) {
  return Array.from({ length: total }, (_, index) => extend(seed[index % seed.length], index))
}

const nationalReportSeed = [
  { name: '【总工会】工会阵地运行状况摸底表', dept: '中华全国总工会机关', freq: '每年', status: '已建表' },
  { name: '【总工会】工会阵地治理帮扶表', dept: '中华全国总工会机关', freq: '每年', status: '已建表' },
  { name: '【团中央】新兴领域团的建设表', dept: '中国共产主义青年团中央', freq: '不定期', status: '待签收' },
  { name: '人社部《被征地农民社会保障情况表》', dept: '人力资源社会保障部', freq: '每半年', status: '已签收' },
  { name: '【住建部】城市更新行动摸底表', dept: '住房城乡建设部', freq: '每年', status: '已签收' },
  { name: '【农业农村部】乡村振兴帮扶表', dept: '农业农村部', freq: '每年', status: '已签收' },
  { name: '【民政部】养老服务设施摸底表', dept: '民政部', freq: '每年', status: '已签收' },
  { name: '【卫健委】基层卫生服务能力表', dept: '国家卫生健康委', freq: '每年', status: '已签收' }
]

const nationalTaskSeed = [
  { name: '国家人口基础信息月报任务', issueDept: '公安部', receiveTime: '2026-08-01 09:00', receiveDept: '自治区公安厅', progress: '112/112', dataCount: '18.6万', deadline: '2026-08-05 18:00', status: '已完成' },
  { name: '被征地农民社会保障核验任务', issueDept: '人力资源社会保障部', receiveTime: '2026-08-02 10:30', receiveDept: '自治区人社厅', progress: '98/112', dataCount: '6.2万', deadline: '2026-08-08 18:00', status: '填报中' },
  { name: '保障性住房建设统计任务', issueDept: '住房城乡建设部', receiveTime: '2026-08-03 14:20', receiveDept: '自治区住建厅', progress: '72/112', dataCount: '4.8万', deadline: '2026-08-10 18:00', status: '待填报' },
  { name: '养老服务设施核查任务', issueDept: '民政部', receiveTime: '2026-08-04 08:45', receiveDept: '自治区民政厅', progress: '已签收', dataCount: '2.1万', deadline: '2026-08-09 18:00', status: '待签收' },
  { name: '基层卫生服务能力填报任务', issueDept: '国家卫生健康委', receiveTime: '2026-08-05 11:00', receiveDept: '自治区卫健委', progress: '64/112', dataCount: '3.4万', deadline: '2026-08-12 18:00', status: '填报中' }
]

const autonomousReportSeed = [
  { name: '自治区民政重点人群摸排表', tableName: '民政重点人群库', scope: '12个盟市', cycle: '每月', startTime: '2026-08-01', endTime: '2026-08-31', currentProgress: '12/12', status: '已建表' },
  { name: '自治区低保对象核验表', tableName: '低保对象主题库', scope: '103个旗县区', cycle: '每月', startTime: '2026-08-01', endTime: '2026-08-31', currentProgress: '97/103', status: '填报中' },
  { name: '自治区养老机构运营情况表', tableName: '养老机构资源库', scope: '12个盟市', cycle: '每季度', startTime: '2026-07-01', endTime: '2026-09-30', currentProgress: '12/12', status: '已完成' },
  { name: '自治区住房保障基础信息表', tableName: '住房保障基础库', scope: '103个旗县区', cycle: '每月', startTime: '2026-08-01', endTime: '2026-08-31', currentProgress: '88/103', status: '填报中' },
  { name: '自治区基层卫健服务监测表', tableName: '基层卫健资源库', scope: '103个旗县区', cycle: '每月', startTime: '2026-08-01', endTime: '2026-08-31', currentProgress: '103/103', status: '已完成' },
  { name: '自治区乡村振兴重点任务表', tableName: '乡村振兴监测库', scope: '12个盟市', cycle: '每月', startTime: '2026-08-01', endTime: '2026-08-31', currentProgress: '11/12', status: '待填报' }
]

const autonomousTaskSeed = [
  { name: '自治区民政重点人群摸排任务', tableName: '民政重点人群库', scope: '12个盟市', cycle: '每月', startTime: '2026-08-01', endTime: '2026-08-31', currentProgress: '12/12', status: '已完成' },
  { name: '自治区低保对象核验任务', tableName: '低保对象主题库', scope: '103个旗县区', cycle: '每月', startTime: '2026-08-01', endTime: '2026-08-31', currentProgress: '97/103', status: '填报中' },
  { name: '自治区养老机构运营监测任务', tableName: '养老机构资源库', scope: '12个盟市', cycle: '每季度', startTime: '2026-07-01', endTime: '2026-09-30', currentProgress: '12/12', status: '已完成' },
  { name: '自治区住房保障基础核查任务', tableName: '住房保障基础库', scope: '103个旗县区', cycle: '每月', startTime: '2026-08-01', endTime: '2026-08-31', currentProgress: '88/103', status: '填报中' },
  { name: '自治区基层卫健服务填报任务', tableName: '基层卫健资源库', scope: '103个旗县区', cycle: '每月', startTime: '2026-08-01', endTime: '2026-08-31', currentProgress: '65/103', status: '待填报' },
  { name: '自治区乡村振兴专题汇聚任务', tableName: '乡村振兴监测库', scope: '12个盟市', cycle: '每月', startTime: '2026-08-01', endTime: '2026-08-31', currentProgress: '10/12', status: '待签收' }
]

// 报表明细列表（点击报表总数/任务总数查看详情）
export const nationalReportDetailList = repeatSeed(nationalReportSeed, 32, (item, index) => ({
  ...item,
  name: `${item.name}${index >= nationalReportSeed.length ? `（${padNumber(index + 1)}）` : ''}`
}))

export const nationalTaskDetailList = repeatSeed(nationalTaskSeed, 40, (item, index) => ({
  ...item,
  name: `${item.name}${index >= nationalTaskSeed.length ? `（${padNumber(index + 1)}）` : ''}`,
  dataCount: `${(Number.parseFloat(item.dataCount) + (index % 4) * 0.3).toFixed(1)}万`
}))

export const autonomousReportDetailList = repeatSeed(autonomousReportSeed, 109, (item, index) => ({
  ...item,
  name: `${item.name}${index >= autonomousReportSeed.length ? `（${padNumber(index + 1)}）` : ''}`
}))

export const autonomousTaskDetailList = repeatSeed(autonomousTaskSeed, 109, (item, index) => ({
  ...item,
  name: `${item.name}${index >= autonomousTaskSeed.length ? `（${padNumber(index + 1)}）` : ''}`
}))

export const reportDetailList = nationalReportDetailList

// 基础特色场景弹窗数据
export const sceneData = {
  totalData: '234万',
  dataTime: '2026年8月4日',
  baseScenes: [
    { name: '人口', value: 21345 },
    { name: '房屋', value: 21345 },
    { name: '企业', value: 21345 },
    { name: '场所', value: 21345 }
  ],
  extendScenes: Array.from({ length: 14 }, () => ({ name: '场景名称1', value: 21345 })),
  otherScenes: ['信息总览', '人口变动监测', '安全生产', '经济困难老年人补贴', '畜牧养殖场巡检']
}

// 数据填报率（三角形雷达）
export const fillRateData = {
  autonomous: 60,
  city: 70,
  county: 60,
  township: 50,
  village: 65
}

// 人房企场所 数据
export const entityData = {
  ren: {
    total: '884.8万',
    tagTotal: '50类',
    governanceTrend: [200, 220, 260, 280, 250, 310, 280, 320, 350, 330, 340, 360],
    completionRates: [70, 72, 75, 78, 80, 82, 79, 85, 88, 86, 90, 92],
    cloudWords: [
      { name: '残疾人', value: 200 },
      { name: '养老', value: 180 },
      { name: '实名认证', value: 160 },
      { name: '低保', value: 140 },
      { name: '就业', value: 120 },
      { name: '医生', value: 100 },
      { name: '学历', value: 90 },
      { name: '残疾等级', value: 85 },
      { name: '养老保险', value: 80 },
      { name: '医疗保险', value: 75 },
      { name: '儿童', value: 70 },
      { name: '老人', value: 65 },
      { name: '妇女', value: 60 },
      { name: '流动人口', value: 55 },
      { name: '常住人口', value: 50 }
    ]
  },
  fang: {
    total: '320.5万',
    tagTotal: '45类',
    governanceTrend: [150, 170, 190, 210, 200, 230, 220, 250, 270, 260, 280, 300],
    completionRates: [65, 68, 72, 74, 76, 78, 75, 82, 84, 83, 88, 90],
    cloudWords: [
      { name: '房屋类型', value: 180 },
      { name: '建筑面积', value: 150 },
      { name: '产权人', value: 130 },
      { name: '居住状态', value: 120 },
      { name: '租赁', value: 100 },
      { name: '抵押', value: 85 },
      { name: '危房', value: 70 },
      { name: '商住两用', value: 60 },
      { name: '宅基地', value: 55 },
      { name: '安置房', value: 50 }
    ]
  },
  qi: {
    total: '15.8万',
    tagTotal: '38类',
    governanceTrend: [50, 60, 75, 85, 90, 100, 95, 110, 120, 130, 140, 150],
    completionRates: [60, 65, 70, 72, 75, 78, 76, 82, 85, 84, 88, 91],
    cloudWords: [
      { name: '企业类型', value: 160 },
      { name: '统一社会信用代码', value: 140 },
      { name: '法人代表', value: 120 },
      { name: '经营范围', value: 100 },
      { name: '注册资本', value: 90 },
      { name: '成立日期', value: 80 },
      { name: '经营状态', value: 75 },
      { name: '行业分类', value: 65 },
      { name: '纳税信用', value: 55 }
    ]
  },
  changsuo: {
    total: '12.3万',
    tagTotal: '32类',
    governanceTrend: [40, 55, 65, 75, 80, 88, 92, 100, 110, 115, 120, 125],
    completionRates: [58, 62, 68, 70, 73, 76, 75, 80, 83, 82, 86, 89],
    cloudWords: [
      { name: '场所类型', value: 150 },
      { name: '场所名称', value: 130 },
      { name: '地址', value: 110 },
      { name: '负责人', value: 100 },
      { name: '联系电话', value: 85 },
      { name: '经营面积', value: 70 },
      { name: '员工人数', value: 60 },
      { name: '是否特种设备', value: 50 }
    ]
  }
}

// 系统使用情况 - 全部（趋势折线图）
export const systemUsageAll = {
  total: '207万次',
  dailyActive: '79725',
  dates: ['7月3日', '7月4日', '7月5日', '7月6日', '7月7日', '7月8日'],
  visits: [140, 100, 130, 143, 144, 142]
}

// 系统使用情况 - 按地市
export const systemUsageCity = {
  cities: ['呼市', '包头', '鄂市', '赤峰', '通辽', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '兴安盟', '锡林郭勒', '阿拉善'],
  visits: [280, 240, 210, 200, 180, 178, 173, 160, 150, 145, 140]
}

// 系统使用情况 - 按部门
export const systemUsageDept = {
  departments: ['部门1', '部门2', '部门3', '部门4', '部门5', '部门6', '部门7', '部门8', '部门9', '部门10'],
  visits: [260, 230, 200, 190, 175, 165, 160, 155, 145, 130]
}

// 数据使用情况 - 一表通根数据库
export const rootDatabase = {
  departments: 16,
  categories: 65,
  dataVolume: '15.42亿条'
}

// 回流情况
export const backflowData = [
  { label: '人口数据', value: '3147万条' },
  { label: '企业数据', value: '311万条' },
  { label: '房屋地址数据', value: '1273万条' },
  { label: '高频标签数据', value: '1.8亿条' }
]

// 政法委系统对接
export const politicalLegalData = {
  tags: { value: '1.6亿条', label: '标签数据' },
  population: { value: '3147万条', label: '人口数据' },
  house: { value: '1273万条', label: '房屋数据' },
  relation: { value: '1679万条', label: '人房关联数据' }
}
