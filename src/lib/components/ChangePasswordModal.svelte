<script>
  let { show = false, onclose = () => {} } = $props();

  let oldPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let error = $state('');
  let success = $state('');
  let loading = $state(false);

  function reset() {
    oldPassword = '';
    newPassword = '';
    confirmPassword = '';
    error = '';
    success = '';
    loading = false;
  }

  function handleClose() {
    reset();
    onclose();
  }

  async function handleSubmit(e) {
    e?.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      error = '请填写所有字段';
      return;
    }
    if (newPassword.length < 4) {
      error = '新密码长度不能少于 4 位';
      return;
    }
    if (newPassword !== confirmPassword) {
      error = '两次输入的新密码不一致';
      return;
    }

    loading = true;
    error = '';
    success = '';
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        success = '密码修改成功！';
        setTimeout(() => {
          reset();
          onclose();
        }, 1500);
      } else {
        error = data.message || '修改失败';
      }
    } catch {
      error = '网络错误，请重试';
    } finally {
      loading = false;
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) handleClose();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') handleClose();
  }
</script>

<svelte:window onkeydown={show ? handleKeydown : null} />

{#if show}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropClick}
    role="dialog"
    aria-label="修改密码"
    tabindex="-1"
  >
    <div class="glass-strong rounded-2xl p-6 w-full max-w-sm animate-fade-in shadow-glass-lg">

      <h3 class="text-base font-semibold text-slate-100 mb-5">修改密码</h3>

      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label for="old-pwd" class="block text-xs font-medium text-slate-400 mb-1.5 ml-1">旧密码</label>
          <input
            id="old-pwd"
            type="password"
            bind:value={oldPassword}
            autocomplete="current-password"
            placeholder="请输入旧密码"
            disabled={loading}
            class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm
                   text-slate-200 placeholder-slate-600
                   focus:outline-none focus:border-accent-500/40 focus:ring-2 focus:ring-accent-500/10
                   disabled:opacity-50 transition-all duration-200"
          />
        </div>

        <div>
          <label for="new-pwd" class="block text-xs font-medium text-slate-400 mb-1.5 ml-1">新密码</label>
          <input
            id="new-pwd"
            type="password"
            bind:value={newPassword}
            autocomplete="new-password"
            placeholder="请输入新密码（至少 4 位）"
            disabled={loading}
            class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm
                   text-slate-200 placeholder-slate-600
                   focus:outline-none focus:border-accent-500/40 focus:ring-2 focus:ring-accent-500/10
                   disabled:opacity-50 transition-all duration-200"
          />
        </div>

        <div>
          <label for="confirm-pwd" class="block text-xs font-medium text-slate-400 mb-1.5 ml-1">确认新密码</label>
          <input
            id="confirm-pwd"
            type="password"
            bind:value={confirmPassword}
            autocomplete="new-password"
            placeholder="请再次输入新密码"
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

        {#if success}
          <div class="px-4 py-3 rounded-xl text-sm bg-accent-500/10 text-accent-400 border border-accent-500/20">
            {success}
          </div>
        {/if}

        <div class="flex gap-3 pt-1">
          <button
            type="button"
            onclick={handleClose}
            disabled={loading}
            class="flex-1 px-4 py-2.5 glass-subtle text-slate-300 rounded-xl text-sm font-medium
                   hover:bg-white/10 hover:text-white transition-all duration-200
                   disabled:opacity-50"
          >取消</button>
          <button
            type="submit"
            disabled={loading}
            class="flex-1 px-4 py-2.5 bg-accent-500 text-white rounded-xl text-sm font-medium
                   hover:bg-accent-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
                   transition-all duration-200 shadow-glow active:scale-[0.97]"
          >{loading ? '修改中...' : '确认修改'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}
