<script>
  let { label = '', value = '--', sub = '', color = 'accent' } = $props();

  const colorMap = {
    accent:  { value: 'text-accent-400',     glow: 'shadow-glow',        dot: 'bg-accent-500' },
    blue:    { value: 'text-blue-400',       glow: 'shadow-glow-blue',   dot: 'bg-blue-500' },
    amber:   { value: 'text-amber-400',      glow: '',                   dot: 'bg-amber-500' },
    rose:    { value: 'text-rose-400',       glow: '',                   dot: 'bg-rose-500' },
  };

  let c = $derived(colorMap[color] || colorMap.accent);
</script>

<div class="glass rounded-2xl p-5 {c.glow} animate-fade-in">
  <div class="text-xs text-slate-400 mb-1.5 tracking-wide font-medium uppercase">{label}</div>
  <div class="text-2xl font-bold {c.value} tabular-nums tracking-tight">
    {value}
  </div>
  {#if sub}
    <div class="text-xs text-slate-500 mt-1">{sub}</div>
  {/if}
</div>
