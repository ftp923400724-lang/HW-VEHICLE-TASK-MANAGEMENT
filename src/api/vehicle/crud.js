import { requestJson } from '@/api/http'

const VEHICLE_INDEX_PATH = import.meta.env.VITE_VEHICLE_PATH || '/Vehicle/index'
const VEHICLE_SAVE_PATH = import.meta.env.VITE_VEHICLE_SAVE_PATH || '/Vehicle/save'
const VEHICLE_UPDATE_PATH = import.meta.env.VITE_VEHICLE_UPDATE_PATH || '/Vehicle/update'
const VEHICLE_DELETE_PATH = import.meta.env.VITE_VEHICLE_DELETE_PATH || '/Vehicle/delete'

export const fetchVehicleList = (params = {}) =>
  requestJson(VEHICLE_INDEX_PATH, { params })

export const createVehicle = (payload = {}) =>
  requestJson(VEHICLE_SAVE_PATH, {
    method: 'POST',
    body: payload
  })

export const updateVehicle = (id, payload = {}) =>
  requestJson(VEHICLE_UPDATE_PATH, {
    method: 'POST',
    body: { ...payload, id }
  })

export const deleteVehicle = (id) =>
  requestJson(VEHICLE_DELETE_PATH, {
    method: 'POST',
    body: { id }
  })

export default {
  fetchVehicleList,
  createVehicle,
  updateVehicle,
  deleteVehicle
}
