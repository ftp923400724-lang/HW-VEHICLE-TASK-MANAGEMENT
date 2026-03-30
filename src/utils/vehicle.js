export const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return NaN
  }
  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(num) ? num : NaN
}

export const normalizeGpsCoordinate = (value, axis = 'lon') => {
  const num = toFiniteNumber(value)
  if (!Number.isFinite(num)) return NaN
  const limit = axis === 'lat' ? 90 : 180
  if (Math.abs(num) <= limit) return num
  if (Math.abs(num) >= 1000) {
    const scaled = num / 10000000
    if (Math.abs(scaled) <= limit) return scaled
  }
  return num
}

export const extractDeviceKey = (record) => {
  if (!record) return ''
  const candidates = [
    record.device_no,
    record.deviceNo,
    record.hardware_id,
    record.hardwareId,
    record.uuid,
    record.device
  ]
  for (const value of candidates) {
    if (value === undefined || value === null) continue
    const normalized = String(value).trim()
    if (normalized) return normalized
  }
  return ''
}

export const hasValidCoordinates = (record) => {
  const lon = normalizeGpsCoordinate(record?.lon ?? record?.lng ?? record?.longitude, 'lon')
  const lat = normalizeGpsCoordinate(record?.lat ?? record?.latitude, 'lat')
  return Number.isFinite(lon) && Number.isFinite(lat)
}
