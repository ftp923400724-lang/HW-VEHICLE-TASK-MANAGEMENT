<template>
  <div class="panel">
    <div ref="mapContainer" class="map"></div>
    <div ref="markerOverlay" class="marker-overlay"></div>
  </div>
</template>

<script>
window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }
import AMapLoader from '@amap/amap-jsapi-loader'
import { normalizeListResult } from '@/api/http'
import { fetchRealtimeVehicles } from '@/api/vehicle'
import { extractDeviceKey, normalizeGpsCoordinate } from '@/utils/vehicle'
import ThreeVehicleMarkerLayer from '../../../shared/map-marker/threeVehicleMarkerLayer.js'

const POLL_INTERVAL = 60000

export default {
  name: 'AppMain',
  data() {
    return {
      mapInstance: null,
      pollTimer: null,
      AMap: null,
      markerLayer: null,
      markerStates: Object.create(null),
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
    handleVehicleSelected(event) {
      const detail = event?.detail || {}
      const deviceNo = detail?.deviceNo || detail?.device_no
      if (!deviceNo) return
      this.focusedDeviceNo = String(deviceNo)
      this.selectedDetail = detail
      this.syncFocusedMarker()
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
        const payload = await fetchRealtimeVehicles()
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
      this.syncFocusedMarker()
      if (!this.hasCentered && visiblePositions.length) {
        this.mapInstance.setCenter(visiblePositions[0])
        this.hasCentered = true
      }
      if (this.focusedDeviceNo) {
        this.focusOnDevice()
        const fallback = this.selectedDetail?.rawVehicle || this.selectedDetail?.rawRealtime || this.selectedDetail
        this.openInfoWindowForDevice(this.focusedDeviceNo, fallback)
      }
    },
    normalizeVehicle(record, index) {
      const lon = normalizeGpsCoordinate(record?.lon || record?.lng || record?.longitude, 'lon')
      const lat = normalizeGpsCoordinate(record?.lat || record?.latitude, 'lat')
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
      const key = extractDeviceKey(record) || `vehicle_${record?.id || record?.vehicle_id || index}`
      return {
        key,
        position: [lon, lat],
        record,
      }
    },
    upsertMarker(vehicle) {
      if (!vehicle?.key || !vehicle?.position) return
      this.markerStates[vehicle.key] = {
        key: vehicle.key,
        position: vehicle.position,
        record: vehicle.record,
      }
      const labelText = this.buildMarkerLabel(vehicle.record)
      this.markerLayer?.upsertMarker(vehicle.key, vehicle.position, vehicle.record, labelText)
    },
    buildMarkerLabel(record) {
      const formatText = (value) => String(value ?? '').replace(/[-_]/g, '·').trim()
      return (
        formatText(record?.license_plate) ||
        formatText(record?.vehicle_name) ||
        formatText(record?.vehicleName) ||
        formatText(record?.name) ||
        formatText(record?.device_no) ||
        formatText(record?.deviceNo) ||
        formatText(record?.point_name) ||
        formatText(record?.pointName) ||
        formatText(record?.location_name) ||
        formatText(record?.locationName) ||
        formatText(record?.site_name) ||
        formatText(record?.siteName) ||
        formatText(record?.poi_name) ||
        formatText(record?.poiName) ||
        '定位点名称'
      )
    },
    initMarkerLayer() {
      if (!this.mapInstance || !this.$refs.markerOverlay) return
      this.destroyMarkerLayer()
      this.markerLayer = new ThreeVehicleMarkerLayer({
        map: this.mapInstance,
        container: this.$refs.markerOverlay,
        onClick: this.handleMarkerClick,
      })
      this.syncFocusedMarker()
    },
    destroyMarkerLayer() {
      if (!this.markerLayer) return
      this.markerLayer.dispose()
      this.markerLayer = null
    },
    handleMarkerClick(deviceNo) {
      if (!deviceNo) return
      this.focusedDeviceNo = String(deviceNo)
      this.syncFocusedMarker()
      const state = this.markerStates[this.focusedDeviceNo]
      const record = state?.record || this.selectedDetail?.rawVehicle || this.selectedDetail?.rawRealtime || this.selectedDetail
      this.selectedDetail = record
      this.focusOnDevice()
      this.openInfoWindowForDevice(this.focusedDeviceNo, record)
    },
    syncFocusedMarker() {
      if (!this.markerLayer) return
      this.markerLayer.setFocusedKey(this.focusedDeviceNo)
    },
    focusOnDevice() {
      if (!this.focusedDeviceNo) return
      const markerState = this.markerStates[this.focusedDeviceNo]
      const position = markerState?.position
      if (position && this.mapInstance) {
        this.mapInstance.setCenter(position)
      }
    },
    openInfoWindowForDevice(deviceNo, fallbackRecord) {
      if (!deviceNo) return
      const markerState = this.markerStates[deviceNo]
      if (markerState) {
        const record = markerState.record || fallbackRecord
        this.openInfoWindow(markerState, record)
        return
      }
      if (!fallbackRecord || !this.mapInstance) return
      const lon = normalizeGpsCoordinate(fallbackRecord?.lon || fallbackRecord?.lng || fallbackRecord?.longitude, 'lon')
      const lat = normalizeGpsCoordinate(fallbackRecord?.lat || fallbackRecord?.latitude, 'lat')
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
        isCustom: true,
        offset: new this.AMap.Pixel(0, -60),
        closeWhenClickMap: true,
        autoMove: true,
      })
    },
    openInfoWindow(markerState, record) {
      if (!markerState || !record) return
      this.ensureInfoWindow()
      if (!this.infoWindow) return
      const content = this.buildInfoWindowContent(record)
      if (!content) return
      this.infoWindow.setContent(content)
      const position = markerState.position
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
        `<div style="position:relative;min-width:220px;max-width:260px;padding:10px 10px 9px;border-radius:14px;` +
        `background:linear-gradient(180deg, rgba(10,18,34,0.98), rgba(4,10,20,0.98));` +
        `border:1px solid rgba(96,165,250,0.22);` +
        `box-shadow:0 18px 40px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.03);` +
        `backdrop-filter:blur(6px);` +
        `">` +
        `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;">` +
        `<div style="min-width:0;">` +
        `<div style="font-size:13px;font-weight:700;color:#f4f9ff;letter-spacing:0.4px;line-height:1.2;">${escapeHtml(title)}</div>` +
        `<div style="margin-top:3px;font-size:11px;color:#7f93ab;">实时车辆定位与状态信息</div>` +
        `</div>` +
        `<div style="flex-shrink:0;padding:3px 8px;border-radius:999px;border:1px solid rgba(55, 210, 138, 0.28);background:rgba(55, 210, 138, 0.12);color:#37d28a;font-size:11px;line-height:1;">在线</div>` +
        `</div>` +
        `${rowHtml}` +
        `</div>`
      )
    },
    pruneMarkers(activeKeys) {
      Object.keys(this.markerStates).forEach((key) => {
        if (activeKeys.has(key)) return
        this.markerLayer?.removeMarker(key)
        delete this.markerStates[key]
      })
    },
    clearMarkers() {
      Object.keys(this.markerStates).forEach((key) => {
        this.markerLayer?.removeMarker(key)
      })
      this.markerStates = Object.create(null)
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
}
</style>
