type Handler = (payload?: any) => void

export const EventTypes = {
  VehicleSelected: 'vehicle-selected',
  TrajectoryFetched: 'trajectory-fetched',
  TrajectoryAnalyzed: 'trajectory-analyzed',
  TrajectoryControl: 'trajectory-control',
  PlaybackState: 'playback-state',
} as const

type EventName = (typeof EventTypes)[keyof typeof EventTypes]

const listeners = new Map<EventName, Set<Handler>>()

function getBucket(eventName: EventName) {
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set())
  }
  return listeners.get(eventName)
}

const eventBus = {
  on(eventName: EventName, handler: Handler) {
    if (typeof handler !== 'function') return
    getBucket(eventName)?.add(handler)
  },
  off(eventName: EventName, handler: Handler) {
    getBucket(eventName)?.delete(handler)
  },
  emit(eventName: EventName, payload?: any) {
    getBucket(eventName)?.forEach((handler) => {
      try {
        handler(payload)
      } catch (_) {
        // ignore listener errors to keep UI responsive
      }
    })
  },
}

export default eventBus
