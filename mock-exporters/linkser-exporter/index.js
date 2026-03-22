/**
 * Linkser Exporter - Simulador de tarjetas de debito y credito
 * Expone metricas en formato Prometheus
 */

const express = require('express');
const client = require('prom-client');

const app = express();
const register = new client.Registry();

client.collectDefaultMetrics({ register });

const linkserServiceUp = new client.Gauge({
  name: 'linkser_service_up',
  help: 'Estado del servicio Linkser (1 = UP, 0 = DOWN)',
  registers: [register],
});

const linkserCardTransactionsTotal = new client.Counter({
  name: 'linkser_card_transactions_total',
  help: 'Total de transacciones procesadas por Linkser',
  labelNames: ['card_type', 'brand', 'operation', 'status'],
  registers: [register],
});

const linkserTransactionDuration = new client.Histogram({
  name: 'linkser_transaction_duration_seconds',
  help: 'Duracion de transacciones Linkser en segundos',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

const linkserAuthorizationRate = new client.Gauge({
  name: 'linkser_authorization_rate',
  help: 'Tasa de autorizacion de transacciones Linkser',
  registers: [register],
});

const linkserActiveCards = new client.Gauge({
  name: 'linkser_active_cards',
  help: 'Tarjetas activas administradas por Linkser',
  labelNames: ['card_type'],
  registers: [register],
});

const linkserSettlementVolume = new client.Gauge({
  name: 'linkser_settlement_volume_bolivianos',
  help: 'Volumen de liquidacion procesado por Linkser en bolivianos',
  registers: [register],
});

function simulateMetrics() {
  linkserServiceUp.set(Math.random() > 0.01 ? 1 : 0);

  const cardTypes = ['debit', 'credit'];
  const brands = ['visa', 'mastercard', 'local'];
  const operations = ['purchase', 'cash_advance', 'refund'];

  cardTypes.forEach((cardType) => {
    brands.forEach((brand) => {
      operations.forEach((operation) => {
        const count = Math.floor(Math.random() * 16) + 2;
        const status = Math.random() > 0.04 ? 'approved' : 'declined';
        linkserCardTransactionsTotal.inc(
          { card_type: cardType, brand, operation, status },
          count
        );
      });
    });
  });

  linkserTransactionDuration.observe(Math.random() * 1.1 + 0.08);
  linkserAuthorizationRate.set(0.93 + Math.random() * 0.05);
  linkserActiveCards.set({ card_type: 'debit' }, Math.floor(Math.random() * 40000) + 180000);
  linkserActiveCards.set({ card_type: 'credit' }, Math.floor(Math.random() * 25000) + 90000);
  linkserSettlementVolume.set(Math.floor(Math.random() * 9000000) + 1500000);
}

setInterval(simulateMetrics, 5000);
simulateMetrics();

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'linkser-exporter' });
});

const PORT = process.env.PORT || 9100;
app.listen(PORT, () => {
  console.log(`Linkser Exporter running on port ${PORT}`);
});
