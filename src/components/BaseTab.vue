<template>
  <div class="base-root">
    <div v-if="tabLoading" class="loading-mask">
      <span class="loading-spinner"></span>
    </div>
    <div class="entity-tabs">
      <div
        v-for="t in entityTabs"
        :key="t.key"
        class="entity-item"
        :class="{ active: activeEntity === t.key }"
        @click="activeEntity = t.key"
      >
        <span class="entity-icon">{{ t.icon }}</span>{{ t.label }}
      </div>
    </div>

    <div class="badge-row">
      <span class="dark-badge">治理总数 <b>{{ cur.total }}</b></span>
    </div>

    <div ref="trendRef" class="trend-chart"></div>

    <div v-if="showCategorySection" class="badge-row">
      <span class="dark-badge">{{ activeEntity === 'ren' ? '标签总数' : '类型统计' }}：<b>{{ cur.tagTotal }}</b></span>
    </div>

    <div v-if="showCategorySection" ref="cloudRef" class="cloud-chart"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import 'echarts-wordcloud'
import { useScaledData } from '../composables/useRegionData'
import { useDashboardApi } from '../composables/useDashboardApi'

const { entityData } = useScaledData()
const { apiLoading } = useDashboardApi()

// 本页数据来自基础数据概览接口
const tabLoading = computed(() => apiLoading.basicData)

const entityTabs = [
  { key: 'ren', label: '人口', icon: '👤' },
  { key: 'fang', label: '房屋', icon: '🏠' },
  { key: 'qi', label: '企业', icon: '🏢' },
  { key: 'changsuo', label: '场所', icon: '🏬' }
] as const

type EntityKey = (typeof entityTabs)[number]['key']
type CloudWord = { name: string; value: number }
type PieGroup = { title: string; data: Array<{ name: string; value: number }> }
type EntityView = {
  total: string
  tagTotal: string
  governanceTrend: number[]
  completionRates: number[]
  axisLabels: string[]
  cloudWords: CloudWord[]
  pieGroups: PieGroup[]
}
const activeEntity = ref<EntityKey>('ren')
const showCategorySection = computed(() => activeEntity.value !== 'qi')

const cur = computed<EntityView>(() => entityData.value[activeEntity.value] as EntityView)

const trendRef = ref<HTMLElement>()
const cloudRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let cloudChart: echarts.ECharts | null = null

const cloudColors = ['#d43e3e', '#3aa05a', '#e8963a', '#35c3dc', '#3b82f6', '#7c8cd5']

/** 词云标签只取最后一个「/」后的文字，如 劳动保障/低保户 → 低保户；无斜杠原样返回 */
function lastTagSegment(name: string): string {
  const idx = Math.max(name.lastIndexOf('/'), name.lastIndexOf('／'))
  if (idx === -1) return name
  const tail = name.slice(idx + 1).trim()
  return tail || name
}

const getCategoryTitle = () => {
  if (activeEntity.value === 'qi') return '企业类型分布'
  if (activeEntity.value === 'changsuo') return '场所类型分布'
  return '主要标签分布'
}

const disposeCloudChart = () => {
  cloudChart?.dispose()
  cloudChart = null
}

const ensureCloudChart = () => {
  if (!cloudRef.value) return null
  if (cloudChart && cloudChart.getDom() !== cloudRef.value) {
    disposeCloudChart()
  }
  cloudChart = cloudChart || echarts.init(cloudRef.value)
  return cloudChart
}

// 基层治理情况图表：完善率暂时隐藏（改回 true 即恢复折线 + 右侧百分比轴）
const SHOW_COMPLETION_TREND = false

const renderTrend = () => {
  if (!trendRef.value) return
  trendChart = trendChart || echarts.init(trendRef.value)
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: {
      data: SHOW_COMPLETION_TREND ? ['基层治理量', '完善率'] : ['基层治理量'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { top: 30, left: 8, right: 15, bottom: 6, containLabel: true },
    xAxis: {
      type: 'category',
      data: cur.value.axisLabels,
      axisLabel: {
        rotate: 45,
        fontSize: 11,
        color: '#666',
        interval: 0,
        hideOverlap: false,
        formatter: (value: string) => (value.length > 4 ? `${value.slice(0, 4)}...` : value)
      }
    },
    yAxis: [
      { type: 'value', axisLabel: { fontSize: 11, color: '#666' } },
      ...(SHOW_COMPLETION_TREND
        ? [{ type: 'value', max: 100, axisLabel: { fontSize: 11, color: '#666' } }]
        : [])
    ],
    series: [
      {
        name: '基层治理量',
        type: 'bar',
        data: cur.value.governanceTrend,
        itemStyle: { color: '#3b82f6' },
        barWidth: 12
      },
      ...(SHOW_COMPLETION_TREND
        ? [{
            name: '完善率',
            type: 'line',
            yAxisIndex: 1,
            data: cur.value.completionRates,
            smooth: false,
            symbol: 'emptyCircle',
            symbolSize: 6,
            itemStyle: { color: '#5dd3c8' },
            lineStyle: { color: '#5dd3c8', width: 1.5 }
          }]
        : [])
    ]
  }, true)
}

const renderCloud = () => {
  if (!showCategorySection.value) {
    disposeCloudChart()
    return
  }
  const chart = ensureCloudChart()
  if (!chart) return
  if (activeEntity.value === 'ren') {
    chart.setOption({
      series: [{
        type: 'wordCloud',
        shape: 'circle',
        left: 'center',
        top: 'center',
        width: '95%',
        height: '95%',
        sizeRange: [14, 40],
        rotationRange: [-90, 90],
        rotationStep: 45,
        gridSize: 8,
        drawOutOfMask: false,
        textStyle: {
          fontFamily: 'PingFang SC, Microsoft YaHei',
          fontWeight: 'bold',
          color: () => cloudColors[Math.floor(Math.random() * cloudColors.length)]
        },
        emphasis: { textStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
        // 词云最多展示前 20 个标签
        data: cur.value.cloudWords
          .slice(0, 20)
          .map((w: { name: string; value: number }) => ({ name: lastTagSegment(w.name), value: w.value }))
      }]
    } as echarts.EChartsOption, true)
    return
  }

  const pieColors = ['#35c3dc', '#5dd3c8', '#3b82f6', '#7c8cd5', '#f5c542', '#6fb5c9', '#4a7ab8']
  if (!cur.value.pieGroups.length) {
    chart.setOption({
      title: {
        text: getCategoryTitle(),
        top: '12%',
        left: 'center',
        textStyle: { color: '#2f7ff7', fontSize: 12, fontWeight: 'normal' }
      },
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: '暂无类型统计数据',
          fill: '#9aa9c2',
          font: '14px Microsoft YaHei'
        }
      },
      series: []
    } as echarts.EChartsOption, true)
    return
  }
  const singlePie = cur.value.pieGroups.length === 1
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    title: cur.value.pieGroups.map((group: { title: string }, index: number) => ({
      text: group.title,
      top: singlePie ? '10%' : (index === 0 ? '10%' : '56%'),
      left: 'center',
      textStyle: { color: '#2f7ff7', fontSize: 12, fontWeight: 'normal' }
    })),
    series: cur.value.pieGroups.map((group: { data: Array<{ name: string; value: number }> }, index: number) => ({
      type: 'pie',
      center: singlePie
        ? ['50%', '56%']
        : ['50%', index === 0 ? '31%' : '79%'],
      radius: singlePie ? ['24%', '42%'] : ['22%', '38%'],
      avoidLabelOverlap: true,
      label: { color: '#666', fontSize: 11, formatter: '{b}\n{c}' },
      labelLine: { lineStyle: { color: '#b9c9ec' } },
      data: group.data.map((item, itemIndex) => ({
        ...item,
        itemStyle: { color: pieColors[itemIndex % pieColors.length] }
      }))
    }))
  } as echarts.EChartsOption, true)
}

onMounted(() => {
  nextTick(() => {
    renderTrend()
    renderCloud()
  })
})

onBeforeUnmount(() => {
  trendChart?.dispose()
  disposeCloudChart()
})

watch([activeEntity, entityData], () => {
  nextTick(() => {
    renderTrend()
    renderCloud()
  })
})
</script>

<style scoped>
.base-root {
  position: relative;
  display: flex;
  flex-direction: column;
  /* 弹性占满 tab-content 剩余空间（App.vue 已做 flex 布局），不再用视口魔法数 */
  flex: 1 1 0;
  min-height: 380px;
}

/* 局部 loading：盖住整个页签内容 */
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
  animation: base-loading-spin 0.8s linear infinite;
}

@keyframes base-loading-spin {
  to { transform: rotate(360deg); }
}

.entity-tabs {
  display: flex;
  border-radius: 4px;
  overflow: hidden;
  background: #8f9ff0;
  flex: 0 0 auto;
}
.entity-item {
  flex: 1;
  text-align: center;
  padding: 9px 0;
  font-size: 13px;
  color: #fff;
  cursor: pointer;
}
.entity-item.active {
  background: #fff;
  color: #2f7ff7;
  font-weight: bold;
}
.entity-icon { margin-right: 4px; font-size: 12px; }

.badge-row { margin: 10px 0 6px; flex: 0 0 auto; }

.trend-chart {
  flex: 1.15 1 0;
  min-height: 120px;
  width: 100%;
  background: #fff;
  border-radius: 6px;
}

.cloud-chart {
  flex: 1 1 0;
  min-height: 120px;
  width: 100%;
  background: #fff;
  border-radius: 6px;
}
</style>
