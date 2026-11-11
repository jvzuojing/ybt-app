<template>
  <div class="app-root">
    <div class="app-header">
      <div class="header-region" @click="openRegionPicker">
        <span class="header-region-text">{{ currentRegionLine }}</span>
        <span class="header-region-arrow">></span>
      </div>
    </div>
    <div class="tab-bar">
      <div
        v-for="t in tabs"
        :key="t.key"
        class="tab-item"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >{{ t.label }}</div>
    </div>
    <div class="tab-content">
      <UserTab v-if="activeTab === 'user'" />
      <ReportTab v-else-if="activeTab === 'report'" />
      <BaseTab v-else-if="activeTab === 'base'" />
      <UsageTab v-else-if="activeTab === 'usage'" />
      <DataTab v-else-if="activeTab === 'data'" />
    </div>
    <div v-if="regionVisible" class="region-picker-mask" @click.self="regionVisible = false">
      <div class="region-picker-panel">
        <div class="region-picker-header">
          <span>请选择所属区域</span>
          <span class="region-picker-close" @click="regionVisible = false">✕</span>
        </div>
        <div class="region-picker-body">
          <div class="region-picker-tabs">
            <div
              v-for="tab in pickerTabs"
              :key="`${tab.level}-${tab.label}`"
              class="region-picker-tab"
              :class="{ active: tab.active, disabled: tab.disabled }"
              @click="!tab.disabled && selectPickerLevel(tab.level)"
            >
              {{ tab.label }}
            </div>
          </div>
          <div class="region-picker-action">
            <span class="region-current">{{ draftRegionLabel }}</span>
            <span class="region-apply" @click="applyCurrentDraft">使用当前层级</span>
          </div>
          <div class="region-picker-list">
            <div
              v-for="option in activeRegionOptions"
              :key="option.value"
              class="region-picker-item"
              :class="{ selected: isOptionSelected(option) }"
              @click="handleRegionSelect(option)"
            >
              {{ option.label }}
            </div>
            <div v-if="activeRegionOptions.length === 0" class="region-picker-empty">暂无可选区域</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import UserTab from './components/UserTab.vue'
import ReportTab from './components/ReportTab.vue'
import BaseTab from './components/BaseTab.vue'
import UsageTab from './components/UsageTab.vue'
import DataTab from './components/DataTab.vue'
import { regionOptions as mockRegionOptions } from './mock/data'
import { useDashboardApi, type RegionCascaderOption } from './composables/useDashboardApi'
import { apiConfig } from './config/api'

const tabs = [
  { key: 'user', label: '用户情况' },
  { key: 'usage', label: '系统使用情况' },
  { key: 'report', label: '报表情况' },
  { key: 'base', label: '基层治理情况' },
  { key: 'data', label: '数据情况' }
]

const activeTab = ref('user')
const useApi = apiConfig.useApi
const { regionCascaderOptions, getRegionPath, initRegionTree, loadRegionData, loadGlobalData, loadAll, regionSwitching } = useDashboardApi()

const selectedRegion = ref<string[]>([])
const scaleVersion = ref(0)
const regionVisible = ref(false)
const draftRegion = ref<string[]>([])
const pickerLevel = ref(0)
const refreshing = ref(false)

const regionOptions = computed<RegionCascaderOption[]>(() =>
  useApi ? regionCascaderOptions.value : (mockRegionOptions as RegionCascaderOption[])
)

const findNodeByPath = (path: string[]) => {
  let nodes: RegionCascaderOption[] = regionOptions.value
  const result: RegionCascaderOption[] = []

  for (const value of path) {
    const node = nodes.find((item) => item.value === value)
    if (!node) break
    result.push(node)
    nodes = node.children || []
  }

  return result
}

const getRegionLine = (path: string[]) => {
  const labels = findNodeByPath(path).map((item) => item.label)
  return labels.length ? labels.join('-') : '请选择所属区域'
}

const getRegionLabel = (path: string[]) => {
  const labels = findNodeByPath(path).map((item) => item.label)
  return labels.length ? labels.join(' / ') : '未选择区域'
}

const draftRegionLabel = computed(() => getRegionLabel(draftRegion.value))
const currentRegionLine = computed(() => getRegionLine(selectedRegion.value))

const activeRegionOptions = computed(() => {
  let nodes = regionOptions.value
  for (let i = 0; i < pickerLevel.value; i++) {
    const value = draftRegion.value[i]
    const node = nodes.find((item) => item.value === value)
    nodes = node?.children || []
  }
  return nodes
})

const pickerTabs = computed(() => {
  const nodes = findNodeByPath(draftRegion.value)
  return Array.from({ length: pickerLevel.value + 1 }, (_, level) => ({
    level,
    label: nodes[level]?.label || '请选择',
    active: level === pickerLevel.value,
    disabled: level > 0 && !nodes[level - 1]
  }))
})

let activeCode = ''
let activePath: string[] = []

const lastCode = (value: string[]) => value[value.length - 1] ?? ''

const openRegionPicker = () => {
  draftRegion.value = [...selectedRegion.value]
  pickerLevel.value = Math.max(0, draftRegion.value.length - 1)
  regionVisible.value = true
}

const selectPickerLevel = (level: number) => {
  pickerLevel.value = level
}

const applyRegion = async (path: string[]) => {
  if (!path.length) return
  draftRegion.value = [...path]
  if (!useApi) {
    selectedRegion.value = [...path]
    scaleVersion.value++
    regionVisible.value = false
    return
  }

  const code = lastCode(path)
  if (!code) return
  
  const prev = activeCode
  const prevPath = [...activePath]

  // 用户要求的顺序：①顶部所选地区立刻变化 → ②请求期间各区域局部 loading → ③数据回来后 loading 消失
  selectedRegion.value = [...path]
  draftRegion.value = [...path]
  refreshing.value = true
  regionSwitching.value = true
  // 选中后立即关闭区域选择弹窗，数据请求在后台进行（各图表有自己的局部 loading）
  regionVisible.value = false
  try {
    const ok = await loadRegionData(code)
    if (ok) {
      await loadGlobalData()
      activeCode = code
      activePath = [...path]
      scaleVersion.value++
    } else {
      ElMessage.error('当前区划无数据权限，已回退到上一级')
      activeCode = prev
      activePath = prevPath
      selectedRegion.value = prevPath.length ? prevPath : (prev ? getRegionPath(prev) : [])
      draftRegion.value = [...selectedRegion.value]
      if (prev) {
        await loadRegionData(prev)
        await loadGlobalData()
      }
    }
  } catch (err) {
    // 捕获超时或其他异常：顶部地区回退到切换前的值，确保文案与数据一致
    console.error('切换区划失败:', err)
    selectedRegion.value = prevPath.length ? prevPath : (prev ? getRegionPath(prev) : [])
    draftRegion.value = [...selectedRegion.value]
  } finally {
    refreshing.value = false
    regionSwitching.value = false
  }
}

const applyCurrentDraft = () => {
  const path = draftRegion.value.slice(0, pickerLevel.value + 1).filter(Boolean)
  void applyRegion(path)
}

const handleRegionSelect = (node: RegionCascaderOption) => {
  const nextPath = [...draftRegion.value.slice(0, pickerLevel.value), node.value]
  draftRegion.value = nextPath
  if (node.children?.length) {
    pickerLevel.value += 1
    return
  }
  void applyRegion(nextPath)
}

const isOptionSelected = (node: RegionCascaderOption) => draftRegion.value[pickerLevel.value] === node.value

const lockBodyScroll = (locked: boolean) => {
  document.body.style.overflow = locked ? 'hidden' : ''
}

async function bootstrap() {
  if (!useApi) {
    selectedRegion.value = ['neimenggu', 'huhehaote', 'xincheng']
    activeCode = lastCode(selectedRegion.value)
    activePath = [...selectedRegion.value]
    draftRegion.value = [...selectedRegion.value]
    return
  }

  try {
    const path = await initRegionTree()
    if (!path.length) {
      ElMessage.warning('未获取到区划数据')
      return
    }
    activeCode = path[path.length - 1]
    activePath = [...path]
    selectedRegion.value = [...path]
    draftRegion.value = [...path]
    await loadAll(activeCode)
    scaleVersion.value++
  } catch {
    /* 请求层统一提示 */
  }
}

watch(regionVisible, (visible) => {
  lockBodyScroll(visible)
})

onMounted(async () => {
  await bootstrap()
})

onBeforeUnmount(() => {
  lockBodyScroll(false)
})

provide('selectedRegion', selectedRegion)
provide('scaleVersion', scaleVersion)
</script>

<style scoped>
.app-root {
  max-width: 480px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #eef4fb;
  box-shadow: 0 0 20px rgba(30, 60, 120, 0.08);
  overflow: hidden;
}

.app-header {
  flex: 0 0 auto;
  padding: 12px 14px 10px;
  background: linear-gradient(180deg, #6d8df0 0%, #6382e4 100%);
  color: #fff;
}

.header-region {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  cursor: pointer;
}

.header-region-text {
  min-width: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.96);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-region-arrow {
  flex: 0 0 auto;
  margin-left: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.92);
}

.region-picker-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(16, 24, 40, 0.28);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overscroll-behavior: contain;
}

.region-picker-panel {
  width: 100%;
  max-width: 480px;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  background: rgba(247, 247, 247, 0.98);
  color: #222;
  border-radius: 18px 18px 0 0;
  overflow: hidden;
  animation: region-sheet-up 0.25s ease-out;
}

@keyframes region-sheet-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.region-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 10px;
  font-size: 16px;
  font-weight: 500;
  background: #f7f7f7;
}

.region-picker-close {
  font-size: 24px;
  color: #b7b7b7;
  cursor: pointer;
}

.region-picker-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 8px 0 0;
}

.region-picker-tabs {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 0 20px;
  border-bottom: 1px solid #efefef;
}

.region-picker-tab {
  position: relative;
  padding: 12px 0 14px;
  font-size: 14px;
  color: #444;
  cursor: pointer;
}

.region-picker-tab.active {
  color: #888;
}

.region-picker-tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 2px;
  background: #f02a39;
}

.region-picker-tab.disabled {
  color: #c3c3c3;
  cursor: default;
}

.region-picker-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px 4px;
}

.region-current {
  font-size: 12px;
  color: #9aa4b2;
}

.region-apply {
  flex: 0 0 auto;
  font-size: 12px;
  color: #2f7ff7;
  cursor: pointer;
}

.region-picker-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 8px 0 30px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.region-picker-item {
  padding: 18px 20px;
  font-size: 15px;
  line-height: 1.2;
  color: #222;
  cursor: pointer;
}

.region-picker-item.selected {
  color: #f02a39;
}

.region-picker-empty {
  padding: 24px 20px;
  font-size: 13px;
  color: #a5a5a5;
}
</style>
