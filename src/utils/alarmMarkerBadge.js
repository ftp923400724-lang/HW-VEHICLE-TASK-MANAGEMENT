import { createVNode, render } from 'vue'
import AlarmMarkerBadge from '@/components/common/AlarmMarkerBadge.vue'

export function createAlarmMarkerBadge(options = {}) {
  const host = document.createElement('div')
  host.className = 'alarm-marker-badge-host'
  host.style.position = 'absolute'
  host.style.left = '0px'
  host.style.top = '0px'
  host.style.transformOrigin = 'center top'
  host.style.pointerEvents = 'none'
  host.style.zIndex = '120'
  host.style.display = 'block'

  const state = {
    text: options.text || '定位点名称',
    variant: options.variant || 'idle',
    glow: options.glow || '',
  }

  let vnode = createVNode(AlarmMarkerBadge, state)
  render(vnode, host)

  const api = {
    el: host,
    state,
    update(nextState = {}) {
      Object.assign(state, nextState)
      vnode = createVNode(AlarmMarkerBadge, state)
      render(vnode, host)
    },
    destroy() {
      render(null, host)
    },
  }

  return api
}
