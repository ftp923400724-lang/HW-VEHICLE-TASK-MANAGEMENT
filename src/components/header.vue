<template>
  <div class="header-wrap">
    <el-row class="row-bg" align="middle" justify="space-between">
      <el-col :span="4">
        <div>
          <div class="title-cn">车辆定位管理</div>
          <div class="title-en">Vehicle Management Center</div>
        </div>
      </el-col>
      <el-col :span="18">
        <el-row align="middle" :gutter="20">
          <el-col :span="3">
            <div class="statistics" @click="offlineStatistics">
              <el-image class="statistics-image" :src="statisticsImg" fit="cover" />
              <div>车辆在离线统计</div>
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

  <OfflineStatisticsWindow v-model:visible="offlineStatisticsVisible" />
</template>

<script>
import statisticsImg from '../assets/header/1.png'
import AppCenterImg from '../assets/header/2.png'
import { ElMessage } from 'element-plus'
import OfflineStatisticsWindow from '@/window/offlineStatistics.vue'
import tokenHelper from '@/utils/token'
import { redirectWithToken } from '@/utils/tokenTransfer'

export default {
  name: 'AppHeader',
  components: {
    OfflineStatisticsWindow
  },
  data() {
    return {
      statisticsImg,
      AppCenterImg,
      offlineStatisticsVisible: false,
    }
  },
  methods: {
    isLocalRuntimeHost(hostname = '') {
      const normalized = String(hostname || '').trim().toLowerCase()
      return (
        normalized === 'localhost' ||
        normalized === '127.0.0.1' ||
        normalized === '::1'
      )
    },
    adaptAppCenterUrlByRuntime(targetUrl) {
      try {
        const runtimeUrl = new URL(window.location.href)
        const candidateUrl = new URL(targetUrl, runtimeUrl.origin)
        const runtimeIsLocal = this.isLocalRuntimeHost(runtimeUrl.hostname)
        const candidateIsLocal = this.isLocalRuntimeHost(candidateUrl.hostname)

        if (runtimeIsLocal !== candidateIsLocal) {
          candidateUrl.protocol = runtimeUrl.protocol
          candidateUrl.hostname = runtimeUrl.hostname
          if (!candidateUrl.port) {
            candidateUrl.port = '1011'
          }
        }

        return candidateUrl.toString()
      } catch (error) {
        return targetUrl
      }
    },
    resolveDefaultAppCenterUrl() {
      try {
        const current = new URL(window.location.href)
        current.port = '1011'
        current.pathname = '/'
        current.search = ''
        current.hash = ''
        return current.toString()
      } catch (error) {
        return ''
      }
    },
    jumpToAppCenter(event, target = '_self') {
      try {
        let redirectUrl = import.meta.env.VITE_REDIRECT_APPCENTER || this.resolveDefaultAppCenterUrl()
        console.log('读取到的跳转地址：', redirectUrl)

        if (!redirectUrl) {
          ElMessage.error('未获取到应用中心地址')
          console.error('错误：应用中心地址为空')
          return
        }

        let validUrl
        if (redirectUrl.startsWith('http')) {
          validUrl = new URL(redirectUrl)
        } else {
          validUrl = new URL(redirectUrl, window.location.origin)
        }

        const finalUrl = this.adaptAppCenterUrlByRuntime(validUrl.href)
        console.log('最终跳转地址：', finalUrl)

        const el = event?.currentTarget
        if (el) el.style.pointerEvents = 'none'
        setTimeout(() => {
          if (el) el.style.pointerEvents = 'auto'
        }, 1000)

        const userToken = tokenHelper.getToken()

        if (target === '_self') {
          if (userToken && redirectWithToken(userToken, finalUrl)) {
            return
          }
          window.location.replace(finalUrl)
        } else if (target === '_blank') {
          const newWindow = window.open(finalUrl, '_blank')
          if (!newWindow) {
            ElMessage.warning('浏览器拦截了新窗口，请允许弹窗后重试')
            ElMessage.info(`应用中心地址：${finalUrl}`)
          }
        }
      } catch (err) {
        ElMessage.error(`跳转失败：${err.message}`)
        console.error('跳转异常详情：', err)
      }
    },
    offlineStatistics() {
      this.offlineStatisticsVisible = true
    }
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
