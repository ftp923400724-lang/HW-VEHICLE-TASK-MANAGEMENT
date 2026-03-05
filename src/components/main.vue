<template>
  <div class="panel">
    <div ref="mapContainer" class="map"></div>
  </div>
</template>

<script>
window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }
import AMapLoader from '@amap/amap-jsapi-loader'
import carIcon from '@/assets/main/car.png'
import { requestJson, normalizeListResult } from '@/utils/request'
import { extractDeviceKey, toFiniteNumber } from '@/utils/vehicle'

const REALTIME_PATH =
  import.meta.env.VITE_VEHICLE_REALTIME_PATH || '/vehicle/real-time-location'
const POLL_INTERVAL = 60000

export default {
  name: 'AppMain',
  data() {
    return {
      mapInstance: null,
      pollTimer: null,
      AMap: null,
      markers: Object.create(null),
      focusedDeviceNo: '',
      hasCentered: false,
      infoWindow: null,
      selectedDetail: null,
    }
  },
  async mounted() {
    await this.initializeMap()
    this.startPolling()
    window.addEventListener('vehicle-selected', this.handleVehicleSelected)
  },
  beforeUnmount() {
    this.teardownPolling()
    window.removeEventListener('vehicle-selected', this.handleVehicleSelected)
    this.clearMarkers()
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
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('初始化地图失败', error)
      }
    },
    handleVehicleSelected(event) {
      const detail = event?.detail || {}
      const deviceNo = detail?.deviceNo || detail?.device_no
      if (!deviceNo) return
      this.focusedDeviceNo = String(deviceNo)
      this.selectedDetail = detail
      this.focusOnDevice()
      this.openInfoWindowForDevice(this.focusedDeviceNo, detail?.rawVehicle || detail?.rawRealtime || detail)
    },
    startPolling() {
      this.teardownPolling()
      this.fetchAndRender()
      this.pollTimer = window.setInterval(() => {
        this.fetchAndRender()
      }, POLL_INTERVAL)
    },
    teardownPolling() {
      if (this.pollTimer) {
        window.clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    async fetchAndRender() {
      if (!this.AMap || !this.mapInstance) return
      try {
      const payload = await requestJson(REALTIME_PATH)
      const records = this.normalizeRecords(payload)
        this.updateMarkers(records)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('获取实时位置失败', error)
      }
    },
    normalizeRecords(payload) {
      const { list } = normalizeListResult(payload)
      if (list.length) return list
      if (payload?.data) {
        const data = payload.data
        return Array.isArray(data) ? data : [data]
      }
      if (Array.isArray(payload)) {
        return payload
      }
      return payload ? [payload] : []
    },
    updateMarkers(records) {
      const activeKeys = new Set()
      const visiblePositions = []
      records.forEach((record, index) => {
        const vehicle = this.normalizeVehicle(record, index)
        if (!vehicle) return
        activeKeys.add(vehicle.key)
        visiblePositions.push(vehicle.position)
        this.upsertMarker(vehicle)
      })
      this.pruneMarkers(activeKeys)
      if (!this.hasCentered && visiblePositions.length) {
        this.mapInstance.setCenter(visiblePositions[0])
        this.hasCentered = true
      }
      this.focusOnDevice()
      if (this.focusedDeviceNo) {
        const fallback = this.selectedDetail?.rawVehicle || this.selectedDetail?.rawRealtime || this.selectedDetail
        this.openInfoWindowForDevice(this.focusedDeviceNo, fallback)
      }
    },
    normalizeVehicle(record, index) {
      const lon = toFiniteNumber(record?.lon || record?.lng || record?.longitude)
      const lat = toFiniteNumber(record?.lat || record?.latitude)
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
      const key = extractDeviceKey(record) || `vehicle_${record?.id || record?.vehicle_id || index}`
      return {
        key,
        position: [lon, lat],
        record,
      }
    },
    upsertMarker(vehicle) {
      let marker = this.markers[vehicle.key]
      if (!marker) {
        marker = this.createMarker(vehicle.position)
        this.markers[vehicle.key] = marker
      } else {
        marker.setPosition(vehicle.position)
      }
      marker.setExtData?.(vehicle.record)
      this.updateMarkerTitle(marker, vehicle.record)
    },
    createMarker(position) {
      const marker = new this.AMap.Marker({
        position,
        map: this.mapInstance,
        icon: new this.AMap.Icon({
          size: new this.AMap.Size(30, 60),
          image: carIcon,
          imageSize: new this.AMap.Size(30, 60),
        }),
        offset: new this.AMap.Pixel(-15, -60),
        autoRotation: true,
        angle: 0,
      })
      marker.on?.('click', () => {
        const record = marker.getExtData?.()
        this.openInfoWindow(marker, record)
      })
      return marker
    },
    updateMarkerTitle(marker, record) {
      const title = this.buildMarkerTitle(record)
      if (title) {
        marker.setTitle?.(title)
      }
    },
    buildMarkerTitle(record) {
      const plate = record?.license_plate || record?.vehicle_name || record?.vehicleName || record?.name
      const unit = record?.unit_name || record?.unitName || record?.unit
      const type = record?.vehicle_type_name || record?.vehicleTypeName || record?.type_name || record?.type
      return [plate, unit, type].filter(Boolean).join(' | ')
    },
    focusOnDevice() {
      if (!this.focusedDeviceNo) return
      const marker = this.markers[this.focusedDeviceNo]
      if (!marker) return
      const position = marker.getPosition?.()
      if (position) {
        this.mapInstance.setCenter([position.lng, position.lat])
      }
    },
    openInfoWindowForDevice(deviceNo, fallbackRecord) {
      if (!deviceNo) return
      const marker = this.markers[deviceNo]
      if (marker) {
        const record = marker.getExtData?.() || fallbackRecord
        this.openInfoWindow(marker, record)
        return
      }
      if (!fallbackRecord || !this.mapInstance) return
      const lon = toFiniteNumber(fallbackRecord?.lon || fallbackRecord?.lng || fallbackRecord?.longitude)
      const lat = toFiniteNumber(fallbackRecord?.lat || fallbackRecord?.latitude)
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return
      this.ensureInfoWindow()
      const content = this.buildInfoWindowContent(fallbackRecord)
      if (!content || !this.infoWindow) return
      this.infoWindow.setContent(content)
      this.infoWindow.open(this.mapInstance, [lon, lat])
      this.mapInstance.setCenter([lon, lat])
    },
    ensureInfoWindow() {
      if (!this.AMap || !this.mapInstance) return
      if (this.infoWindow) return
      this.infoWindow = new this.AMap.InfoWindow({
        offset: new this.AMap.Pixel(0, -60),
        closeWhenClickMap: true,
        autoMove: true,
      })
    },
    openInfoWindow(marker, record) {
      if (!marker || !record) return
      this.ensureInfoWindow()
      if (!this.infoWindow) return
      const content = this.buildInfoWindowContent(record)
      if (!content) return
      this.infoWindow.setContent(content)
      const position = marker.getPosition?.()
      if (position) {
        this.infoWindow.open(this.mapInstance, position)
      }
    },
    buildInfoWindowContent(record) {
      if (!record) return ''
      const escapeHtml = (value) =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
      const title = record?.license_plate || record?.vehicle_name || record?.device_no || record?.deviceNo || '车辆'
      const speedValue = record?.speed ?? record?.calculatedSpeed
      const rows = [
        { label: '车牌', value: record?.license_plate },
        { label: '类型', value: record?.vehicle_name },
        { label: '单位', value: record?.unit_name },
        { label: '类型', value: record?.vehicle_type_name },
        { label: '速度', value: Number.isFinite(speedValue) ? `${speedValue} km/h` : '' },
        { label: '时间', value: record?.timer || record?.ts || record?.updated_at },
      ].filter((row) => row.value !== undefined && row.value !== null && row.value !== '')
      const rowHtml = rows
        .map(
          (row) =>
            `<div style="display:flex;gap:8px;line-height:1.6;">` +
            `<div style="min-width:42px;color:#94a3b8;">${escapeHtml(row.label)}</div>` +
            `<div style="color:#e2e8f0;">${escapeHtml(row.value)}</div>` +
            `</div>`
        )
        .join('')
      return (
        `<div style="background:#0b1220;` +
        `padding:10px 12px;min-width:220px;` +
        `">` +
        `<div style="font-size:14px;font-weight:600;color:#ffffff;margin-bottom:6px;">${escapeHtml(title)}</div>` +
        `${rowHtml}` +
        `</div>`
      )
    },
    pruneMarkers(activeKeys) {
      Object.keys(this.markers).forEach((key) => {
        if (activeKeys.has(key)) return
        const marker = this.markers[key]
        marker?.setMap?.(null)
        marker?.destroy?.()
        delete this.markers[key]
      })
    },
    clearMarkers() {
      Object.keys(this.markers).forEach((key) => {
        const marker = this.markers[key]
        marker?.setMap?.(null)
        marker?.destroy?.()
      })
      this.markers = Object.create(null)
      this.infoWindow?.close?.()
    },
  },
}
</script>

<style scoped>
.panel {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.map {
  width: 100%;
  height: 100%;
}
</style>
