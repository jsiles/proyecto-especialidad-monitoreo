/**
 * ATC Exporter - Simulador de procesamiento ATC
 * Expone métricas en formato Prometheus
 */

const express = require('express');
const client = require('prom-client');

const app = express();
const register = new client.Registry();

client.collectDefaultMetrics({ register });

// ==================== ATC METRICS ====================

const atcServiceUp = new client.Gauge({
  name: 'atc_service_up',
  help: 'Estado del servicio ATC (1 = UP, 0 = DOWN)',
  registers: [register]
});

const atcTransactionsTotal = new client.Counter({
  name: 'atc_transactions_total',
  help: 'Total de transacciones ATC',
  labelNames: ['card_type', 'operation', 'status'],
  registers: [register]
});

const atcTransactionDuration = new client.Histogram({
  name: 'atc_transaction_duration_seconds',
  help: 'Duración de transacciones ATC',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register]
});

const atcAuthorizationRate = new client.Gauge({
  name: 'atc_authorization_rate',
  help: 'Tasa de autorización de transacciones',
  registers: [register]
});

const atcPosTerminals = new client.Gauge({
  name: 'atc_pos_terminals_active',
  help: 'Terminales POS activos',
  registers: [register]
});

const atcDailyVolume = new client.Gauge({
  name: 'atc_daily_volume_bolivianos',
  help: 'Volumen diario en Bolivianos',
  registers: [register]
});

// ==================== SIMULATION ====================

function simulateMetrics() {
  atcServiceUp.set(Math.random() > 0.005 ? 1 : 0);
  
  const cardTypes = ['visa', 'mastercard', 'local'];
  const operations = ['purchase', 'withdrawal', 'refund'];
  
  cardTypes.forEach(card => {
    operations.forEach(op => {
      const count = Math.floor(Math.random() * 20) + 1;
      const status = Math.random() > 0.03 ? 'approved' : 'declined';
      atcTransactionsTotal.inc({ card_type: card, operation: op, status }, count);
    });
  });
  
  atcTransactionDuration.observe(Math.random() * 1.5 + 0.05);
  atcAuthorizationRate.set(0.95 + Math.random() * 0.04);
  atcPosTerminals.set(Math.floor(Math.random() * 200) + 100);
  atcDailyVolume.set(Math.floor(Math.random() * 5000000) + 500000);
}

setInterval(simulateMetrics, 5000);
simulateMetrics();

// ==================== ENDPOINTS ====================

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'atc-exporter' });
});

const PORT = process.env.PORT || 9100;
app.listen(PORT, () => {
  console.log(`ATC Exporter running on port ${PORT}`);
});
