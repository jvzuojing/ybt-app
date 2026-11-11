<template>
  <div class="report-root">
    <div v-if="tabLoading" class="loading-mask">
      <span class="loading-spinner"></span>
    </div>
    <div class="radar-wrap">
      <div class="rate-list">
        <div v-for="metric in radarMetrics" :key="metric.key" class="rate-item">
          {{ metric.label }}：<b>{{ ratePending ? '—' : `${Number(metric.value ?? 0).toFixed(2)}%` }}</b>
        </div>
      </div>
      <div ref="radarRef" class="radar-chart"></div>
    </div>

    <!-- 报表口径切换：国家报表（原有内容） / 自治区报表（getFillCount） -->
    <div class="view-toggle">
      <button class="view-btn" :class="{ active: reportView === 'national' }" @click="reportView = 'national'">国家报表</button>
      <button class="view-btn" :class="{ active: reportView === 'autonomous' }" @click="reportView = 'autonomous'">自治区报表</button>
    </div>

    <template v-if="reportView === 'national'">
    <div class="card-grid" :class="{ compact: cur.cards.length <= 6 }">
      <div
        v-for="card in cur.cards"
        :key="card.key"
        class="dark-card"
        :class="{ clickable: !!getCardDetailType(card) }"
        @click="getCardDetailType(card) && openDetail(getCardDetailType(card)!)"
      >
        <div class="dc-label">{{ card.label }}</div>
        <div class="dc-value">
          {{ statsPending ? '—' : card.value }}
          <span v-if="getCardDetailType(card)" class="mini-icon">📋</span>
        </div>
      </div>
    </div>

    <div class="sec-title cyan">分布情况</div>
    <div ref="distRef" class="dist-chart"></div>
    </template>

    <!-- 自治区报表：两个子页签（自治区数据表 / 基层精简保留清单），明细走弹窗 -->
    <template v-else>
      <div class="auto-sub-tabs">
        <span class="auto-sub-tab" :class="{ active: autoTab === 'data' }" @click="autoTab = 'data'">自治区数据表</span>
        <span class="auto-sub-tab" :class="{ active: autoTab === 'simplify' }" @click="autoTab = 'simplify'">基层精简保留清单</span>
      </div>

      <div class="card-grid compact">
        <div
          v-for="card in autoCards"
          :key="card.key"
          class="dark-card"
          :class="{ clickable: autoHasData }"
          @click="autoHasData && openAutoDetail()"
        >
          <div class="dc-label">{{ card.label }}</div>
          <div class="dc-value">
            {{ autoHasData ? card.value : '—' }}<span v-if="autoHasData && card.unit" class="dc-unit">{{ card.unit }}</span>
            <span v-if="autoHasData" class="mini-icon">📋</span>
          </div>
        </div>
      </div>

      <template v-if="autoTab === 'data'">
        <div class="sec-title cyan">分布情况</div>
        <div v-if="autoHasData" ref="autoDistRef" class="dist-chart"></div>
        <div v-else class="dist-chart chart-empty">暂无数据</div>
      </template>

      <div class="sec-title cyan">按周期统计</div>
      <div v-if="autoHasData" ref="autoCycleRef" class="cycle-chart"></div>
      <div v-else class="cycle-chart chart-empty">暂无数据</div>
    </template>

    <div v-if="detailVisible" class="modal-mask" @click.self="detailVisible = false">
      <div class="modal-box report-modal-box">
        <div class="modal-header">
          <span>{{ detailTitle }}</span>
          <span class="modal-close" @click="detailVisible = false">✕</span>
        </div>
        <div class="modal-body">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="column in currentColumns" :key="column.key">{{ column.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in currentDetailList" :key="`${detailType}-${rowIndex}`">
                <td
                  v-for="column in currentColumns"
                  :key="column.key"
                  :class="{ 'text-left': column.align === 'left' }"
                >
                  <span v-if="column.key === 'status'" class="status-tag" :class="statusClass(String(row[column.key]))">
                    {{ row[column.key] }}
                  </span>
                  <span v-else-if="column.key === 'deadline'">
                    {{ row[column.key] }}
                    <small v-if="row.urgent" class="urgent-tag">明日截止</small>
                  </span>
                  <template v-else>{{ row[column.key] }}</template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer report-modal-footer">
          <span>共 {{ detailTotal }} 条</span>
          <div class="pager-row">
            <button class="pager-btn" :disabled="detailPage <= 1 || detailLoading" @click="loadDetailPage(detailPage - 1)">上一页</button>
            <span class="pager-text">第 {{ detailPage }} / {{ totalPages }} 页</span>
            <button class="pager-btn" :disabled="detailPage >= totalPages || detailLoading" @click="loadDetailPage(detailPage + 1)">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 自治区数据表 / 基层精简保留清单 明细弹窗 -->
    <div v-if="autoDetailVisible" class="modal-mask" @click.self="autoDetailVisible = false">
      <div class="modal-box report-modal-box">
        <div class="modal-header">
          <span>{{ autoDetailTitle }}</span>
          <span class="modal-close" @click="autoDetailVisible = false">✕</span>
        </div>
        <div class="modal-body">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="column in autoDetailColumns" :key="column.key">{{ column.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in autoPageRows" :key="row.index">
                <td
                  v-for="column in autoDetailColumns"
                  :key="column.key"
                  :class="{ 'text-left': column.align === 'left' }"
                >{{ row[column.key] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer report-modal-footer">
          <span>共 {{ autoList.length }} 条</span>
          <div class="pager-row">
            <button class="pager-btn" :disabled="autoPage <= 1" @click="autoPage--">上一页</button>
            <span class="pager-text">第 {{ autoPage }} / {{ autoTotalPages }} 页</span>
            <button class="pager-btn" :disabled="autoPage >= autoTotalPages" @click="autoPage++">下一页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { useScaledData, useRegionData } from '../composables/useRegionData'
import { useDashboardApi } from '../composables/useDashboardApi'
import { apiConfig } from '../config/api'

type DetailType = 'report' | 'task'
type TableColumn = { key: string; label: string; align?: 'left' | 'center' }

const { reportData, radarMetrics, fetchDetailList } = useScaledData()
const { regionKey } = useRegionData()
const { apiLoading, regionSwitching, reportStats, fillRate, autonomousFillCount, simplifyFillCount } = useDashboardApi()

// 本页数据横跨两个请求阶段（填报率在 loadRegionData、报表统计在 loadGlobalData），
// 任一请求中或区划切换全程（避免两阶段之间 loading 闪灭、数据分两波跳）都显示局部 loading
const tabLoading = computed(
  () => regionSwitching.value || apiLoading.reportStats || apiLoading.fillRate
)

// API 模式下数据未返回前不渲染数字与图表（复测问题：会先显示一下 0 再消失）
const statsPending = computed(() => apiConfig.useApi && reportStats.value === null)
const ratePending = computed(() => apiConfig.useApi && fillRate.value === null)

const cur = computed(() => reportData.value.national)

const radarRef = ref<HTMLElement>()
const distRef = ref<HTMLElement>()
const autoDistRef = ref<HTMLElement>()
const autoCycleRef = ref<HTMLElement>()
const detailVisible = ref(false)
// 切换区划后数据重新拉取，立即关闭明细弹窗
watch(regionKey, () => {
  detailVisible.value = false
  autoDetailVisible.value = false
})
const detailType = ref<DetailType>('report')
const detailLoading = ref(false)
const detailPage = ref(1)
const detailPageSize = 8
const detailTotal = ref(0)
const currentDetailList = ref<Record<string, unknown>[]>([])
const totalPages = computed(() => Math.max(1, Math.ceil(detailTotal.value / detailPageSize)))

// 列与 pc 端「国家报表 / 国家任务」明细保持一致（编码/版本/状态在 pc 端已隐藏，这里同样不展示）
const detailColumns: Record<DetailType, TableColumn[]> = {
  report: [
    { key: 'name', label: '报表名称', align: 'left' },
    { key: 'dept', label: '派发部委' },
    { key: 'freq', label: '更新频次' },
    { key: 'level', label: '填报层级' },
    { key: 'receiveDept', label: '接收部门' },
    { key: 'method', label: '报表下发方式' },
    { key: 'time', label: '下发时间' },
    { key: 'status', label: '状态' }
  ],
  task: [
    { key: 'name', label: '任务名称', align: 'left' },
    { key: 'issueDept', label: '下发部门' },
    { key: 'receiveTime', label: '接收时间' },
    { key: 'receiveDept', label: '接收部门' },
    { key: 'progress', label: '填报进展' },
    { key: 'dataCount', label: '数据量' },
    { key: 'deadline', label: '填报截止时间' }
  ]
}

const currentColumns = computed(() => detailColumns[detailType.value])
const detailTitle = computed(() => `国家报表${detailType.value === 'report' ? '明细' : '任务明细'}`)

const loadDetailPage = async (pageNum: number) => {
  detailLoading.value = true
  try {
    const result = await fetchDetailList({
      tab: 'national',
      type: detailType.value,
      pageNum,
      pageSize: detailPageSize
    })
    currentDetailList.value = result.list as Record<string, unknown>[]
    detailTotal.value = result.total
    detailPage.value = pageNum
  } finally {
    detailLoading.value = false
  }
}

const openDetail = (type: DetailType) => {
  detailType.value = type
  detailVisible.value = true
  void loadDetailPage(1)
}

const getCardDetailType = (card: Record<string, unknown>): DetailType | undefined => {
  const detail = card.detailType
  return detail === 'report' || detail === 'task' ? detail : undefined
}

const statusClass = (status: string) => {
  if (['已建表', '已签收', '已完成', '完成建表'].includes(status)) return 'green'
  if (['待签收', '待填报'].includes(status)) return 'orange'
  return 'blue'
}

/* ---------------- 自治区报表（getFillCount：isExtended=false 数据表 / true 精简保留清单） ---------------- */
const reportView = ref<'national' | 'autonomous'>('national')
const autoTab = ref<'data' | 'simplify'>('data')

const autoRaw = computed(() =>
  autoTab.value === 'data' ? autonomousFillCount.value : simplifyFillCount.value
)
const autoHasData = computed(() => !!autoRaw.value)

/** 累计数据量：万级换算成「万」，与 pc 端口径一致 */
const formatVolumeText = (value: number) => {
  const num = Number(value) || 0
  if (num >= 10000) {
    const wan = num / 10000
    return `${Number.isInteger(wan) ? wan : wan.toFixed(1)}万`
  }
  return String(num)
}

const autoCards = computed(() => {
  const raw = autoRaw.value
  const isData = autoTab.value === 'data'
  if (!raw) {
    return [
      { key: 'count', label: isData ? '数据表总数' : '基层扩展表', value: '—', unit: '' },
      { key: 'volume', label: isData ? '累计数据总量' : '累计填报数据', value: '—', unit: '' },
      { key: 'issue', label: '涉及下发部门总数', value: '—', unit: '' }
    ]
  }
  const volumeNum = Number(raw.ledgerDataCount ?? 0)
  return [
    { key: 'count', label: isData ? '数据表总数' : '基层扩展表', value: String(raw.ledgerCount ?? 0), unit: '张' },
    {
      key: 'volume',
      label: isData ? '累计数据总量' : '累计填报数据',
      value: formatVolumeText(volumeNum),
      unit: volumeNum >= 10000 ? '' : '条'
    },
    { key: 'issue', label: '涉及下发部门总数', value: String(raw.ledgerIssueCount ?? 0), unit: '' }
  ]
})

/** { 名称: 数量 } → 图表数据（按数量降序） */
const toDistList = (map: Record<string, number> | undefined) =>
  Object.entries(map ?? {})
    .map(([name, value]) => ({ name, value: Number(value) || 0 }))
    .sort((a, b) => b.value - a.value)

const autoDist = computed(() => toDistList(autoRaw.value?.deptLedgerCount))
const autoCycle = computed(() => toDistList(autoRaw.value?.cycleLedgerCount))

let autoDistChart: echarts.ECharts | null = null
let autoCycleChart: echarts.ECharts | null = null
const AUTO_CYCLE_COLORS = ['#409eff', '#5dd39e', '#f5c542', '#9b8cff', '#ff7a6b', '#4ea1ff']

const renderAutoCharts = () => {
  if (reportView.value !== 'autonomous') return
  if (autoDistRef.value) {
    autoDistChart = autoDistChart || echarts.init(autoDistRef.value)
    autoDistChart.setOption(
      {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { top: 10, left: 142, right: 44, bottom: 20 },
        dataZoom: autoDist.value.length > 12
          ? [{ type: 'inside', yAxisIndex: 0, startValue: 0, endValue: 11 }]
          : [],
        xAxis: { type: 'value', axisLabel: { fontSize: 11, color: '#666' } },
        yAxis: {
          type: 'category',
          inverse: true,
          data: autoDist.value.map((d) => d.name),
          axisTick: { show: false },
          axisLabel: {
            fontSize: 11,
            color: '#555',
            width: 122,
            overflow: 'truncate',
            align: 'right',
            margin: 12,
            formatter: (value: string) => truncateLabel(value, 10)
          }
        },
        series: [
          {
            type: 'bar',
            data: autoDist.value.map((d) => d.value),
            itemStyle: { color: '#409eff', borderRadius: [0, 4, 4, 0] },
            barWidth: 8,
            label: {
              show: true,
              position: 'right',
              fontSize: 11,
              color: '#409eff',
              formatter: (params: any) => `${params.value}张`
            }
          }
        ]
      },
      true
    )
  }
  if (autoCycleRef.value) {
    autoCycleChart = autoCycleChart || echarts.init(autoCycleRef.value)
    autoCycleChart.setOption(
      {
        tooltip: { trigger: 'item', formatter: '{b}: {c}' },
        series: [
          {
            type: 'pie',
            center: ['50%', '50%'],
            radius: ['42%', '66%'],
            label: { color: '#555', fontSize: 11, formatter: '{b}\n{c}' },
            labelLine: { length: 6, length2: 6, lineStyle: { color: '#c9d8ee' } },
            itemStyle: { borderColor: '#fff', borderWidth: 2 },
            data: autoCycle.value.map((d, i) => ({
              ...d,
              itemStyle: { color: AUTO_CYCLE_COLORS[i % AUTO_CYCLE_COLORS.length] }
            }))
          }
        ]
      },
      true
    )
  }
}

/** 切页签时容器随 v-if 销毁重建，旧实例先释放 */
watch([reportView, autoTab], () => {
  autoDistChart?.dispose()
  autoDistChart = null
  autoCycleChart?.dispose()
  autoCycleChart = null
  nextTick(() => renderAutoCharts())
})

watch([autonomousFillCount, simplifyFillCount], () => nextTick(() => renderAutoCharts()), { deep: true })

/* 自治区明细弹窗（ledgerListInfo 全量前端分页） */
const autoDetailVisible = ref(false)
const autoPage = ref(1)
const autoPageSize = 8
const autoDetailTitle = computed(() =>
  autoTab.value === 'data' ? '自治区数据表明细' : '基层精简保留清单明细'
)

const autoDetailColumns = computed<TableColumn[]>(() =>
  autoTab.value === 'data'
    ? [
        { key: 'index', label: '序号' },
        { key: 'name', label: '数据表名称', align: 'left' },
        { key: 'dept', label: '发布部门名称' },
        { key: 'cycle', label: '填报周期' },
        { key: 'dataTotal', label: '数据总量' },
        { key: 'time', label: '下发时间' }
      ]
    : [
        { key: 'index', label: '序号' },
        { key: 'name', label: '数据表名称', align: 'left' },
        { key: 'dept', label: '发布部门名称' },
        { key: 'cycle', label: '填报周期' },
        { key: 'dataTotal', label: '数据量' },
        { key: 'time', label: '发布时间' }
      ]
)

const autoList = computed(() =>
  (autoRaw.value?.ledgerListInfo ?? []).map((item, index) => ({
    index: index + 1,
    name: item.ledgerName ?? '',
    dept: item.orgName ?? '',
    cycle: item.reportCycleName ?? '--',
    dataTotal: String(item.dataTotal ?? 0),
    time: item.lastOnlieTime ?? item.lastOnlineTime ?? '--'
  }))
)

const autoTotalPages = computed(() => Math.max(1, Math.ceil(autoList.value.length / autoPageSize)))
const autoPageRows = computed<Array<{ [key: string]: unknown; index: number }>>(() =>
  autoList.value
    .slice((autoPage.value - 1) * autoPageSize, autoPage.value * autoPageSize)
    .map((row) => ({ ...row }))
)

const openAutoDetail = () => {
  if (!autoRaw.value) return
  autoDetailVisible.value = true
  if (autoPage.value !== 1) autoPage.value = 1
}

let radarChart: echarts.ECharts | null = null
let distChart: echarts.ECharts | null = null

function truncateLabel(value: string, max = 10) {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}...` : value
}

const renderRadar = () => {
  if (!radarRef.value || ratePending.value) return
  radarChart = radarChart || echarts.init(radarRef.value)
  radarChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const values: number[] = params.value ?? []
        const lines = values.map((v, i) => {
          const name = radarMetrics.value[i]?.axisName ?? ''
          return `${name}：${Number(v ?? 0).toFixed(2)}%`
        })
        return lines.join('<br/>')
      }
    },
    radar: {
      indicator: radarMetrics.value.map((metric) => ({ name: metric.axisName, max: 100 })),
      radius: '62%',
      axisName: { color: '#2f7ff7', fontSize: 11 },
      splitArea: { areaStyle: { color: ['#fff'] } },
      axisLine: { lineStyle: { color: '#c9d8ee' } },
      splitLine: { lineStyle: { color: '#c9d8ee' } }
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: radarMetrics.value.map((metric) => Number(Number(metric.value ?? 0).toFixed(2))),
            lineStyle: { color: '#f5c542', width: 2 },
            itemStyle: { color: '#f5c542' },
            areaStyle: { color: 'rgba(245,197,66,0.15)' },
            symbolSize: 5,
            // 数值已在左侧指标列表展示，图上不再叠加标签，避免几个点挤在一起看不清
            label: { show: false }
          }
        ]
      }
    ]
  }, true)
}

const renderDist = () => {
  if (!distRef.value || statsPending.value) return
  distChart = distChart || echarts.init(distRef.value)
  const distribution = cur.value.distributionConfig
  const items = distribution.categoryData.map((name, index) => ({
    name,
    values: distribution.series.map((series) => series.data[index] ?? 0),
    total: distribution.series.reduce((sum, series) => sum + (series.data[index] ?? 0), 0)
  }))
  // 部门个数与 pc 端保持一致：不截断，接口返回多少个部门就画多少个
  const visibleItems = items.sort((a, b) => b.total - a.total)

  // 条形图高度随部门数量自适应，部门多时改为内部滚动，避免条挤成一团
  const scrollable = visibleItems.length > 14
  const chartHeight = scrollable ? 420 : Math.max(280, visibleItems.length * 26 + 70)
  if (distRef.value) {
    distRef.value.style.height = `${chartHeight}px`
    distChart.resize()
  }

  distChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: distribution.legend, top: 0, textStyle: { fontSize: 11 } },
    grid: { top: 34, left: 142, right: 34, bottom: 20 },
    ...(scrollable
      ? { dataZoom: [{ type: 'inside', yAxisIndex: 0, startValue: 0, endValue: 13 }] }
      : {}),
    yAxis: {
      type: 'category',
      data: visibleItems.map((item) => item.name),
      inverse: true,
      axisLabel: {
        fontSize: 11,
        color: '#555',
        width: 122,
        overflow: 'truncate',
        align: 'right',
        margin: 12,
        formatter: (value: string) => truncateLabel(value, 10)
      },
      axisTick: { show: false }
    },
    xAxis: { type: 'value', axisLabel: { fontSize: 11, color: '#666' } },
    series: distribution.series.map((series, seriesIndex) => ({
      name: series.name,
      type: series.type,
      data: visibleItems.map((item) => item.values[seriesIndex] ?? 0),
      itemStyle: { color: series.color },
      barWidth: 6,
      barGap: '35%',
      label: {
        show: true,
        position: 'right',
        fontSize: 11,
        color: series.color,
        formatter: (params: any) => (params.value > 0 ? params.value : '')
      }
    }))
  }, true)
}

onMounted(() => {
  nextTick(() => {
    renderRadar()
    renderDist()
  })
})

onBeforeUnmount(() => {
  autoDistChart?.dispose()
  autoDistChart = null
  autoCycleChart?.dispose()
  autoCycleChart = null
})

watch([radarMetrics, reportData], () => {
  renderRadar()
  renderDist()
})
</script>

<style scoped>
.radar-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff;
  border-radius: 6px;
  padding: 4px 8px;
}

.rate-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.rate-item {
  font-size: 11px;
  color: #333;
}

.rate-item b {
  color: #2f7ff7;
}

.radar-chart {
  flex: 1;
  height: 168px;
  min-width: 0;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  justify-items: center;
}

.card-grid.compact {
  grid-template-columns: repeat(3, 1fr);
}

.card-grid .dark-card {
  width: 100%;
}

.clickable {
  cursor: pointer;
}

.mini-icon {
  font-size: 11px;
}

.dist-chart {
  width: 100%;
  height: 320px;
  background: #fff;
  border-radius: 6px;
}

/* ===== 自治区报表 ===== */
.view-toggle {
  display: flex;
  justify-content: center;
  gap: 0;
  margin: 4px 0 2px;
}

.view-btn {
  min-width: 110px;
  padding: 7px 18px;
  font-size: 13px;
  color: #2f7ff7;
  background: #e3edfb;
  border: 1px solid #c9d8ee;
  cursor: pointer;
}

.view-btn:first-child {
  border-radius: 4px 0 0 4px;
}

.view-btn:last-child {
  border-radius: 0 4px 4px 0;
}

.view-btn.active {
  color: #fff;
  background: #7b6ff0;
  border-color: #7b6ff0;
}

.auto-sub-tabs {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 4px 0 2px;
}

.auto-sub-tab {
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: #16396e;
  border: 1px solid #16396e;
  border-radius: 3px;
  cursor: pointer;
}

.auto-sub-tab.active {
  color: #16396e;
  background: #ffe94a;
  border-color: #ffe94a;
}

.dc-unit {
  font-size: 11px;
  margin-left: 1px;
}

.cycle-chart {
  width: 100%;
  height: 260px;
  background: #fff;
  border-radius: 6px;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aacca;
  font-size: 12px;
}

.text-left {
  text-align: left !important;
}

.report-modal-box {
  max-height: 70vh;
}

.report-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pager-row {
  display: flex;
  align-items: center;
  gap: 8px;
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

.urgent-tag {
  display: inline-block;
  margin-left: 4px;
  color: #e8963a;
}

/* 局部 loading：盖住整个页签内容 */
.report-root {
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
  animation: report-loading-spin 0.8s linear infinite;
}

@keyframes report-loading-spin {
  to { transform: rotate(360deg); }
}
</style>
