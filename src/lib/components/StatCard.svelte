<script>
  let { label = '', value = '--', sub = '', color = 'purple' } = $props();
</script>

<div class="bg-white rounded-xl p-5 shadow-sm border border-purple-50">
  <div class="text-xs text-gray-400 mb-1.5 tracking-wide uppercase">{label}</div>
  <div class="text-2xl font-bold
    {color === 'green' ? 'text-green-500' : ''}
    {color === 'blue' ? 'text-blue-500' : ''}
    {color === 'amber' ? 'text-amber-500' : ''}
    {color === 'red' ? 'text-red-500' : ''}
    {color === 'purple' ? 'text-purple-600' : ''}
  ">
    {value}
  </div>
  {#if sub}
    <div class="text-xs text-gray-400 mt-1">{sub}</div>
  {/if}
</div>
