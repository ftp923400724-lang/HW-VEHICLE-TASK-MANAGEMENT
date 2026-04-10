<template>
  <div class="panel">
    <div ref="mapContainer" class="map"></div>
    <div ref="markerOverlay" class="marker-overlay"></div>
    <div v-if="loading" class="loading-mask">轨迹加载中…</div>
    <div class="playback-hud">
      <span>状态：{{ playbackStatusLabel }}</span>
      <span>速度：{{ playbackSpeed }} km/h</span>
      <span>进度：{{ (playbackProgress * 100).toFixed(0) }}%</span>
    </div>
    <div v-if="fenceCompareLabel" class="fence-hud">
      <span>规划：{{ currentFenceName || '未选择' }}</span>
      <span>{{ fenceCompareLabel }}</span>
      <span v-if="deviationLabel">{{ deviationLabel }}</span>
    </div>
    <div class="map-legend">
      <span class="legend-item">
        <i class="legend-dot legend-dot--actual"></i>
        实际行驶
      </span>
      <span class="legend-item">
        <i class="legend-dot legend-dot--planned"></i>
        规划路线
      </span>
      <span class="legend-item">
        <i class="legend-dot legend-dot--deviation"></i>
        偏离段
      </span>
      <span class="legend-item">
        <i class="legend-dot legend-dot--deviation-mild"></i>
        轻微偏离
      </span>
      <span class="legend-item">
        <i class="legend-dot legend-dot--deviation-severe"></i>
        严重偏离
      </span>
    </div>
  </div>
</template>

<script>
window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }
import AMapLoader from '@amap/amap-jsapi-loader'
import { ElNotification } from 'element-plus'
import eventBus, { EventTypes } from '@/utils/eventBus'
import { fetchVehicleFence } from '@/api/vehicle'
import ThreeVehicleMarkerLayer from '@/utils/threeVehicleMarkerLayer.js'
const PLAYBACK_STATUS_LABEL = {
  idle: '待命',
  playing: '播放中',
  paused: '已暂停',
}

function normalizeHeading(deg) {
  if (!Number.isFinite(deg)) return 0
  const normalized = deg % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function computeBearing(from, to) {
  if (!from || !to) return 0
  const [lon1, lat1] = from
  const [lon2, lat2] = to
  if (![lon1, lat1, lon2, lat2].every(Number.isFinite)) return 0
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(deltaLambda) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)
  return normalizeHeading((Math.atan2(y, x) * 180) / Math.PI)
}

export default {
  name: 'AppMain',
  data() {
    return {
      mapInstance: null,
      AMap: null,
      markerLayer: null,
      playbackMarkerKey: 'trajectory_playback_marker',
      polyline: null,
      playedPolyline: null,
      deviationOverlays: [],
      deviationMildOverlays: [],
      deviationSevereOverlays: [],
      lastMarkerPosition: null,
      startMarker: null,
      endMarker: null,
      loading: false,
      currentDeviceNo: '',
      currentPlate: '',
      currentFenceId: '',
      currentFenceName: '',
      trajectoryPath: [],
      fenceGeometry: null,
      fenceOverlays: [],
      segmentDistances: [],
      totalDistance: 0,
      fenceComparison: null,
      playbackStatus: 'idle',
      playbackSpeed: 40,
      playbackProgress: 0,
      playbackHeading: 0,
      playbackRaf: null,
      lastTick: 0,
    }
  },
  async mounted() {
    await this.initializeMap()
    eventBus.on(EventTypes.VehicleSelected, this.handleVehicleSelected)
    eventBus.on(EventTypes.TrajectoryFetched, this.handleTrajectoryFetched)
    eventBus.on(EventTypes.TrajectoryAnalyzed, this.handleTrajectoryAnalyzed)
    eventBus.on(EventTypes.TrajectoryControl, this.handleTrajectoryControl)
  },
  beforeUnmount() {
    eventBus.off(EventTypes.VehicleSelected, this.handleVehicleSelected)
    eventBus.off(EventTypes.TrajectoryFetched, this.handleTrajectoryFetched)
    eventBus.off(EventTypes.TrajectoryAnalyzed, this.handleTrajectoryAnalyzed)
    eventBus.off(EventTypes.TrajectoryControl, this.handleTrajectoryControl)
    this.clearTrajectory()
    this.clearFenceOverlays()
    this.clearDeviationOverlays()
      this.destroyMarkerLayer()
    if (this.mapInstance) {
      this.mapInstance.destroy()
      this.mapInstance = null
    }
  },
  methods: {
    async initializeMap() {
      if (this.mapInstance) return
      try {
        const AMap = await AMapLoader.load({
          key: import.meta.env.VITE_AMAP_KEY,
          version: '2.0',
          plugins: ['AMap.MouseTool', 'AMap.MoveAnimation'],
        })
        this.AMap = AMap
        this.mapInstance = new AMap.Map(this.$refs.mapContainer, {
          resizeEnable: true,
          mapStyle: 'amap://styles/958a5238b1ec191d7f4f6de2e855d2a6',
          viewMode: '2D',
          zoom: 11,
          center: [118.796624, 32.059344],
          features: ['bg', 'road', 'building'],
          showBuildingBlock: false,
          jogEnable: false,
          keyboardEnable: true,
          doubleClickZoom: false,
          rotateEnable: false,
          isHotspot: false,
        })
        this.initMarkerLayer()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('初始化地图失败', error)
      }
    },
    handleVehicleSelected(detail = {}) {
      const deviceNo = detail?.deviceNo || detail?.device_no
      if (!deviceNo) return
      this.currentDeviceNo = String(deviceNo)
      this.currentPlate = detail?.licensePlate || detail?.license_plate || detail?.vehicle_name || ''
      this.currentFenceId = String(detail?.fenceId || detail?.fence_id || '').trim()
      this.currentFenceName = detail?.fenceName || detail?.work_fence_name || detail?.fence_name || ''
      this.loadFenceForSelection(detail)
    },
    handleTrajectoryFetched(detail = {}) {
      const deviceNo = detail?.deviceNo || detail?.device_no
      const points = Array.isArray(detail?.points) ? detail.points : []
      if (deviceNo) {
        this.currentDeviceNo = String(deviceNo)
      }
      this.renderTrajectory(points)
      this.refreshFenceComparison()
      this.resetPlaybackState()
      if (!points.length) {
        ElNotification({
          title: '提示',
          message: '未查询到该车辆的轨迹点',
          type: 'info',
        })
      }
      this.emitPlaybackState()
    },
    handleTrajectoryAnalyzed(detail = {}) {
      const fence = detail?.fence || null
      if (fence && this.isFenceGeometryAvailable(fence)) {
        this.currentFenceId = String(fence?.id || fence?.fence_id || this.currentFenceId || '').trim()
        this.currentFenceName = fence?.name || fence?.label || this.currentFenceName || ''
        this.renderFence(fence)
        return
      }
      this.refreshFenceComparison()
    },
    handleTrajectoryControl(payload = {}) {
      const action = payload?.action
      switch (action) {
        case 'play':
          this.startPlayback(payload?.progress ?? 0, payload?.speed)
          break
        case 'pause':
          this.pausePlayback()
          break
        case 'resume':
          this.resumePlayback(payload?.speed)
          break
        case 'stop':
          this.stopPlayback()
          break
        case 'seek':
          this.seekPlayback(payload?.progress)
          break
        case 'speed':
          this.updateSpeed(payload?.speed)
          break
        default:
          break
      }
    },
    getTodayRange() {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      return { start, end }
    },
    normalizeTrajectory(payload) {
      const list = Array.isArray(payload?.data?.list)
        ? payload.data.list
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : payload?.data
              ? [payload.data]
              : []
      return list
        .map((item, index) => {
          const lon = this.toNumber(item?.lon || item?.lng || item?.longitude)
          const lat = this.toNumber(item?.lat || item?.latitude)
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
          return { position: [lon, lat], raw: item, index }
        })
        .filter(Boolean)
    },
    async loadFenceForSelection(detail = {}) {
      const fenceId = String(detail?.fenceId || detail?.fence_id || '').trim()
      if (!fenceId) {
        this.clearFenceOverlays()
        this.currentFenceId = ''
        this.currentFenceName = ''
        return
      }
      try {
        const fence = await this.fetchFenceDetail(fenceId)
        if (!fence) return
        this.currentFenceName = fence?.name || fence?.label || this.currentFenceName || ''
        this.renderFence(fence)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('加载围栏失败', error)
      }
    },
    async fetchFenceDetail(fenceId) {
      const fenceKey = String(fenceId || '').trim()
      if (!fenceKey) return null
      if (!this._fenceCache) {
        this._fenceCache = new Map()
      }
      if (this._fenceCache.has(fenceKey)) {
        return this._fenceCache.get(fenceKey)
      }
      const payload = await fetchVehicleFence(fenceKey)
      const fence = payload?.data ?? payload ?? null
      if (fence) {
        this._fenceCache.set(fenceKey, fence)
      }
      return fence
    },
    toNumber(value) {
      const num = typeof value === 'string' ? parseFloat(value) : Number(value)
      return Number.isFinite(num) ? num : NaN
    },
    parseFenceGeometry(fence) {
      if (!fence) return null
      const typeHint = String(fence.geometry || fence.geometry_type || fence.geometryType || fence.shape || fence.type || '').trim().toLowerCase()
      const raw = fence.coordinates ?? fence.coords ?? fence.points ?? fence.path
      const normalized = this.normalizeFenceGeometry(raw, typeHint)
      if (normalized) return normalized
      if (typeof raw === 'string' && raw.trim()) {
        try {
          return this.normalizeFenceGeometry(JSON.parse(raw), typeHint)
        } catch (error) {
          const points = this.parseLoosePointList(raw)
          if (points.length) {
            return { type: typeHint === 'polyline' || typeHint === 'line' ? 'polyline' : 'polygon', path: points }
          }
        }
      }
      return null
    },
    normalizeFenceGeometry(value, typeHint = '') {
      if (!value) return null
      if (typeof value === 'string') {
        const raw = value.trim()
        if (!raw) return null
        try {
          return this.normalizeFenceGeometry(JSON.parse(raw), typeHint)
        } catch (error) {
          if (typeHint === 'polyline' || typeHint === 'line') {
            const points = this.parseLoosePointList(raw)
            if (points.length) {
              return { type: 'polyline', path: points }
            }
          }
          return null
        }
      }
      if (Array.isArray(value)) {
        if (!value.length) return null
        if (value.length === 2 && value.every((item) => typeof item === 'number' || typeof item === 'string')) {
          const center = this.toCoordinatePoint(value)
          return center ? { type: 'circle', center, radius: 50 } : null
        }
        const path = this.normalizeFencePath(value)
        if (!path.length) return null
        return { type: typeHint === 'polyline' || typeHint === 'line' ? 'polyline' : 'polygon', path }
      }
      if (typeof value === 'object') {
        const type = String(value.type || value.geometry || value.shape || '').trim().toLowerCase()
        if (type === 'polyline' || type === 'line') {
          const path = value.path || value.points || value.coords || value.coordinates || value.polygon || value.vertices
          const normalizedPath = this.normalizeFencePath(path || [])
          if (normalizedPath.length) {
            return { type: 'polyline', path: normalizedPath }
          }
        }
        if (type === 'circle') {
          const center = this.toCoordinatePoint(value.center || value.position || value.point || value.coordinates?.center)
          const radius = Number(value.radius ?? value.r ?? value.distance ?? value.range ?? 0)
          if (center && Number.isFinite(radius) && radius > 0) {
            return { type: 'circle', center, radius }
          }
        }
        const path = value.path || value.points || value.coords || value.coordinates || value.polygon || value.vertices
        if (path) {
          const normalizedPath = this.normalizeFencePath(path)
          if (normalizedPath.length) {
            return { type: typeHint === 'polyline' || type === 'line' ? 'polyline' : 'polygon', path: normalizedPath }
          }
        }
        const center = this.toCoordinatePoint(value.center || value.location)
        const radius = Number(value.radius ?? value.r ?? 0)
        if (center && Number.isFinite(radius) && radius > 0) {
          return { type: 'circle', center, radius }
        }
      }
      return null
    },
    normalizeFencePath(value) {
      const list = Array.isArray(value) ? value : this.parseLoosePointList(String(value || ''))
      return list
        .map((point) => this.toCoordinatePoint(point))
        .filter(Boolean)
    },
    parseLoosePointList(raw) {
      const text = String(raw || '').trim()
      if (!text) return []
      const stripped = text.replace(/[\[\](){}]/g, ' ')
      return stripped
        .split(/[;|]/)
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => segment.split(/[,，\s]+/).filter(Boolean))
    },
    toCoordinatePoint(value) {
      if (!value) return null
      if (Array.isArray(value) && value.length >= 2) {
        const lon = this.toNumber(value[0])
        const lat = this.toNumber(value[1])
        return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null
      }
      if (typeof value === 'object') {
        const lon = this.toNumber(value.lng ?? value.lon ?? value.longitude ?? value.x)
        const lat = this.toNumber(value.lat ?? value.latitude ?? value.y)
        return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null
      }
      if (typeof value === 'string') {
        const parts = value.split(/[,，\s]+/).filter(Boolean)
        if (parts.length >= 2) {
          const lon = this.toNumber(parts[0])
          const lat = this.toNumber(parts[1])
          return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null
        }
      }
      return null
    },
    isFenceGeometryAvailable(fence) {
      return !!this.parseFenceGeometry(fence)
    },
    refreshFenceComparison() {
      if (!this.fenceGeometry || !this.trajectoryPath.length) {
        this.fenceComparison = null
        return
      }
      const total = this.trajectoryPath.length
      let insideCount = 0
      this.trajectoryPath.forEach((point) => {
        if (this.isPointInFence(point, this.fenceGeometry)) {
          insideCount += 1
        }
      })
      this.fenceComparison = {
        total,
        insideCount,
        outsideCount: total - insideCount,
        insideRatio: total > 0 ? insideCount / total : 0,
      }
    },
    isPointInFence(point, geometry) {
      if (!point || !geometry) return false
      if (geometry.type === 'circle') {
        const distance = this.calcDistance(point, geometry.center)
        return distance <= Number(geometry.radius || 0)
      }
      if (geometry.type === 'polyline' && geometry.path?.length >= 2) {
        return this.isPointNearPolyline(point, geometry.path, 30)
      }
      if (geometry.path?.length >= 3) {
        return this.isPointInPolygon(point, geometry.path)
      }
      return false
    },
    isPointNearPolyline(point, polyline, thresholdMeters = 30) {
      if (!Array.isArray(polyline) || polyline.length < 2) return false
      let minDistance = Infinity
      for (let i = 0; i < polyline.length - 1; i += 1) {
        const distance = this.distanceToSegment(point, polyline[i], polyline[i + 1])
        if (distance < minDistance) {
          minDistance = distance
        }
      }
      return minDistance <= thresholdMeters
    },
    distanceToSegment(point, start, end) {
      if (!point || !start || !end) return Infinity
      const [px, py] = point
      const [sx, sy] = start
      const [ex, ey] = end
      const metersPerDegree = 111320
      const cosLat = Math.cos((((py ?? sy ?? ey) || 0) * Math.PI) / 180)
      const x1 = (sx - px) * metersPerDegree * cosLat
      const y1 = (sy - py) * metersPerDegree
      const x2 = (ex - px) * metersPerDegree * cosLat
      const y2 = (ey - py) * metersPerDegree
      const dx = x2 - x1
      const dy = y2 - y1
      const lenSq = dx * dx + dy * dy
      if (lenSq === 0) {
        return Math.sqrt(x1 * x1 + y1 * y1)
      }
      let t = -(x1 * dx + y1 * dy) / lenSq
      t = Math.max(0, Math.min(1, t))
      const projX = x1 + dx * t
      const projY = y1 + dy * t
      return Math.sqrt(projX * projX + projY * projY)
    },
    isPointInPolygon(point, polygon) {
      if (!Array.isArray(polygon) || polygon.length < 3) return false
      const [x, y] = point
      let inside = false
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]
        const intersect =
          yi > y !== yj > y &&
          x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi
        if (intersect) inside = !inside
      }
      return inside
    },
    renderTrajectory(points) {
      if (!this.mapInstance || !this.AMap) return
      this.clearTrajectory()
      if (!points.length) return
      const path = points
        .map((p) => {
          if (Array.isArray(p?.position) && p.position.length === 2) return p.position
          const lon = this.toNumber(p?.lon || p?.lng || p?.longitude)
          const lat = this.toNumber(p?.lat || p?.latitude)
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
          return [lon, lat]
        })
        .filter(Boolean)

      if (!path.length) return
      this.trajectoryPath = path
      this.preparePlaybackMetrics(path)
      // 未行驶的路径（低饱和暗紫色）
      this.polyline = new this.AMap.Polyline({
        path,
        showDir: false,
        strokeColor: '#2563eb',
        strokeWeight: 5,
        strokeOpacity: 0.8,
        lineJoin: 'round',
        lineCap: 'round',
      })

      // 已经行驶的路径（淡紫色，高亮）
      this.playedPolyline = new this.AMap.Polyline({
        path: [path[0]],
        showDir: true,
        strokeColor: '#60a5fa',
        strokeWeight: 6,
        strokeOpacity: 1.0,
        lineJoin: 'round',
        lineCap: 'round',
      })
      this.polyline.setMap(this.mapInstance)
      this.playedPolyline.setMap(this.mapInstance)
      this.createEndpoints(path[0], path[path.length - 1])
      this.fitMapToVisibleOverlays()
      this.refreshDeviationOverlays()
    },
    renderFence(fence) {
      if (!this.mapInstance || !this.AMap) return
      this.clearFenceOverlays()
      const geometry = this.parseFenceGeometry(fence)
      if (!geometry) {
        this.fenceGeometry = null
        this.fenceComparison = null
        return
      }
      this.fenceGeometry = geometry
      const fenceStyle = {
        strokeColor: '#f59e0b',
        strokeWeight: geometry.type === 'polyline' ? 5 : 3,
        strokeOpacity: 0.9,
        strokeStyle: 'solid',
      }
      if (geometry.type === 'circle') {
        const circle = new this.AMap.Circle({
          center: geometry.center,
          radius: geometry.radius,
          map: this.mapInstance,
          fillColor: '#f59e0b',
          fillOpacity: 0.16,
          ...fenceStyle,
        })
        this.fenceOverlays.push(circle)
      } else if (geometry.type === 'polyline' && geometry.path?.length) {
        const polyline = new this.AMap.Polyline({
          path: geometry.path,
          map: this.mapInstance,
          ...fenceStyle,
          strokeStyle: 'dashed',
          strokeOpacity: 0.95,
        })
        this.fenceOverlays.push(polyline)
      } else if (geometry.path?.length) {
        const polygon = new this.AMap.Polygon({
          path: geometry.path,
          map: this.mapInstance,
          fillColor: '#f59e0b',
          fillOpacity: 0.16,
          ...fenceStyle,
        })
        this.fenceOverlays.push(polygon)
      }
      this.refreshFenceComparison()
      this.fitMapToVisibleOverlays()
      this.refreshDeviationOverlays()
    },
    clearFenceOverlays() {
      if (Array.isArray(this.fenceOverlays)) {
        this.fenceOverlays.forEach((overlay) => {
          if (!overlay) return
          overlay.setMap?.(null)
          overlay.destroy?.()
        })
      }
      this.fenceOverlays = []
      this.fenceGeometry = null
      this.fenceComparison = null
      this.clearDeviationOverlays()
    },
    clearDeviationOverlays() {
      if (Array.isArray(this.deviationOverlays)) {
        this.deviationOverlays.forEach((overlay) => {
          if (!overlay) return
          overlay.setMap?.(null)
          overlay.destroy?.()
        })
      }
      if (Array.isArray(this.deviationMildOverlays)) {
        this.deviationMildOverlays.forEach((overlay) => {
          if (!overlay) return
          overlay.setMap?.(null)
          overlay.destroy?.()
        })
      }
      if (Array.isArray(this.deviationSevereOverlays)) {
        this.deviationSevereOverlays.forEach((overlay) => {
          if (!overlay) return
          overlay.setMap?.(null)
          overlay.destroy?.()
        })
      }
      this.deviationOverlays = []
      this.deviationMildOverlays = []
      this.deviationSevereOverlays = []
    },
    refreshDeviationOverlays() {
      this.clearDeviationOverlays()
      if (!this.mapInstance || !this.AMap) return
      if (!this.fenceGeometry || this.fenceGeometry.type !== 'polyline') return
      if (!Array.isArray(this.trajectoryPath) || this.trajectoryPath.length < 2) return
      const plannedPath = Array.isArray(this.fenceGeometry.path) ? this.fenceGeometry.path : []
      if (plannedPath.length < 2) return

      const mildThresholdMeters = 30
      const severeThresholdMeters = 80
      const segments = []
      let currentSegment = []
      let currentTier = null

      this.trajectoryPath.forEach((point, index) => {
        const distance = this.distanceToPolyline(point, plannedPath)
        const tier = this.classifyDeviation(distance, mildThresholdMeters, severeThresholdMeters)
        if (!tier) {
          if (currentSegment.length >= 2 && currentTier) {
            segments.push({ tier: currentTier, path: [...currentSegment] })
          }
          currentSegment = []
          currentTier = null
          return
        }
        if (currentTier && tier !== currentTier && currentSegment.length >= 2) {
          segments.push({ tier: currentTier, path: [...currentSegment] })
          currentSegment = [point]
          currentTier = tier
          return
        }
        currentTier = tier
        currentSegment.push(point)
        if (index === this.trajectoryPath.length - 1 && currentSegment.length >= 2) {
          segments.push({ tier: currentTier, path: [...currentSegment] })
        }
      })

      if (!segments.length) return

      segments.forEach(({ tier, path }) => {
        const overlay = new this.AMap.Polyline({
          path,
          map: this.mapInstance,
          strokeColor: tier === 'severe' ? '#dc2626' : '#f97316',
          strokeWeight: tier === 'severe' ? 7 : 6,
          strokeOpacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round',
        })
        if (tier === 'severe') {
          this.deviationSevereOverlays.push(overlay)
        } else {
          this.deviationMildOverlays.push(overlay)
        }
        this.deviationOverlays.push(overlay)
      })
      this.fitMapToVisibleOverlays()
    },
    classifyDeviation(distance, mildThresholdMeters, severeThresholdMeters) {
      if (!Number.isFinite(distance)) return null
      if (distance > severeThresholdMeters) return 'severe'
      if (distance > mildThresholdMeters) return 'mild'
      return null
    },
    distanceToPolyline(point, polyline) {
      if (!Array.isArray(polyline) || polyline.length < 2) return Infinity
      let minDistance = Infinity
      for (let i = 0; i < polyline.length - 1; i += 1) {
        const distance = this.distanceToSegment(point, polyline[i], polyline[i + 1])
        if (distance < minDistance) {
          minDistance = distance
        }
      }
      return minDistance
    },
    fitMapToVisibleOverlays() {
      if (!this.mapInstance || !this.AMap) return
      const overlays = [
        this.polyline,
        this.playedPolyline,
        this.startMarker,
        this.endMarker,
        ...this.deviationOverlays,
        ...this.fenceOverlays,
      ].filter(Boolean)
      if (!overlays.length) return
      try {
        this.mapInstance.setFitView(overlays, false, [60, 60, 60, 60])
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('调整视野失败', error)
      }
    },
    createEndpoints(startPosition, endPosition) {
      if (!this.AMap || !this.mapInstance) return
      this.startMarker = new this.AMap.Marker({
        position: startPosition,
        map: this.mapInstance,
        label: { content: '起点', direction: 'top', offset: new this.AMap.Pixel(0, -6) },
      })
      this.endMarker = new this.AMap.Marker({
        position: endPosition,
        map: this.mapInstance,
        label: { content: '终点', direction: 'top', offset: new this.AMap.Pixel(0, -6) },
      })
    },
    initMarkerLayer() {
      if (!this.mapInstance || !this.$refs.markerOverlay) return
      this.destroyMarkerLayer()
      this.markerLayer = new ThreeVehicleMarkerLayer({
        map: this.mapInstance,
        container: this.$refs.markerOverlay,
      })
      this.syncPlaybackMarker()
    },
    destroyMarkerLayer() {
      if (!this.markerLayer) return
      this.markerLayer.dispose()
      this.markerLayer = null
    },
    buildPlaybackMarkerRecord(position) {
      return {
        deviceNo: this.currentDeviceNo,
        device_no: this.currentDeviceNo,
        license_plate: this.currentPlate,
        vehicle_name: this.currentPlate,
        status: 'online',
        online_status: 1,
        speed: this.playbackStatus === 'playing' ? this.playbackSpeed : 0,
        moving: this.playbackStatus === 'playing',
        heading: this.playbackHeading,
        headingDeg: this.playbackHeading,
        direction: this.playbackHeading,
        angle: this.playbackHeading,
        bearing: this.playbackHeading,
        course: this.playbackHeading,
        timer: new Date().toISOString(),
        position,
      }
    },
    getPlaybackMarkerLabel() {
      return this.currentPlate || this.currentDeviceNo || '定位点名称'
    },
    syncPlaybackMarker(position = null) {
      if (!this.markerLayer || !this.trajectoryPath.length) return
      const targetPosition = position || this.getPositionByProgress(this.playbackProgress)
      if (!targetPosition) return
      const record = this.buildPlaybackMarkerRecord(targetPosition)
      this.markerLayer.upsertMarker(this.playbackMarkerKey, targetPosition, record, this.getPlaybackMarkerLabel())
      this.markerLayer.setFocusedKey(this.playbackMarkerKey)
    },
    preparePlaybackMetrics(path) {
      this.segmentDistances = []
      this.totalDistance = 0
      for (let i = 0; i < path.length - 1; i += 1) {
        const dist = this.calcDistance(path[i], path[i + 1])
        this.segmentDistances.push(dist)
        this.totalDistance += dist
      }
    },
    calcDistance(a, b) {
      if (!a || !b || a.length !== 2 || b.length !== 2) return 0
      const [lon1, lat1] = a
      const [lon2, lat2] = b
      const rad = Math.PI / 180
      const dLat = (lat2 - lat1) * rad
      const dLon = (lon2 - lon1) * rad
      const originLat = lat1 * rad
      const targetLat = lat2 * rad
      const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(originLat) * Math.cos(targetLat)
      const earthRadius = 6371000 // meters
      return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)))
    },
    resetPlaybackState() {
      this.playbackStatus = 'idle'
      this.playbackProgress = 0
      this.lastMarkerPosition = null
      this.stopTicker()
      this.updatePlaybackPosition()
    },
    startPlayback(startProgress = 0, speed) {
      if (!this.trajectoryPath.length || this.trajectoryPath.length < 2) {
        ElNotification({ title: '提示', message: '轨迹点不足，无法回放', type: 'warning' })
        return
      }
      if (!this.totalDistance || this.totalDistance <= 0) {
        this.playbackProgress = 1
        this.playbackStatus = 'idle'
        this.updatePlaybackPosition()
        this.emitPlaybackState()
        return
      }
      if (typeof speed === 'number') {
        this.updateSpeed(speed)
      }
      const progress = Number.isFinite(Number(startProgress)) ? Number(startProgress) : 0
      this.playbackProgress = Math.min(1, Math.max(0, progress))
      this.playbackStatus = 'playing'
      this.updatePlaybackPosition()
      this.startTicker()
      this.emitPlaybackState()
    },
    resumePlayback(speed) {
      if (this.playbackStatus !== 'paused') return
      if (typeof speed === 'number') {
        this.updateSpeed(speed)
      }
      this.playbackStatus = 'playing'
      this.startTicker()
      this.emitPlaybackState()
    },
    pausePlayback() {
      if (this.playbackStatus !== 'playing') return
      this.playbackStatus = 'paused'
      this.stopTicker()
      this.emitPlaybackState()
    },
    stopPlayback() {
      this.playbackStatus = 'idle'
      this.playbackProgress = 0
      this.lastMarkerPosition = null
      this.stopTicker()
      this.updatePlaybackPosition()
      this.emitPlaybackState()
    },
    seekPlayback(progress) {
      const numeric = Number(progress)
      if (!Number.isFinite(numeric)) return
      this.playbackProgress = Math.min(1, Math.max(0, numeric))
      this.updatePlaybackPosition()
      this.emitPlaybackState()
    },
    updateSpeed(speed) {
      const next = Number(speed)
      if (!Number.isFinite(next) || next <= 0) return
      this.playbackSpeed = next
      if (this.playbackStatus === 'playing') {
        this.emitPlaybackState()
      }
    },
    startTicker() {
      this.stopTicker()
      this.lastTick = performance.now()
      const step = (timestamp) => {
        if (this.playbackStatus !== 'playing') return
        const delta = (timestamp - this.lastTick) / 1000
        this.lastTick = timestamp
        this.advancePlayback(delta)
        this.playbackRaf = requestAnimationFrame(step)
      }
      this.playbackRaf = requestAnimationFrame(step)
    },
    stopTicker() {
      if (this.playbackRaf) {
        cancelAnimationFrame(this.playbackRaf)
        this.playbackRaf = null
      }
      this.lastTick = 0
    },
    advancePlayback(deltaSeconds) {
      if (!this.totalDistance || this.totalDistance <= 0) {
        this.playbackStatus = 'idle'
        this.stopTicker()
        this.emitPlaybackState()
        return
      }
      const speedMps = (this.playbackSpeed * 1000) / 3600
      const deltaProgress = (speedMps * deltaSeconds) / this.totalDistance
      this.playbackProgress = Math.min(1, this.playbackProgress + deltaProgress)
      this.updatePlaybackPosition()
      this.emitPlaybackState()
      if (this.playbackProgress >= 1) {
        this.playbackStatus = 'idle'
        this.stopTicker()
        this.emitPlaybackState()
      }
    },
    updatePlaybackPosition() {
      if (!this.trajectoryPath.length) return
      const position = this.getPositionByProgress(this.playbackProgress)
      if (!position) return
      const heading = computeBearing(this.lastMarkerPosition, position)
      this.playbackHeading = heading
      this.lastMarkerPosition = position
      this.syncPlaybackMarker(position)
      if (this.playbackStatus === 'playing') {
        try {
          this.mapInstance?.setCenter(position, true)
        } catch (e) {
          // ignore centering errors
        }
      }
      if (this.playedPolyline) {
        this.playedPolyline.setPath(this.buildPlayedPath(position))
      }
      this.refreshFenceComparison()
    },
    getPositionByProgress(progress) {
      if (!this.trajectoryPath.length) return null
      if (!this.segmentDistances.length || this.totalDistance <= 0) {
        return this.trajectoryPath[0]
      }
      const targetDistance = this.totalDistance * Math.min(1, Math.max(0, progress))
      let accumulated = 0
      for (let i = 0; i < this.segmentDistances.length; i += 1) {
        const segment = this.segmentDistances[i]
        if (accumulated + segment >= targetDistance) {
          const ratio = segment === 0 ? 0 : (targetDistance - accumulated) / segment
          const [lon1, lat1] = this.trajectoryPath[i]
          const [lon2, lat2] = this.trajectoryPath[i + 1]
          return [lon1 + (lon2 - lon1) * ratio, lat1 + (lat2 - lat1) * ratio]
        }
        accumulated += segment
      }
      return this.trajectoryPath[this.trajectoryPath.length - 1]
    },
    buildPlayedPath(currentPosition) {
      const percent = this.playbackProgress
      if (percent <= 0) return [this.trajectoryPath[0]]
      if (percent >= 1) return this.trajectoryPath
      const targetDistance = this.totalDistance * percent
      let accumulated = 0
      for (let i = 0; i < this.segmentDistances.length; i += 1) {
        const segment = this.segmentDistances[i]
        if (accumulated + segment >= targetDistance) {
          const basePath = this.trajectoryPath.slice(0, i + 1)
          return [...basePath, currentPosition]
        }
        accumulated += segment
      }
      return this.trajectoryPath
    },
    emitPlaybackState() {
      eventBus.emit(EventTypes.PlaybackState, {
        status: this.playbackStatus,
        progress: this.playbackProgress,
        progressPercent: this.playbackProgress * 100,
        speed: this.playbackSpeed,
        deviceNo: this.currentDeviceNo,
      })
    },
    clearTrajectory() {
      this.stopTicker()
      if (this.polyline) {
        this.polyline.setMap(null)
        this.polyline.destroy?.()
        this.polyline = null
      }
      if (this.playedPolyline) {
        this.playedPolyline.setMap(null)
        this.playedPolyline.destroy?.()
        this.playedPolyline = null
      }
      this.markerLayer?.removeMarker(this.playbackMarkerKey)
      if (this.startMarker) {
        this.startMarker.setMap(null)
        this.startMarker.destroy?.()
        this.startMarker = null
      }
      if (this.endMarker) {
        this.endMarker.setMap(null)
        this.endMarker.destroy?.()
        this.endMarker = null
      }
      this.trajectoryPath = []
      this.segmentDistances = []
      this.totalDistance = 0
      this.lastMarkerPosition = null
      this.playbackHeading = 0
      this.refreshFenceComparison()
      this.clearDeviationOverlays()
    },
  },
  computed: {
    playbackStatusLabel() {
      return PLAYBACK_STATUS_LABEL[this.playbackStatus] || '待命'
    },
    fenceCompareLabel() {
      if (!this.fenceComparison) return ''
      if (this.fenceGeometry?.type === 'polyline') {
        return `对比：${this.fenceComparison.insideCount}/${this.fenceComparison.total} 点贴近路线`
      }
      return `对比：${this.fenceComparison.insideCount}/${this.fenceComparison.total} 点在围栏内`
    },
    deviationLabel() {
      if (!this.fenceGeometry || this.fenceGeometry.type !== 'polyline') return ''
      const mildCount = this.deviationMildOverlays.length
      const severeCount = this.deviationSevereOverlays.length
      if (!mildCount && !severeCount) {
        return '偏离：无'
      }
      return `偏离：轻微 ${mildCount} 段 / 严重 ${severeCount} 段`
    },
  },
}
</script>

<style scoped>
.panel {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.map {
  width: 100%;
  height: 100%;
}

.marker-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}

.loading-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(13, 20, 33, 0.45);
  color: #e2e8f0;
  font-size: 14px;
  backdrop-filter: blur(2px);
  pointer-events: none;
}

.playback-hud {
  position: absolute;
  left: 16px;
  bottom: 16px;
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(13, 20, 33, 0.72);
  color: #e5e7eb;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
}

.fence-hud {
  position: absolute;
  left: 16px;
  top: 16px;
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(13, 20, 33, 0.78);
  color: #fde68a;
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  backdrop-filter: blur(3px);
}

.map-legend {
  position: absolute;
  right: 16px;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(13, 20, 33, 0.78);
  color: #dbeafe;
  border: 1px solid rgba(59, 130, 246, 0.18);
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  backdrop-filter: blur(3px);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.legend-dot--actual {
  background: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
}

.legend-dot--planned {
  background: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.18);
}

.legend-dot--deviation {
  background: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.18);
}

.legend-dot--deviation-mild {
  background: #f97316;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.18);
}

.legend-dot--deviation-severe {
  background: #dc2626;
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.18);
}
</style>
