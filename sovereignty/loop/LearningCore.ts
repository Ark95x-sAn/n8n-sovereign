// LearningCore.ts
// Adaptive Learning Engine for the SLVSS Loop
// Ingests pass/fail data, updates internal model, improves future VERI3FY scores
// ARK95X | sovereignty/loop/LearningCore.ts

import type { LearningResult } from './SLVSSRunner';

export interface IngestInput {
  type: 'success' | 'failure';
  data: Record<string, unknown>;
  iteration: number;
}

export interface LearnedPattern {
  id: string;
  type: 'success' | 'failure';
  features: string[];
  weight: number;
  seenCount: number;
  lastSeen: string;
}

export interface LearningConfig {
  memorySize: number;       // max patterns to store
  decayRate: number;        // reduce old pattern weights over time (0.99 = 1% per iter)
  successBoost: number;     // weight increase for success patterns
  failurePenalty: number;   // weight increase for failure patterns
  versionPrefix: string;
}

// ============================================================
// LEARNING CORE — pattern recognition & model versioning
// ============================================================

export class LearningCore {
  private config: LearningConfig;
  private patterns: Map<string, LearnedPattern> = new Map();
  private ingestCount: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;
  private _modelVersion: string = '1.0';
  private totalImprovementDelta: number = 0;

  constructor(config: Partial<LearningConfig> = {}) {
    this.config = {
      memorySize: 500,
      decayRate: 0.99,
      successBoost: 0.1,
      failurePenalty: 0.15,
      versionPrefix: 'LC',
      ...config,
    };
  }

  async ingest(input: IngestInput): Promise<LearningResult> {
    this.ingestCount++;
    let improvementDelta = 0;

    // Extract feature keys from data
    const features = this.extractFeatures(input.data);
    const patternId = this.hashFeatures(features, input.type);

    // Apply decay to all existing patterns
    this.decayPatterns();

    // Update or create pattern
    if (this.patterns.has(patternId)) {
      const p = this.patterns.get(patternId)!;
      const boost = input.type === 'success' ? this.config.successBoost : this.config.failurePenalty;
      const prevWeight = p.weight;
      p.weight = parseFloat(Math.min(p.weight + boost, 1.0).toFixed(6));
      p.seenCount++;
      p.lastSeen = new Date().toISOString();
      improvementDelta = p.weight - prevWeight;
    } else {
      // New pattern discovered
      const newPattern: LearnedPattern = {
        id: patternId,
        type: input.type,
        features,
        weight: input.type === 'success' ? 0.6 : 0.4,
        seenCount: 1,
        lastSeen: new Date().toISOString(),
      };
      this.patterns.set(patternId, newPattern);
      improvementDelta = newPattern.weight;

      // Prune if over memory limit
      if (this.patterns.size > this.config.memorySize) {
        this.pruneWeakPatterns();
      }
    }

    // Update counters
    if (input.type === 'success') this.successCount++;
    else this.failureCount++;

    this.totalImprovementDelta += improvementDelta;

    // Version the model after every 10 ingests
    this.updateModelVersion();

    return {
      learned: true,
      patterns: this.patterns.size,
      improvementDelta: parseFloat(improvementDelta.toFixed(6)),
      modelVersion: this._modelVersion,
    };
  }

  // ============================================================
  // FEATURE EXTRACTION
  // ============================================================

  private extractFeatures(data: Record<string, unknown>): string[] {
    const features: string[] = [];

    // Extract structural features
    const keys = Object.keys(data);
    features.push(`keys:${keys.length}`);
    features.push(`type_sig:${keys.sort().join('|')}`);

    // Extract value-based features
    if (typeof data['score'] === 'number') {
      const band = data['score'] >= 0.9 ? 'high' : data['score'] >= 0.7 ? 'mid' : 'low';
      features.push(`score_band:${band}`);
    }
    if (typeof data['iteration'] === 'number') {
      const phase = data['iteration'] < 10 ? 'warmup' : data['iteration'] < 50 ? 'ramp' : 'cruise';
      features.push(`phase:${phase}`);
    }
    if (Array.isArray(data['errors'])) {
      features.push(`errors:${(data['errors'] as string[]).length}`);
      if ((data['errors'] as string[]).length > 0) {
        features.push(`error_types:${(data['errors'] as string[]).map(e => e.split(':')[0]).join(',')}`);
      }
    }
    if (typeof data['scale'] === 'number') {
      features.push(`scale_log2:${Math.floor(Math.log2((data['scale'] as number) + 1))}`);
    }

    return features;
  }

  private hashFeatures(features: string[], type: string): string {
    const raw = `${type}:${features.sort().join('||')}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return `${type}_${Math.abs(hash).toString(16)}`;
  }

  // ============================================================
  // PATTERN MANAGEMENT
  // ============================================================

  private decayPatterns(): void {
    for (const p of this.patterns.values()) {
      p.weight = parseFloat((p.weight * this.config.decayRate).toFixed(6));
    }
  }

  private pruneWeakPatterns(): void {
    // Remove the weakest patterns to stay within memorySize
    const sorted = Array.from(this.patterns.entries()).sort((a, b) => a[1].weight - b[1].weight);
    const toRemove = sorted.slice(0, Math.floor(this.config.memorySize * 0.1)); // remove bottom 10%
    for (const [id] of toRemove) {
      this.patterns.delete(id);
    }
  }

  // ============================================================
  // MODEL VERSIONING
  // ============================================================

  private updateModelVersion(): void {
    // Major version: every 100 ingests
    // Minor version: every 10 ingests
    const major = Math.floor(this.ingestCount / 100) + 1;
    const minor = Math.floor((this.ingestCount % 100) / 10);
    this._modelVersion = `${major}.${minor}`;
  }

  // ============================================================
  // PREDICTION — score likelihood of next iteration passing
  // ============================================================

  predict(features: string[]): number {
    if (this.patterns.size === 0) return 0.5;

    const featureSet = new Set(features);
    let totalWeight = 0;
    let matchWeight = 0;

    for (const p of this.patterns.values()) {
      const overlap = p.features.filter(f => featureSet.has(f)).length;
      const similarity = overlap / Math.max(p.features.length, features.length);
      if (p.type === 'success') {
        matchWeight += p.weight * similarity;
      } else {
        matchWeight -= p.weight * similarity * 0.5; // failures penalize less
      }
      totalWeight += p.weight;
    }

    const base = totalWeight > 0 ? matchWeight / totalWeight : 0.5;
    return parseFloat(Math.max(0, Math.min(1, base + 0.5)).toFixed(4));
  }

  // ============================================================
  // PUBLIC INTERFACE
  // ============================================================

  get modelVersion(): string {
    return this._modelVersion;
  }

  get stats(): Record<string, unknown> {
    return {
      modelVersion: this._modelVersion,
      patterns: this.patterns.size,
      ingestCount: this.ingestCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.ingestCount > 0 ? parseFloat((this.successCount / this.ingestCount).toFixed(4)) : 0,
      totalImprovementDelta: parseFloat(this.totalImprovementDelta.toFixed(4)),
      memoryUsage: `${this.patterns.size}/${this.config.memorySize}`,
    };
  }

  topPatterns(n: number = 5): LearnedPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, n);
  }
}

export default LearningCore;
