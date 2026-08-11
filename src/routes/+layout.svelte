<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import ChangePasswordModal from '$lib/components/ChangePasswordModal.svelte';
  import { copyToClipboard } from '$lib/utils/helpers';
  import '../app.css';

  let { children, data } = $props();

  const navItems = [
    { href: '/', label: '首页' },
    { href: '/admin', label: '广播' },
    { href: '/timer', label: '推送' },
    { href: '/reports', label: '回复' },
  ];

  let currentUser = $derived(data.user);
  let loggingOut = $state(false);
  let showChangePwd = $state(false);
  let wsUrl = $state(data.wsUrl || '');
  let copied = $state(false);
  let refreshing = $state(false);

  // 每次导航时从服务端数据同步最新 wsUrl
  $effect(() => {
    if (data.wsUrl) wsUrl = data.wsUrl;
  });

  onMount(async () => {
    try {
      const res = await fetch('/api/auth/ws-token');
      const d = await res.json();
      if (d.success) wsUrl = d.wsUrl;
    } catch {}
  });

  async function copyWsUrl() {
    if (!wsUrl) return;
    try {
      await copyToClipboard(wsUrl);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch {}
  }

  async function refreshWsToken() {
    refreshing = true;
    try {
      const res = await fetch('/api/auth/ws-token', { method: 'POST' });
      const d = await res.json();
      if (d.success) wsUrl = d.wsUrl;
    } catch {}
    refreshing = false;
  }

  async function handleLogout() {
    loggingOut = true;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  }
</script>

{#if $page.url.pathname !== '/login'}
<header class="glass-strong sticky top-0 z-50 h-14 flex items-center px-6 border-b border-white/5">
  <div class="flex items-center gap-3 shrink-0">
    <span class="text-lg font-semibold text-slate-100 tracking-tight">DuMiMessager</span>
    <span class="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-400 font-medium border border-accent-500/20">WS</span>
  </div>
  <nav class="flex items-center gap-1 ml-6">
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
  <div class="flex items-center gap-2 shrink-0 ml-auto">
    {#if wsUrl}
      <div class="flex items-center gap-1.5 border-r border-white/10 pr-2">
        <span class="text-[11px] text-slate-500 font-mono max-w-[320px] truncate hidden xl:inline" title={wsUrl}>{wsUrl}</span>
        <button
          onclick={copyWsUrl}
          class="px-2 py-1 rounded-lg text-[10px] font-medium transition-all duration-200
                 text-slate-400 hover:text-accent-400 hover:bg-accent-500/10 border border-white/5 hover:border-accent-500/20"
          title="复制 WS 地址"
        >
          {copied ? '已复制' : '复制'}
        </button>
        {#if data.requireToken}
        <button
          onclick={refreshWsToken}
          disabled={refreshing}
          class="px-2 py-1 rounded-lg text-[10px] font-medium transition-all duration-200
                 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/20
                 disabled:opacity-50"
          title="刷新 WS 令牌"
        >
          {refreshing ? '...' : '刷新'}
        </button>
        {/if}
      </div>
    {/if}
    <div class="flex items-center gap-2">
      {#if currentUser}
        <button
          onclick={() => showChangePwd = true}
          class="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-0.5"
        >{currentUser.username}</button>
      {/if}
      <button
        onclick={handleLogout}
        disabled={loggingOut}
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
               text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20
               disabled:opacity-50"
      >
        {loggingOut ? '...' : '退出'}
      </button>
    </div>
  </div>
</header>
{/if}

<main class="relative z-10 max-w-[1366px] mx-auto p-6">
  {@render children()}
</main>

<ChangePasswordModal show={showChangePwd} onclose={() => showChangePwd = false} />

<style>
  :global(*) {
    -webkit-tap-highlight-color: transparent;
  }

  :global(html) {
    background: #0f172a;
  }

  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh;
    background: #0f172a;
    color: #f1f5f9;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :global(body::before) {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% -20%, rgba(168, 85, 247, 0.08), transparent),
      radial-gradient(ellipse 60% 50% at 100% 50%, rgba(147, 51, 234, 0.05), transparent),
      radial-gradient(ellipse 50% 40% at 0% 80%, rgba(124, 58, 237, 0.06), transparent);
    pointer-events: none;
    z-index: 0;
  }

  :global(::selection) {
    background: rgba(168, 85, 247, 0.3);
    color: #f8fafc;
  }

  :global(::-webkit-scrollbar) {
    width: 6px;
    height: 6px;
  }
  :global(::-webkit-scrollbar-track) {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 3px;
  }
  :global(::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  :global(::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0.18);
  }

  @media (prefers-reduced-motion: reduce) {
    :global(*),
    :global(*::before),
    :global(*::after) {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Glass utility classes */
  :global(.glass) {
    background: rgba(30, 41, 59, 0.55);
    backdrop-filter: blur(20px) saturate(150%);
    -webkit-backdrop-filter: blur(20px) saturate(150%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  :global(.glass-subtle) {
    background: rgba(30, 41, 59, 0.35);
    backdrop-filter: blur(12px) saturate(150%);
    -webkit-backdrop-filter: blur(12px) saturate(150%);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  :global(.glass-strong) {
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  :global(.glass-hover) {
    transition: all 0.2s ease;
  }
  :global(.glass-hover:hover) {
    background: rgba(30, 41, 59, 0.7);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  :global(.glow-ring) {
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }
  :global(.glow-ring:focus-within) {
    border-color: rgba(168, 85, 247, 0.4);
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
  }

  :global(.status-dot) {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  :global(.status-dot.online) {
    background: #a855f7;
    box-shadow: 0 0 6px rgba(168, 85, 247, 0.5);
  }
  :global(.status-dot.offline) {
    background: #475569;
  }
</style>
