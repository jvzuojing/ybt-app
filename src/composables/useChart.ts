import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

export function useChart(el: HTMLElement | null) {
  const chart = ref<echarts.ECharts | null>(null)

  const initChart = (container?: HTMLElement) => {
    const target = container || el
    if (!target) return null
    if (chart.value) {
      chart.value.dispose()
    }
    chart.value = echarts.init(target)
    return chart.value
  }

  const setOption = (option: echarts.EChartsOption, notMerge = false) => {
    if (chart.value) {
      chart.value.setOption(option, notMerge)
    }
  }

  const resize = () => {
    chart.value?.resize()
  }

  const dispose = () => {
    if (chart.value) {
      chart.value.dispose()
      chart.value = null
    }
  }

  let resizeHandler: (() => void) | null = null

  onMounted(() => {
    resizeHandler = () => resize()
    window.addEventListener('resize', resizeHandler)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeHandler!)
    dispose()
  })

  return {
    chart,
    initChart,
    setOption,
    resize,
    dispose
  }
}
