import { json } from '@sveltejs/kit'
import os from 'node:os'

/** GET /api/system/stats — 系统资源统计 */
export function GET () {
  const mem = process.memoryUsage()
  const cpus = os.cpus()
  const loadAvg = os.loadavg()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()

  let cpuUsage = 0
  for (const cpu of cpus) {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0)
    const idle = cpu.times.idle
    cpuUsage += ((total - idle) / total) * 100
  }
  cpuUsage = cpuUsage / cpus.length

  return json({
    success: true,
    stats: {
      cpu: {
        usagePercent: Math.round(cpuUsage * 100) / 100,
        cores: cpus.length,
        model: cpus[0]?.model || 'unknown',
        loadAvg1m: loadAvg[0],
        loadAvg5m: loadAvg[1],
        loadAvg15m: loadAvg[2]
      },
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
        rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
        externalMB: Math.round(mem.external / 1024 / 1024 * 100) / 100,
        systemTotalMB: Math.round(totalMem / 1024 / 1024 * 100) / 100,
        systemFreeMB: Math.round(freeMem / 1024 / 1024 * 100) / 100,
        systemUsedPercent: Math.round((1 - freeMem / totalMem) * 10000) / 100
      },
      uptime: Math.round(process.uptime())
    }
  })
}
