<script>
  let { variant = 'default', text = '' } = $props();
</script>

<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium
  {variant === 'success' ? 'bg-green-100 text-green-700' : ''}
  {variant === 'warning' ? 'bg-amber-100 text-amber-700' : ''}
  {variant === 'danger' ? 'bg-red-100 text-red-700' : ''}
  {variant === 'info' ? 'bg-blue-100 text-blue-700' : ''}
  {variant === 'default' ? 'bg-purple-100 text-purple-700' : ''}
">
  {text}
</span>
