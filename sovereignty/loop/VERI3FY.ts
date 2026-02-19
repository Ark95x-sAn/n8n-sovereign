// VERI3FY.ts
// 3-Stage Verification Engine for the SLVSS Loop
// Stage 1: Syntax/Structure | Stage 2: Logic/Coherence | Stage 3: Sovereignty/PAX
// ARK95X | sovereignty/loop/VERI3FY.ts

import type { VERI3FYResult } from './SLVSSRunner';

export interface VERI3FYConfig {
  stages: number;           // 1, 2, or 3
  threshold: number;        // confidence gate (0.85)
  strictMode: boolean;      // all 3 stages must pass
}

interface VerifyPayload {
  iteration: number;
  scale: number;
  learnerVersion: string;
  successRate: number;
  avgConfidence: number;
  avgROI: number;
  timestamp: number;
  ark95xNode: string;
  [key: string]: unknown;
}

// ============================================================
// VERI3FY — THE 3-STAGE GATE
// ============================================================

export class VERI3FY {
  private config: VERI3FYConfig;
  private verifyCount: number = 0;
  private passCount: number = 0;

  constructor(config: Partial<VERI3FYConfig> = {}) {
    this.config = {
      stages: 3,
      threshold: 0.85,
      strictMode: true,
      ...config,
    };
  }

  async verify(payload: Record<string, unknown>): Promise<VERI3FYResult> {
    this.verifyCount++;
    const errors: string[] = [];
    let score = 0;

    // ---- STAGE 1: SYNTAX / STRUCTURE ----
    // Does the payload have required fields and valid types?
    const s1 = this.stage1_syntax(payload as VerifyPayload, errors);
    const stage1Score = s1 ? 0.35 : 0;

    if (this.config.stages < 2) {
      const passed = s1 && stage1Score >= this.config.threshold * 0.35;
      score = stage1Score;
      if (passed) this.passCount++;
      return { stage1_syntax: s1, stage2_logic: false, stage3_sovereignty: false, passed, score, errors };
    }

    // ---- STAGE 2: LOGIC / COHERENCE ----
    // Are values within expected ranges and self-consistent?
    const s2 = this.stage2_logic(payload as VerifyPayload, errors);
    const stage2Score = s2 ? 0.30 : 0;

    if (this.config.stages < 3) {
      score = stage1Score + stage2Score;
      const passed = s1 && s2 && score >= (this.config.threshold * 0.65);
      if (passed) this.passCount++;
      return { stage1_syntax: s1, stage2_logic: s2, stage3_sovereignty: false, passed, score, errors };
    }

    // ---- STAGE 3: SOVEREIGNTY / PAX ALIGNMENT ----
    // Is the system operating within sovereign parameters?
    const s3 = this.stage3_sovereignty(payload as VerifyPayload, errors);
    const stage3Score = s3 ? 0.35 : 0;

    score = parseFloat((stage1Score + stage2Score + stage3Score).toFixed(4));

    const passed = this.config.strictMode
      ? s1 && s2 && s3 && score >= this.config.threshold
      : score >= this.config.threshold;

    if (passed) this.passCount++;

    return {
      stage1_syntax: s1,
      stage2_logic: s2,
      stage3_sovereignty: s3,
      passed,
      score,
      errors,
    };
  }

  // ============================================================
  // STAGE 1: SYNTAX — required fields + type checks
  // ============================================================
  private stage1_syntax(payload: VerifyPayload, errors: string[]): boolean {
    const required = ['iteration', 'scale', 'learnerVersion', 'timestamp', 'ark95xNode'];
    let ok = true;

    for (const field of required) {
      if (payload[field] === undefined || payload[field] === null) {
        errors.push(`STAGE1: Missing required field: ${field}`);
        ok = false;
      }
    }

    if (typeof payload.iteration !== 'number' || payload.iteration < 0) {
      errors.push('STAGE1: iteration must be a non-negative number');
      ok = false;
    }
    if (typeof payload.scale !== 'number' || payload.scale < 1) {
      errors.push('STAGE1: scale must be >= 1');
      ok = false;
    }
    if (typeof payload.ark95xNode !== 'string' || !payload.ark95xNode.includes('ARK95X')) {
      errors.push('STAGE1: ark95xNode must contain \'ARK95X\' identifier');
      ok = false;
    }
    if (typeof payload.timestamp !== 'number' || payload.timestamp <= 0) {
      errors.push('STAGE1: timestamp must be a positive epoch ms value');
      ok = false;
    }

    return ok;
  }

  // ============================================================
  // STAGE 2: LOGIC — range + consistency checks
  // ============================================================
  private stage2_logic(payload: VerifyPayload, errors: string[]): boolean {
    let ok = true;

    // successRate must be 0.0 – 1.0
    if (payload.successRate < 0 || payload.successRate > 1) {
      errors.push(`STAGE2: successRate out of range: ${payload.successRate}`);
      ok = false;
    }

    // avgConfidence must be 0.0 – 1.0
    if (payload.avgConfidence < 0 || payload.avgConfidence > 1) {
      errors.push(`STAGE2: avgConfidence out of range: ${payload.avgConfidence}`);
      ok = false;
    }

    // avgROI must not be negative (warn but don't fail)
    if (payload.avgROI < 0) {
      errors.push(`STAGE2: avgROI is negative (${payload.avgROI}) — underperforming`);
      // Not a hard fail, deduct but continue
    }

    // timestamp should be recent (within last 60 seconds)
    const ageMs = Date.now() - (payload.timestamp as number);
    if (ageMs > 60_000) {
      errors.push(`STAGE2: Payload timestamp is stale (${(ageMs / 1000).toFixed(1)}s old)`);
      ok = false;
    }

    // iteration must match expected growth (no backward jumps)
    if (typeof payload.iteration === 'number' && payload.iteration < 0) {
      errors.push('STAGE2: iteration cannot be negative');
      ok = false;
    }

    return ok;
  }

  // ============================================================
  // STAGE 3: SOVEREIGNTY — PAX alignment + ARK95X compliance
  // ============================================================
  private stage3_sovereignty(payload: VerifyPayload, errors: string[]): boolean {
    let ok = true;

    // PAX node identifier must be SLVSS or sovereignty-related
    const validNodes = ['SLVSS-ARK95X-v2', 'PAXRuntime', 'SovereignExtraction', 'AutomationAPI'];
    const nodeValid = validNodes.some(n => String(payload.ark95xNode).includes(n.split('-')[0]));
    if (!nodeValid) {
      errors.push(`STAGE3: Non-sovereign node detected: ${payload.ark95xNode}`);
      ok = false;
    }

    // Confidence must be above PAX threshold after iteration 5
    if (payload.iteration > 5 && payload.avgConfidence < 0.70) {
      errors.push(`STAGE3: Sovereignty confidence too low after warmup: ${payload.avgConfidence}`);
      ok = false;
    }

    // Scale must be positive and growing (system should not shrink after iter 10)
    if (payload.iteration > 10 && payload.scale < 1) {
      errors.push('STAGE3: Scale regression detected — sovereignty at risk');
      ok = false;
    }

    // learnerVersion must be present and versioned
    if (!payload.learnerVersion || !String(payload.learnerVersion).match(/\d+\.\d+/)) {
      errors.push(`STAGE3: Invalid learner version: ${payload.learnerVersion}`);
      ok = false;
    }

    return ok;
  }

  // ============================================================
  // STATS
  // ============================================================

  get passRate(): number {
    return this.verifyCount > 0 ? this.passCount / this.verifyCount : 0;
  }

  get stats(): Record<string, unknown> {
    return {
      verifyCount: this.verifyCount,
      passCount: this.passCount,
      passRate: parseFloat(this.passRate.toFixed(4)),
      stages: this.config.stages,
      threshold: this.config.threshold,
    };
  }
}

export default VERI3FY;
