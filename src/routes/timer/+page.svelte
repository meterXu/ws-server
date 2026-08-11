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
  let groupValue = '';

  let editingTimers = {};
  let collapsedGroups = {};
  let groupedTimers = [];
  let confirmDeleteId = null;

  function regroup() {
    const map = {};
    for (const t of timers) {
      const g = t.group || '默认分组';
      if (!map[g]) map[g] = [];
      map[g].push(t);
    }
    groupedTimers = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }

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
        body: JSON.stringify({ name: nameValue, message: payload, interval: intervalValue, group: groupValue })
      });
      const data = await res.json();
      data.success ? (showResult('success', '「' + (nameValue || data.timer.name) + '」已启动'), refreshStatus())
                    : showResult('error', data.message);
    } catch (err) { showResult('error', '请求失败: ' + err.message); }
  }

  async function stopTimer(id) {
    const key = 'stop:' + id; if (busy(key)) return; lock(key);
    try {
      const res = await fetch('/api/timer/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const data = await res.json();
      const name = (prevTimers.find(t => t.id === id) || {}).name;
      data.success ? (showResult('success', '「' + (name || '定时器' + id) + '」已停止'), refreshStatus()) : showResult('error', data.message);
    } catch (err) { showResult('error', '请求失败: ' + err.message); }
    finally { unlock(key); }
  }

  async function restartTimer(id) {
    const key = 'restart:' + id; if (busy(key)) return;
    const timer = prevTimers.find(t => t.id === id);
    if (!timer) return; lock(key);
    try {
      const [startRes] = await Promise.all([
        fetch('/api/timer/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: timer.name, message: timer.message, interval: Math.round(timer.intervalMs / 1000), startAt: timer.startAt, group: timer.group }) }).then(r => r.json()),
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

  async function toggleGroup(groupName, active) {
    const group = prevTimers.filter(t => (t.group || '默认分组') === groupName);
    const promises = [];
    for (const t of group) {
      if (active && !t.active) promises.push(restartTimer(t.id));
      else if (!active && t.active) promises.push(stopTimer(t.id));
    }
    await Promise.all(promises);
  }

  function startEdit(id) {
    const timer = prevTimers.find(t => t.id === id);
    if (!timer) return;
    editingTimers[id] = {
      name: timer.name || '',
      group: timer.group || '',
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
        fetch('/api/timer/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: edit.name, message: payload, interval: edit.interval, startAt: (prevTimers.find(t => t.id === id) || {}).startAt, group: edit.group }) }).then(r => r.json()),
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

  function addLogEntry(name, count, cc) {
    const now = new Date();
    logEntries = [{ time: now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0'), name, count, clientCount: cc }, ...logEntries.slice(0, 79)];
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
          if (prev && t.sendCount > prev.sendCount && t.active) addLogEntry(t.name || '定时器' + t.id, t.sendCount, cs.clientCount);
        }
        if (!sameStructure(prevTimers, ts.timers)) { timers = ts.timers; regroup(); }
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

<svelte:head><title>DuMiMessager — 推送</title></svelte:head>

<div class="mb-6">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <StatCard label="已连接客户端" value={clientCount} color="accent">
      <span slot="sub" class="inline-flex items-center gap-1.5 text-xs text-slate-500 mt-1">
        <span class="status-dot {clientCount > 0 ? 'online' : 'offline'}"></span>在线
      </span>
    </StatCard>
    <StatCard label="活跃定时器" value={activeCount} sub={'共 ' + totalTimers + ' 个定时器'} color="blue" />
    <StatCard label="累计广播次数" value={totalSends} sub="所有定时器合计" color="amber" />
  </div>
</div>

<Panel title="添加定时广播">
  <div class="p-5">
    <div class="mb-4">
      <span class="block text-xs text-slate-400 mb-2 font-medium">定时器名称</span>
      <input type="text" bind:value={nameValue} placeholder="例如: 每日推送" required
        class="w-full px-3 py-2 glass-subtle rounded-xl text-sm text-slate-200 placeholder-slate-600
               focus:outline-none focus:border-accent-500/40 focus:ring-2 focus:ring-accent-500/10 transition-all" />
    </div>
    <div class="mb-4">
      <span class="block text-xs text-slate-400 mb-2 font-medium">分组（可选）</span>
      <input type="text" bind:value={groupValue} placeholder="留空则归入「默认分组」"
        class="w-full px-3 py-2 glass-subtle rounded-xl text-sm text-slate-200 placeholder-slate-600
               focus:outline-none focus:border-accent-500/40 focus:ring-2 focus:ring-accent-500/10 transition-all"
        list="group-suggestions" />
      <datalist id="group-suggestions">
        {#each [...new Set(prevTimers.map(t => t.group).filter(Boolean))] as g}
          <option value={g}></option>
        {/each}
      </datalist>
    </div>
    <div class="mb-4">
      <span class="block text-xs text-slate-400 mb-2 font-medium">消息内容（JSON）</span>
      <JsonEditor bind:this={editorComponent} value={editorValue} onChange={v => editorValue = v} height="100px" />
    </div>
    <div class="flex gap-4 items-end">
      <div class="w-44">
        <span class="block text-xs text-slate-400 mb-2 font-medium">发送间隔（秒）</span>
        <input type="number" bind:value={intervalValue} min="1" max="3600"
          class="w-full px-3 py-2 glass-subtle rounded-xl text-sm text-slate-200
                 focus:outline-none focus:border-accent-500/40 focus:ring-2 focus:ring-accent-500/10 transition-all" />
      </div>
      <div class="text-xs text-slate-500 pb-2">最低 1 秒，建议 ≥ 5 秒</div>
    </div>
    <div class="flex gap-2.5 mt-4">
      <button onclick={addTimer}
        class="px-5 py-2.5 bg-accent-500 text-white rounded-xl text-sm font-medium
               hover:bg-accent-600 transition-all duration-200 shadow-glow active:scale-[0.97]"
      >添加并启动</button>
      <button onclick={formatJson}
        class="px-5 py-2.5 glass-subtle text-slate-300 rounded-xl text-sm font-medium
               hover:bg-white/10 hover:text-white transition-all duration-200 active:scale-[0.97]"
      >格式化 JSON</button>
    </div>
    {#if resultMsg}
      <div class="mt-4 px-4 py-3 rounded-xl text-sm {resultType === 'success' ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}">{resultMsg}</div>
    {/if}
  </div>
</Panel>

<Panel title="定时器列表">
  {#if timers.length === 0}
    <Empty message="暂无定时广播任务，请添加一个" />
  {:else}
    <div class="p-5 space-y-4">
      {#each groupedTimers as [groupName, groupTimers]}
        {@const collapsed = collapsedGroups[groupName] === true}
        <div class="glass-subtle rounded-2xl overflow-hidden">
          <div class="flex items-center px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
            <button
              onclick={() => { collapsedGroups[groupName] = !collapsed; collapsedGroups = collapsedGroups; }}
              class="flex-1 flex items-center gap-2 text-left bg-transparent border-none p-0 cursor-pointer"
            >
              <span class="text-xs text-slate-500 transition-transform duration-200 {collapsed ? '' : 'rotate-90'}">▶</span>
              <span class="text-sm font-semibold text-slate-200">{groupName}</span>
              <span class="text-xs text-slate-500 ml-auto mr-3">{groupTimers.filter(t => t.active).length}/{groupTimers.length} 活跃</span>
            </button>
            <div title={groupTimers.some(t => t.active) ? "停止此分组所有定时器" : "启动此分组所有定时器"}>
              <Toggle checked={groupTimers.some(t => t.active)} onChanged={v => toggleGroup(groupName, v)} />
            </div>
          </div>
          {#if !collapsed}
            <div class="p-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each groupTimers as t}
                  {@const editing = editingTimers[t.id] !== undefined}
                  {@const edit = editingTimers[t.id]}
                  <div class="glass rounded-2xl p-4 transition-all duration-200 hover:shadow-glass-lg
                              {t.active ? 'border-l-[3px] border-l-accent-500' : 'border-l-[3px] border-l-slate-700'}">
                    <div class="flex items-center justify-between mb-2.5">
                      <span class="font-semibold text-sm text-slate-100">{t.name || '定时器' + t.id}</span>
                      <Badge text={t.active ? '运行中' : '已停止'} variant={t.active ? 'success' : 'default'} />
                    </div>
                    {#if editing}
                      <div class="mb-2">
                        <span class="text-xs text-slate-500 block mb-1">名称</span>
                        <input type="text" bind:value={edit.name} placeholder="例如: 每日推送" required
                          class="w-full px-2 py-1.5 glass-subtle rounded-lg text-xs text-slate-200 focus:outline-none focus:border-accent-500/40" />
                      </div>
                      <div class="mb-2">
                        <span class="text-xs text-slate-500 block mb-1">分组</span>
                        <input type="text" bind:value={edit.group} placeholder="留空则归入「默认分组」"
                          class="w-full px-2 py-1.5 glass-subtle rounded-lg text-xs text-slate-200 focus:outline-none focus:border-accent-500/40"
                          list={'group-edit-' + t.id} />
                        <datalist id={'group-edit-' + t.id}>
                          {#each [...new Set(prevTimers.map(t => t.group).filter(Boolean))] as g}
                            <option value={g}></option>
                          {/each}
                        </datalist>
                      </div>
                      <div class="mb-2">
                        <span class="text-xs text-slate-500 block mb-1">消息内容（JSON）</span>
                        <JsonEditor value={edit.msg} onChange={v => edit.msg = v} height="100px" />
                      </div>
                      <div class="mb-2">
                        <span class="text-xs text-slate-500 block mb-1">发送间隔（秒）</span>
                        <input type="number" bind:value={edit.interval} min="1" max="3600"
                          class="w-28 px-2 py-1.5 glass-subtle rounded-lg text-xs text-slate-200 focus:outline-none focus:border-accent-500/40" />
                      </div>
                    {:else}
                      <div class="text-xs font-mono bg-slate-900/50 px-3 py-2 rounded-lg text-slate-400 truncate mb-2.5" title={JSON.stringify(t.message)}>{JSON.stringify(t.message)}</div>
                    {/if}
                    <div class="flex gap-4 text-xs text-slate-500 mb-3 flex-wrap">
                      <span>间隔: {t.intervalMs / 1000}s</span><span>已发送: {t.sendCount} 次</span>
                      {#if t.active}<span>已运行: {elapsed(t.startAt)}</span>{/if}
                    </div>
                    <div class="flex items-center gap-2">
                      <Toggle checked={t.active} onChanged={v => toggleTimer(t.id, v)} />
                      {#if editing}
                        <button onclick={() => updateTimer(t.id)}
                          class="px-3 py-1.5 bg-accent-500 text-white rounded-lg text-xs font-medium
                                 hover:bg-accent-600 transition-all duration-200 active:scale-[0.97]"
                        >更新</button>
                        <button onclick={() => cancelEdit(t.id)}
                          class="px-3 py-1.5 glass-subtle text-slate-400 rounded-lg text-xs
                                 hover:bg-white/10 hover:text-slate-200 transition-all duration-200"
                        >取消</button>
                      {:else}
                        <button onclick={() => startEdit(t.id)}
                          class="px-3 py-1.5 glass-subtle text-slate-400 rounded-lg text-xs font-medium
                                 hover:bg-white/10 hover:text-slate-200 transition-all duration-200"
                        >编辑</button>
                      {/if}
                      <button onclick={() => { confirmDeleteId = t.id; }}
                        class="px-3 py-1.5 glass-subtle text-red-400 rounded-lg text-xs border border-red-500/20
                               hover:bg-red-500/10 hover:border-red-500/40 transition-all duration-200 ml-auto"
                      >删除</button>
                    </div>
                    {#if confirmDeleteId === t.id}
                      <div class="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <span class="text-xs text-red-300 flex-1">确定要删除此定时器吗？</span>
                        <button onclick={() => { removeTimer(t.id); confirmDeleteId = null; }}
                          class="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium
                                 hover:bg-red-600 transition-all duration-200"
                        >确认删除</button>
                        <button onclick={() => { confirmDeleteId = null; }}
                          class="px-3 py-1 glass-subtle text-slate-400 rounded-lg text-xs
                                 hover:bg-white/10 hover:text-slate-200 transition-all duration-200"
                        >取消</button>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</Panel>

<Panel title="广播日志">
  {#if logEntries.length === 0}
    <Empty message="暂无广播记录" />
  {:else}
    <div class="max-h-[300px] overflow-y-auto">
      {#each logEntries as entry}
        <div class="px-5 py-2 text-xs border-b border-white/5 last:border-b-0 flex gap-2.5 items-center hover:bg-white/[0.02] transition-colors">
          <span class="text-slate-500 whitespace-nowrap tabular-nums">{entry.time}</span>
          <span class="text-accent-400 font-medium">{entry.name}</span>
          <span class="text-slate-400">第 <span class="text-accent-400 font-medium">{entry.count}</span> 次广播</span>
          <span class="text-slate-500">→ {entry.clientCount} 个客户端</span>
        </div>
      {/each}
    </div>
  {/if}
</Panel>
