<script>
  import { barColor } from '$lib/utils/helpers.js';

  let { label = '', detail = '', pct = 0 } = $props();
</script>

<div class="px-5 py-3 border-b border-purple-50/50 last:border-b-0">
  <div class="flex justify-between text-xs mb-1.5">
    <span class="text-gray-500">{label}</span>
    <span class="text-gray-600 font-medium">{detail}</span>
  </div>
  <div class="h-2 bg-purple-50 rounded-full overflow-hidden">
    <div class="h-full rounded-full transition-all duration-500 ease-out {barColor(pct)}" style="width: {Math.min(pct, 100)}%"></div>
  </div>
</div>
