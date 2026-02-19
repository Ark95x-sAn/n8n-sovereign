// AUTOMATION API - External Orchestration Gateway
// ARK95X | n8n-sovereign | Network95

import express from 'express';
import { paxRuntime } from './PAXRuntime';
import { ValueScanner } from './ValueScanner';

export class AutomationAPI {
  private app = express();
  private scanner = new ValueScanner();

  constructor() {
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    // Health check
    this.app.get('/api/sovereignty/health', (_req, res) => {
      res.json({ status: 'operational', version: 'PAX.Runtime.v2.0', timestamp: new Date().toISOString() });
    });

    // PAX Runtime state
    this.app.get('/api/sovereignty/state', (_req, res) => {
      const state = paxRuntime.getState();
      const metrics = paxRuntime.getMetrics();
      res.json({ state, metrics });
    });

    // Pulse endpoint
    this.app.post('/api/sovereignty/pulse', (req, res) => {
      const result = paxRuntime.pulse(req.body);
      res.json({ status: 'pulsed', result });
    });

    // Emit NEUROSYNC packet
    this.app.post('/api/sovereignty/neurosync', (req, res) => {
      const packet = paxRuntime.pulse({ emitNeuro: true, mission: req.body.mission ?? 'SOVEREIGN OPS', incr: true, codexSync: true, quadUp: true });
      res.json({ status: 'emitted', packet });
    });

    // Vault read
    this.app.get('/api/sovereignty/vault/:key', (req, res) => {
      const value = paxRuntime.vaultGet(req.params.key);
      const hash = paxRuntime.getState().continuity.lastToken;
      res.json({ key: req.params.key, value, hash });
    });

    // Vault write
    this.app.post('/api/sovereignty/vault/:key', (req, res) => {
      paxRuntime.vaultSet(req.params.key, req.body.value);
      res.json({ status: 'stored', key: req.params.key });
    });

    // Value opportunities scan
    this.app.get('/api/sovereignty/scan/opportunities', async (_req, res) => {
      const opportunities = await this.scanner.scanAll();
      res.json({ count: opportunities.length, opportunities });
    });

    // Value report
    this.app.get('/api/sovereignty/scan/report', async (_req, res) => {
      const report = await this.scanner.generateReport();
      res.type('text/markdown').send(report);
    });

    // Metrics endpoint (Prometheus compatible)
    this.app.get('/api/sovereignty/metrics', (_req, res) => {
      const m = paxRuntime.getMetrics();
      const metrics = [
        `# HELP pax_pulse_count Total PAX Runtime pulse count`,
        `# TYPE pax_pulse_count counter`,
        `pax_pulse_count ${m.pulseCount}`,
        `# HELP pax_vault_size PAX vault entry count`,
        `# TYPE pax_vault_size gauge`,
        `pax_vault_size ${m.vaultSize}`,
        `# HELP pax_chain_length Continuity chain length`,
        `# TYPE pax_chain_length gauge`,
        `pax_chain_length ${m.chainLength}`,
      ].join('\n');
      res.type('text/plain').send(metrics);
    });
  }

  start(port: number = 5679) {
    this.app.listen(port, () => {
      console.log(`🔥 Sovereignty API active on :${port}`);
      console.log(`   GET  /api/sovereignty/health`);
      console.log(`   GET  /api/sovereignty/state`);
      console.log(`   POST /api/sovereignty/pulse`);
      console.log(`   POST /api/sovereignty/neurosync`);
      console.log(`   GET  /api/sovereignty/scan/opportunities`);
      console.log(`   GET  /api/sovereignty/scan/report`);
      console.log(`   GET  /api/sovereignty/metrics`);
      // Emit boot pulse
      paxRuntime.pulse({ incr: true, codexSync: true, quadUp: true, note: 'AutomationAPI boot', emitNeuro: true, mission: 'SOVEREIGNTY API ONLINE' });
    });
  }
}

export const automationAPI = new AutomationAPI();
