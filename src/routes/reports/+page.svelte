<script>
  import { onMount, onDestroy } from 'svelte';
  import { timePart, datePart, escHtml, copyToClipboard } from '$lib/utils/helpers.js';
  import StatCard from '$lib/components/StatCard.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import JsonEditor from '$lib/components/JsonEditor.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import Empty from '$lib/components/Empty.svelte';

  let totalCount = 0, todayCount = 0, todayDate = '--', lastTime = '--', lastIp = '--';
  let reportEntries = [], wsMessages = [], wsConnected = false, allMessages = [];

  let rules = [], editingRuleId = null;
  let ruleNameValue = '', rulePatternValue = '', ruleReplyValue = '', ruleEnabled = true;
  let ruleNameEditor, rulePatternEditor, ruleReplyEditor;

  let inlineEdits = {};

  let testEditor, testBody = '', testResult = '', testSending = false;

  let expandedRows = {};

  let wsRef, refreshTimeout, rulesTimeout;
  let wsDestroyed = false;
  let reportsMounted = false;

  async function connectWS() {
    if (wsDestroyed) return;
    try {
      const tokenRes = await fetch('/api/auth/ws-token');
      const tokenData = await tokenRes.json();
      if (!tokenData.success) {
        // 未登录，稍后重试
        if (!wsDestroyed) setTimeout(connectWS, 10000);
        return;
      }
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsRef = new WebSocket(protocol + '//' + location.host + '/ws?token=' + tokenData.token);
    } catch {
      if (!wsDestroyed) setTimeout(connectWS, 5000);
      return;
    }
    wsRef.onopen = () => { wsConnected = true; };
    wsRef.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'welcome') return;
        if (data.type !== 'ws-message') return;
        wsMessages = [...wsMessages, { time: new Date().toISOString(), data }];
        if (wsMessages.length > 200) wsMessages = wsMessages.slice(-200);
        mergeMessages();
      } catch {}
    };
    wsRef.onclose = () => {
      wsConnected = false;
      if (!wsDestroyed) setTimeout(connectWS, 5000);
    };
    wsRef.onerror = () => {
      wsConnected = false;
    };
  }

  function mergeMessages() {
    const httpRows = reportEntries.map(r => ({
      time: r.time, source: 'http', ip: r.ip || 'unknown',
      body: typeof r.body === 'string' ? r.body : JSON.stringify(r.body, null, 2)
    }));
    const wsRows = wsMessages.map(m => {
      const isWsMsg = m.data && typeof m.data === 'object' && m.data.type === 'ws-message';
      return {
        time: m.time,
        source: isWsMsg ? 'ws' : 'reply',
        ip: isWsMsg ? '客户端 #' + (m.data.clientId || '?') : '-',
        body: isWsMsg ? (typeof m.data.data === 'string' ? m.data.data : JSON.stringify(m.data.data, null, 2))
              : (typeof m.data === 'string' ? m.data : JSON.stringify(m.data, null, 2))
      };
    });
    allMessages = [...httpRows, ...wsRows].sort((a, b) => b.time.localeCompare(a.time));
  }

  async function refreshAll() {
    if (!reportsMounted) return;
    try {
      const res = await fetch('/api/reports?limit=100');
      const data = await res.json();
      if (!data.success) return;
      reportEntries = data.reports || [];
      totalCount = data.total || 0;
      const today = new Date().toISOString().slice(0, 10);
      todayCount = reportEntries.filter(r => r.time?.slice(0, 10) === today).length;
      todayDate = today;
      if (reportEntries.length > 0) {
        lastTime = timePart(reportEntries[0].time);
        lastIp = '来自 ' + (reportEntries[0].ip || 'unknown');
      }
      mergeMessages();
    } catch {}
  }

  async function sendTest() {
    const raw = testEditor ? testEditor.getValue().trim() : testBody.trim();
    if (!raw) { testResult = '请输入数据'; return; }
    let body;
    try { body = JSON.parse(raw); } catch { body = { data: raw }; }
    testSending = true; testResult = '发送中...';
    try {
      const res = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { testResult = '已发送'; if (testEditor) testEditor.setValue(''); else testBody = ''; setTimeout(refreshAll, 500); }
      else testResult = '发送失败';
    } catch { testResult = '网络错误'; }
    testSending = false;
    setTimeout(() => { testResult = ''; }, 3000);
  }

  async function refreshRules() {
    if (!reportsMounted || editingRuleId) return;
    try {
      const res = await fetch('/api/auto-reply/rules');
      const data = await res.json();
      if (data.success) rules = data.rules || [];
    } catch {}
  }

  function clearForm() {
    if (ruleNameEditor) ruleNameEditor.setValue('');
    if (rulePatternEditor) rulePatternEditor.setValue('');
    if (ruleReplyEditor) ruleReplyEditor.setValue('');
    ruleNameValue = rulePatternValue = ruleReplyValue = '';
    ruleEnabled = true; editingRuleId = null;
  }

  async function saveRule() {
    const name = ruleNameEditor ? ruleNameEditor.getValue().trim() : ruleNameValue;
    const pattern = rulePatternEditor ? rulePatternEditor.getValue().trim() : rulePatternValue;
    const reply = ruleReplyEditor ? ruleReplyEditor.getValue().trim() : ruleReplyValue;
    if (!name || !pattern || !reply) { alert('请填写完整'); return; }
    try {
      const res = await fetch('/api/auto-reply/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, pattern, reply, enabled: ruleEnabled }) });
      if ((await res.json()).success) { clearForm(); refreshRules(); }
    } catch {}
  }

  function startEdit(id) {
    if (editingRuleId && editingRuleId !== id) { delete inlineEdits[editingRuleId]; inlineEdits = inlineEdits; }
    editingRuleId = id;
    const rule = rules.find(r => r.id === id);
    if (rule) { inlineEdits[id] = { name: rule.name, pattern: rule.pattern, reply: rule.reply }; inlineEdits = inlineEdits; }
  }
  function cancelEdit(id) { delete inlineEdits[id]; inlineEdits = inlineEdits; if (editingRuleId === id) editingRuleId = null; }

  async function saveEdit(id) {
    const vals = inlineEdits[id]; if (!vals) return;
    try {
      const res = await fetch('/api/auto-reply/rules/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vals) });
      if ((await res.json()).success) { delete inlineEdits[id]; inlineEdits = inlineEdits; editingRuleId = null; refreshRules(); }
    } catch {}
  }

  async function toggleRule(id, enabled) {
    try { await fetch('/api/auto-reply/rules/' + id + '/toggle', { method: 'POST' }); refreshRules(); } catch {}
  }
  async function deleteRule(id) {
    if (!confirm('确定要删除该规则吗？')) return;
    try { await fetch('/api/auto-reply/rules/' + id, { method: 'DELETE' }); refreshRules(); } catch {}
  }

  function toggleExpand(i) { expandedRows[i] = !expandedRows[i]; expandedRows = expandedRows; }
  async function copyBody(idx) {
    const row = allMessages[idx]; if (!row) return;
    try { await copyToClipboard(row.body); } catch {}
  }

  async function scheduleReportsRefresh() {
    if (!reportsMounted) return;
    await refreshAll();
    if (reportsMounted) refreshTimeout = setTimeout(scheduleReportsRefresh, 3000);
  }
  async function scheduleRulesRefresh() {
    if (!reportsMounted) return;
    await refreshRules();
    if (reportsMounted) rulesTimeout = setTimeout(scheduleRulesRefresh, 5000);
  }

  onMount(() => {
    reportsMounted = true;
    connectWS();
    scheduleReportsRefresh();
    scheduleRulesRefresh();
  });
  onDestroy(() => {
    reportsMounted = false;
    wsDestroyed = true;
    if (wsRef) {
      wsRef.onclose = null;
      wsRef.onerror = null;
      wsRef.close();
    }
    if (refreshTimeout) clearTimeout(refreshTimeout);
    if (rulesTimeout) clearTimeout(rulesTimeout);
  });
</script>

<svelte:head><title>DuMiMessager — 回复</title></svelte:head>

<div class="mb-6">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <StatCard label="累计收到" value={totalCount} color="accent" />
    <StatCard label="今日收到" value={todayCount} sub={todayDate} color="blue" />
    <StatCard label="最新一条" value={lastTime} sub={lastIp} color="amber" />
  </div>
</div>

<Panel title="发送测试数据">
  <div class="p-5 flex gap-3 items-start">
    <div class="flex-1 min-w-0">
      <JsonEditor bind:this={testEditor} value={testBody} onChange={v => testBody = v} height="200px" />
    </div>
    <div class="flex gap-2.5 items-center pt-0">
      <button onclick={sendTest} disabled={testSending}
        class="px-5 py-2 bg-accent-500 text-white rounded-xl text-sm font-medium
               hover:bg-accent-600 disabled:bg-slate-700 disabled:text-slate-500 transition-all duration-200 whitespace-nowrap active:scale-[0.97]"
      >发送测试</button>
      {#if testResult}
        <span class="text-xs whitespace-nowrap {testResult === '已发送' ? 'text-accent-400' : testResult === '发送中...' ? 'text-slate-500' : 'text-red-400'}">{testResult}</span>
      {/if}
    </div>
  </div>
</Panel>

<Panel title="接收消息列表">
  {#snippet badge()}{allMessages.length} 条{/snippet}
  <div class="flex items-center gap-2 px-5 py-2 text-xs">
    <span class="inline-flex items-center gap-1.5 text-slate-500">
      <span class="status-dot {wsConnected ? 'online' : 'offline'}"></span>
      {wsConnected ? 'WS 已连接' : 'WS 断开'}
    </span>
  </div>
  {#if allMessages.length === 0}
    <Empty message="暂无数据，等待消息" />
  {:else}
    <div class="max-h-[500px] overflow-y-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="sticky top-0 bg-slate-800/80 backdrop-blur-sm text-left">
            <th class="px-5 py-2.5 text-xs font-medium text-slate-500 w-[100px]">时间</th>
            <th class="px-5 py-2.5 text-xs font-medium text-slate-500 w-[70px]">来源</th>
            <th class="px-5 py-2.5 text-xs font-medium text-slate-500 w-[130px]">来源 IP</th>
            <th class="px-5 py-2.5 text-xs font-medium text-slate-500">消息内容</th>
          </tr>
        </thead>
        <tbody>
          {#each allMessages as r, i}
            {@const truncated = r.body.length > 120}
            <tr class="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
              <td class="px-5 py-2.5 text-xs text-slate-500 whitespace-nowrap align-top tabular-nums">
                {timePart(r.time)}<br><span class="text-[10px] text-slate-600">{datePart(r.time)}</span>
              </td>
              <td class="px-5 py-2.5 align-top">
                <span class="inline-block text-[10px] px-1.5 py-px rounded font-medium whitespace-nowrap border
                  {r.source === 'http' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                  {r.source === 'ws' ? 'bg-accent-500/10 text-accent-400 border-accent-500/20' : ''}
                  {r.source === 'reply' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                ">{r.source === 'http' ? 'HTTP' : r.source === 'reply' ? '自动回复' : 'WS'}</span>
              </td>
              <td class="px-5 py-2.5 text-xs font-mono text-accent-400 whitespace-nowrap align-top">{escHtml(r.ip)}</td>
              <td class="px-5 py-2.5 align-top">
                {#if truncated && !expandedRows[i]}
                  <div class="text-xs font-mono text-slate-400 max-h-[60px] overflow-hidden whitespace-pre-wrap">{escHtml(r.body.slice(0, 120))}...</div>
                  <button onclick={() => toggleExpand(i)} class="text-[11px] text-accent-400 hover:underline mt-1 bg-transparent border-none p-0 cursor-pointer">展开</button>
                {:else}
                  <div class="text-xs font-mono text-slate-400 whitespace-pre-wrap">{escHtml(r.body)}</div>
                  {#if truncated}
                    <button onclick={() => toggleExpand(i)} class="text-[11px] text-accent-400 hover:underline mt-1 bg-transparent border-none p-0 cursor-pointer">收起</button>
                  {/if}
                {/if}
                <button onclick={() => copyBody(i)} class="text-[11px] text-slate-500 border border-white/10 rounded-lg px-1.5 py-px ml-1 hover:text-accent-400 hover:border-accent-500/30 bg-transparent cursor-pointer transition-all duration-200">复制</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Panel>

<Panel title="自动回复规则">
  {#snippet badge()}{rules.length} 条规则{/snippet}
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3 p-5 border-b border-white/5 items-start">
    <div class="flex flex-col gap-1 min-w-0">
      <span class="text-xs text-slate-400 font-medium">规则名称</span>
      <JsonEditor bind:this={ruleNameEditor} value={ruleNameValue} onChange={v => ruleNameValue = v} height="84px" />
    </div>
    <div class="flex flex-col gap-1 min-w-0">
      <span class="text-xs text-slate-400 font-medium">正则匹配</span>
      <JsonEditor bind:this={rulePatternEditor} value={rulePatternValue} onChange={v => rulePatternValue = v} height="84px" />
    </div>
    <div class="flex flex-col gap-1 min-w-0">
      <span class="text-xs text-slate-400 font-medium">自动回复内容</span>
      <JsonEditor bind:this={ruleReplyEditor} value={ruleReplyValue} onChange={v => ruleReplyValue = v} height="84px" />
    </div>
    <div class="flex items-center gap-2 pt-4 md:col-span-3">
      <label class="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
        <input type="checkbox" bind:checked={ruleEnabled} class="accent-accent-500" /> 启用
      </label>
      <button onclick={saveRule}
        class="px-4 py-1.5 bg-accent-500 text-white rounded-lg text-xs font-medium
               hover:bg-accent-600 transition-all duration-200 active:scale-[0.97]"
      >添加规则</button>
      {#if editingRuleId}
        <button onclick={clearForm}
          class="px-4 py-1.5 glass-subtle text-slate-400 rounded-lg text-xs
                 hover:bg-white/10 hover:text-slate-200 transition-all duration-200"
        >取消</button>
      {/if}
    </div>
  </div>

  {#if rules.length === 0}
    <Empty message="暂无自动回复规则" />
  {:else}
    <div>
      {#each rules as r}
        {@const editing = inlineEdits[r.id] !== undefined}
        {@const ev = inlineEdits[r.id] || {}}
        {@const timeStr = r.lastMatch ? new Date(r.lastMatch).toLocaleString('zh-CN') : '--'}
        <div class="px-5 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors {editing ? 'bg-accent-500/[0.03]' : ''}">
          <div class="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_2fr_auto] gap-3 items-start">
            <div class="min-w-0">
              {#if editing}
                <textarea bind:value={ev.name}
                  class="w-full p-2 glass-subtle rounded-lg text-xs resize-y text-slate-200 focus:outline-none focus:border-accent-500/40 min-h-[84px]"></textarea>
              {:else}
                <span class="font-medium text-sm text-slate-100">{r.name}</span>
                <div class="text-[11px] text-slate-500 mt-0.5">匹配 <span class="text-accent-400 font-medium">{r.matchCount}</span> 次 · {timeStr}</div>
              {/if}
            </div>
            <div class="min-w-0">
              {#if editing}
                <textarea bind:value={ev.pattern}
                  class="w-full p-2 glass-subtle rounded-lg text-xs resize-y text-slate-200 focus:outline-none focus:border-accent-500/40 min-h-[84px]"></textarea>
              {:else}
                <span class="text-xs font-mono text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded-lg truncate block border border-accent-500/10" title={r.pattern}>{r.pattern}</span>
              {/if}
            </div>
            <div class="min-w-0">
              {#if editing}
                <textarea bind:value={ev.reply}
                  class="w-full p-2 glass-subtle rounded-lg text-xs resize-y text-slate-200 focus:outline-none focus:border-accent-500/40 min-h-[84px]"></textarea>
              {:else}
                <span class="text-xs text-slate-400 truncate block max-w-[320px]">{r.reply}</span>
              {/if}
            </div>
            <div class="flex items-center gap-1.5 whitespace-nowrap {editing ? 'pt-5' : ''}">
              <Toggle checked={r.enabled} onChanged={v => toggleRule(r.id, v)} />
              {#if editing}
                <button onclick={() => saveEdit(r.id)}
                  class="px-2.5 py-1 bg-accent-500 text-white rounded-lg text-[11px] font-medium
                         hover:bg-accent-600 transition-all duration-200 active:scale-[0.97]"
                >更新</button>
                <button onclick={() => cancelEdit(r.id)}
                  class="px-2.5 py-1 glass-subtle text-slate-400 rounded-lg text-[11px]
                         hover:bg-white/10 hover:text-slate-200 transition-all duration-200"
                >取消</button>
              {:else}
                <button onclick={() => startEdit(r.id)}
                  class="px-2.5 py-1 glass-subtle text-slate-400 rounded-lg text-[11px] font-medium
                         hover:bg-white/10 hover:text-slate-200 transition-all duration-200"
                >编辑</button>
              {/if}
              <button onclick={() => deleteRule(r.id)}
                class="px-2.5 py-1 glass-subtle text-red-400 rounded-lg text-[11px] border border-red-500/20
                       hover:bg-red-500/10 transition-all duration-200"
              >删除</button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</Panel>
