import { getOrCreateWSToken } from '$lib/server/auth.js'

/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals, url }) {
  const user = locals.user || null
  let wsUrl = ''
  if (user) {
    const token = getOrCreateWSToken(user.id)
    const protocol = 'ws:'
    wsUrl = protocol + '//' + url.host + '/ws?token=' + token
  }
  return { user, wsUrl }
}
