<template>
  <div class="header-wrap">
    <el-row class="row-bg" align="middle" justify="space-between">
      <el-col :span="4">
        <div>
          <div class="title-cn">车辆任务管理</div>
          <div class="title-en">Vehicle Task Management Center</div>
        </div>
      </el-col>
      <el-col :span="18">
        <el-row align="middle" :gutter="20">
          <el-col :span="3">
            <div class="statistics" @click="taskOrderStatistics">
              <el-image class="statistics-image" :src="taskOrderImg" fit="cover" />
              <div>车辆任务单</div>
            </div>
          </el-col>
          <el-col :span="3">
            <div class="statistics" @click="workTypeStatistics">
              <el-image class="statistics-image" :src="workTypeImg" fit="cover" />
              <div>车辆作业类型</div>
            </div>
          </el-col>
        </el-row>
      </el-col>
      <el-col :span="2">
        <div class="statistics" @click="jumpToAppCenter($event)">
          <el-image class="statistics-image" :src="AppCenterImg" fit="cover" />
          <div>返回应用中心</div>
        </div>
      </el-col>
    </el-row>
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
    }
  },
  methods: {
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  background-color: #020b18;
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  padding: 0 20px;
}

.title-cn {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 2px;
  background: linear-gradient(90deg, #60a5fa, #a5f3fc);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-fill-color: transparent;
}

.title-en {
  font-size: 12px;
  color: #94a3b8;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.row-bg {
  width: 100%;
}

.statistics {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #ffffff;
  font-size: 14px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 80px;
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(96, 165, 250, 0.1);
}

.statistics:hover {
  background-color: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.15);
}

.statistics-image {
  width: 40px;
  height: 40px;
  margin-bottom: 8px;
  transition: transform 0.3s ease;
}

.statistics:hover .statistics-image {
  transform: rotate(5deg) scale(1.05);
  border-color: rgba(165, 243, 252, 0.3);
}

.statistics>div:last-child {
  letter-spacing: 0.5px;
  font-weight: 500;
  background: linear-gradient(90deg, #ffffff, #a5f3fc);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-fill-color: transparent;
  transition: all 0.3s ease;
}

.statistics:hover>div:last-child {
  background: linear-gradient(90deg, #60a5fa, #a5f3fc);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-fill-color: transparent;
}

@media (max-width: 1200px) {
  .statistics {
    min-width: 70px;
    padding: 10px 6px;
  }

  .statistics-image {
    width: 36px;
    height: 36px;
  }

  .statistics>div:last-child {
    font-size: 13px;
  }
}

@media (max-width: 992px) {
  .statistics {
    min-width: 60px;
    padding: 8px 4px;
  }

  .statistics-image {
    width: 32px;
    height: 32px;
  }

  .statistics>div:last-child {
    font-size: 12px;
  }
}
</style>
