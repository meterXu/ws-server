<script>
  let username = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) {
      error = '请输入用户名和密码';
      return;
    }
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await res.json();
      if (data.success) {
        // 使用完整页面跳转确保服务端用新 cookie 重新渲染布局
        window.location.href = '/';
      } else {
        error = data.message || '登录失败，请重试';
      }
    } catch {
      error = '网络错误，请检查网络连接后重试';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>DuMiMessager — 登录</title>
</svelte:head>

<div class="min-h-[85vh] flex items-center justify-center px-4">
  <div class="glass-strong rounded-2xl p-8 w-full max-w-sm animate-fade-in">

    <!-- Logo / Branding -->
    <div class="text-center mb-8">
      <div class="flex items-center justify-center gap-3 mb-3">
        <span class="text-2xl font-semibold text-slate-100 tracking-tight">DuMiMessager</span>
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-400 font-medium border border-accent-500/20">WS</span>
      </div>
      <p class="text-sm text-slate-500">WebSocket 消息管理工具</p>
    </div>

    <!-- Login Form -->
    <form onsubmit={handleSubmit} class="space-y-4">
      <div>
        <label for="username" class="block text-xs font-medium text-slate-400 mb-1.5 ml-1">用户名</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          autocomplete="username"
          placeholder="请输入用户名"
          disabled={loading}
          class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm
                 text-slate-200 placeholder-slate-600
                 focus:outline-none focus:border-accent-500/40 focus:ring-2 focus:ring-accent-500/10
                 disabled:opacity-50 transition-all duration-200"
        />
      </div>

      <div>
        <label for="password" class="block text-xs font-medium text-slate-400 mb-1.5 ml-1">密码</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          autocomplete="current-password"
          placeholder="请输入密码"
          disabled={loading}
          class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm
                 text-slate-200 placeholder-slate-600
                 focus:outline-none focus:border-accent-500/40 focus:ring-2 focus:ring-accent-500/10
                 disabled:opacity-50 transition-all duration-200"
        />
      </div>

      {#if error}
        <div class="px-4 py-3 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20">
          {error}
        </div>
      {/if}

      <button
        type="submit"
        disabled={loading}
        class="w-full px-5 py-2.5 bg-accent-500 text-white rounded-xl text-sm font-medium
               hover:bg-accent-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
               transition-all duration-200 shadow-glow active:scale-[0.97]"
      >
        {loading ? '登录中...' : '登录'}
      </button>
    </form>
  </div>
</div>
