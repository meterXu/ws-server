<script>
  import { onMount, onDestroy } from 'svelte';
  import { fmtBytes, fmtUptime, barColor } from '$lib/utils/helpers.js';
  import StatCard from '$lib/components/StatCard.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import Empty from '$lib/components/Empty.svelte';

  let clientCount = 0;
  let cpuUsage = '--';
  let cpuModel = '--';
  let heapUsed = '--';
  let heapTotal = '--';
  let uptime = '--';
  let systemMem = '--';
  let clients = [];
  let openCount = 0;
  let logs = [];
  let resourceBars = [];
  let timeout;
  let mounted = false;

  function fmtTime(iso) {
    if (!iso) return '--';
    return new Date(iso).toLocaleTimeString('zh-CN');
  }

  async function refreshAll() {
    if (!mounted) return;
    try {
      const [cd, ss, lg] = await Promise.all([
        fetch('/api/clients/detail').then(r => r.json()).catch(() => null),
        fetch('/api/system/stats').then(r => r.json()).catch(() => null),
        fetch('/api/logs?limit=50').then(r => r.json()).catch(() => null)
      ]);

      if (cd && cd.success) {
        clients = cd.clients || [];
        openCount = clients.filter(c => c.isOpen).length;
        clientCount = openCount;
      }

      if (ss && ss.success) {
        const stats = ss.stats;
        cpuUsage = stats.cpu.usagePercent + '%';
        cpuModel = stats.cpu.cores + ' 核 · ' + stats.cpu.model;
        heapUsed = fmtBytes(stats.memory.heapUsedMB);
        heapTotal = '总量 ' + fmtBytes(stats.memory.heapTotalMB);
        uptime = fmtUptime(stats.uptime);
        systemMem = '系统内存 ' + Math.round(stats.memory.systemUsedPercent) + '%';

        resourceBars = [
          { label: 'CPU', pct: stats.cpu.usagePercent, detail: Math.round(stats.cpu.usagePercent) + '%' },
          { label: '堆内存 (Heap)', pct: stats.memory.heapTotalMB > 0 ? (stats.memory.heapUsedMB / stats.memory.heapTotalMB * 100) : 0, detail: fmtBytes(stats.memory.heapUsedMB) + ' / ' + fmtBytes(stats.memory.heapTotalMB) },
          { label: 'RSS', pct: stats.memory.systemTotalMB > 0 ? (stats.memory.rssMB / stats.memory.systemTotalMB * 100) : 0, detail: fmtBytes(stats.memory.rssMB) },
          { label: '系统内存', pct: stats.memory.systemUsedPercent, detail: fmtBytes(stats.memory.systemTotalMB - stats.memory.systemFreeMB) + ' / ' + fmtBytes(stats.memory.systemTotalMB) },
          { label: 'Load Average (1m/5m/15m)', pct: stats.cpu.loadAvg1m / stats.cpu.cores * 100, detail: stats.cpu.loadAvg1m.toFixed(2) + ' / ' + stats.cpu.loadAvg5m.toFixed(2) + ' / ' + stats.cpu.loadAvg15m.toFixed(2) }
        ];
      }

      if (lg && lg.success) {
        logs = lg.logs || [];
      }
    } catch {}
  }

  async function kickClient(id) {
    if (!confirm('确定要踢出客户端 #' + id + ' 吗？')) return;
    try {
      const res = await fetch('/api/clients/kick/' + id, { method: 'POST' });
      const data = await res.json();
      if (data.success) refreshAll();
    } catch {}
  }

  async function scheduleRefresh() {
    if (!mounted) return;
    await refreshAll();
    if (mounted) timeout = setTimeout(scheduleRefresh, 2000);
  }

  onMount(() => {
    mounted = true;
    scheduleRefresh();
  });

  onDestroy(() => {
    mounted = false;
    if (timeout) clearTimeout(timeout);
  });
</script>

<svelte:head>
  <title>🌾☠️信使 — 首页</title>
</svelte:head>

<div class="mb-6">
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard label="WebSocket 连接数" value={clientCount} sub="上限 1000" color="green" />
    <StatCard label="CPU 使用率" value={cpuUsage} sub={cpuModel} color="blue" />
    <StatCard label="堆内存" value={heapUsed} sub={heapTotal} color="amber" />
    <StatCard label="运行时间" value={uptime} sub={systemMem} color="red" />
  </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
  <Panel title="已连接客户端">
    {#snippet badge()}{openCount} 个在线{/snippet}
    {#if clients.length === 0}
      <Empty message="暂无客户端连接" />
    {:else}
      <div class="max-h-[280px] overflow-y-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="sticky top-0 bg-gray-50/80 text-left">
              <th class="px-5 py-2.5 text-xs font-medium text-gray-400">ID</th>
              <th class="px-5 py-2.5 text-xs font-medium text-gray-400">IP</th>
              <th class="px-5 py-2.5 text-xs font-medium text-gray-400">连接时间</th>
              <th class="px-5 py-2.5 text-xs font-medium text-gray-400">状态</th>
              <th class="px-5 py-2.5 text-xs font-medium text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {#each clients as c}
              <tr class="border-b border-gray-50 last:border-b-0">
                <td class="px-5 py-2.5 text-gray-700">#{c.id}</td>
                <td class="px-5 py-2.5 text-gray-600">{c.ip}</td>
                <td class="px-5 py-2.5 text-gray-500 text-xs">{fmtTime(c.connectedAt)}</td>
                <td class="px-5 py-2.5">
                  <span class="inline-flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full {c.isOpen ? 'bg-green-500' : 'bg-gray-300'}"></span>
                    <span class="text-xs {c.isOpen ? 'text-green-600' : 'text-gray-400'}">{c.isOpen ? '在线' : '离线'}</span>
                  </span>
                </td>
                <td class="px-5 py-2.5">
                  {#if c.isOpen}
                    <button
                      onclick={() => kickClient(c.id)}
                      class="px-3 py-1 border border-red-400 rounded text-xs text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    >踢出</button>
                  {:else}
                    <span class="text-xs text-gray-300">--</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Panel>

  <Panel title="消息日志">
    {#snippet badge()}最近 {logs.length} 条{/snippet}
    {#if logs.length === 0}
      <Empty message="暂无消息" />
    {:else}
      <div class="max-h-[280px] overflow-y-auto">
        {#each logs as l}
          {@const isSend = l.type === 'send'}
          {@const detailText = isSend
            ? '→ ' + l.clientCount + ' 客户端, ' + (l.bytes || 0) + ' B: ' + (typeof l.data === 'string' ? l.data : JSON.stringify(l.data)).slice(0, 80)
            : '← 来自 #' + l.clientId + ' ' + l.ip + ': ' + (l.data || '').slice(0, 80)}
          <div class="px-5 py-2 text-xs border-b border-gray-50 last:border-b-0 flex gap-2.5 items-start">
            <span class="text-gray-400 whitespace-nowrap min-w-[55px]">{fmtTime(l.time)}</span>
            <span class="inline-block px-1.5 py-px rounded text-[10px] font-semibold whitespace-nowrap min-w-[36px] text-center
              {isSend ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}">
              {isSend ? '发送' : '接收'}
            </span>
            <span class="text-gray-600 break-all flex-1">{detailText}</span>
          </div>
        {/each}
      </div>
    {/if}
  </Panel>
</div>

<Panel title="系统资源">
  {#if resourceBars.length === 0}
    <Empty message="加载中..." />
  {:else}
    {#each resourceBars as bar}
      {@const cls = barColor(bar.pct)}
      <div class="px-5 py-3 border-b border-purple-50/50 last:border-b-0">
        <div class="flex justify-between text-xs mb-1.5">
          <span class="text-gray-500">{bar.label}</span>
          <span class="text-gray-600 font-medium">{bar.detail}</span>
        </div>
        <div class="h-2 bg-purple-50 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500 ease-out {cls}" style="width: {Math.min(bar.pct, 100)}%"></div>
        </div>
      </div>
    {/each}
  {/if}
</Panel>
