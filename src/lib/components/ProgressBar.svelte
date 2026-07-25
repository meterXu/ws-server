<script>
  import { barColor } from '$lib/utils/helpers.js';

  let { label = '', detail = '', pct = 0 } = $props();
</script>

<div class="px-5 py-3 border-b border-white/5 last:border-b-0">
  <div class="flex justify-between text-xs mb-1.5">
    <span class="text-slate-400">{label}</span>
    <span class="text-slate-300 font-medium tabular-nums">{detail}</span>
  </div>
  <div class="h-2 bg-white/5 rounded-full overflow-hidden">
    <div
      class="h-full rounded-full transition-all duration-700 ease-out {barColor(pct)}"
      style="width: {Math.min(pct, 100)}%"
    ></div>
  </div>
</div>
