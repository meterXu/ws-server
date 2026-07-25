<script>
  import { onMount, onDestroy } from 'svelte';
  import { elapsed } from '$lib/utils/helpers.js';
  import StatCard from '$lib/components/StatCard.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import JsonEditor from '$lib/components/JsonEditor.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Empty from '$lib/components/Empty.svelte';

  let clientCount = 0, activeCount = 0, totalTimers = 0, totalSends = 0;
  let timers = [];
  let logEntries = [];
  let prevTimers = [];
  let pendingOps = new Set();
  let resultMsg = '', resultType = '';
  let timeout = null;
  let mounted = false;
  let editorComponent;
  let editorValue = '{\n  "type": "timer",\n  "message": "定时广播消息"\n}';
  let intervalValue = 2;
  let nameValue = '';

  // per-timer edit state
  let editingTimers = {};

  function showResult(type, msg) {
    resultType = type; resultMsg = msg;
    setTimeout(() => { resultType = ''; resultMsg = ''; }, 5000);
  }
  function busy(id) { return pendingOps.has(id); }
  function lock(id) { pendingOps.add(id); pendingOps = pendingOps; }
  function unlock(id) { pendingOps.delete(id); pendingOps = pendingOps; }

  function formatJson() {
    if (!editorComponent) return;
    try { editorComponent.setValue(JSON.stringify(JSON.parse(editorComponent.getValue().trim()), null, 2)); }
    catch { showResult('error', 'JSON 格式无效'); }
  }

  async function addTimer() {
    const raw = editorComponent ? editorComponent.getValue().trim() : editorValue;
    if (!nameValue.trim()) { showResult('error', '定时器名称不能为空'); return; }
    if (!raw) { showResult('error', '消息内容不能为空'); return; }
    let payload;
    try { payload = JSON.parse(raw); } catch { showResult('error', 'JSON 格式无效'); return; }
    if (!intervalValue || intervalValue < 1) { showResult('error', '间隔必须 >= 1 秒'); return; }
    try {
      const res = await fetch('/api/timer/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue, message: payload, interval: intervalValue })
      });
      const data = await res.json();
      data.success ? (showResult('success', '定时器 #' + data.timer.id + ' 已启动'), refreshStatus())
                    : showResult('error', data.message);
    } catch (err) { showResult('error', '请求失败: ' + err.message); }
  }

  async function stopTimer(id) {
    const key = 'stop:' + id; if (busy(key)) return; lock(key);
    try {
      const res = await fetch('/api/timer/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const data = await res.json();
      data.success ? (showResult('success', '定时器 #' + id + ' 已停止'), refreshStatus()) : showResult('error', data.message);
    } catch (err) { showResult('error', '请求失败: ' + err.message); }
    finally { unlock(key); }
  }

  async function restartTimer(id) {
    const key = 'restart:' + id; if (busy(key)) return;
    const timer = prevTimers.find(t => t.id === id);
    if (!timer) return; lock(key);
    try {
      const [startRes] = await Promise.all([
        fetch('/api/timer/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: timer.name, message: timer.message, interval: Math.round(timer.intervalMs / 1000) }) }).then(r => r.json()),
        fetch('/api/timer/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(r => r.json())
      ]);
      startRes.success ? (showResult('success', '定时器已重启'), refreshStatus()) : showResult('error', startRes.message);
    } catch (err) { showResult('error', '请求失败: ' + err.message); }
    finally { unlock(key); }
  }

  async function removeTimer(id) {
    try {
      const res = await fetch('/api/timer/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const data = await res.json();
      data.success ? (showResult('success', '定时器已删除'), refreshStatus()) : showResult('error', data.message);
    } catch (err) { showResult('error', '请求失败: ' + err.message); }
  }

  async function toggleTimer(id, active) { active ? restartTimer(id) : stopTimer(id); }

  function startEdit(id) {
    const timer = prevTimers.find(t => t.id === id);
    if (!timer) return;
    editingTimers[id] = {
      name: timer.name || '',
      msg: JSON.stringify(timer.message, null, 2),
      interval: Math.round(timer.intervalMs / 1000)
    };
    editingTimers = editingTimers;
  }
  function cancelEdit(id) {
    delete editingTimers[id];
    editingTimers = editingTimers;
  }

  async function updateTimer(id) {
    const edit = editingTimers[id];
    if (!edit) return;
    if (!edit.name.trim()) { showResult('error', '定时器名称不能为空'); return; }
    const raw = edit.msg.trim();
    if (!raw) { showResult('error', '消息内容不能为空'); return; }
    let payload;
    try { payload = JSON.parse(raw); } catch { showResult('error', 'JSON 格式无效'); return; }
    if (!edit.interval || edit.interval < 1) { showResult('error', '间隔必须 >= 1 秒'); return; }
    try {
      const [startRes] = await Promise.all([
        fetch('/api/timer/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: edit.name, message: payload, interval: edit.interval }) }).then(r => r.json()),
        fetch('/api/timer/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(r => r.json())
      ]);
      if (startRes.success) {
        showResult('success', '定时器已更新');
        delete editingTimers[id]; editingTimers = editingTimers;
        refreshStatus();
      } else { showResult('error', startRes.message); }
    } catch (err) { showResult('error', '请求失败: ' + err.message); }
  }

  function sameStructure(a, b) {
    if (!a || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) { if (a[i].id !== b[i].id || a[i].active !== b[i].active) return false; }
    return true;
  }

  function addLogEntry(timerId, count, cc) {
    const now = new Date();
    logEntries = [{ time: now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0'), timerId, count, clientCount: cc }, ...logEntries.slice(0, 79)];
  }

  async function refreshStatus() {
    if (!mounted) return;
    try {
      const [cs, ts] = await Promise.all([
        fetch('/api/clients').then(r => r.json()),
        fetch('/api/timer/status').then(r => r.json())
      ]);
      clientCount = cs.clientCount;
      if (ts.success && ts.timers) {
        for (const t of ts.timers) {
          const prev = prevTimers.find(p => p.id === t.id);
          if (prev && t.sendCount > prev.sendCount && t.active) addLogEntry(t.id, t.sendCount, cs.clientCount);
        }
        if (!sameStructure(prevTimers, ts.timers)) timers = ts.timers;
        prevTimers = ts.timers;
      }
      activeCount = prevTimers.filter(t => t.active).length;
      totalSends = prevTimers.reduce((s, t) => s + t.sendCount, 0);
      totalTimers = prevTimers.length;
    } catch {}
  }

  async function scheduleRefresh() {
    if (!mounted) return;
    await refreshStatus();
    if (mounted) timeout = setTimeout(scheduleRefresh, 2000);
  }

  onMount(() => { mounted = true; scheduleRefresh(); });
  onDestroy(() => { mounted = false; if (timeout) clearTimeout(timeout); });
</script>

<svelte:head><title>🌾☠️信使 — 推送</title></svelte:head>

<div class="mb-6">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <StatCard label="已连接客户端" value={clientCount} color="green"><span slot="sub" class="inline-flex items-center gap-1.5 text-xs text-gray-400 mt-1"><span class="w-2 h-2 rounded-full {clientCount > 0 ? 'bg-green-500' : 'bg-gray-300'}"></span>在线</span></StatCard>
    <StatCard label="活跃定时器" value={activeCount} sub={'共 ' + totalTimers + ' 个定时器'} color="blue" />
    <StatCard label="累计广播次数" value={totalSends} sub="所有定时器合计" color="amber" />
  </div>
</div>

<Panel title="添加定时广播">
  <div class="p-5">
    <div class="mb-4">
      <span class="block text-xs text-gray-500 mb-2">定时器名称</span>
      <input type="text" bind:value={nameValue} placeholder="例如: 每日推送" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
    </div>
    <div class="mb-4">
      <span class="block text-xs text-gray-500 mb-2">消息内容（JSON）</span>
      <JsonEditor bind:this={editorComponent} value={editorValue} onChange={v => editorValue = v} height="100px" />
    </div>
    <div class="flex gap-4 items-end">
      <div class="w-44">
        <span class="block text-xs text-gray-500 mb-2">发送间隔（秒）</span>
        <input type="number" bind:value={intervalValue} min="1" max="3600" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
      </div>
      <div class="text-xs text-gray-400 pb-2">最低 1 秒，建议 ≥ 5 秒</div>
    </div>
    <div class="flex gap-2.5 mt-4">
      <button onclick={addTimer} class="px-6 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">添加并启动</button>
      <button onclick={formatJson} class="px-6 py-2.5 bg-white text-purple-600 border border-purple-300 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors">格式化 JSON</button>
    </div>
    {#if resultMsg}
      <div class="mt-4 px-4 py-3 rounded-lg text-sm {resultType === 'success' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}">{resultMsg}</div>
    {/if}
  </div>
</Panel>

<Panel title="定时器列表">
  {#if timers.length === 0}
    <Empty message="暂无定时广播任务，请添加一个" />
  {:else}
    <div class="p-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each timers as t}
          {@const editing = editingTimers[t.id] !== undefined}
          {@const edit = editingTimers[t.id]}
          <div class="border rounded-xl p-4 transition-shadow hover:shadow-sm {t.active ? 'border-l-[3px] border-l-green-500 bg-green-50/30' : 'border-l-[3px] border-l-gray-300 bg-gray-50/50'}">
            <div class="flex items-center justify-between mb-2.5">
              <span class="font-semibold text-sm">{t.name || '定时器 #' + t.id}</span>
              <Badge text={t.active ? '运行中' : '已停止'} variant={t.active ? 'success' : 'default'} />
            </div>
            {#if editing}
              <div class="mb-2">
                <span class="text-xs text-gray-500 block mb-1">名称</span>
                <input type="text" bind:value={edit.name} placeholder="例如: 每日推送" class="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-purple-400" />
              </div>
              <div class="mb-2">
                <span class="text-xs text-gray-500 block mb-1">消息内容（JSON）</span>
                <textarea bind:value={edit.msg} class="w-full h-20 p-2 border border-gray-200 rounded-md text-xs font-mono resize-y focus:outline-none focus:border-purple-400"></textarea>
              </div>
              <div class="mb-2">
                <span class="text-xs text-gray-500 block mb-1">发送间隔（秒）</span>
                <input type="number" bind:value={edit.interval} min="1" max="3600" class="w-28 px-2 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-purple-400" />
              </div>
            {:else}
              <div class="text-xs font-mono bg-gray-100 px-3 py-2 rounded-md text-gray-500 truncate mb-2.5" title={JSON.stringify(t.message)}>{JSON.stringify(t.message)}</div>
            {/if}
            <div class="flex gap-4 text-xs text-gray-400 mb-3 flex-wrap">
              <span>间隔: {t.intervalMs / 1000}s</span><span>已发送: {t.sendCount} 次</span>
              {#if t.active}<span>已运行: {elapsed(t.startAt)}</span>{/if}
            </div>
            <div class="flex items-center gap-2">
              <Toggle checked={t.active} onChanged={v => toggleTimer(t.id, v)} />
              {#if editing}
                <button onclick={() => updateTimer(t.id)} class="px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-medium hover:bg-purple-700 transition-colors">更新</button>
                <button onclick={() => cancelEdit(t.id)} class="px-3 py-1.5 bg-white text-gray-400 border border-gray-200 rounded-md text-xs hover:bg-gray-50 transition-colors">取消</button>
              {:else}
                <button onclick={() => startEdit(t.id)} class="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-300 transition-colors">编辑</button>
              {/if}
              <button onclick={() => removeTimer(t.id)} class="px-3 py-1.5 bg-white text-red-400 border border-red-200 rounded-md text-xs hover:bg-red-50 hover:text-red-500 transition-colors ml-auto">删除</button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</Panel>

<Panel title="广播日志">
  {#if logEntries.length === 0}
    <Empty message="暂无广播记录" />
  {:else}
    <div class="max-h-[300px] overflow-y-auto">
      {#each logEntries as entry}
        <div class="px-5 py-2 text-xs border-b border-gray-50 last:border-b-0 flex gap-2.5 items-center">
          <span class="text-gray-400 whitespace-nowrap">{entry.time}</span>
          <span class="text-purple-600 font-medium">#{entry.timerId}</span>
          <span>第 <span class="text-purple-600 font-medium">{entry.count}</span> 次广播</span>
          <span class="text-gray-500">→ {entry.clientCount} 个客户端</span>
        </div>
      {/each}
    </div>
  {/if}
</Panel>
