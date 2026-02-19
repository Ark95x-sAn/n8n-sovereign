// SLVSSRunner.ts
// Self-Loop Verification & Scaling System — Core Loop Engine
// ARK95X | sovereignty/loop/SLVSSRunner.ts
// Perpetual: runs → VERI3FY → scale → learn → auto-generate → repeat

import { EventEmitter } from 'events';
import { VERI3FY } from './VERI3FY';
import { ScalingEngine } from './ScalingEngine';
import { AutoGenerator } from './AutoGenerator';
import { LearningCore } from './LearningCore';

// ============================================================
// TYPES
// ============================================================

export interface LoopConfig {
  maxIterations: number;       // 0 = infinite
  intervalMs: number;          // ms between loop ticks
  confidenceThreshold: number; // PAX gate (0.85)
  autoScale: boolean;          // scale on passing loops
  autoGenerate: boolean;       // emit new artifacts per loop
  learnFromFailures: boolean;  // feed failures into LearningCore
  debugMode: boolean;
  veri3fyStages: number;       // 1, 2, or 3 stages
}

export interface LoopIteration {
  id: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  veri3fyResult: VERI3FYResult;
  scalingResult: ScalingResult;
  generationResult: GenerationResult;
  learningResult: LearningResult;
  status: 'running' | 'passed' | 'failed' | 'scaled';
  confidence: number;
  roi: number;
}

export interface VERI3FYResult {
  stage1_syntax: boolean;
  stage2_logic: boolean;
  stage3_sovereignty: boolean;
  passed: boolean;
  score: number;
  errors: string[];
}

export interface ScalingResult {
  scaled: boolean;
  previousScale: number;
  newScale: number;
  reason: string;
}

export interface GenerationResult {
  generated: boolean;
  artifacts: string[];
  type: string;
}

export interface LearningResult {
  learned: boolean;
  patterns: number;
  improvementDelta: number;
  modelVersion: string;
}

export interface SLVSSState {
  running: boolean;
  iteration: number;
  totalPassed: number;
  totalFailed: number;
  totalGenerated: number;
  successRate: number;
  avgConfidence: number;
  avgROI: number;
  currentScale: number;
  learningVersion: string;
  uptime: number;
  history: LoopIteration[];
}

// ============================================================
// SLVSS RUNNER — THE PERPETUAL LOOP
// ============================================================

export class SLVSSRunner extends EventEmitter {
  private config: LoopConfig;
  private veri3fy: VERI3FY;
  private scaling: ScalingEngine;
  private generator: AutoGenerator;
  private learner: LearningCore;

  private iteration: number = 0;
  private totalPassed: number = 0;
  private totalFailed: number = 0;
  private totalGenerated: number = 0;
  private confidenceSum: number = 0;
  private roiSum: number = 0;
  private history: LoopIteration[] = [];
  private running: boolean = false;
  private startTime: number = Date.now();
  private loopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: Partial<LoopConfig> = {}) {
    super();
    this.config = {
      maxIterations: 0,          // infinite by default
      intervalMs: 5000,          // 5s between ticks
      confidenceThreshold: 0.85,
      autoScale: true,
      autoGenerate: true,
      learnFromFailures: true,
      debugMode: false,
      veri3fyStages: 3,
      ...config,
    };
    this.veri3fy = new VERI3FY({ stages: this.config.veri3fyStages, threshold: this.config.confidenceThreshold });
    this.scaling = new ScalingEngine();
    this.generator = new AutoGenerator();
    this.learner = new LearningCore();
  }

  // ============================================================
  // START THE LOOP
  // ============================================================

  start(): void {
    if (this.running) {
      this.log('[SLVSS] Already running.');
      return;
    }
    this.running = true;
    this.startTime = Date.now();
    this.log('[SLVSS] Loop STARTED — ARK95X Sovereign Mode Active');
    this.emit('slvss:started', this.getState());
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.loopTimer) clearTimeout(this.loopTimer);
    this.log('[SLVSS] Loop STOPPED');
    this.emit('slvss:stopped', this.getState());
  }

  // ============================================================
  // CORE TICK — SINGLE LOOP ITERATION
  // ============================================================

  private async tick(): Promise<void> {
    if (!this.running) return;
    if (this.config.maxIterations > 0 && this.iteration >= this.config.maxIterations) {
      this.log(`[SLVSS] Reached max iterations (${this.config.maxIterations}). Stopping.`);
      this.stop();
      return;
    }

    this.iteration++;
    const iterStart = Date.now();
    const iterObj: LoopIteration = {
      id: this.iteration,
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: 0,
      veri3fyResult: { stage1_syntax: false, stage2_logic: false, stage3_sovereignty: false, passed: false, score: 0, errors: [] },
      scalingResult: { scaled: false, previousScale: this.scaling.currentScale, newScale: this.scaling.currentScale, reason: '' },
      generationResult: { generated: false, artifacts: [], type: '' },
      learningResult: { learned: false, patterns: 0, improvementDelta: 0, modelVersion: '' },
      status: 'running',
      confidence: 0,
      roi: 0,
    };

    this.log(`\n[SLVSS] ===== ITERATION #${this.iteration} =====`);
    this.emit('slvss:iteration:start', { id: this.iteration });

    try {
      // ---- STAGE 1: VERI3FY ----
      this.log('[SLVSS] Phase 1: VERI3FY ...');
      const payload = this.buildPayload();
      const vResult = await this.veri3fy.verify(payload);
      iterObj.veri3fyResult = vResult;
      iterObj.confidence = vResult.score;
      this.confidenceSum += vResult.score;

      if (!vResult.passed) {
        iterObj.status = 'failed';
        this.totalFailed++;
        this.log(`[SLVSS] VERI3FY FAILED — score: ${vResult.score.toFixed(4)} | errors: ${vResult.errors.join(', ')}`);

        // ---- LEARN FROM FAILURE ----
        if (this.config.learnFromFailures) {
          const lResult = await this.learner.ingest({ type: 'failure', data: vResult, iteration: this.iteration });
          iterObj.learningResult = lResult;
          this.log(`[SLVSS] LearningCore ingested failure → v${lResult.modelVersion}`);
        }

        this.emit('slvss:iteration:failed', iterObj);
      } else {
        this.totalPassed++;
        this.log(`[SLVSS] VERI3FY PASSED — score: ${vResult.score.toFixed(4)}`);

        // ---- STAGE 2: SCALE ----
        if (this.config.autoScale) {
          this.log('[SLVSS] Phase 2: SCALING ...');
          const sResult = await this.scaling.scale({ score: vResult.score, iteration: this.iteration, history: this.history });
          iterObj.scalingResult = sResult;
          if (sResult.scaled) {
            iterObj.status = 'scaled';
            this.log(`[SLVSS] Scaled ${sResult.previousScale}x → ${sResult.newScale}x | reason: ${sResult.reason}`);
          }
        }

        // ---- STAGE 3: AUTO-GENERATE ----
        if (this.config.autoGenerate) {
          this.log('[SLVSS] Phase 3: AUTO-GENERATE ...');
          const gResult = await this.generator.generate({
            iteration: this.iteration,
            scale: this.scaling.currentScale,
            confidence: vResult.score,
            history: this.history,
          });
          iterObj.generationResult = gResult;
          iterObj.roi = this.computeROI(vResult.score, this.scaling.currentScale);
          this.roiSum += iterObj.roi;
          this.totalGenerated += gResult.artifacts.length;
          this.log(`[SLVSS] Generated ${gResult.artifacts.length} artifact(s): ${gResult.artifacts.join(', ')}`);
        }

        // ---- STAGE 4: LEARN FROM SUCCESS ----
        const lResult = await this.learner.ingest({ type: 'success', data: { vResult, scale: this.scaling.currentScale }, iteration: this.iteration });
        iterObj.learningResult = lResult;
        this.log(`[SLVSS] LearningCore updated → v${lResult.modelVersion} | delta: +${lResult.improvementDelta.toFixed(4)}`);

        if (iterObj.status === 'running') iterObj.status = 'passed';
        this.emit('slvss:iteration:passed', iterObj);
      }
    } catch (err) {
      iterObj.status = 'failed';
      this.totalFailed++;
      this.log(`[SLVSS] EXCEPTION in iteration #${this.iteration}: ${(err as Error).message}`);
      this.emit('slvss:error', { iteration: this.iteration, error: err });
    }

    // Finalize iteration record
    iterObj.completedAt = new Date().toISOString();
    iterObj.durationMs = Date.now() - iterStart;
    this.history.push(iterObj);
    if (this.history.length > 100) this.history.shift(); // rolling 100-iter window

    this.log(`[SLVSS] Iteration #${this.iteration} done in ${iterObj.durationMs}ms | status: ${iterObj.status.toUpperCase()}`);
    this.emit('slvss:iteration:complete', iterObj);

    // Schedule next tick
    if (this.running) {
      this.loopTimer = setTimeout(() => this.tick(), this.config.intervalMs);
    }
  }

  // ============================================================
  // PAYLOAD BUILDER — assembles current system state for VERI3FY
  // ============================================================

  private buildPayload(): Record<string, unknown> {
    return {
      iteration: this.iteration,
      scale: this.scaling.currentScale,
      learnerVersion: this.learner.modelVersion,
      successRate: this.iteration > 0 ? this.totalPassed / this.iteration : 0,
      avgConfidence: this.iteration > 0 ? this.confidenceSum / this.iteration : 0,
      avgROI: this.iteration > 0 ? this.roiSum / this.iteration : 0,
      timestamp: Date.now(),
      ark95xNode: 'SLVSS-ARK95X-v2',
    };
  }

  // ============================================================
  // ROI CALCULATOR
  // ============================================================

  private computeROI(confidence: number, scale: number): number {
    const base = confidence * 100;
    const multiplier = Math.log2(scale + 1) + 1;
    return parseFloat((base * multiplier).toFixed(2));
  }

  // ============================================================
  // STATE
  // ============================================================

  getState(): SLVSSState {
    return {
      running: this.running,
      iteration: this.iteration,
      totalPassed: this.totalPassed,
      totalFailed: this.totalFailed,
      totalGenerated: this.totalGenerated,
      successRate: this.iteration > 0 ? parseFloat((this.totalPassed / this.iteration).toFixed(4)) : 0,
      avgConfidence: this.iteration > 0 ? parseFloat((this.confidenceSum / this.iteration).toFixed(4)) : 0,
      avgROI: this.iteration > 0 ? parseFloat((this.roiSum / this.iteration).toFixed(2)) : 0,
      currentScale: this.scaling.currentScale,
      learningVersion: this.learner.modelVersion,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      history: this.history.slice(-10), // last 10 iterations
    };
  }

  private log(msg: string): void {
    if (this.config.debugMode) console.log(msg);
    this.emit('slvss:log', { msg, ts: new Date().toISOString() });
  }
}

// ============================================================
// SINGLETON — ready to import and start
// ============================================================

export const slvss = new SLVSSRunner({
  maxIterations: 0,         // INFINITE
  intervalMs: 5000,
  confidenceThreshold: 0.85,
  autoScale: true,
  autoGenerate: true,
  learnFromFailures: true,
  debugMode: true,
  veri3fyStages: 3,
});

export default SLVSSRunner;
