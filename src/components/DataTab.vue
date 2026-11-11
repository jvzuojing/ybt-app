<template>
  <div>
    <!-- 基层特色场景（点击弹窗暂时屏蔽，恢复时加回：class="scene-line clickable" @click="sceneVisible = true"） -->
    <div class="scene-line">基层特色场景：<b>23个</b></div>

    <!-- 根数据库情况 -->
    <div class="sec-title cyan">“一表通根数据库”情况</div>
    <div class="db-row">
      <span class="v-label">汇聚情况</span>
      <div class="db-circles">
        <div class="db-circle c-cyan">
          <div class="db-num">{{ rootDatabase.departments }}个</div>
          <div class="db-label">部门</div>
        </div>
        <div class="db-circle c-green">
          <div class="db-num">{{ rootDatabase.categories }}个</div>
          <div class="db-label">类别</div>
        </div>
        <div class="db-circle c-purple">
          <div class="db-num">{{ rootDatabase.dataVolume }}</div>
          <div class="db-label">数据</div>
        </div>
      </div>
    </div>

    <!-- 回流情况 -->
    <div class="backflow-row">
      <span class="v-label">回流情况</span>
      <div class="bf-grid">
        <div v-for="b in backflowData" :key="b.label" class="bf-item">
          {{ b.label }}{{ b.value }}
        </div>
      </div>
    </div>

    <!-- 政法委系统对接情况 -->
    <div class="sec-title cyan">政法委系统对接情况</div>
    <div class="bubble-wrap">
      <div class="bubble b-tags">
        <div>{{ politicalLegalData.tags.label }}</div>
        <div>{{ politicalLegalData.tags.value }}</div>
      </div>
      <div class="bubble b-pop">
        <div>{{ politicalLegalData.population.label }}</div>
        <div>{{ politicalLegalData.population.value }}</div>
      </div>
      <div class="bubble b-house">
        <div>{{ politicalLegalData.house.label }}</div>
        <div>{{ politicalLegalData.house.value }}</div>
      </div>
      <div class="bubble b-rel">
        <div>{{ politicalLegalData.relation.label }}</div>
        <div>{{ politicalLegalData.relation.value }}</div>
      </div>
    </div>

    <!-- 基础特色场景弹窗（移动端底部滑出） -->
    <div v-if="sceneVisible" class="modal-mask" @click.self="sceneVisible = false">
      <div class="modal-box">
        <div class="modal-header">
          <span>基层特色场景</span>
          <span class="modal-close" @click="sceneVisible = false">✕</span>
        </div>
        <div class="modal-body">
          <div class="scene-meta">
            <span>累计数据总量：<b>{{ sceneData.totalData }}</b></span>
            <span>数据时间：<b>{{ sceneData.dataTime }}</b></span>
          </div>
          <div class="scene-sec-title">基础场景</div>
          <div class="scene-grid base">
            <div v-for="s in sceneData.baseScenes" :key="s.name" class="scene-card">
              <div class="sc-name">{{ s.name }}</div>
              <div class="sc-value">数据量：{{ s.value }}</div>
            </div>
          </div>
          <div class="scene-sec-title">扩展表应用场景</div>
          <div class="scene-grid extend">
            <div v-for="(s, i) in sceneData.extendScenes" :key="i" class="scene-card">
              <div class="sc-name">{{ s.name }}</div>
              <div class="sc-value">数据量：{{ s.value }}</div>
            </div>
          </div>
          <div class="scene-sec-title">其他场景</div>
          <div class="scene-grid other">
            <div v-for="s in sceneData.otherScenes" :key="s" class="scene-card other">{{ s }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useScaledData } from '../composables/useRegionData'

const { rootDatabase, backflowData, politicalLegalData, sceneData } = useScaledData()

const sceneVisible = ref(false)
</script>

<style scoped>
.scene-line {
  font-size: 13px;
  color: #35c3dc;
  font-weight: bold;
}
.scene-line b { color: #f5c542; }
.scene-line.clickable { cursor: pointer; }

/* 场景弹窗内容 */
.scene-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #1d4e89;
  font-weight: bold;
  margin-bottom: 10px;
}
.scene-meta b { color: #2f7ff7; }

.scene-sec-title {
  display: inline-block;
  border: 1px solid #35c3dc;
  color: #35c3dc;
  font-size: 12px;
  font-weight: bold;
  padding: 2px 10px;
  margin: 8px 0;
}

.scene-grid {
  display: grid;
  gap: 8px;
}
.scene-grid.base { grid-template-columns: repeat(2, 1fr); }
.scene-grid.extend { grid-template-columns: repeat(2, 1fr); }
.scene-grid.other { grid-template-columns: repeat(2, 1fr); }

.scene-card {
  background: linear-gradient(180deg, #4a6fd8, #dfe6f5);
  border-radius: 3px;
  padding: 7px 9px;
  color: #fff;
}
.sc-name { font-size: 12px; font-weight: bold; margin-bottom: 3px; }
.sc-value { font-size: 11px; }

.scene-card.other {
  background: linear-gradient(180deg, #17b3a6, #0d8a80);
  text-align: center;
  font-size: 12px;
  font-weight: bold;
  padding: 9px 4px;
  line-height: 1.4;
}

/* 左侧竖排标签 */
.v-label {
  writing-mode: vertical-rl;
  letter-spacing: 3px;
  background: #2f7ff7;
  color: #fff;
  font-size: 12px;
  padding: 8px 5px;
  border-radius: 3px;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.db-row, .backflow-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
  margin-top: 10px;
}

.db-circles {
  flex: 1;
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 6px;
}
.db-circle {
  width: 86px;
  height: 86px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #1d3557;
  flex: 0 0 auto;
}
.db-num { font-size: 14px; font-weight: bold; }
.db-label { font-size: 12px; margin-top: 2px; }
.c-cyan { background: radial-gradient(circle at 35% 30%, #eafcff, #7fd4e8); }
.c-green { background: radial-gradient(circle at 35% 30%, #f2ffe9, #a8dd6e); }
.c-purple { background: radial-gradient(circle at 35% 30%, #cfd4f7, #7c8cd5); color: #fff; }

.bf-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  align-content: center;
}
.bf-item {
  background: linear-gradient(180deg, #1d4e89, #16386b);
  border: 1px solid #4a7ab8;
  color: #fff;
  font-size: 11px;
  padding: 7px 4px;
  border-radius: 3px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 政法委气泡 */
.bubble-wrap {
  position: relative;
  height: 250px;
  background: #fff;
  border-radius: 6px;
}
.bubble {
  position: absolute;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  line-height: 1.4;
}
.b-tags { width: 150px; height: 150px; left: 4%; top: 60px; background: #6f8fe8; }
.b-pop { width: 96px; height: 96px; right: 8%; top: 22px; background: #e8b04a; }
.b-house { width: 62px; height: 62px; left: 47%; top: 158px; background: #6fb5c9; font-size: 10px; }
.b-rel { width: 78px; height: 78px; right: 12%; top: 148px; background: #6fae6f; font-size: 11px; }
</style>
