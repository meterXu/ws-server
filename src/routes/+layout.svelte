<script>
  import { page } from '$app/stores';
  import '../app.css';

  let { children } = $props();

  const navItems = [
    { href: '/', label: '首页' },
    { href: '/admin', label: '广播' },
    { href: '/timer', label: '推送' },
    { href: '/reports', label: '回复' }
  ];
</script>

<header class="bg-white border-b border-purple-100 h-14 flex items-center justify-between px-6 shadow-sm sticky top-0 z-10">
  <h1 class="text-lg font-semibold text-purple-900">🌾☠️信使</h1>
  <nav class="flex items-center gap-1">
    {#each navItems as item}
      <a
        href={item.href}
        class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors no-underline
               {$page.url.pathname === item.href
                 ? 'bg-purple-100 text-purple-700'
                 : 'text-purple-600 hover:bg-purple-50 hover:text-purple-700'}">
        {item.label}
      </a>
    {/each}
  </nav>
</header>

<main class="max-w-[1200px] mx-auto p-6">
  {@render children()}
</main>
