// ScalingEngine.ts
// Auto-Scaling Engine for the SLVSS Loop
// Grows the system's operational scale on each verified pass
// ARK95X | sovereignty/loop/ScalingEngine.ts

import type { LoopIteration, ScalingResult } from './SLVSSRunner';

export interface ScaleInput {
  score: number;
  iteration: number;
  history: LoopIteration[];
}

export interface ScalePolicy {
  growthFactor: number;        // multiplier per successful scaling event
  maxScale: number;            // upper bound (prevent runaway)
  minPassStreak: number;       // consecutive passes needed to trigger scale-up
  decayOnFailure: boolean;     // reduce scale on fail streaks
  decayFactor: number;         // how much to decay (0.9 = 10% reduction)
}

// ============================================================
// SCALING ENGINE — grows capacity with each verified pass
// ============================================================

export class ScalingEngine {
  private policy: ScalePolicy;
  private _currentScale: number = 1;
  private passStreak: number = 0;
  private failStreak: number = 0;
  private scaleHistory: { iteration: number; scale: number; reason: string }[] = [];

  constructor(policy: Partial<ScalePolicy> = {}) {
    this.policy = {
      growthFactor: 1.25,      // 25% capacity increase per event
      maxScale: 1024,          // max 1024x sovereign scale
      minPassStreak: 3,        // 3 consecutive passes triggers scale-up
      decayOnFailure: true,
      decayFactor: 0.9,        // 10% decay on fail streak
      ...policy,
    };
  }

  async scale(input: ScaleInput): Promise<ScalingResult> {
    const prev = this._currentScale;
    let scaled = false;
    let reason = 'No scaling event';

    // Count consecutive pass/fail streaks from recent history
    this.updateStreaks(input.history);

    // ---- SCALE UP: sufficient pass streak + high confidence ----
    if (
      this.passStreak >= this.policy.minPassStreak &&
      input.score >= 0.85 &&
      this._currentScale < this.policy.maxScale
    ) {
      const next = parseFloat(
        Math.min(this._currentScale * this.policy.growthFactor, this.policy.maxScale).toFixed(4)
      );
      reason = `Pass streak ${this.passStreak} + score ${input.score.toFixed(3)} → scale up`;
      this._currentScale = next;
      scaled = true;
      this.passStreak = 0; // reset streak after scaling
    }

    // ---- SCALE DOWN: decay on sustained failure ----
    else if (
      this.policy.decayOnFailure &&
      this.failStreak >= 3 &&
      this._currentScale > 1
    ) {
      const next = parseFloat(
        Math.max(this._currentScale * this.policy.decayFactor, 1).toFixed(4)
      );
      reason = `Fail streak ${this.failStreak} → scale decay`;
      this._currentScale = next;
      scaled = true;
      this.failStreak = 0; // reset after decay
    }

    // ---- QUANTUM BOOST: every 10th iteration with perfect score ----
    else if (input.iteration > 0 && input.iteration % 10 === 0 && input.score >= 0.95) {
      const quantumBoost = this._currentScale * 1.5;
      const next = parseFloat(Math.min(quantumBoost, this.policy.maxScale).toFixed(4));
      reason = `Quantum boost at iteration ${input.iteration} (score=${input.score.toFixed(3)})`;
      this._currentScale = next;
      scaled = true;
    }

    if (scaled) {
      this.scaleHistory.push({ iteration: input.iteration, scale: this._currentScale, reason });
      if (this.scaleHistory.length > 50) this.scaleHistory.shift();
    }

    return {
      scaled,
      previousScale: prev,
      newScale: this._currentScale,
      reason,
    };
  }

  // ============================================================
  // STREAK ANALYSIS
  // ============================================================

  private updateStreaks(history: LoopIteration[]): void {
    if (history.length === 0) return;

    // Look at last N iterations for streak calculation
    const window = history.slice(-10);
    let passStreak = 0;
    let failStreak = 0;

    // Count from most recent backward
    for (let i = window.length - 1; i >= 0; i--) {
      const iter = window[i];
      if (iter.status === 'passed' || iter.status === 'scaled') {
        if (failStreak === 0) passStreak++;
        else break;
      } else if (iter.status === 'failed') {
        if (passStreak === 0) failStreak++;
        else break;
      } else {
        break;
      }
    }

    this.passStreak = passStreak;
    this.failStreak = failStreak;
  }

  // ============================================================
  // PUBLIC INTERFACE
  // ============================================================

  get currentScale(): number {
    return this._currentScale;
  }

  get stats(): Record<string, unknown> {
    return {
      currentScale: this._currentScale,
      passStreak: this.passStreak,
      failStreak: this.failStreak,
      scaleEvents: this.scaleHistory.length,
      maxScale: this.policy.maxScale,
      growthFactor: this.policy.growthFactor,
      recentScales: this.scaleHistory.slice(-5),
    };
  }

  reset(): void {
    this._currentScale = 1;
    this.passStreak = 0;
    this.failStreak = 0;
    this.scaleHistory = [];
  }
}

export default ScalingEngine;
