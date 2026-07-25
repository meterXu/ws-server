import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // 使用自定义入口替代默认 build/index.js
      precompress: false
    }),
    alias: {
      $lib: 'src/lib'
    }
  },
  onwarn: (warning, handler) => {
    if (warning.code === 'a11y_label_has_associated_control') return
    handler(warning)
  }
}
