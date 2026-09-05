/**
 * lib/mlScorer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Lab-parameter-based coffee quality ML engine.
 *
 * Architecture: Random Forest Regressor over raw lab parameters.
 *   Features : raw lab values (humidity, HMF, diastase, proline, etc.)
 *   Labels   : quality score 0–100 computed by the EU rule-based scorer
 *              — generated automatically each time a batch is registered,
 *              NO human sensory input required
 *   Training : automatic; triggered whenever a batch is added
 *
 * Why Random Forest over linear regression:
 *   - Captures non-linear interactions (high HMF + high humidity is
 *     more harmful together than either value suggests alone)
 *   - Feature importance shows which raw parameters most drive quality
 *   - Works well on small tabular datasets (5–200 samples)
 *
 * Reference: Yang et al. (2025) Food Chemistry 477:143391
 *   "RF models achieving 92%+ accuracy in food grade classification
 *   from tabular chemical parameter data"
 *
 * Model persisted to data/rfModel.json.
 * Falls back to EU rule-based scoring when < MIN_SAMPLES batches exist.
 */

import fs from "fs";
import path from "path";
import { scoreCoffee, type LabParams } from "./coffeeQuality";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BatchRecord {
  batchId:           string;
  addedAt:           string;
  coffeeType?:        string | null;
  // Standard
  humidity?:         number | null;  // % water content
  hmf?:              number | null;  // mg/kg
  diastase?:         number | null;  // DN
  freeAcidity?:      number | null;  // meq/kg
  proline?:          number | null;  // mg/kg
  conductivity?:     number | null;  // mS/cm
  fructoseGlucose?:  number | null;  // %
  reducingSugars?:   number | null;  // %
  sucrose?:          number | null;  // %
  ash?:              number | null;  // %
  isotopicDiff?:     number | null;  // ‰
  colour?:           number | null;  // mm Pfund
  ph?:               number | null;
  // Extended biochemistry
  invertase?:        number | null;  // U/kg
  fructose?:         number | null;  // % separate
  glucose?:          number | null;  // % separate
  fgRatio?:          number | null;  // F/G ratio
  maltose?:          number | null;  // %
  waterActivity?:    number | null;  // aw
  opticalRotation?:  number | null;  // °
  viscosity?:        number | null;  // mPa·s
  totalPolyphenols?: number | null;  // mg GAE/100g
  hdeEncoded?:       number | null;  // 0=None 1=Few 2=Moderate 3=Many
  // Microbiological
  yeastCount?:       number | null;  // log CFU/g
  totalPlateCount?:  number | null;  // log CFU/g
  // Contaminants
  leadPb?:           number | null;  // mg/kg
  cadmiumCd?:        number | null;  // mg/kg
  pesticideScreen?:  number | null;  // 1=pass 0=fail
  antibioticScreen?: number | null;  // 1=pass 0=fail
  // Geographic / harvest
  altitude?:         number | null;  // metres
  harvestMonth?:     number | null;  // 1–12
  ruleScore?:        number;         // EU-rule quality score 0–100 (auto-computed)
}

export interface RFModel {
  trained:           boolean;
  trainedAt:         string | null;
  sampleCount:       number;
  r2:                number | null;
  trees:             DTreeNode[] | null;
  featureImportance: Record<string, number> | null;
  note:              string;
}

export interface ModelStats {
  mode:              "rf" | "rule-based";
  sampleCount:       number;
  r2:                number | null;
  trainedAt:         string | null;
  samplesNeeded:     number;
  featureImportance: Record<string, number> | null;
}

// ── Feature configuration ─────────────────────────────────────────────────────

const FEATURES = [
  // Standard physicochemical
  { key: "humidity",         min: 0,    max: 25    },
  { key: "hmf",              min: 0,    max: 80    },
  { key: "diastase",         min: 0,    max: 30    },
  { key: "freeAcidity",      min: 0,    max: 80    },
  { key: "proline",          min: 0,    max: 2000  },
  { key: "conductivity",     min: 0,    max: 2.0   },
  { key: "fructoseGlucose",  min: 0,    max: 100   },
  { key: "reducingSugars",   min: 0,    max: 100   },
  { key: "sucrose",          min: 0,    max: 20    },
  { key: "ash",              min: 0,    max: 2.0   },
  { key: "isotopicDiff",     min: 0,    max: 5.0   },
  { key: "colour",           min: 0,    max: 220   },
  { key: "ph",               min: 3.0,  max: 7.0   },
  // Extended biochemistry — non-standard but highly informative
  { key: "invertase",        min: 0,    max: 500   },  // degrades with heat like diastase
  { key: "fgRatio",          min: 0.8,  max: 2.5   },  // predicts crystallisation
  { key: "waterActivity",    min: 0.4,  max: 0.75  },  // fermentation risk threshold 0.60
  { key: "opticalRotation",  min: -20,  max: 5     },  // negative = fructose-dominant
  { key: "totalPolyphenols", min: 0,    max: 500   },  // antioxidant quality signal
  { key: "hdeEncoded",       min: 0,    max: 3     },  // botanical auth: 0=none 3=many
  { key: "maltose",          min: 0,    max: 20    },
  { key: "viscosity",        min: 0,    max: 20000 },
  // Microbiological
  { key: "yeastCount",       min: 0,    max: 5     },  // log CFU/g, >2.7 = risk
  { key: "totalPlateCount",  min: 0,    max: 6     },  // log CFU/g
  // Contaminants
  { key: "leadPb",           min: 0,    max: 0.5   },  // EU max 0.10 mg/kg
  { key: "cadmiumCd",        min: 0,    max: 0.2   },  // EU max 0.050 mg/kg
  { key: "pesticideScreen",  min: 0,    max: 1     },  // 1=pass 0=fail
  { key: "antibioticScreen", min: 0,    max: 1     },  // 1=pass 0=fail
  // Geographic / harvest context
  { key: "altitude",         min: 0,    max: 2500  },  // metres — quality driver
  { key: "harvestMonth",     min: 1,    max: 12    },  // seasonal HMF/enzyme effect
] as const;

type FeatureKey = typeof FEATURES[number]["key"];
const FEATURE_KEYS: FeatureKey[] = FEATURES.map(f => f.key);

const MIN_SAMPLES = 5;
const NUM_TREES   = 20;
const MAX_DEPTH   = 5;

const RECORDS_PATH = path.join(process.cwd(), "data", "mlBatchRecords.json");
const MODEL_PATH   = path.join(process.cwd(), "data", "rfModel.json");

// ── Decision Tree ─────────────────────────────────────────────────────────────

interface DTreeNode {
  featureIdx?: number;
  threshold?:  number;
  left?:       DTreeNode;
  right?:      DTreeNode;
  prediction?: number;
}

function avg(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}
function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = avg(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
}

function buildTree(
  examples:      { features: number[]; label: number }[],
  featureSubset: number[],
  depth:         number,
  maxDepth:      number,
  importanceAcc: number[]
): DTreeNode {
  const labels = examples.map(e => e.label);
  if (depth >= maxDepth || examples.length <= 3) return { prediction: avg(labels) };

  const parentVar   = variance(labels);
  let bestReduction = 0, bestFi = -1, bestThreshold = 0;

  for (const fi of featureSubset) {
    const unique = [...new Set(examples.map(e => e.features[fi]))].sort((a, b) => a - b);
    for (let i = 0; i < unique.length - 1; i++) {
      const t     = (unique[i] + unique[i + 1]) / 2;
      const left  = examples.filter(e => e.features[fi] <= t);
      const right = examples.filter(e => e.features[fi] > t);
      if (!left.length || !right.length) continue;
      const reduction = parentVar -
        (left.length  * variance(left.map(e => e.label)) +
         right.length * variance(right.map(e => e.label))) / examples.length;
      if (reduction > bestReduction) { bestReduction = reduction; bestFi = fi; bestThreshold = t; }
    }
  }

  if (bestFi === -1) return { prediction: avg(labels) };
  importanceAcc[bestFi] = (importanceAcc[bestFi] || 0) + bestReduction * examples.length;

  return {
    featureIdx: bestFi,
    threshold:  bestThreshold,
    left:  buildTree(examples.filter(e => e.features[bestFi] <= bestThreshold), featureSubset, depth + 1, maxDepth, importanceAcc),
    right: buildTree(examples.filter(e => e.features[bestFi] > bestThreshold),  featureSubset, depth + 1, maxDepth, importanceAcc),
  };
}

function predictTree(node: DTreeNode, features: number[]): number {
  if (node.prediction !== undefined) return node.prediction;
  return features[node.featureIdx!] <= node.threshold!
    ? predictTree(node.left!,  features)
    : predictTree(node.right!, features);
}

// ── Random Forest ─────────────────────────────────────────────────────────────

function trainRF(examples: { features: number[]; label: number }[]) {
  const k      = Math.max(2, Math.round(Math.sqrt(FEATURE_KEYS.length)));
  const impAcc = new Array(FEATURE_KEYS.length).fill(0);
  const idxs   = FEATURE_KEYS.map((_, i) => i);

  const trees = Array.from({ length: NUM_TREES }, () => {
    const boot   = Array.from({ length: examples.length }, () =>
      examples[Math.floor(Math.random() * examples.length)]
    );
    const subset = [...idxs].sort(() => Math.random() - 0.5).slice(0, k);
    return buildTree(boot, subset, 0, MAX_DEPTH, impAcc);
  });

  const preds     = examples.map(e => avg(trees.map(t => predictTree(t, e.features))));
  const labels    = examples.map(e => e.label);
  const labelMean = avg(labels);
  const ssTot = labels.reduce((s, l) => s + (l - labelMean) ** 2, 0);
  const ssRes = labels.reduce((s, l, i) => s + (l - preds[i]) ** 2, 0);
  const r2    = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  const impTotal         = impAcc.reduce((s, v) => s + v, 0) || 1;
  const featureImportance = impAcc.map(v => parseFloat((v / impTotal).toFixed(4)));

  return { trees, r2, featureImportance };
}

// ── Normalisation ─────────────────────────────────────────────────────────────

function toFeatureVector(record: Partial<BatchRecord>): number[] {
  return FEATURES.map(({ key, min, max }) => {
    let raw = (record as any)[key] as number | null | undefined;
    if (raw == null || isNaN(raw)) return 0.5; // impute missing with midpoint
    if (key === "humidity" && raw > 50)  raw = raw / 10; // ×10 stored format
    if (key === "hmf"      && raw > 200) raw = raw / 10;
    return Math.max(0, Math.min(1, (raw - min) / (max - min)));
  });
}

// ── I/O ───────────────────────────────────────────────────────────────────────

function readRecords(): BatchRecord[] {
  try { return JSON.parse(fs.readFileSync(RECORDS_PATH, "utf-8")); } catch { return []; }
}
function writeRecords(r: BatchRecord[]): void {
  fs.mkdirSync(path.dirname(RECORDS_PATH), { recursive: true });
  fs.writeFileSync(RECORDS_PATH, JSON.stringify(r, null, 2));
}
function readModel(): RFModel {
  try { return JSON.parse(fs.readFileSync(MODEL_PATH, "utf-8")); }
  catch {
    return { trained: false, trainedAt: null, sampleCount: 0, r2: null,
             trees: null, featureImportance: null, note: "No model yet." };
  }
}
function writeModel(m: RFModel): void {
  fs.mkdirSync(path.dirname(MODEL_PATH), { recursive: true });
  fs.writeFileSync(MODEL_PATH, JSON.stringify(m, null, 2));
}

function retrain(records: BatchRecord[]): RFModel {
  const valid = records.filter(r =>
    r.ruleScore != null && FEATURE_KEYS.some(k => (r as any)[k] != null)
  );
  if (valid.length < MIN_SAMPLES) {
    const m: RFModel = {
      trained: false, trainedAt: null, sampleCount: valid.length,
      r2: null, trees: null, featureImportance: null,
      note: `Need ${MIN_SAMPLES - valid.length} more batches to activate RF. Using EU-rule scoring.`,
    };
    writeModel(m); return m;
  }
  const { trees, r2, featureImportance } = trainRF(
    valid.map(r => ({ features: toFeatureVector(r), label: r.ruleScore! }))
  );
  const impMap: Record<string, number> = {};
  FEATURE_KEYS.forEach((k, i) => { impMap[k] = featureImportance[i]; });
  const fitTag = r2 >= 0.7 ? "good fit" : r2 >= 0.4 ? "moderate fit" : "weak — add more batches";
  const m: RFModel = {
    trained: true, trainedAt: new Date().toISOString(), sampleCount: valid.length,
    r2: parseFloat(r2.toFixed(4)), trees, featureImportance: impMap,
    note: `RF active (${NUM_TREES} trees, depth ${MAX_DEPTH}). Trained on ${valid.length} batches. R²=${r2.toFixed(3)} (${fitTag}).`,
  };
  writeModel(m); return m;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Called automatically when a batch is registered on-chain.
 * No human input — label is computed from EU rules.
 */
export function addBatchRecord(data: Omit<BatchRecord, "ruleScore" | "addedAt">): RFModel {
  const h = data.humidity != null && data.humidity > 50 ? data.humidity / 10 : data.humidity;
  const f = data.hmf      != null && data.hmf      > 200 ? data.hmf      / 10 : data.hmf;
  const labParams: LabParams = {
    water:           h           ?? undefined,
    hmf:             f           ?? undefined,
    diastase:        data.diastase      ?? undefined,
    freeAcidity:     data.freeAcidity   ?? undefined,
    proline:         data.proline       ?? undefined,
    conductivity:    data.conductivity  ?? undefined,
    fructoseGlucose: data.fructoseGlucose ?? undefined,
    reducingSugars:  data.reducingSugars  ?? undefined,
    sucrose:         data.sucrose        ?? undefined,
    ash:             data.ash            ?? undefined,
    isotopicDiff:    data.isotopicDiff  ?? undefined,
    coffeeType:       data.coffeeType     ?? undefined,
  };
  const ruleScore = scoreCoffee(labParams).score;
  const records   = readRecords();
  const idx       = records.findIndex(r => r.batchId === data.batchId);
  const record: BatchRecord = { ...data, ruleScore, addedAt: new Date().toISOString() };
  if (idx >= 0) records[idx] = record; else records.push(record);
  writeRecords(records);
  return retrain(records);
}

/** Manually trigger a full retrain (e.g. from admin panel). */
export function triggerRetrain(): RFModel {
  return retrain(readRecords());
}

/**
 * Backfill RF training records from labHistory.json.
 * Called automatically when the analytics API loads — ensures the RF
 * trains from all historical batches, not just ones registered after
 * mlScorer was wired up.
 */
export function backfillFromHistory(): RFModel {
  const LAB_HISTORY_PATH = path.join(process.cwd(), "data", "labHistory.json");
  let history: Array<{
    batchId: string; registeredAt: string; coffeeType?: string;
    altitude?: number; harvestMonth?: number; harvestYear?: number;
    params: Record<string, number | null | undefined>;
  }> = [];
  try {
    const raw = JSON.parse(fs.readFileSync(LAB_HISTORY_PATH, "utf-8"));
    history = raw.records ?? raw;
  } catch { return readModel(); }

  if (history.length === 0) return readModel();

  const existing    = readRecords();
  const existingIds = new Set(existing.map(r => r.batchId));
  let   added       = 0;

  const n = (v: any): number | null => (v != null && !isNaN(Number(v)) ? Number(v) : null);

  for (const h of history) {
    if (existingIds.has(h.batchId)) continue;
    const p = h.params ?? {};
    const humidity = p.water != null && (p.water as number) > 50
      ? (p.water as number) / 10 : n(p.water);
    const hmf = p.hmf != null && (p.hmf as number) > 200
      ? (p.hmf as number) / 10 : n(p.hmf);
    const labParams: LabParams = {
      water: humidity ?? undefined, hmf: hmf ?? undefined,
      diastase:        n(p.diastase)        ?? undefined,
      freeAcidity:     n(p.freeAcidity)     ?? undefined,
      proline:         n(p.proline)         ?? undefined,
      conductivity:    n(p.conductivity)    ?? undefined,
      fructoseGlucose: n(p.fructoseGlucose) ?? undefined,
      reducingSugars:  n(p.reducingSugars)  ?? undefined,
      sucrose:         n(p.sucrose)         ?? undefined,
      ash:             n(p.ash)             ?? undefined,
      isotopicDiff:    n(p.isotopicDiff)    ?? undefined,
      coffeeType:       h.coffeeType,
    };
    const ruleScore = scoreCoffee(labParams).score;
    existing.push({
      batchId:          h.batchId,
      addedAt:          h.registeredAt,
      coffeeType:        h.coffeeType         ?? null,
      altitude:         n(h.altitude),
      harvestMonth:     n(h.harvestMonth),
      // Standard
      humidity, hmf,
      diastase:         n(p.diastase),
      freeAcidity:      n(p.freeAcidity),
      proline:          n(p.proline),
      conductivity:     n(p.conductivity),
      fructoseGlucose:  n(p.fructoseGlucose),
      reducingSugars:   n(p.reducingSugars),
      sucrose:          n(p.sucrose),
      ash:              n(p.ash),
      isotopicDiff:     n(p.isotopicDiff),
      colour:           n(p.colour),
      ph:               n(p.ph),
      // Extended
      invertase:        n(p.invertase),
      fgRatio:          n(p.fgRatio),
      waterActivity:    n(p.waterActivity),
      opticalRotation:  n(p.opticalRotation),
      totalPolyphenols: n(p.totalPolyphenols),
      hdeEncoded:       n(p.hdeEncoded),
      maltose:          n(p.maltose),
      viscosity:        n(p.viscosity),
      // Micro
      yeastCount:       n(p.yeastCount),
      totalPlateCount:  n(p.totalPlateCount),
      // Contaminants
      leadPb:           n(p.leadPb),
      cadmiumCd:        n(p.cadmiumCd),
      pesticideScreen:  n(p.pesticideScreen),
      antibioticScreen: n(p.antibioticScreen),
      ruleScore,
    });
    existingIds.add(h.batchId);
    added++;
  }

  if (added > 0) writeRecords(existing);
  return retrain(existing);
}

/**
 * Predict quality score using the RF model.
 * Returns null if model not yet trained.
 */
export function predictQuality(data: Partial<BatchRecord>): {
  score: number; confidence: "high" | "medium" | "low";
} | null {
  const model = readModel();
  if (!model.trained || !model.trees) return null;
  const features  = toFeatureVector(data);
  const treePreds = model.trees.map(t => predictTree(t, features));
  const score     = avg(treePreds);
  const std       = Math.sqrt(avg(treePreds.map(p => (p - score) ** 2)));
  return {
    score:      Math.round(Math.max(0, Math.min(100, score))),
    confidence: std < 5 ? "high" : std < 12 ? "medium" : "low",
  };
}

/** Returns all stored batch records (includes ruleScore). */
export function getBatchRecords(): BatchRecord[] {
  return readRecords();
}

/** Returns current model state for the admin dashboard. */
export function getModelStats(): ModelStats {
  const m = readModel();
  return {
    mode:              m.trained ? "rf" : "rule-based",
    sampleCount:       m.sampleCount,
    r2:                m.r2,
    trainedAt:         m.trainedAt,
    samplesNeeded:     Math.max(0, MIN_SAMPLES - m.sampleCount),
    featureImportance: m.featureImportance,
  };
}

// ── Legacy compat ─────────────────────────────────────────────────────────────
// Kept so any existing imports don't break during transition

/** @deprecated Use addBatchRecord() — no sensory input needed */
export const DEFAULT_WEIGHTS: Record<string, number> = {
  hmf: 0.25, water: 0.20, diastase: 0.15, freeAcidity: 0.12,
  proline: 0.12, conductivity: 0.06, fructoseGlucose: 0.06,
  reducingSugars: 0.04, isotopicDiff: 0.04,
};

/** @deprecated Use getModelStats() */
export function getActiveWeights(): Record<string, number> | null { return null; }
