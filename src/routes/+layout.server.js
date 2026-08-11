import { getOrCreateWSToken } from '$lib/server/auth.js'

const WS_REQUIRE_TOKEN = process.env.WS_REQUIRE_TOKEN === 'true'

/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals, url }) {
  const user = locals.user || null
  let wsUrl = ''
  if (user) {
    const token = getOrCreateWSToken(user.id)
    const protocol = 'ws:'
    wsUrl = protocol + '//' + url.host + '/ws' + (WS_REQUIRE_TOKEN ? '?token=' + token : '')
  }
  return { user, wsUrl, requireToken: WS_REQUIRE_TOKEN }
}
