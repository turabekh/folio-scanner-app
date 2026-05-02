import { registerPlugin } from '@capacitor/core'

const KeepAlive = registerPlugin('KeepAlive', {
  web: () => ({
    start: async () => ({ ok: true }),
    stop: async () => ({ ok: true }),
  }),
})

export default KeepAlive