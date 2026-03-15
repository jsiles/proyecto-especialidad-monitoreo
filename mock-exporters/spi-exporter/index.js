/**
 * SPI Exporter - Simulador del Sistema de Pagos Interbancarios
 * Expone métricas en formato Prometheus
 */

const express = require('express');
const client = require('prom-client');

const app = express();
const register = new client.Registry();

// Default metrics
client.collectDefaultMetrics({ register });

// ==================== CUSTOM METRICS ====================

const spiServiceUp = new client.Gauge({
  name: 'spi_service_up',
  help: 'Estado del servicio SPI (1 = UP, 0 = DOWN)',
  registers: [register]
});

const spiTransactionsTotal = new client.Counter({
  name: 'spi_transactions_total',
  help: 'Total de transacciones SPI procesadas',
  labelNames: ['type', 'status'],
  registers: [register]
});

const spiTransactionsFailed = new client.Counter({
  name: 'spi_transactions_failed_total',
  help: 'Total de transacciones SPI fallidas',
  registers: [register]
});

const spiTransactionDuration = new client.Histogram({
  name: 'spi_transaction_duration_seconds',
  help: 'Duración de transacciones SPI en segundos',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

const spiAmountProcessed = new client.Gauge({
  name: 'spi_amount_processed_bolivianos',
  help: 'Monto total procesado en Bolivianos',
  registers: [register]
});

const spiActiveConnections = new client.Gauge({
  name: 'spi_active_connections',
  help: 'Número de conexiones activas al SPI',
  registers: [register]
});

// ==================== SIMULATION ====================

function simulateMetrics() {
  // Service status (99% uptime)
  spiServiceUp.set(Math.random() > 0.01 ? 1 : 0);
  
  // Transactions
  const types = ['transfer', 'payment', 'inquiry'];
  types.forEach(type => {
    const count = Math.floor(Math.random() * 10) + 1;
    const status = Math.random() > 0.05 ? 'success' : 'failed';
    spiTransactionsTotal.inc({ type, status }, count);
    
    if (status === 'failed') {
      spiTransactionsFailed.inc(count);
    }
  });
  
  // Latency
  spiTransactionDuration.observe(Math.random() * 2.9 + 0.1);
  
  // Amount
  spiAmountProcessed.set(Math.floor(Math.random() * 1000000) + 10000);
  
  // Connections
  spiActiveConnections.set(Math.floor(Math.random() * 50) + 10);
}

setInterval(simulateMetrics, 5000);
simulateMetrics();

// ==================== ENDPOINTS ====================

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'spi-exporter' });
});

const PORT = process.env.PORT || 9100;
app.listen(PORT, () => {
  console.log(`SPI Exporter running on port ${PORT}`);
});
