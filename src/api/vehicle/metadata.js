import { requestJson } from '@/api/http'

const UNIT_INDEX_PATH = import.meta.env.VITE_VEHICLE_UNIT_PATH || '/VehicleUnit/index'
const UNIT_SAVE_PATH = import.meta.env.VITE_VEHICLE_UNIT_SAVE_PATH || '/VehicleUnit/save'
const UNIT_UPDATE_PATH = import.meta.env.VITE_VEHICLE_UNIT_UPDATE_PATH || '/VehicleUnit/update'
const UNIT_DELETE_PATH = import.meta.env.VITE_VEHICLE_UNIT_DELETE_PATH || '/VehicleUnit/delete'

const TYPE_INDEX_PATH = import.meta.env.VITE_VEHICLE_TYPE_PATH || '/VehicleType/index'
const TYPE_SAVE_PATH = import.meta.env.VITE_VEHICLE_TYPE_SAVE_PATH || '/VehicleType/save'
const TYPE_UPDATE_PATH = import.meta.env.VITE_VEHICLE_TYPE_UPDATE_PATH || '/VehicleType/update'
const TYPE_DELETE_PATH = import.meta.env.VITE_VEHICLE_TYPE_DELETE_PATH || '/VehicleType/delete'

const PERMISSION_GROUP_INDEX_PATH =
  import.meta.env.VITE_PERMISSION_GROUPS_PATH || '/PermissionGroup/index'
const DEVICE_BINDING_INDEX_PATH =
  import.meta.env.VITE_DEVICE_BINDING_PATH || '/DeviceBinding/index'

export const fetchVehicleUnits = (params = {}) =>
  requestJson(UNIT_INDEX_PATH, { params })

export const createVehicleUnit = (payload = {}) =>
  requestJson(UNIT_SAVE_PATH, {
    method: 'POST',
    body: payload
  })

export const updateVehicleUnit = (id, payload = {}) =>
  requestJson(UNIT_UPDATE_PATH, {
    method: 'POST',
    body: { ...payload, id }
  })

export const deleteVehicleUnit = (id) =>
  requestJson(UNIT_DELETE_PATH, {
    method: 'POST',
    body: { id }
  })

export const fetchVehicleTypes = (params = {}) =>
  requestJson(TYPE_INDEX_PATH, { params })

export const createVehicleType = (payload = {}) =>
  requestJson(TYPE_SAVE_PATH, {
    method: 'POST',
    body: payload
  })

export const updateVehicleType = (id, payload = {}) =>
  requestJson(TYPE_UPDATE_PATH, {
    method: 'POST',
    body: { ...payload, id }
  })

export const deleteVehicleType = (id) =>
  requestJson(TYPE_DELETE_PATH, {
    method: 'POST',
    body: { id }
  })

export const fetchPermissionGroups = () =>
  requestJson(PERMISSION_GROUP_INDEX_PATH)

export const fetchDeviceBindings = (params = {}) =>
  requestJson(DEVICE_BINDING_INDEX_PATH, { params })

export default {
  fetchVehicleUnits,
  createVehicleUnit,
  updateVehicleUnit,
  deleteVehicleUnit,
  fetchVehicleTypes,
  createVehicleType,
  updateVehicleType,
  deleteVehicleType,
  fetchPermissionGroups,
  fetchDeviceBindings
}
