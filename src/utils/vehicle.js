export const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return NaN
  }
  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(num) ? num : NaN
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
  const lon = toFiniteNumber(record?.lon ?? record?.lng ?? record?.longitude)
  const lat = toFiniteNumber(record?.lat ?? record?.latitude)
  return Number.isFinite(lon) && Number.isFinite(lat)
}
