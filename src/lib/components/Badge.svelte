<script>
  let { variant = 'default', text = '' } = $props();
</script>

<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium border
  {variant === 'success' ? 'bg-accent-500/10 text-accent-400 border-accent-500/20' : ''}
  {variant === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
  {variant === 'danger' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
  {variant === 'info' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
  {variant === 'default' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : ''}
">
  {text}
</span>
