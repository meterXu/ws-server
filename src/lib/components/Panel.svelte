<script>
  let { title = '', children, badge } = $props();
</script>

<div class="glass rounded-2xl overflow-hidden mb-4 animate-fade-in">
  {#if title}
    <div class="px-5 py-3.5 text-sm font-semibold text-slate-200 border-b border-white/5 flex items-center justify-between">
      <span>{title}</span>
      {#if badge}
        <span class="text-xs font-normal text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
          {@render badge()}
        </span>
      {/if}
    </div>
  {/if}
  {@render children?.()}
</div>
