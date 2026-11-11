<template>
  <div class="usage-root">
    <!-- 顶部卡片 + 查询周期 -->
    <div class="top-row">
      <span class="dark-badge">总访问量：<b>{{ statsPending ? '—' : systemUsageAll.total }}</b><i v-if="apiLoading.reportStats" class="badge-loading"></i></span>
      <span class="dark-badge">日活跃次数：<b>{{ statsPending ? '—' : systemUsageAll.dailyActive }}</b></span>
      <select v-model="queryPeriod" class="period-select" :disabled="queryLoading">
        <option value="" disabled>查询周期</option>
        <option value="week">近一周</option>
        <option value="month">近一个月</option>
        <option value="quarter">近一季度</option>
        <option value="year">近一年</option>
      </select>
    </div>

    <!-- 按日期 -->
    <div class="chart-block">
      <div class="sec-title cyan">按日期</div>
      <div class="chart-wrap">
        <div ref="dateRef" class="sys-chart"></div>
        <!-- 局部 loading：绑定 accessTrend 接口（切查询周期时沿用 queryLoading） -->
        <div v-if="queryLoading || apiLoading.accessTrend" class="loading-mask">
          <span class="loading-spinner"></span>
        </div>
      </div>
    </div>

    <!-- 按地市 -->
    <div class="chart-block">
      <div class="sec-title cyan">按地市</div>
      <div class="chart-wrap">
        <div ref="cityRef" class="sys-chart"></div>
        <div v-if="queryLoading || apiLoading.accessRegion" class="loading-mask">
          <span class="loading-spinner"></span>
        </div>
      </div>
    </div>

    <!-- 按部门 -->
    <div class="chart-block">
      <div class="sec-title cyan dept-title">
        <span>按部门</span>
        <span class="view-all" @click="openDeptAll">&lt;&lt;&lt; 查看全部</span>
      </div>
      <div class="chart-wrap">
        <div ref="deptRef" class="sys-chart dept-chart"></div>
        <div v-if="queryLoading || apiLoading.accessDept" class="loading-mask">
          <span class="loading-spinner"></span>
        </div>
      </div>
    </div>

    <!-- 部门访问列表（显示全部） -->
    <div v-if="showDeptAll" class="modal-mask" @click.self="showDeptAll = false">
      <div class="modal-box">
        <div class="modal-header">
          <span>部门访问列表</span>
          <span class="modal-close" @click="showDeptAll = false">✕</span>
        </div>
        <div class="modal-body">
          <table class="data-table wrap-table">
            <thead>
              <tr><th>序号</th><th>部门名称</th><th>访问次数</th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in deptAllRows" :key="`${row.name}-${index}`">
                <td>{{ index + 1 }}</td>
                <td class="text-left">{{ row.name }}</td>
                <td class="num">{{ row.value.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!deptAllRows.length" class="empty-tip">暂无部门访问数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { useScaledData, useRegionData } from '../composables/useRegionData'
import { useDashboardApi } from '../composables/useDashboardApi'
import { apiConfig } from '../config/api'

const { systemUsageAll, systemUsageCity, systemUsageDept, setAccessTimeType } = useScaledData()
const { regionKey } = useRegionData()
const { apiLoading, reportStats } = useDashboardApi()

// API 模式下报表统计未返回前，顶部数字不展示 0（避免「先显示 0 再变数据」）
const statsPending = computed(() => apiConfig.useApi && reportStats.value === null)

const queryPeriod = ref('week')
const queryLoading = ref(false)
const showDeptAll = ref(false)

// 弹窗打开时锁定页面滚动，避免页面右侧出现滚动条
watch(showDeptAll, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// 切换区划后数据重新拉取，立即关闭「查看全部」弹窗
watch(regionKey, () => {
  showDeptAll.value = false
})

const dateRef = ref<HTMLElement>()
const cityRef = ref<HTMLElement>()
const deptRef = ref<HTMLElement>()
let dateChart: echarts.ECharts | null = null
let cityChart: echarts.ECharts | null = null
let deptChart: echarts.ECharts | null = null

function truncateLabel(value: string, max = 8) {
  return value.length > max ? `${value.slice(0, max)}...` : value
}

/** 部门访问全量数据（按访问次数倒序），供「显示全部」弹窗使用 */
const deptAllRows = computed(() => {
  const names = systemUsageDept.value.departments
  const values = systemUsageDept.value.visits
  return names
    .map((name, index) => ({ name, value: values[index] ?? 0 }))
    .filter((item) => item.name && item.name !== '--')
    .sort((a, b) => b.value - a.value)
})

const renderDate = () => {
  if (!dateRef.value) return
  dateChart = dateChart || echarts.init(dateRef.value)
  dateChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { top: 25, left: 8, right: 8, bottom: 6, containLabel: true },
    xAxis: {
      type: 'category',
      data: systemUsageAll.value.dates,
      // boundaryGap 需为 true：首尾日期标签居中画在端点上，false 时会溢出容器被裁
      boundaryGap: true,
      axisLabel: { fontSize: 11, color: '#999', hideOverlap: true },
      axisLine: { lineStyle: { color: '#c9d8ee' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { show: false },
      splitLine: { lineStyle: { color: '#e3ecf7' } }
    },
    series: [{
      type: 'line',
      data: systemUsageAll.value.visits,
      smooth: false,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#3b82f6' },
      lineStyle: { color: '#3b82f6', width: 2 },
      label: { show: true, position: 'top', fontSize: 11, color: '#2f7ff7' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(59,130,246,0.35)' },
          { offset: 1, color: 'rgba(59,130,246,0.06)' }
        ])
      }
    }]
  }, true)
}

const renderBar = (
  el: HTMLElement | undefined,
  chart: echarts.ECharts | null,
  names: string[],
  values: number[],
  rotate: number
) => {
  if (!el) return null
  chart = chart || echarts.init(el)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0]
        return `${names[item.dataIndex]}<br/>访问次数: ${item.value}`
      }
    },
    grid: {
      top: 30,
      left: 8,
      right: 15,
      // containLabel 已自动为 X 轴（含斜排）标签留高度，这里只保留少量呼吸空间
      bottom: 6,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        rotate,
        fontSize: 11,
        color: '#666',
        hideOverlap: true,
        formatter: (value: string) => truncateLabel(value, 6)
      },
      axisLine: { lineStyle: { color: '#c9d8ee' } }
    },
    yAxis: {
      type: 'value',
      // 图表较矮，刻度太多会挤成一列，限制为 3 段并隐藏重叠标签
      splitNumber: 3,
      axisLabel: { fontSize: 11, color: '#666', hideOverlap: true },
      splitLine: { lineStyle: { color: '#e3ecf7' } }
    },
    series: [{
      type: 'bar',
      data: values,
      barWidth: values.length > 10 ? 8 : 12,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#3b82f6' },
          { offset: 1, color: '#60a5fa' }
        ]),
        borderRadius: [2, 2, 0, 0]
      },
      label: {
        show: true,
        position: 'top',
        fontSize: 11,
        color: '#2f7ff7',
        formatter: (p: any) => (p.value > 0 ? p.value : '')
      }
    }]
  }, true)
  return chart
}

const renderDeptBar = (
  el: HTMLElement | undefined,
  chart: echarts.ECharts | null
) => {
  if (!el) return null
  chart = chart || echarts.init(el)

  // 图内只展示访问量前 10 个部门，其余走「查看全部」弹窗
  const rows = deptAllRows.value.slice(0, 10)

  const maxValue = rows.length ? Math.max(...rows.map((item) => item.value)) : 0

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0]
        return `${rows[item.dataIndex]?.name ?? ''}<br/>访问次数: ${item.value}`
      }
    },
    grid: { top: 18, left: 132, right: 48, bottom: 18 },
    xAxis: {
      type: 'value',
      max: maxValue ? Math.ceil(maxValue * 1.2) : undefined,
      axisLabel: { fontSize: 11, color: '#666' },
      splitLine: { lineStyle: { color: '#e3ecf7' } }
    },
    yAxis: {
      type: 'category',
      data: rows.map((item) => item.name),
      inverse: true,
      axisLabel: {
        fontSize: 11,
        color: '#666',
        // 每条 bar 都显示名称，否则自动隔行抽样导致名称与条形错位
        interval: 0,
        width: 96,
        overflow: 'truncate',
        formatter: (value: string) => truncateLabel(value, 8)
      },
      axisLine: { lineStyle: { color: '#c9d8ee' } },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: rows.map((item) => item.value),
      barMaxWidth: 16,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
          { offset: 0, color: '#60a5fa' },
          { offset: 1, color: '#2563eb' }
        ]),
        borderRadius: [0, 8, 8, 0]
      },
      label: {
        show: true,
        position: 'right',
        fontSize: 11,
        color: '#2f7ff7',
        distance: 6,
        formatter: (p: any) => (p.value > 0 ? p.value : '')
      }
    }]
  }, true)
  return chart
}

const renderAll = () => {
  renderDate()
  cityChart = renderBar(cityRef.value, cityChart, systemUsageCity.value.cities, systemUsageCity.value.visits, 45)
  deptChart = renderDeptBar(deptRef.value, deptChart)
}

const openDeptAll = () => {
  if (!deptAllRows.value.length) return
  showDeptAll.value = true
}

onMounted(() => {
  nextTick(renderAll)
})

watch([systemUsageAll, systemUsageCity, systemUsageDept], () => {
  nextTick(renderAll)
})

watch(queryPeriod, async (value) => {
  if (!value) return
  // 切换查询周期：图表区域内展示局部 loading（最短展示 500ms，避免一闪而过看不见）
  queryLoading.value = true
  const startedAt = Date.now()
  try {
    await setAccessTimeType(value)
    await nextTick()
    renderAll()
  } finally {
    const elapsed = Date.now() - startedAt
    if (elapsed < 500) await new Promise((resolve) => setTimeout(resolve, 500 - elapsed))
    queryLoading.value = false
  }
})
</script>

<style scoped>
.usage-root {
  position: relative;
  display: flex;
  flex-direction: column;
  /* 弹性占满 tab-content 剩余空间（App.vue 已做 flex 布局），不再用视口魔法数 */
  flex: 1 1 0;
  min-height: 420px;
}

.top-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 0 0 auto;
}
.top-row .period-select { margin-left: auto; }

.chart-block {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.chart-block .sec-title {
  flex: 0 0 auto;
  margin: 10px 0 6px;
}

.chart-block .sec-title.dept-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.view-all {
  font-size: 12px;
  font-weight: normal;
  color: #2f7ff7;
  cursor: pointer;
}

.chart-wrap {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.sys-chart {
  flex: 1 1 0;
  min-height: 90px;
  width: 100%;
  background: #fff;
  border-radius: 6px;
}

/* 局部加载遮罩：只盖住所在图表区域 */
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
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #cfe1fa;
  border-top-color: #2f7ff7;
  animation: loading-spin 0.8s linear infinite;
}

@keyframes loading-spin {
  to { transform: rotate(360deg); }
}

/* 徽章内的迷你 loading */
.badge-loading {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-left: 6px;
  vertical-align: -1px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: loading-spin 0.8s linear infinite;
}

.text-left {
  text-align: left !important;
  white-space: normal;
}

.empty-tip {
  padding: 20px 0;
  text-align: center;
  font-size: 12px;
  color: #9aa9c2;
}
</style>
