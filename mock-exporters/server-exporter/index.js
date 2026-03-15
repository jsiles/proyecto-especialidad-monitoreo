/**
 * Server Exporter - Simulador de Métricas de Servidores
 * Simula métricas de CPU, Memoria, Disco y Red
 */

const express = require('express');
const client = require('prom-client');

const app = express();
const register = new client.Registry();

client.collectDefaultMetrics({ register });

// ==================== SERVER METRICS ====================

const cpuUsage = new client.Gauge({
  name: 'cpu_usage_percent',
  help: 'Uso de CPU en porcentaje',
  labelNames: ['server', 'core'],
  registers: [register]
});

const memoryUsage = new client.Gauge({
  name: 'memory_usage_percent',
  help: 'Uso de memoria en porcentaje',
  labelNames: ['server'],
  registers: [register]
});

const memoryTotal = new client.Gauge({
  name: 'memory_total_bytes',
  help: 'Memoria total en bytes',
  labelNames: ['server'],
  registers: [register]
});

const memoryUsed = new client.Gauge({
  name: 'memory_used_bytes',
  help: 'Memoria usada en bytes',
  labelNames: ['server'],
  registers: [register]
});

const diskUsage = new client.Gauge({
  name: 'disk_usage_percent',
  help: 'Uso de disco en porcentaje',
  labelNames: ['server', 'mount'],
  registers: [register]
});

const networkBytesIn = new client.Counter({
  name: 'network_bytes_received_total',
  help: 'Bytes recibidos por red',
  labelNames: ['server', 'interface'],
  registers: [register]
});

const networkBytesOut = new client.Counter({
  name: 'network_bytes_sent_total',
  help: 'Bytes enviados por red',
  labelNames: ['server', 'interface'],
  registers: [register]
});

const serverUptime = new client.Gauge({
  name: 'server_uptime_seconds',
  help: 'Tiempo de actividad del servidor',
  labelNames: ['server'],
  registers: [register]
});

const processCount = new client.Gauge({
  name: 'server_process_count',
  help: 'Número de procesos activos',
  labelNames: ['server'],
  registers: [register]
});

// ==================== SERVER CONFIG ====================

const servers = [
  { name: 'srv-app-01', type: 'application', baseCpu: 45, baseMem: 60 },
  { name: 'srv-app-02', type: 'application', baseCpu: 50, baseMem: 65 },
  { name: 'srv-db-01', type: 'database', baseCpu: 30, baseMem: 75 },
  { name: 'srv-web-01', type: 'web', baseCpu: 25, baseMem: 40 },
  { name: 'srv-cache-01', type: 'cache', baseCpu: 15, baseMem: 80 }
];

const startTime = Date.now();

// ==================== SIMULATION ====================

function simulateMetrics() {
  servers.forEach(server => {
    // CPU
    const cpuVariation = (Math.random() - 0.5) * 20;
    const cpuValue = Math.min(100, Math.max(0, server.baseCpu + cpuVariation));
    cpuUsage.set({ server: server.name, core: 'total' }, cpuValue);
    
    for (let i = 0; i < 4; i++) {
      const coreVariation = (Math.random() - 0.5) * 30;
      cpuUsage.set(
        { server: server.name, core: `core${i}` },
        Math.min(100, Math.max(0, server.baseCpu + coreVariation))
      );
    }
    
    // Memory
    const memVariation = (Math.random() - 0.5) * 10;
    const memValue = Math.min(100, Math.max(0, server.baseMem + memVariation));
    memoryUsage.set({ server: server.name }, memValue);
    
    const totalMem = 16 * 1024 * 1024 * 1024;
    memoryTotal.set({ server: server.name }, totalMem);
    memoryUsed.set({ server: server.name }, totalMem * (memValue / 100));
    
    // Disk
    const diskValue = 40 + Math.random() * 30;
    diskUsage.set({ server: server.name, mount: '/' }, diskValue);
    diskUsage.set({ server: server.name, mount: '/data' }, diskValue + 10);
    
    // Network
    networkBytesIn.inc({ server: server.name, interface: 'eth0' }, Math.floor(Math.random() * 1000000));
    networkBytesOut.inc({ server: server.name, interface: 'eth0' }, Math.floor(Math.random() * 500000));
    
    // Uptime
    serverUptime.set({ server: server.name }, (Date.now() - startTime) / 1000);
    
    // Processes
    processCount.set({ server: server.name }, Math.floor(Math.random() * 50) + 100);
  });
}

setInterval(simulateMetrics, 5000);
simulateMetrics();

// ==================== ENDPOINTS ====================

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'server-exporter' });
});

const PORT = process.env.PORT || 9100;
app.listen(PORT, () => {
  console.log(`Server Exporter running on port ${PORT}`);
});
