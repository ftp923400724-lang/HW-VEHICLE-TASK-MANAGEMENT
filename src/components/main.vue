<template>
  <div class="panel">
    <div ref="mapContainer" class="map"></div>
  </div>
</template>

<script>
window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }
import AMapLoader from '@amap/amap-jsapi-loader'
import carIcon from '@/assets/main/car.png'
import { normalizeListResult } from '@/api/http'
import { fetchRealtimeVehicles } from '@/api/vehicle'
import { extractDeviceKey, toFiniteNumber } from '@/utils/vehicle'
import { getTransferStationById } from '@/utils/transferStation'

const POLL_INTERVAL = 60000

export default {
  name: 'AppMain',
  data() {
    return {
      mapInstance: null,
      pollTimer: null,
      AMap: null,
      markers: Object.create(null),
      stationMarkers: Object.create(null),
      focusedDeviceNo: '',
      focusedStationId: '',
      hasCentered: false,
      infoWindow: null,
      selectedDetail: null,
      selectedStationDetail: null
    }
  },
  async mounted() {
    await this.initializeMap()
    this.startPolling()
    window.addEventListener('vehicle-selected', this.handleVehicleSelected)
    window.addEventListener('station-selected', this.handleStationSelected)
  },
  beforeUnmount() {
    this.teardownPolling()
    window.removeEventListener('vehicle-selected', this.handleVehicleSelected)
    window.removeEventListener('station-selected', this.handleStationSelected)
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
      this.focusedStationId = ''
      this.selectedStationDetail = null
      this.selectedDetail = detail
      this.focusOnDevice()
      this.openInfoWindowForDevice(this.focusedDeviceNo, detail?.rawVehicle || detail?.rawRealtime || detail)
    },
    handleStationSelected(event) {
      const detail = event?.detail || {}
      const stationId = detail?.stationId || detail?.id || detail?.code
      const station = this.resolveStationDetail(stationId, detail)
      if (!station) return
      this.focusedDeviceNo = ''
      this.selectedDetail = null
      this.focusedStationId = station.stationId
      this.selectedStationDetail = station
      this.upsertStationFromDetail(station)
      this.focusOnStation(station)
      this.openInfoWindowForStation(station)
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
      if (!this.hasCentered && visiblePositions.length) {
        this.mapInstance.setCenter(visiblePositions[0])
        this.hasCentered = true
      }
      if (this.focusedDeviceNo) {
        this.focusOnDevice()
        const fallback = this.selectedDetail?.rawVehicle || this.selectedDetail?.rawRealtime || this.selectedDetail
        this.openInfoWindowForDevice(this.focusedDeviceNo, fallback)
        return
      }
      if (this.focusedStationId) {
        const station = this.selectedStationDetail || this.buildStationDetail(this.focusedStationId)
        if (station) {
          this.focusOnStation(station)
          this.openInfoWindowForStation(station)
        }
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
    upsertStationFromDetail(detail) {
      if (!detail) return null
      const key = String(detail.stationId || detail.code || '').trim()
      const position = this.getStationPosition(detail)
      if (!key || !position) return null
      let marker = this.stationMarkers[key]
      if (!marker) {
        marker = this.createStationMarker(position, detail)
        this.stationMarkers[key] = marker
      } else {
        marker.setPosition(position)
      }
      marker.setExtData?.(detail)
      return marker
    },
    createStationMarker(position, detail) {
      const marker = new this.AMap.Marker({
        position,
        map: this.mapInstance,
        offset: new this.AMap.Pixel(-16, -16),
        content:
          '<div style="' +
          'width:32px;height:32px;border-radius:50%;' +
          'background:linear-gradient(135deg,#38bdf8,#1d4ed8);' +
          'border:2px solid rgba(255,255,255,0.85);' +
          'box-shadow:0 0 0 6px rgba(56,189,248,0.18);' +
          'display:flex;align-items:center;justify-content:center;' +
          'color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;' +
          '">站</div>'
      })
      marker.on?.('click', () => {
        const record = marker.getExtData?.() || detail
        this.openInfoWindowForStation(record)
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
    focusOnStation(station) {
      const position = this.getStationPosition(station)
      if (position) {
        this.mapInstance.setCenter(position)
      }
    },
    getStationPosition(station) {
      const lon = toFiniteNumber(station?.location?.lng ?? station?.lng ?? station?.longitude)
      const lat = toFiniteNumber(station?.location?.lat ?? station?.lat ?? station?.latitude)
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
      return [lon, lat]
    },
    resolveStationDetail(stationId, fallbackDetail = {}) {
      const station = getTransferStationById(stationId)
      if (!station) return null
      const traffic = fallbackDetail?.traffic || station.traffic
      return {
        stationId: station.id,
        stationName: station.name,
        code: station.code,
        remark: station.remark,
        platformCount: station.platformCount,
        location: {
          lng: station.lng,
          lat: station.lat
        },
        traffic,
        totalInbound: traffic?.totalInbound ?? station.traffic.totalInbound,
        totalOutbound: traffic?.totalOutbound ?? station.traffic.totalOutbound,
        peakHour: traffic?.peakHour ?? station.traffic.peakHour
      }
    },
    buildStationDetail(stationId) {
      return this.resolveStationDetail(stationId)
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
    openInfoWindowForStation(stationDetail) {
      if (!stationDetail) return
      this.ensureInfoWindow()
      if (!this.infoWindow) return
      const content = this.buildStationInfoWindowContent(stationDetail)
      const position = this.getStationPosition(stationDetail)
      if (!content || !position) return
      this.infoWindow.setContent(content)
      this.infoWindow.open(this.mapInstance, position)
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
    buildStationInfoWindowContent(stationDetail) {
      const escapeHtml = (value) =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
      const traffic = stationDetail?.traffic || {}
      const rows = [
        { label: '编码', value: stationDetail?.code },
        { label: '站点', value: stationDetail?.stationName },
        { label: '站台', value: stationDetail?.platformCount ? `${stationDetail.platformCount} 个` : '' },
        { label: '进站', value: Number.isFinite(traffic.totalInbound) ? `${traffic.totalInbound} 辆` : '' },
        { label: '出站', value: Number.isFinite(traffic.totalOutbound) ? `${traffic.totalOutbound} 辆` : '' },
        { label: '峰值', value: traffic.peakHour },
        { label: '备注', value: stationDetail?.remark }
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
        `padding:10px 12px;min-width:240px;` +
        `">` +
        `<div style="font-size:14px;font-weight:600;color:#ffffff;margin-bottom:6px;">${escapeHtml(stationDetail?.stationName || '中转站')}</div>` +
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
      Object.keys(this.stationMarkers).forEach((key) => {
        const marker = this.stationMarkers[key]
        marker?.setMap?.(null)
        marker?.destroy?.()
      })
      this.markers = Object.create(null)
      this.stationMarkers = Object.create(null)
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
