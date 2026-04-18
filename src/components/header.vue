<template>
  <div class="header-wrap">
    <div class="toolbar-row">
      <div class="brand">
        <div class="title-cn">车辆任务管理</div>
        <div class="title-en">Vehicle Task Management Center</div>
      </div>

      <div class="control-center">
        <button class="control-btn control-btn--accent" type="button" @click="taskOrderStatistics">
          <span class="control-btn__icon">
            <el-image class="control-btn__icon-image" :src="taskOrderImg" fit="cover" />
          </span>
          <span class="control-btn__text">
            <span class="control-btn__title">车辆任务单</span>
            <span class="control-btn__sub">任务单总览</span>
          </span>
        </button>
        <button class="control-btn" type="button" @click="workTypeStatistics">
          <span class="control-btn__icon">
            <el-image class="control-btn__icon-image" :src="workTypeImg" fit="cover" />
          </span>
          <span class="control-btn__text">
            <span class="control-btn__title">车辆作业类型</span>
            <span class="control-btn__sub">作业分类分析</span>
          </span>
        </button>
      </div>

      <div class="header-actions">
        <button class="action-btn" type="button" @click="refreshPage">
          <span class="action-icon action-icon--text">↻</span>
          <span>刷新</span>
        </button>
        <button class="action-btn" type="button" :class="{ 'action-btn--active': isFullscreen }"
          @click="toggleFullscreen">
          <span class="action-icon action-icon--text">{{ isFullscreen ? '⤡' : '⤢' }}</span>
          <span>{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
        </button>
        <button class="action-btn action-btn--primary" type="button" @click="jumpToAppCenter($event)">
          <span class="action-icon">
            <el-image class="action-icon__image" :src="AppCenterImg" fit="cover" />
          </span>
          <span>应用中心</span>
        </button>
      </div>
    </div>
  </div>

  <VehicleWorkTypeWindow v-model:visible="workTypeDialogVisible" />
  <VehicleTaskOrderDrawer v-model:visible="taskOrderDialogVisible" />
</template>

<script>
import workTypeImg from '../assets/header/1.png'
import AppCenterImg from '../assets/header/2.png'
import { ElNotification } from 'element-plus'
import VehicleWorkTypeWindow from '@/window/vehicleWorkType.vue'
import VehicleTaskOrderDrawer from '@/window/vehicleTaskOrderDrawer.vue'

export default {
  name: 'AppHeader',
  components: {
    VehicleWorkTypeWindow,
    VehicleTaskOrderDrawer,
  },
  data() {
    return {
      workTypeImg,
      taskOrderImg: workTypeImg,
      AppCenterImg,
      workTypeDialogVisible: false,
      taskOrderDialogVisible: false,
      isFullscreen: false,
    }
  },
  mounted() {
    this.syncFullscreenState()
    document.addEventListener('fullscreenchange', this.handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange)
  },
  beforeUnmount() {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange)
  },
  methods: {
    getFullscreenElement() {
      return document.fullscreenElement || document.webkitFullscreenElement || null
    },
    syncFullscreenState() {
      this.isFullscreen = Boolean(this.getFullscreenElement())
    },
    handleFullscreenChange() {
      this.syncFullscreenState()
    },
    async refreshPage() {
      try {
        window.location.reload()
      } catch (err) {
        ElNotification({
          title: '提示',
          message: `刷新失败：${err.message}`,
          type: 'error',
        })
      }
    },
    async requestFullscreen() {
      const element = document.documentElement
      const request =
        element.requestFullscreen ||
        element.webkitRequestFullscreen ||
        element.msRequestFullscreen

      if (!request) {
        throw new Error('当前浏览器不支持全屏 API')
      }

      const result = request.call(element)
      if (result && typeof result.then === 'function') {
        await result
      }
    },
    async exitFullscreen() {
      const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.msExitFullscreen

      if (!exit) {
        throw new Error('当前浏览器不支持退出全屏 API')
      }

      const result = exit.call(document)
      if (result && typeof result.then === 'function') {
        await result
      }
    },
    async toggleFullscreen() {
      try {
        if (this.getFullscreenElement()) {
          await this.exitFullscreen()
        } else {
          await this.requestFullscreen()
        }
        this.syncFullscreenState()
      } catch (err) {
        ElNotification({
          title: '提示',
          message: `全屏切换失败：${err.message}`,
          type: 'error',
        })
      }
    },
    isLocalOrIntranetHost(hostname) {
      if (!hostname) {
        return false
      }
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return true
      }
      return (
        /^10\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
      )
    },
    jumpToAppCenter(event, target = '_self') {
      try {
        const redirectUrl = import.meta.env.VITE_REDIRECT_APPCENTER || ''
        if (!redirectUrl) {
          ElNotification({
            title: '提示',
            message: '未配置应用中心跳转地址（VITE_REDIRECT_APPCENTER）',
            type: 'error',
          })
          return
        }

        let targetUrl
        if (/^https?:\/\//i.test(redirectUrl)) {
          targetUrl = new URL(redirectUrl)
        } else {
          targetUrl = new URL(redirectUrl, window.location.origin)
        }

        const runtimeUrl = new URL(window.location.href)
        const runtimeIsLocal = this.isLocalOrIntranetHost(runtimeUrl.hostname)
        const targetIsLocal = this.isLocalOrIntranetHost(targetUrl.hostname)

        // Keep same-environment redirect to avoid local/prod cross-jump.
        if (runtimeIsLocal !== targetIsLocal) {
          targetUrl = new URL(runtimeIsLocal ? 'http://127.0.0.1:1011' : 'http://119.91.132.25:1011')
        }

        const finalUrl = targetUrl.href

        const el = event?.currentTarget
        if (el) el.style.pointerEvents = 'none'
        setTimeout(() => {
          if (el) el.style.pointerEvents = 'auto'
        }, 1000)

        if (target === '_self') {
          window.location.href = finalUrl
        } else if (target === '_blank') {
          const newWindow = window.open(finalUrl, '_blank')
          if (!newWindow) {
            ElNotification({
              title: '提示',
              message: '浏览器拦截了新窗口，请允许弹窗后重试',
              type: 'warning',
            })
            ElNotification({
              title: '提示',
              message: `应用中心地址：${finalUrl}`,
              type: 'info',
            })
          }
        }
      } catch (err) {
        ElNotification({
          title: '提示',
          message: `跳转失败：${err.message}`,
          type: 'error',
        })
      }
    },
    workTypeStatistics() {
      this.workTypeDialogVisible = true
    },
    taskOrderStatistics() {
      this.taskOrderDialogVisible = true
    },
  },
}
</script>

<style scoped>
.header-wrap {
  height: 100%;
  padding: 12px 16px 10px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 18% 0%, rgba(59, 130, 246, 0.24), transparent 30%),
    linear-gradient(180deg, rgba(3, 10, 22, 0.96), rgba(5, 14, 28, 0.98));
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
}

.toolbar-row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.brand {
  min-width: 0;
}

.title-cn {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 2.2px;
  background: linear-gradient(90deg, #7dd3fc, #dbeafe);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-fill-color: transparent;
}

.title-en {
  font-size: 11px;
  color: #94a3b8;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 2px;
}

.control-center {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.control-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  min-width: 184px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(10, 18, 34, 0.7);
  color: #dbeafe;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.control-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.3);
  background: rgba(15, 23, 42, 0.92);
  box-shadow: 0 10px 20px rgba(2, 8, 23, 0.28);
}

.control-btn--accent {
  border-color: rgba(96, 165, 250, 0.28);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.78), rgba(14, 165, 233, 0.56));
}

.control-btn__icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 13px;
  overflow: hidden;
}

.control-btn__icon-image,
.action-icon__image {
  width: 100%;
  height: 100%;
}

.control-btn__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.control-btn__title {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
}

.control-btn__sub {
  margin-top: 2px;
  font-size: 11px;
  color: rgba(226, 232, 240, 0.72);
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(10, 18, 34, 0.7);
  color: #dbeafe;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.3);
  background: rgba(15, 23, 42, 0.92);
  box-shadow: 0 10px 20px rgba(2, 8, 23, 0.28);
}

.action-btn--active {
  border-color: rgba(125, 211, 252, 0.45);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(8, 47, 73, 0.88));
}

.action-btn--primary {
  border-color: rgba(96, 165, 250, 0.28);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.7), rgba(14, 165, 233, 0.55));
}

.action-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  overflow: hidden;
}

.action-icon--text {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

@media (max-width: 1440px) {
  .toolbar-row {
    grid-template-columns: auto auto;
  }

  .header-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}
</style>
