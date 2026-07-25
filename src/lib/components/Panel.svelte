<script>
  let { title = '', children, badge } = $props();
</script>

<div class="bg-white rounded-xl shadow-sm border border-purple-50 overflow-hidden mb-4">
  {#if title}
    <div class="px-5 py-3.5 text-sm font-semibold text-gray-700 border-b border-purple-50 flex items-center justify-between">
      <span>{title}</span>
      {#if badge}
        <span class="text-xs font-normal text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded-full">
          {@render badge()}
        </span>
      {/if}
    </div>
  {/if}
  {@render children?.()}
</div>
