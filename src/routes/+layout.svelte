<script>
  import { page } from '$app/stores';
  import '../app.css';

  let { children } = $props();

  const navItems = [
    { href: '/', label: '首页', icon: '●' },
    { href: '/admin', label: '广播', icon: '◆' },
    { href: '/timer', label: '推送', icon: '◈' },
    { href: '/reports', label: '回复', icon: '◇' },
  ];
</script>

<header class="glass-strong sticky top-0 z-50 h-14 flex items-center justify-between px-6 border-b border-white/5">
  <div class="flex items-center gap-3">
    <span class="text-lg font-semibold text-slate-100 tracking-tight">☠️🌾信使</span>
    <span class="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-400 font-medium border border-accent-500/20">WS</span>
  </div>
  <nav class="flex items-center gap-1">
    {#each navItems as item}
      <a
        href={item.href}
        class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 no-underline
               {$page.url.pathname === item.href
                 ? 'bg-white/10 text-white shadow-glass-sm border border-white/10'
                 : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}">
        {item.label}
      </a>
    {/each}
  </nav>
</header>

<main class="relative z-10 max-w-[1366px] mx-auto p-6">
  {@render children()}
</main>
