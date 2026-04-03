import * as THREE from 'three'
import { createAlarmMarkerBadge } from '@/utils/alarmMarkerBadge'

const DEFAULT_THEME = {
  online: {
    variant: 'online',
    accent: '#37d28a',
    glow: 'rgba(55, 210, 138, 0.42)',
    ripple: 'rgba(55, 210, 138, 0.24)',
    surface: 'rgba(55, 210, 138, 0.1)',
    trail: 'rgba(55, 210, 138, 0.22)',
  },
  offline: {
    variant: 'offline',
    accent: '#7f8a9d',
    glow: 'rgba(127, 138, 157, 0.28)',
    ripple: 'rgba(127, 138, 157, 0.16)',
    surface: 'rgba(127, 138, 157, 0.08)',
    trail: 'rgba(127, 138, 157, 0.18)',
  },
  warning: {
    variant: 'warning',
    alarmLevel: 'warning',
    accent: '#ffb020',
    glow: 'rgba(255, 176, 32, 0.42)',
    ripple: 'rgba(255, 176, 32, 0.3)',
    surface: 'rgba(255, 176, 32, 0.1)',
    trail: 'rgba(255, 176, 32, 0.24)',
  },
  danger: {
    variant: 'danger',
    alarmLevel: 'danger',
    accent: '#ff4d4f',
    glow: 'rgba(255, 77, 79, 0.55)',
    ripple: 'rgba(255, 77, 79, 0.36)',
    surface: 'rgba(255, 77, 79, 0.12)',
    trail: 'rgba(255, 77, 79, 0.28)',
  },
}

const LABEL_FONT = '700 24px SourceHanSansCN, PingFang SC, Microsoft YaHei, sans-serif'
const ONLINE_THRESHOLD_MINUTES = 5
const OFFLINE_ABNORMAL_THRESHOLD_MINUTES = 30 * 24 * 60

function normalizeTimestamp(value) {
  if (value === undefined || value === null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const raw = typeof value === 'string' ? value.trim() : value
  const numeric = Number(raw)
  if (Number.isFinite(numeric)) {
    const millis = numeric < 1e12 ? numeric * 1000 : numeric
    const date = new Date(millis)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function extractVehicleTimestamp(record) {
  const candidates = [record?.timer, record?.received_at, record?.updated_at, record?.created_at, record?.ts]
  for (const value of candidates) {
    const date = normalizeTimestamp(value)
    if (date) return date
  }
  return null
}

function resolveStatusFromTimestamp(record) {
  const timestamp = extractVehicleTimestamp(record)
  if (!timestamp) return ''
  const diffMinutes = (Date.now() - timestamp.getTime()) / 60000
  if (diffMinutes >= OFFLINE_ABNORMAL_THRESHOLD_MINUTES) return 'abnormal'
  if (diffMinutes > ONLINE_THRESHOLD_MINUTES) return 'offline'
  return 'online'
}

export function resolveVehicleStatusKey(record = {}) {
  const candidates = [
    record?.statusKey,
    record?.status_key,
    record?.dispatchStatus,
    record?.dispatch_status,
    record?.status_text,
    record?.statusText,
    record?.status,
    record?.online_status,
    record?.onlineStatus,
    record?.device_status,
    record?.deviceStatus,
  ]

  for (const value of candidates) {
    const normalized = String(value ?? '').trim().toLowerCase()
    if (!normalized) continue
    if (['online', 'offline', 'abnormal'].includes(normalized)) return normalized
    if (['alarm', 'warning', 'danger', 'critical', 'red'].includes(normalized)) return 'abnormal'
    if (normalized.includes('异常') || normalized.includes('abnormal')) return 'abnormal'
    if (normalized.includes('离线') || normalized.includes('offline') || normalized.includes('disabled')) return 'offline'
    if (normalized.includes('在线') || normalized.includes('online') || normalized.includes('normal')) return 'online'
  }

  if (record?.alarm || record?.is_alarm || record?.alarm_enabled || record?.alarmEnabled) {
    return 'abnormal'
  }

  const timestampStatus = resolveStatusFromTimestamp(record)
  if (timestampStatus) return timestampStatus

  const onlineValue =
    record?.is_online ??
    record?.isOnline ??
    record?.online ??
    record?.online_status ??
    record?.onlineStatus ??
    record?.device_status ??
    record?.deviceStatus
  if (
    onlineValue === 1 ||
    onlineValue === '1' ||
    onlineValue === 0 ||
    onlineValue === '0' ||
    onlineValue === false ||
    String(onlineValue).toLowerCase() === 'offline' ||
    String(onlineValue).toLowerCase() === 'disabled'
  ) {
    return 'offline'
  }
  if (onlineValue === true || String(onlineValue).toLowerCase() === 'online' || String(onlineValue).toLowerCase() === 'enabled') {
    return 'online'
  }

  return 'online'
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function createRoundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function createTrianglePath(ctx, size) {
  const top = size * 0.07
  const left = size * 0.19
  const right = size * 0.81
  const bottom = size * 0.88
  const midX = size * 0.5
  const tailY = size * 0.57

  ctx.beginPath()
  ctx.moveTo(midX, top)
  ctx.lineTo(right, tailY)
  ctx.quadraticCurveTo(size * 0.67, size * 0.63, size * 0.62, size * 0.77)
  ctx.lineTo(size * 0.545, bottom)
  ctx.quadraticCurveTo(midX, size * 0.97, size * 0.455, bottom)
  ctx.lineTo(size * 0.38, size * 0.77)
  ctx.quadraticCurveTo(size * 0.33, size * 0.63, left, tailY)
  ctx.closePath()
}

function createTriangleShape(size) {
  const shape = new THREE.Shape()
  const top = size * 0.07
  const left = size * 0.19
  const right = size * 0.81
  const bottom = size * 0.88
  const midX = size * 0.5
  const tailY = size * 0.57

  shape.moveTo(midX, top)
  shape.lineTo(right, tailY)
  shape.quadraticCurveTo(size * 0.67, size * 0.63, size * 0.62, size * 0.77)
  shape.lineTo(size * 0.545, bottom)
  shape.quadraticCurveTo(midX, size * 0.97, size * 0.455, bottom)
  shape.lineTo(size * 0.38, size * 0.77)
  shape.quadraticCurveTo(size * 0.33, size * 0.63, left, tailY)
  shape.closePath()
  return shape
}

function resolvePoint(point) {
  if (!point) return null
  if (Array.isArray(point)) {
    const [x, y] = point
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  }
  const x = point.x ?? point.lng ?? point.lon
  const y = point.y ?? point.lat
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === '') return NaN
  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(num) ? num : NaN
}

function readNumber(record, keys) {
  for (const key of keys) {
    const value = toFiniteNumber(record?.[key])
    if (Number.isFinite(value)) return value
  }
  return NaN
}

function readBoolean(record, keys) {
  for (const key of keys) {
    const value = record?.[key]
    if (value === true || value === 1 || value === '1') return true
    if (value === false || value === 0 || value === '0') return false
  }
  return null
}

function normalizeHeading(deg) {
  if (!Number.isFinite(deg)) return 0
  const normalized = deg % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function computeBearing(from, to) {
  if (!from || !to) return NaN
  const fromLon = toFiniteNumber(from[0])
  const fromLat = toFiniteNumber(from[1])
  const toLon = toFiniteNumber(to[0])
  const toLat = toFiniteNumber(to[1])
  if (![fromLon, fromLat, toLon, toLat].every(Number.isFinite)) return NaN
  const phi1 = (fromLat * Math.PI) / 180
  const phi2 = (toLat * Math.PI) / 180
  const deltaLambda = ((toLon - fromLon) * Math.PI) / 180
  const y = Math.sin(deltaLambda) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)
  return normalizeHeading((Math.atan2(y, x) * 180) / Math.PI)
}

function distanceBetween(a, b) {
  if (!a || !b) return Infinity
  const ax = toFiniteNumber(a[0])
  const ay = toFiniteNumber(a[1])
  const bx = toFiniteNumber(b[0])
  const by = toFiniteNumber(b[1])
  if (![ax, ay, bx, by].every(Number.isFinite)) return Infinity
  return Math.hypot(ax - bx, ay - by)
}

export default class ThreeVehicleMarkerLayer {
  constructor(options = {}) {
    this.map = options.map || null
    this.overlayContainer = options.container || null
    this.onClick = typeof options.onClick === 'function' ? options.onClick : null
    this.markers = Object.create(null)
    this.focusedKey = ''
    this.scene = null
    this.camera = null
    this.renderer = null
    this.root = null
    this.width = 0
    this.height = 0
    this._running = false
    this._rafId = 0
    this._lastTime = 0
    this._viewportDirty = true
    this._mapContainer = null
    this._resizeObserver = null

    this._onMapClick = this._onMapClick.bind(this)
    this._onViewportChange = this._onViewportChange.bind(this)
    this._animate = this._animate.bind(this)

    this._init()
  }

  _init() {
    if (!this.map || !this.overlayContainer || typeof document === 'undefined') return
    this._mapContainer = typeof this.map.getContainer === 'function' ? this.map.getContainer() : null

    this.root = document.createElement('div')
    this.root.className = 'three-marker-layer'
    Object.assign(this.root.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: '3',
    })

    this.overlayContainer.appendChild(this.root)

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000)
    this.camera.position.z = 10

    const ambient = new THREE.AmbientLight(0xffffff, 1.15)
    const hemisphere = new THREE.HemisphereLight(0xcfe8ff, 0x09111f, 1.05)
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.65)
    frontLight.position.set(0.35, -0.7, 1.1)
    const rimLight = new THREE.DirectionalLight(0x6cc4ff, 0.55)
    rimLight.position.set(-0.6, 0.4, 0.8)

    this.scene.add(ambient)
    this.scene.add(hemisphere)
    this.scene.add(frontLight)
    this.scene.add(rimLight)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    })
    this.renderer.setPixelRatio(window.devicePixelRatio || 1)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.pointerEvents = 'none'
    this.root.appendChild(this.renderer.domElement)

    this._bindMapEvents()
    this._bindResizeObserver()
    this._resize()
    this._running = true
    this._rafId = window.requestAnimationFrame(this._animate)
  }

  _bindMapEvents() {
    if (!this.map) return
    ;['move', 'zoomchange', 'resize', 'complete', 'mapmove', 'moveend'].forEach((eventName) => {
      try {
        this.map.on?.(eventName, this._onViewportChange)
      } catch (error) {
        // ignore unsupported event names on some AMap builds
      }
    })
    if (this._mapContainer) {
      this._mapContainer.addEventListener('click', this._onMapClick, true)
    }
  }

  _bindResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return
    const targets = [this.overlayContainer, this._mapContainer].filter(Boolean)
    if (!targets.length) return
    this._resizeObserver = new ResizeObserver(() => {
      this._resize()
      this._viewportDirty = true
    })
    targets.forEach((target) => this._resizeObserver.observe(target))
  }

  _onViewportChange() {
    this._viewportDirty = true
  }

  _onMapClick(event) {
    if (!this._mapContainer || !this.onClick) return
    const rect = this._mapContainer.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const hit = this._findHitMarker(x, y)
    if (hit) {
      this.onClick(hit.key, hit.record)
    }
  }

  _findHitMarker(x, y) {
    let closest = null
    let closestDistance = Infinity
    Object.keys(this.markers).forEach((key) => {
      const marker = this.markers[key]
      if (!marker.visible) return
      const distance = Math.hypot(x - marker.hitX, y - marker.hitY)
      if (distance > marker.hitRadius || distance >= closestDistance) return
      closest = marker
      closestDistance = distance
    })
    return closest
  }

  _resize() {
    if (!this.renderer || !this.overlayContainer) return
    const rect = this.overlayContainer.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    if (width === this.width && height === this.height) return
    this.width = width
    this.height = height
    this.camera.left = 0
    this.camera.right = width
    this.camera.top = 0
    this.camera.bottom = height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  _animate(time) {
    if (!this._running) return
    const delta = this._lastTime ? Math.min((time - this._lastTime) / 1000, 0.05) : 0
    this._lastTime = time

    if (this._viewportDirty) {
      this.syncAll()
      this._viewportDirty = false
    }

    this._updateAnimations(time / 1000, delta)
    this.renderer?.render(this.scene, this.camera)
    this._rafId = window.requestAnimationFrame(this._animate)
  }

  _updateAnimations(time, delta) {
    Object.keys(this.markers).forEach((key) => {
      const marker = this.markers[key]
      const selectedScale = marker.selected ? 1.14 : 1
      const movingPulse = marker.moving ? 1 + Math.sin(time * 4.2 + marker.phase) * 0.05 : 1
      const alarmPulse = marker.alarm.enabled ? 1 + Math.sin(time * 6.4 + marker.phase) * 0.05 : 1

      marker.group.scale.setScalar(selectedScale)
      marker.icon.scale.setScalar(movingPulse * alarmPulse)
      marker.iconGlow.scale.setScalar(marker.moving ? 1.04 : 1)
      marker.shadow.scale.setScalar(marker.moving ? 1.03 : 1)
      marker.haloGlow.scale.setScalar(marker.moving ? movingPulse * 1.03 : 0.98)
      marker.motionRing.scale.setScalar(marker.moving ? movingPulse * 1.02 : 0.98)
      marker.motionRing.material.opacity = marker.moving ? (marker.alarm.enabled ? 0.2 : 0.14) : 0.08
      marker.forwardLine.material.opacity = marker.moving ? (marker.alarm.enabled ? 0.78 : 0.9) : 0.16
      marker.forwardLine.scale.setScalar(marker.moving ? 1 : 0.6)
      marker.forwardLine.visible = marker.moving || marker.alarm.enabled

      if (!marker.alarm.enabled) {
        marker.ripple1.material.opacity = 0
        marker.ripple2.material.opacity = 0
        marker.ripple1.scale.setScalar(1)
        marker.ripple2.scale.setScalar(1)
        return
      }

      this._animateRipple(marker.ripple1, time, marker.alarm.speed, marker.alarm.maxScale, marker.alarm.opacity, 0)
      this._animateRipple(marker.ripple2, time, marker.alarm.speed, marker.alarm.maxScale, marker.alarm.opacity, 0.7)
    })
  }

  _animateRipple(mesh, time, speed, maxScale, maxOpacity, offset) {
    const cycle = 1.8 / clamp(speed || 1, 0.2, 3)
    const t = ((time + offset) % cycle) / cycle
    const scale = 1 + t * (maxScale - 1)
    mesh.scale.setScalar(scale)
    mesh.material.opacity = maxOpacity * (1 - t)
  }

  _resolveMarkerState(record, previousPosition, currentPosition, previousHeading = 0) {
    const alarm = this._resolveAlarmState(record)
    const moving = this._resolveMovingState(record, previousPosition, currentPosition)
    const headingDeg = this._resolveHeadingState(record, previousPosition, currentPosition, previousHeading)
    const statusKey = resolveVehicleStatusKey(record)
    const offline = statusKey === 'offline' || this._resolveOfflineState(record)

    if (statusKey === 'abnormal' || alarm.enabled) {
      return {
        theme: alarm.level === 'danger' ? DEFAULT_THEME.danger : DEFAULT_THEME.warning,
        headingDeg,
        moving,
        alarm,
        variant: alarm.level === 'danger' ? 'danger' : 'warning',
        statusKey: 'abnormal',
      }
    }

    if (offline) {
      return {
        theme: DEFAULT_THEME.offline,
        headingDeg,
        moving: false,
        alarm,
        variant: 'offline',
        statusKey: 'offline',
      }
    }

    return {
      theme: DEFAULT_THEME.online,
      headingDeg,
      moving,
      alarm,
      variant: 'online',
      statusKey: 'online',
    }
  }

  _resolveAlarmState(record) {
    const alarmLevel = String(
      record?.alarm_level ??
        record?.alarmLevel ??
        record?.alarm_type ??
        record?.alarmType ??
        record?.warning_level ??
        record?.warningLevel ??
        record?.level ??
        ''
    )
      .trim()
      .toLowerCase()

    const alarmEnabled =
      readBoolean(record, [
        'alarm',
        'is_alarm',
        'alarm_enabled',
        'alarmEnabled',
        'warning',
        'danger',
        'is_warning',
        'is_danger',
      ]) ?? false

    if (!alarmEnabled && !['alarm', 'warning', 'danger', 'critical', 'red'].includes(alarmLevel)) {
      return {
        enabled: false,
        level: '',
        speed: 1.4,
        maxScale: 3.2,
        opacity: 0.72,
      }
    }

    const level = ['danger', 'critical', 'red'].includes(alarmLevel) ? 'danger' : 'warning'
    return {
      enabled: true,
      level,
      speed: level === 'danger' ? 1.05 : 1.35,
      maxScale: level === 'danger' ? 3.6 : 3.0,
      opacity: level === 'danger' ? 0.78 : 0.68,
    }
  }

  _resolveOfflineState(record) {
    const onlineValue =
      record?.is_online ??
      record?.isOnline ??
      record?.online_status ??
      record?.onlineStatus ??
      record?.online ??
      record?.status ??
      record?.device_status ??
      record?.deviceStatus
    return (
      onlineValue === 0 ||
      onlineValue === '0' ||
      onlineValue === false ||
      String(onlineValue).toLowerCase() === 'offline' ||
      String(onlineValue).toLowerCase() === 'disabled'
    )
  }

  _resolveMovingState(record, previousPosition, currentPosition) {
    const movingFlag =
      readBoolean(record, ['moving', 'is_moving', 'isMoving', 'move_status', 'moveStatus', 'in_motion']) ?? null
    if (movingFlag !== null) return movingFlag

    const speed = readNumber(record, ['speed', 'calculatedSpeed', 'gps_speed', 'gpsSpeed', 'velocity', 'velocity_kmh'])
    if (Number.isFinite(speed)) return speed > 0.6

    if (previousPosition && currentPosition) {
      return distanceBetween(previousPosition, currentPosition) > 0.00003
    }

    return false
  }

  _resolveHeadingState(record, previousPosition, currentPosition, fallbackHeading = 0) {
    const directHeading = readNumber(record, [
      'heading',
      'heading_deg',
      'headingDeg',
      'direction',
      'direction_deg',
      'directionDeg',
      'angle',
      'bearing',
      'course',
      'course_angle',
    ])
    if (Number.isFinite(directHeading)) return normalizeHeading(directHeading)

    const derivedHeading = computeBearing(previousPosition, currentPosition)
    if (Number.isFinite(derivedHeading)) return derivedHeading

    return normalizeHeading(fallbackHeading)
  }

  _createMarkerObject(key, position, record, labelText) {
    const resolved = this._resolveMarkerState(record, null, position, 0)
    const theme = resolved.theme
    const group = new THREE.Group()
    group.position.set(0, 0, 0)

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(24, 48),
      new THREE.MeshBasicMaterial({
        color: theme.surface,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })
    )
    shadow.position.set(0, 13, -0.4)

    const haloGlow = new THREE.Mesh(
      new THREE.CircleGeometry(31, 64),
      new THREE.MeshBasicMaterial({
        color: theme.accent,
        transparent: true,
        opacity: 0.05,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    haloGlow.position.set(0, 13, 0.03)

    const motionRing = new THREE.Mesh(
      new THREE.RingGeometry(20, 21.6, 96),
      new THREE.MeshBasicMaterial({
        color: theme.accent,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    )
    motionRing.position.set(0, 13, 0.08)

    const forwardLine = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 15),
      new THREE.MeshBasicMaterial({
        color: theme.accent,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      })
    )
    forwardLine.position.set(0, -7, 0.06)
    forwardLine.visible = false

    const icon = this._createTriangleIcon(theme)
    icon.position.set(0, -2, 0.25)

    const iconGlow = new THREE.Mesh(
      new THREE.CircleGeometry(20, 48),
      new THREE.MeshBasicMaterial({
        color: theme.accent,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    iconGlow.position.set(0, -2, 0.04)

    const ripple1 = new THREE.Mesh(
      new THREE.RingGeometry(18, 26, 64),
      new THREE.MeshBasicMaterial({
        color: theme.ripple,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    )
    ripple1.position.set(0, 12, 0.01)

    const ripple2 = new THREE.Mesh(
      new THREE.RingGeometry(18, 26, 64),
      new THREE.MeshBasicMaterial({
        color: theme.ripple,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    )
    ripple2.position.set(0, 12, 0.005)

    const label = this._createLabelSprite(labelText || '定位点名称', theme)
    this.root?.appendChild(label.el)

    group.add(shadow)
    group.add(haloGlow)
    group.add(motionRing)
    group.add(iconGlow)
    group.add(icon)
    group.add(forwardLine)
    group.add(ripple1)
    group.add(ripple2)

    const marker = {
      key,
      group,
      shadow,
      haloGlow,
      motionRing,
      icon,
      iconGlow,
      forwardLine,
      ripple1,
      ripple2,
      label,
      labelState: {
        text: labelText || '定位点名称',
        variant: theme.variant || 'online',
        glow: theme.glow,
      },
      position: position ? [...position] : [0, 0],
      previousPosition: null,
      record,
      labelText,
      selected: false,
      theme,
      visible: true,
      hitRadius: 42,
      hitX: 0,
      hitY: 0,
      headingDeg: resolved.headingDeg,
      moving: resolved.moving,
      alarm: resolved.alarm,
      renderVariant: resolved.variant,
      phase: Math.random() * Math.PI * 2,
    }

    this._applyTheme(marker, theme)
    this.scene.add(group)
    return marker
  }

  _createTriangleIcon(theme) {
    const group = new THREE.Group()
    group.renderOrder = 30

    const bodyShape = createTriangleShape(30)
    const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 9,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 1.1,
      bevelThickness: 1.2,
      curveSegments: 8,
      steps: 1,
    })
    bodyGeometry.center()
    bodyGeometry.rotateX(-0.22)

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.accent).lerp(new THREE.Color('#67c1ff'), 0.12),
      emissive: theme.accent,
      emissiveIntensity: 0.46,
      metalness: 0.08,
      roughness: 0.22,
      transparent: true,
      opacity: 0.97,
    })
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
    bodyMesh.position.z = 0.16
    bodyMesh.renderOrder = 30

    const coreShape = createTriangleShape(22)
    const coreGeometry = new THREE.ShapeGeometry(coreShape)
    coreGeometry.center()
    coreGeometry.rotateX(-0.22)

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.accent).lerp(new THREE.Color('#ffffff'), 0.3),
      emissive: new THREE.Color(theme.accent),
      emissiveIntensity: 0.76,
      metalness: 0.02,
      roughness: 0.12,
      transparent: true,
      opacity: 0.96,
    })
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial)
    coreMesh.position.z = 4.35
    coreMesh.renderOrder = 31

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    })
    const edgeGeometry = new THREE.EdgesGeometry(bodyGeometry, 24)
    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial)
    edgeLines.position.z = 0.22
    edgeLines.renderOrder = 32

    group.add(bodyMesh)
    group.add(coreMesh)
    group.add(edgeLines)
    group.userData.bodyMesh = bodyMesh
    group.userData.coreMesh = coreMesh
    group.userData.edgeLines = edgeLines
    group.userData.bodyGeometry = bodyGeometry
    group.userData.coreGeometry = coreGeometry
    return group
  }

  _createLabelSprite(text, theme) {
    return createAlarmMarkerBadge({
      text: text || '定位点名称',
      variant: theme.variant || 'online',
      glow: theme.glow,
    })
  }

  _updateLabel(marker, labelText, theme) {
    if (!marker.label) return
    const text = labelText || '定位点名称'
    const currentState = marker.label.state || {}
    if (currentState.text === text && currentState.variant === theme.variant && currentState.glow === theme.glow) {
      return
    }
    marker.label.update({
      text,
      variant: theme.variant || 'online',
      glow: theme.glow,
    })
  }

  _applyTheme(marker, theme) {
    const accent = new THREE.Color(theme.accent)
    const glowOpacity = theme.variant === 'online' ? 0.12 : theme.variant === 'offline' ? 0.08 : 0.18

    marker.shadow.material.color.copy(accent)
    marker.shadow.material.opacity = theme.variant === 'offline' ? 0.28 : glowOpacity
    marker.haloGlow.material.color.copy(accent)
    marker.haloGlow.material.opacity = theme.variant === 'offline' ? 0.03 : theme.variant === 'online' ? 0.06 : 0.07
    marker.motionRing.material.color.copy(accent)
    marker.motionRing.material.opacity = marker.moving ? 0.16 : 0.08
    marker.iconGlow.material.color.copy(accent)
    marker.iconGlow.material.opacity = theme.variant === 'offline' ? 0.08 : theme.variant === 'online' ? 0.16 : 0.14
    marker.forwardLine.material.color.copy(accent)
    marker.ripple1.material.color.copy(accent)
    marker.ripple2.material.color.copy(accent)
    if (marker.icon?.userData?.bodyMesh?.material) {
      marker.icon.userData.bodyMesh.material.color.copy(new THREE.Color(theme.accent).lerp(new THREE.Color('#67c1ff'), 0.12))
      marker.icon.userData.bodyMesh.material.emissive.copy(accent)
      marker.icon.userData.bodyMesh.material.emissiveIntensity = theme.variant === 'danger' ? 0.72 : theme.variant === 'warning' ? 0.56 : 0.5
      marker.icon.userData.bodyMesh.material.opacity = theme.variant === 'offline' ? 0.78 : 0.97
    }
    if (marker.icon?.userData?.coreMesh?.material) {
      const coreColor = new THREE.Color(theme.accent).lerp(new THREE.Color('#ffffff'), 0.3)
      marker.icon.userData.coreMesh.material.color.copy(coreColor)
      marker.icon.userData.coreMesh.material.emissive.copy(accent)
      marker.icon.userData.coreMesh.material.emissiveIntensity = theme.variant === 'danger' ? 0.92 : 0.8
      marker.icon.userData.coreMesh.material.opacity = theme.variant === 'offline' ? 0.86 : 0.96
    }
    if (marker.icon?.userData?.edgeLines?.material) {
      marker.icon.userData.edgeLines.material.color.copy(accent)
      marker.icon.userData.edgeLines.material.opacity = theme.variant === 'offline' ? 0.16 : 0.3
    }
    marker.alarm.enabled = marker.alarm.enabled || theme.variant === 'warning' || theme.variant === 'danger'
    marker.alarm.level = marker.alarm.level || (theme.variant === 'danger' ? 'danger' : theme.variant === 'warning' ? 'warning' : '')
    marker.alarm.opacity = marker.alarm.opacity || (theme.variant === 'danger' ? 0.78 : 0.68)
    marker.alarm.speed = marker.alarm.speed || (theme.variant === 'danger' ? 1.05 : 1.35)
    marker.alarm.maxScale = marker.alarm.maxScale || (theme.variant === 'danger' ? 3.6 : 3.0)
  }

  _syncMarker(marker) {
    const point = resolvePoint(this.map?.lngLatToContainer?.(marker.position))
    if (!point) {
      marker.visible = false
      marker.group.visible = false
      return
    }

    marker.visible = true
    marker.group.visible = true
    marker.group.position.set(point.x, point.y, 0)
    marker.group.rotation.z = THREE.MathUtils.degToRad(marker.headingDeg || 0)
    marker.hitX = point.x
    marker.hitY = point.y

    const selectedScale = marker.selected ? 1.14 : 1
    marker.group.scale.setScalar(selectedScale)

    const inside = point.x >= -100 && point.x <= this.width + 100 && point.y >= -160 && point.y <= this.height + 100
    marker.group.visible = inside
    if (marker.label) {
      marker.label.el.style.display = inside ? 'block' : 'none'
      marker.label.el.style.left = `${point.x}px`
      marker.label.el.style.top = `${point.y}px`
      marker.label.el.style.transform = 'translate(-50%, 30px)'
    }

    const state = this._resolveMarkerState(marker.record, marker.previousPosition, marker.position, marker.headingDeg)
    const theme = state.theme
    marker.theme = theme
    marker.headingDeg = state.headingDeg
    marker.moving = state.moving
    marker.alarm = state.alarm
    marker.renderVariant = state.variant
    this._applyTheme(marker, theme)
    this._updateLabel(marker, marker.labelText || '定位点名称', theme)
    marker.previousPosition = [...marker.position]
  }

  upsertMarker(key, position, record, labelText = '') {
    if (!key || !position) return
    const normalizedPosition = Array.isArray(position) ? [...position] : [position[0], position[1]]
    const existing = this.markers[key]
    if (!existing) {
      this.markers[key] = this._createMarkerObject(key, normalizedPosition, record, labelText)
    } else {
      existing.previousPosition = [...existing.position]
      existing.position = normalizedPosition
      existing.record = record
      existing.labelText = labelText
      const state = this._resolveMarkerState(record, existing.previousPosition, normalizedPosition, existing.headingDeg)
      existing.headingDeg = state.headingDeg
      existing.moving = state.moving
      existing.alarm = state.alarm
      existing.renderVariant = state.variant
      existing.theme = state.theme
    }
    const marker = this.markers[key]
    marker.selected = key === this.focusedKey
    this._syncMarker(marker)
  }

  setFocusedKey(key = '') {
    this.focusedKey = key ? String(key) : ''
    Object.keys(this.markers).forEach((markerKey) => {
      const marker = this.markers[markerKey]
      marker.selected = markerKey === this.focusedKey
      this._syncMarker(marker)
    })
  }

  removeMarker(key) {
    const marker = this.markers[key]
    if (!marker) return
    this.scene?.remove(marker.group)
    marker.label?.destroy?.()
    marker.label?.el?.remove?.()

    const disposeMaterial = (material) => {
      if (!material) return
      if (material.map) material.map.dispose?.()
      material.dispose?.()
    }

    marker.group.traverse((object) => {
      if (object.geometry) object.geometry.dispose?.()
      if (object.material) disposeMaterial(object.material)
    })

    delete this.markers[key]
  }

  syncAll() {
    this._resize()
    Object.keys(this.markers).forEach((key) => {
      this._syncMarker(this.markers[key])
    })
  }

  renderNow() {
    if (!this.renderer || !this.scene || !this.camera) return
    this.renderer.render(this.scene, this.camera)
  }

  clear() {
    Object.keys(this.markers).forEach((key) => this.removeMarker(key))
  }

  dispose() {
    this._running = false
    if (this._rafId) {
      window.cancelAnimationFrame(this._rafId)
      this._rafId = 0
    }

    if (this._mapContainer) {
      this._mapContainer.removeEventListener('click', this._onMapClick, true)
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect()
      this._resizeObserver = null
    }

    if (this.map) {
      ;['move', 'zoomchange', 'resize', 'complete', 'mapmove', 'moveend'].forEach((eventName) => {
        try {
          this.map.off?.(eventName, this._onViewportChange)
        } catch (error) {
          // ignore unsupported event names on some AMap builds
        }
      })
    }

    this.clear()

    if (this.renderer) {
      this.renderer.dispose()
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
      }
      this.renderer = null
    }

    if (this.root?.parentNode) {
      this.root.parentNode.removeChild(this.root)
    }
    this.root = null
    this.scene = null
    this.camera = null
  }
}
