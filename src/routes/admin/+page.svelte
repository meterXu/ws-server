<script>
  import { onMount, onDestroy } from 'svelte';
  import { elapsed } from '$lib/utils/helpers.js';
  import StatCard from '$lib/components/StatCard.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import JsonEditor from '$lib/components/JsonEditor.svelte';
  import Empty from '$lib/components/Empty.svelte';

  let clientCount = 0;
  let lastBroadcast = null;
  let resultMsg = '';
  let resultType = '';
  let sending = false;
  let sendingSelected = false;
  let clients = [];
  let timeout;
  let mounted = false;
  let prevClientIds = '';
  let editorComponent;
  let editorValue = '{\n  "type": "broadcast",\n  "message": "这是一条测试消息"\n}';

  let clientForms = {};
  let clientResults = {};

  // Multi-select state
  let selectedClients = new Set();
  let lastSelectedAll = false;

  function getClientForm(id) {
    if (!clientForms[id]) {
      clientForms[id] = { msg: JSON.stringify({type: 'message', content: 'hello'}, null, 2), sending: false };
    }
    return clientForms[id];
  }

  function showClientResult(id, type, msg) {
    clientResults[id] = { type, msg };
    clientResults = clientResults;
    setTimeout(() => {
      delete clientResults[id];
      clientResults = clientResults;
    }, 5000);
  }

  function handleEditorChange(val) { editorValue = val; }
  function formatJson() {
    if (!editorComponent) return;
    const raw = editorComponent.getValue().trim();
    if (!raw) return;
    try { editorComponent.setValue(JSON.stringify(JSON.parse(raw), null, 2)); }
    catch { showResult('error', 'JSON 格式无效，无法格式化'); }
  }

  function showResult(type, msg) {
    resultType = type;
    resultMsg = msg;
    setTimeout(() => { resultType = ''; resultMsg = ''; }, 5000);
  }

  async function sendMessage() {
    const raw = editorComponent ? editorComponent.getValue().trim() : editorValue.trim();
    if (!raw) { showResult('error', '消息内容不能为空'); return; }
    let payload;
    try { payload = JSON.parse(raw); } catch {
      showResult('error', 'JSON 格式无效，请检查后重试'); return;
    }
    sending = true;
    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        lastBroadcast = payload;
        showResult('success', '发送成功！已向 ' + data.clientCount + ' 个客户端广播');
      } else {
        showResult('error', '发送失败: ' + data.message);
      }
    } catch (err) {
      showResult('error', '请求失败: ' + err.message);
    } finally {
      sending = false;
      refreshClients();
    }
  }

  // Send to selected clients using the shared editor content
  async function sendToSelected() {
    const raw = editorComponent ? editorComponent.getValue().trim() : editorValue.trim();
    if (!raw) { showResult('error', '消息内容不能为空'); return; }
    let payload;
    try { payload = JSON.parse(raw); } catch {
      showResult('error', 'JSON 格式无效，请检查后重试'); return;
    }
    if (selectedClients.size === 0) { showResult('error', '请先选择目标客户端'); return; }
    sendingSelected = true;
    try {
      const res = await fetch('/api/client/send-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: [...selectedClients], data: payload })
      });
      const data = await res.json();
      if (data.success) {
        showResult('success', `发送成功！已向 ${data.sent} 个客户端发送` + (data.failed > 0 ? `，${data.failed} 个失败` : ''));
      } else {
        showResult('error', '发送失败: ' + data.message);
      }
    } catch (err) {
      showResult('error', '请求失败: ' + err.message);
    } finally {
      sendingSelected = false;
    }
  }

  // Toggle single client selection
  function toggleSelect(id) {
    const next = new Set(selectedClients);
    if (next.has(id)) {
      next.delete(id);
      lastSelectedAll = false;
    } else {
      next.add(id);
    }
    selectedClients = next;
  }

  // Select all / deselect all
  function toggleSelectAll() {
    if (lastSelectedAll) {
      selectedClients = new Set();
      lastSelectedAll = false;
    } else {
      const onlineIds = clients.filter(c => c.isOpen).map(c => c.id);
      selectedClients = new Set(onlineIds);
      lastSelectedAll = true;
    }
  }

  function toggleSendForm(id) {
    const form = getClientForm(id);
    form._open = !form._open;
    clientForms = clientForms;
  }

  async function sendToClient(id) {
    const form = getClientForm(id);
    const raw = form.msg.trim();
    if (!raw) { showClientResult(id, 'error', '消息内容不能为空'); return; }
    let payload;
    try { payload = JSON.parse(raw); } catch {
      showClientResult(id, 'error', 'JSON 格式无效'); return;
    }
    form.sending = true;
    clientForms = clientForms;
    try {
      const res = await fetch('/api/client/send/' + id, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      showClientResult(id, data.success ? 'success' : 'error', data.message || '发送成功');
    } catch (err) {
      showClientResult(id, 'error', '请求失败: ' + err.message);
    } finally {
      form.sending = false;
      clientForms = clientForms;
    }
  }

  async function refreshClients() {
    if (!mounted) return;
    try {
      const [countRes, detailRes] = await Promise.all([
        fetch('/api/clients'), fetch('/api/clients/detail')
      ]);
      const countData = await countRes.json();
      const detailData = await detailRes.json();
      clientCount = countData.clientCount;
      if (detailData.success) {
        const ids = detailData.clients.map(c => c.id).join(',');
        if (ids !== prevClientIds) {
          clients = detailData.clients;
          prevClientIds = ids;
          // Clean up selected clients that no longer exist
          const currentIds = new Set(detailData.clients.filter(c => c.isOpen).map(c => c.id));
          const next = new Set([...selectedClients].filter(id => currentIds.has(id)));
          if (next.size !== selectedClients.size) {
            selectedClients = next;
            lastSelectedAll = false;
          }
        }
      }
    } catch {}
  }

  async function scheduleRefresh() {
    if (!mounted) return;
    await refreshClients();
    if (mounted) timeout = setTimeout(scheduleRefresh, 5000);
  }

  onMount(() => { mounted = true; scheduleRefresh(); });
  onDestroy(() => { mounted = false; if (timeout) clearTimeout(timeout); });
</script>

<svelte:head><title>信使 — 广播</title></svelte:head>

<div class="mb-6">
  <div class="grid grid-cols-4 gap-4">
    <StatCard label="已连接客户端" value={clientCount} sub="实时更新" color="accent" />
  </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
  <Panel title="消息编辑">
    <div class="p-5">
      <JsonEditor bind:this={editorComponent} value={editorValue} onChange={handleEditorChange} height="160px" />
      <div class="flex gap-2.5 mt-4 flex-wrap">
        <button onclick={sendMessage} disabled={sending}
          class="px-5 py-2.5 bg-accent-500 text-white rounded-xl text-sm font-medium
                 hover:bg-accent-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
                 transition-all duration-200 shadow-glow active:scale-[0.97]"
        >{sending ? '发送中...' : '发送到所有客户端'}</button>
        <button onclick={sendToSelected} disabled={sendingSelected || selectedClients.size === 0}
          class="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium
                 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
                 transition-all duration-200 active:scale-[0.97]"
        >{sendingSelected ? '发送中...' : '发送到已选 (' + selectedClients.size + ')'}</button>
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

  <Panel title="上次广播的消息">
    <div class="p-5">
      {#if lastBroadcast}
        <pre class="text-sm text-slate-300 whitespace-pre-wrap break-all font-mono bg-slate-900/50 rounded-xl p-4">{JSON.stringify(lastBroadcast, null, 2)}</pre>
      {:else}
        <div class="text-slate-600 text-sm text-center py-10">暂无广播记录</div>
      {/if}
    </div>
  </Panel>
</div>

<Panel title="已连接客户端">
  {#snippet badge()}共 {clients.length} 个{/snippet}
  {#if clients.length === 0}
    <Empty message="暂无连接的客户端" />
  {:else}
    <!-- Toolbar: select all -->
    <div class="px-5 py-2 border-b border-white/5 flex items-center gap-3">
      <button onclick={toggleSelectAll}
        class="text-xs text-slate-400 hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer"
      >{lastSelectedAll ? '取消全选' : '全选在线'}</button>
      {#if selectedClients.size > 0}
        <span class="text-xs text-accent-400">已选 {selectedClients.size} 个</span>
      {/if}
    </div>
    <div class="max-h-[420px] overflow-y-auto">
      {#each clients as c}
        {@const uptime = elapsed(Date.parse(c.connectedAt))}
        {@const form = getClientForm(c.id)}
        {@const checked = selectedClients.has(c.id)}
        <div class="px-5 py-3.5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors
                    {checked ? 'bg-accent-500/[0.04]' : ''}">
          <div class="flex items-center gap-3 flex-wrap">
            {#if c.isOpen}
              <label class="flex items-center cursor-pointer" title="选择此客户端">
                <input
                  type="checkbox"
                  checked={checked}
                  onchange={() => toggleSelect(c.id)}
                  class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-accent-500
                         focus:ring-accent-500/30 focus:ring-1 cursor-pointer accent-accent-500"
                />
              </label>
            {:else}
              <span class="w-3.5 h-3.5 block"></span>
            {/if}
            <span class="status-dot {c.isOpen ? 'online' : 'offline'}"></span>
            <span class="font-semibold text-sm text-accent-400">#{c.id}</span>
            <span class="text-sm text-slate-400 font-mono">{c.ip}</span>
            <span class="text-xs text-slate-500">已连接 {uptime}</span>
            <div class="flex-1"></div>
            {#if c.isOpen}
              <button onclick={() => toggleSendForm(c.id)}
                class="px-4 py-1.5 bg-accent-500 text-white rounded-lg text-xs font-medium
                       hover:bg-accent-600 transition-all duration-200 active:scale-[0.97]"
              >{form._open ? '收起' : '发送消息'}</button>
            {/if}
          </div>
          {#if form._open}
            <div class="mt-2 p-3 glass-subtle rounded-xl">
              <textarea
                bind:value={form.msg}
                class="w-full h-20 p-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm font-mono resize-y
                       text-slate-200 placeholder-slate-600
                       focus:outline-none focus:border-accent-500/40 focus:ring-2 focus:ring-accent-500/10 transition-all"
              ></textarea>
              <div class="flex gap-2 mt-2">
                <button onclick={() => sendToClient(c.id)} disabled={form.sending}
                  class="px-4 py-1.5 bg-accent-500 text-white rounded-lg text-xs font-medium
                         hover:bg-accent-600 disabled:bg-slate-700 disabled:text-slate-500 transition-all duration-200"
                >{form.sending ? '发送中...' : '发送'}</button>
                <button onclick={() => toggleSendForm(c.id)}
                  class="px-4 py-1.5 glass-subtle text-slate-400 rounded-lg text-xs font-medium
                         hover:bg-white/10 hover:text-slate-200 transition-all duration-200"
                >取消</button>
              </div>
              {#if clientResults[c.id]}
                <div class="mt-2 px-3 py-2 rounded-lg text-xs {clientResults[c.id].type === 'success' ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}">
                  {clientResults[c.id].msg}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</Panel>
