<script>
  let { checked = false, onChanged = () => {} } = $props();

  function handleChange(e) {
    onChanged(e.target.checked);
  }
</script>

<label class="relative inline-block w-9 h-5 cursor-pointer">
  <input type="checkbox" {checked} onchange={handleChange} class="sr-only peer" />
  <span class="absolute inset-0 rounded-full bg-slate-600 transition-all duration-300
               peer-checked:bg-accent-500
               after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4
               after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-300
               peer-checked:after:translate-x-4"></span>
</label>
