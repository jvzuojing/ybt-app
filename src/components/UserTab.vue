<template>
  <div class="user-root">
    <div v-if="tabLoading" class="loading-mask">
      <span class="loading-spinner"></span>
    </div>
    <div class="stat-row">
      <div class="dark-card">
        <div class="dc-label">用户总数</div>
        <div class="dc-value">{{ pendingData ? '—' : userOverview.totalUsers }}</div>
      </div>
      <div class="dark-card">
        <div class="dc-label">部门用户数</div>
        <div class="dc-value">{{ pendingData ? '—' : userOverview.departmentUsers }}</div>
      </div>
      <div class="dark-card">
        <div class="dc-label">基层用户数</div>
        <div class="dc-value">{{ pendingData ? '—' : userOverview.grassrootsUsers }}</div>
      </div>
    </div>

    <div class="sec-title">覆盖业务部门数</div>
    <div class="level-wrap">
      <div ref="levelRingRef" class="level-ring"></div>
      <div class="level-legend">
        <div v-for="seg in levelSegments" :key="seg.name" class="legend-item">
          <span class="legend-name">{{ seg.name }}</span>
          <span class="legend-swatch" :style="{ background: seg.color }"></span>
          <span class="legend-val">{{ pendingData ? '—' : seg.value.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <div class="cov-row">
      <div class="cov-col">
        <div class="cov-title">乡镇街道（苏木）覆盖率</div>
        <div ref="townshipRingRef" class="cov-ring"></div>
        <div class="cov-rate">{{ townshipRateText }}</div>
      </div>
      <div class="cov-col">
        <div class="cov-title">村社区（嘎查）覆盖率</div>
        <div ref="villageRingRef" class="cov-ring"></div>
        <div class="cov-rate">{{ villageRateText }}</div>
      </div>
    </div>

    <div class="sec-title">下辖区县用户分布</div>
    <div ref="distRef" class="dist-chart"></div>

    <div class="dept-header">
      <span class="sec-title" style="margin: 0">用户部门分布统计</span>
      <span class="view-all" @click="showAllDept = true">&lt;&lt;&lt; 查看全部</span>
    </div>
    <table class="data-table">
      <thead>
        <tr><th>序号</th><th>部门名称</th><th>账号总数</th></tr>
      </thead>
      <tbody>
        <tr v-for="(d, i) in displayDept" :key="d.id">
          <td>{{ i + 1 }}</td>
          <td class="text-left" :title="d.name">{{ d.name }}</td>
          <td class="num">{{ d.count }}</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showAllDept" class="modal-mask" @click.self="showAllDept = false">
      <div class="modal-box">
        <div class="modal-header">
          <span>用户部门分布统计</span>
          <span class="modal-close" @click="showAllDept = false">✕</span>
        </div>
        <div class="modal-body">
          <table class="data-table wrap-table">
            <thead>
              <tr><th>序号</th><th>部门名称</th><th>账号总数</th></tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in dialogList" :key="d.id">
                <td>{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                <td class="text-left dialog-name">{{ d.name }}</td>
                <td class="num">{{ d.count }}</td>
              </tr>
            </tbody>
          </table>
          <div class="pager-row">
            <button class="pager-btn" :disabled="currentPage <= 1 || dialogLoading" @click="loadDeptPage(currentPage - 1)">上一页</button>
            <span class="pager-text">第 {{ currentPage }} / {{ totalPages }} 页，共 {{ dialogTotal }} 条</span>
            <button class="pager-btn" :disabled="currentPage >= totalPages || dialogLoading" @click="loadDeptPage(currentPage + 1)">下一页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { useScaledData, useRegionData } from '../composables/useRegionData'
import { useDashboardApi } from '../composables/useDashboardApi'
import { apiConfig } from '../config/api'

type DeptRow = { id: string | number; name: string; count: number }

const { userOverview, deptTopList, userLevelData, userTrendData, fetchDeptUserPage, regionLevel } = useScaledData()
const { regionKey } = useRegionData()
const { apiLoading, userSituation, deptTopPage } = useDashboardApi()

// 本页两个接口（用户情况 / 部门账号统计）任一在请求中即显示局部 loading
const tabLoading = computed(() => apiLoading.userSituation || apiLoading.deptTop)

// API 模式下数据未返回前不渲染数字与图表（复测问题：会先显示一下 0 再消失）
const pendingData = computed(
  () => apiConfig.useApi && (userSituation.value === null || deptTopPage.value === null)
)

const levelRingRef = ref<HTMLElement>()
const townshipRingRef = ref<HTMLElement>()
const villageRingRef = ref<HTMLElement>()
const distRef = ref<HTMLElement>()
const showAllDept = ref(false)

// 弹窗打开时锁定页面滚动，避免页面右侧出现滚动条
watch(showAllDept, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// 切换区划后数据重新拉取，立即关闭「查看全部」弹窗
watch(regionKey, () => {
  showAllDept.value = false
})
const dialogLoading = ref(false)
const dialogList = ref<DeptRow[]>([])
const dialogTotal = ref(0)
const currentPage = ref(1)
const pageSize = 8
const totalPages = computed(() => Math.max(1, Math.ceil(dialogTotal.value / pageSize)))

const displayDept = computed(() => deptTopList.value.slice(0, 5))
// 层级分段与 pc 端一致：自治区 3 段 / 盟市 2 段（去掉自治区级）/ 旗县区 1 段
const levelSegments = computed(() => {
  const lvl = userLevelData.value
  const all = [
    { name: '自治区级', value: lvl.autonomous, color: '#4a7ab8' },
    { name: '盟市级', value: lvl.city, color: '#6fb5a8' },
    { name: '旗县区级', value: lvl.county, color: '#8fd8e8' }
  ]
  if (regionLevel.value === 1) return all
  if (regionLevel.value === 2) return all.slice(1)
  return all.slice(2)
})
const levelTotal = computed(() => levelSegments.value.reduce((sum, item) => sum + item.value, 0))

function formatCoverage(covered: number, total: number) {
  if (!total) return '覆盖率 --'
  const rate = Math.max(0, Math.min(100, (covered / total) * 100))
  return `覆盖率 ${rate.toFixed(2)}%`
}
const townshipRateText = computed(() =>
  formatCoverage(userOverview.value.townshipCoverage.covered, userOverview.value.townshipCoverage.total)
)
const villageRateText = computed(() =>
  formatCoverage(userOverview.value.villageCoverage.covered, userOverview.value.villageCoverage.total)
)

let levelChart: echarts.ECharts | null = null
let townshipChart: echarts.ECharts | null = null
let villageChart: echarts.ECharts | null = null
let distChart: echarts.ECharts | null = null

function formatAxisLabel(value: string, segment = 4, maxLines = 2) {
  if (!value) return ''
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += segment) {
    chunks.push(value.slice(i, i + segment))
  }
  const visible = chunks.slice(0, maxLines)
  if (chunks.length > maxLines) {
    const lastIndex = visible.length - 1
    visible[lastIndex] = `${visible[lastIndex]}...`
  }
  return visible.join('\n')
}

const loadDeptPage = async (pageNum: number) => {
  dialogLoading.value = true
  try {
    const result = await fetchDeptUserPage(pageNum, pageSize)
    dialogList.value = result.list as DeptRow[]
    dialogTotal.value = result.total
    currentPage.value = pageNum
  } finally {
    dialogLoading.value = false
  }
}

const renderLevel = () => {
  if (!levelRingRef.value || pendingData.value) return
  levelChart = levelChart || echarts.init(levelRingRef.value)
  levelChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    series: [
      {
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['50%', '50%'],
        // 名称与数量由右侧图例展示，环外不再挂标签，避免窄屏下标签被裁切
        label: { show: false },
        labelLine: { show: false },
        data: levelSegments.value.map((item) => ({ name: item.name, value: item.value, itemStyle: { color: item.color } }))
      },
      {
        type: 'pie',
        radius: [0, 0],
        center: ['50%', '50%'],
        silent: true,
        label: {
          show: true,
          position: 'center',
          formatter: `{t|总数}\n{v|${levelTotal.value.toLocaleString()}}`,
          rich: {
            t: { fontSize: 11, color: '#666', align: 'center' },
            v: { fontSize: 14, fontWeight: 'bold', color: '#1d4e89', align: 'center' }
          }
        },
        labelLine: { show: false },
        data: [{ value: 1, itemStyle: { color: 'transparent' } }]
      }
    ]
  }, true)
}

const renderCoverage = (
  el: HTMLElement | undefined,
  chart: echarts.ECharts | null,
  total: number,
  covered: number,
  color: string
) => {
  if (!el || pendingData.value) return null
  // 环按百分比绘制，标签直接带「%」，避免只显示数量看不出覆盖率
  const rate = total ? Math.max(0, Math.min(100, (covered / total) * 100)) : 0
  const remain = Math.max(0, 100 - rate)
  chart = chart || echarts.init(el)
  chart.setOption({
    // 数据本身是百分比数值（已覆盖 + 未覆盖 = 100），统一保留 2 位小数并带 %
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}：${Number(p.value ?? 0).toFixed(2)}%` },
    series: [
      {
        type: 'pie',
        radius: ['45%', '68%'],
        center: ['50%', '50%'],
        // 环外标签在窄卡片上会被横向裁剪（只露出个别字符），覆盖率改由底部文字与 tooltip 承载
        label: { show: false },
        labelLine: { show: false },
        data: [
          { name: '已覆盖', value: Number(rate.toFixed(2)), itemStyle: { color } },
          { name: '未覆盖', value: Number(remain.toFixed(2)), itemStyle: { color: '#f5c542' } }
        ]
      },
      {
        type: 'pie',
        radius: [0, 0],
        center: ['50%', '50%'],
        silent: true,
        label: {
          show: true,
          position: 'center',
          formatter: `{t|总数}\n{v|${total.toLocaleString()}}`,
          rich: {
            t: { fontSize: 11, color: '#666', align: 'center' },
            v: { fontSize: 14, fontWeight: 'bold', color: '#1d4e89', align: 'center' }
          }
        },
        labelLine: { show: false },
        data: [{ value: 1, itemStyle: { color: 'transparent' } }]
      }
    ]
  }, true)
  return chart
}

const renderDist = () => {
  if (!distRef.value || pendingData.value) return
  distChart = distChart || echarts.init(distRef.value)
  const regions = userTrendData.value.regions.map((item) => formatAxisLabel(item, 5, 1))
  distChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const lines = [String(params[0]?.axisValue ?? '')]
        for (const p of params) {
          const v = Number(p.value ?? 0)
          // 率类系列统一保留 2 位小数并带 %
          const text = p.seriesName === '村社覆盖率' ? `${v.toFixed(2)}%` : v.toLocaleString()
          lines.push(`${p.marker}${p.seriesName}：${text}`)
        }
        return lines.join('<br/>')
      }
    },
    legend: { data: ['用户数', '村社覆盖率'], top: 0, textStyle: { fontSize: 11 } },
    grid: { top: 34, left: 24, right: 12, bottom: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: regions,
      axisLabel: { fontSize: 11, color: '#666', interval: 0, rotate: 35, margin: 8 }
    },
    yAxis: [
      { type: 'value', axisLabel: { fontSize: 11, color: '#666' } },
      { type: 'value', min: 0, max: 100, interval: 20, axisLabel: { fontSize: 11, color: '#666', formatter: '{value}%' } }
    ],
    series: [
      { name: '用户数', type: 'bar', data: userTrendData.value.userCounts, itemStyle: { color: '#3b82f6' }, barWidth: 10 },
      {
        name: '村社覆盖率',
        type: 'line',
        yAxisIndex: 1,
        data: userTrendData.value.coverageRates.map((v) => Number(Number(v ?? 0).toFixed(2))),
        smooth: false,
        itemStyle: { color: '#8ab6f5' },
        lineStyle: { color: '#8ab6f5' }
      }
    ]
  }, true)
}

onMounted(() => {
  nextTick(() => {
    renderLevel()
    townshipChart = renderCoverage(
      townshipRingRef.value,
      townshipChart,
      userOverview.value.townshipCoverage.total,
      userOverview.value.townshipCoverage.covered,
      '#5dd3c8'
    )
    villageChart = renderCoverage(
      villageRingRef.value,
      villageChart,
      userOverview.value.villageCoverage.total,
      userOverview.value.villageCoverage.covered,
      '#7c8cd5'
    )
    renderDist()
  })
})

watch([userOverview, userLevelData, userTrendData], () => {
  renderLevel()
  townshipChart = renderCoverage(
    townshipRingRef.value,
    townshipChart,
    userOverview.value.townshipCoverage.total,
    userOverview.value.townshipCoverage.covered,
    '#5dd3c8'
  )
  villageChart = renderCoverage(
    villageRingRef.value,
    villageChart,
    userOverview.value.villageCoverage.total,
    userOverview.value.villageCoverage.covered,
    '#7c8cd5'
  )
  renderDist()
})

watch(showAllDept, (visible) => {
  if (visible) void loadDeptPage(1)
})
</script>

<style scoped>
.stat-row {
  display: flex;
  gap: 8px;
}

.stat-row .dark-card {
  flex: 1;
}

.level-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border-radius: 6px;
  padding: 6px;
}

.level-ring {
  flex: 1;
  height: 190px;
  min-width: 0;
}

.level-legend {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #555;
}

.legend-swatch {
  width: 26px;
  height: 12px;
  border-radius: 2px;
}

.legend-val {
  font-size: 11px;
  font-weight: bold;
  color: #1d4e89;
  font-family: 'Consolas', monospace;
}

.cov-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.cov-col {
  flex: 1;
  background: #fff;
  border-radius: 6px;
  padding: 6px;
  min-width: 0;
}

.cov-title {
  font-size: 12px;
  font-weight: bold;
  color: #1d4e89;
  text-align: center;
}

.cov-ring {
  width: 100%;
  height: 170px;
}

.cov-rate {
  text-align: center;
  font-size: 12px;
  font-weight: bold;
  color: #1d4e89;
  margin-top: -6px;
  padding-bottom: 2px;
}

.dist-chart {
  width: 100%;
  height: 260px;
  background: #fff;
  border-radius: 6px;
}

.dept-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 0 8px;
}

.view-all {
  font-size: 12px;
  color: #2f7ff7;
  cursor: pointer;
}

/* 部门名称过长：主表单行省略，弹窗内换行显示全名 */
.text-left {
  text-align: left !important;
  padding-left: 10px !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dialog-name {
  white-space: normal !important;
  overflow: visible;
  text-overflow: clip;
  word-break: break-all;
  line-height: 1.35;
}

.data-table {
  table-layout: fixed;
}

.data-table th:nth-child(1),
.data-table td:nth-child(1) {
  width: 48px;
}

.data-table th:nth-child(2),
.data-table td:nth-child(2) {
  width: auto;
}

.data-table th:nth-child(3),
.data-table td:nth-child(3) {
  width: 92px;
}

.pager-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}

.pager-btn {
  border: 1px solid #c9d8ee;
  background: #f7fbff;
  color: #2f7ff7;
  border-radius: 3px;
  padding: 4px 8px;
  font-size: 12px;
}

.pager-btn:disabled {
  color: #a0adbf;
  cursor: not-allowed;
}

.pager-text {
  font-size: 12px;
  color: #666;
}

/* 局部 loading：盖住整个页签内容 */
.user-root {
  position: relative;
}

.loading-mask {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 6px;
}

.loading-spinner {
  /* 固定在屏幕正中（遮罩盖内容区，但转圈始终可见） */
  position: fixed;
  top: 50%;
  left: 50%;
  margin: -11px 0 0 -11px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #cfe1fa;
  border-top-color: #2f7ff7;
  animation: user-loading-spin 0.8s linear infinite;
}

@keyframes user-loading-spin {
  to { transform: rotate(360deg); }
}
</style>
