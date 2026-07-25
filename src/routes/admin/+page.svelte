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
  let clients = [];
  let timeout;
  let mounted = false;
  let prevClientIds = '';
  let editorComponent;
  let editorValue = '{\n  "type": "broadcast",\n  "message": "这是一条测试消息"\n}';

  let clientForms = {};
  let clientResults = {};

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
      <div class="flex gap-2.5 mt-4">
        <button onclick={sendMessage} disabled={sending}
          class="px-5 py-2.5 bg-accent-500 text-white rounded-xl text-sm font-medium
                 hover:bg-accent-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
                 transition-all duration-200 shadow-glow active:scale-[0.97]"
        >{sending ? '发送中...' : '发送到所有客户端'}</button>
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
    <div class="max-h-[420px] overflow-y-auto">
      {#each clients as c}
        {@const uptime = elapsed(Date.parse(c.connectedAt))}
        {@const form = getClientForm(c.id)}
        <div class="px-5 py-3.5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
          <div class="flex items-center gap-3 flex-wrap">
            <span class="status-dot online"></span>
            <span class="font-semibold text-sm text-accent-400">#{c.id}</span>
            <span class="text-sm text-slate-400 font-mono">{c.ip}</span>
            <span class="text-xs text-slate-500">已连接 {uptime}</span>
            <div class="flex-1"></div>
            <button onclick={() => toggleSendForm(c.id)}
              class="px-4 py-1.5 bg-accent-500 text-white rounded-lg text-xs font-medium
                     hover:bg-accent-600 transition-all duration-200 active:scale-[0.97]"
            >{form._open ? '收起' : '发送消息'}</button>
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
