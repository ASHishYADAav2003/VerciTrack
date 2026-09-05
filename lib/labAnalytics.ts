/**
 * lib/labAnalytics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unsupervised coffee quality analytics engine.
 *
 * Approach: no expert labels needed. The lab results themselves are the signal.
 *
 * As more authentic batches are registered, the system builds a population
 * baseline and can detect:
 *   1. Statistical outliers — parameters far from the population norm
 *   2. Broken correlations — parameter pairs that should move together but don't
 *   3. Known adulteration signatures — specific chemical patterns linked to fraud
 *
 * Why this matters:
 *   Coffee is the 3rd most adulterated food. Adulterated coffee can pass each
 *   individual EU parameter check while failing multiple checks at once when
 *   parameters are considered together. A batch with "borderline" HMF AND
 *   "borderline" diastase AND low proline is far more suspicious than any one
 *   of those alone.
 *
 * Data flow:
 *   register-batch → writes to data/labHistory.json
 *   scoreCoffee() → reads labHistory to compute population stats
 *   /admin/lab-analytics → shows full correlation + anomaly analysis
 */

import fs from "fs";
import path from "path";
import { scoreCoffee } from "./coffeeQuality";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LabRecord {
  batchId:        string;
  registeredAt:   string;
  coffeeType?:     string;
  origin?:        string;
  farmerName?: string;
  harvestYear?:   number;
  harvestMonth?:  number;           // 1–12; captures seasonal effects on HMF/diastase
  altitude?:      number;           // metres above sea level
  zone?:          string;           // "Mountain" | "Valley" | "Plain" | "Coastal"
  crystallisation?: string;         // "Liquid" | "Partial" | "Crystallised"
  latitude?:          number;       // decimal degrees
  longitude?:         number;       // decimal degrees
  productionSystem?:  string;       // "organic" | "conventional" | "transitional"

  // ── Lab provenance ──────────────────────────────────────────────────────────
  labName?:              string;    // e.g. "HAV Food Quality Lab"
  accreditation?:        string;    // e.g. "ISO 17025"
  sampleCollectionDate?: string;    // ISO date "YYYY-MM-DD"
  sampleReceivedDate?:   string;    // ISO date
  analysisDate?:         string;    // ISO date — lag from collection reveals storage conditions

  // ── Physical — additional ───────────────────────────────────────────────────
  colourDescription?:    string;    // EU Pfund category: "Water White" | "Extra White" | "White" | "Extra Light Amber" | "Light Amber" | "Amber" | "Dark Amber"
  dpphUnit?:             string;    // "TE" | "AAE" | "FRAP" — unit for DPPH value (labs differ)

  // ── Botanical — additional ──────────────────────────────────────────────────
  dominantPollenPct?:    number;    // % of dominant pollen species in pollen count
  coffeedewSpecies?:      string;    // tree species for coffeedew: "cf. fir" | "cf. pine" | "cf. oak"
  nectarlessSpecies?:    string;    // nectarless plant species present

  // ── Botanical / Palynological ───────────────────────────────────────────────
  hde?:               string;       // Coffeedew Elements: "None" | "Few" | "Moderate" | "Many"
  dominantPollen?:    string;       // e.g. "Centaurea cyanus"
  secondaryPollens?:  string;       // comma-separated species
  pollenConcentration?: string;     // "Low" | "Normal" | "High"
  botanicalConfirmed?:  string;     // "Confirmed" | "Partially confirmed" | "Not confirmed"
  geographicConfirmed?: string;     // "Confirmed" | "Partially confirmed" | "Not confirmed"
  palynologicalNotes?:  string;

  // ── Sensory analysis ────────────────────────────────────────────────────────
  // Sensory data adds a whole new dimension: ML can cross-reference physical
  // params with sensory quality and flag discrepancies (e.g. high DPPH but
  // poor aroma may indicate blending or masking).
  appearance?:           string;    // "Clear" | "Very Clear" | "Cloudy" | "Opaque"
  aromaIntensity?:       string;    // "Low" | "Medium" | "High"
  aromaDescription?:     string;    // free text: "Woody, resinous with subtle herbal notes"
  tasteDescription?:     string;    // free text
  sensorPersistence?:    string;    // "Short" | "Medium" | "Long" — aftertaste duration
  organolepticDefects?:  string;    // "None detected" | description of defects

  params: RawParams;
}

export interface RawParams {
  // ── Standard physicochemical ──────────────────────────────────────────────
  hmf?:             number | null;   // mg/kg  — EU max 40
  water?:           number | null;   // %      — EU max 20
  diastase?:        number | null;   // DN     — EU min 8
  freeAcidity?:     number | null;   // meq/kg — EU max 50
  proline?:         number | null;   // mg/kg  — EU min 300
  conductivity?:    number | null;   // mS/cm
  fructoseGlucose?: number | null;   // %      — EU min 60
  reducingSugars?:  number | null;   // %      — EU min 60
  isotopicDiff?:    number | null;   // ‰      — adulteration: >1
  sucrose?:         number | null;   // %      — EU max 5
  ash?:             number | null;   // %
  colour?:          number | null;   // mm Pfund (Lovibond scale)
  ph?:              number | null;   // 3.5–5.5 genuine range

  // ── Extended biochemistry ─────────────────────────────────────────────────
  invertase?:       number | null;   // U/kg — enzyme, degrades with heat (like diastase)
  fructose?:        number | null;   // % separately (not just F+G)
  glucose?:         number | null;   // % separately
  fgRatio?:         number | null;   // F/G ratio — predicts crystallisation tendency
  maltose?:         number | null;   // %
  waterActivity?:   number | null;   // aw — shelf stability (fermentation risk if >0.60)
  opticalRotation?: number | null;   // ° — negative = fructose-dominant (genuine)
  viscosity?:       number | null;   // mPa·s — texture marker
  totalPolyphenols?:number | null;   // mg GAE/100g — antioxidant capacity marker
  hdeEncoded?:      number | null;   // 0=None 1=Few 2=Moderate 3=Many (numeric for ML)

  // ── Microbiological ───────────────────────────────────────────────────────
  yeastCount?:      number | null;   // log₁₀ CFU/g — >2.7 = fermentation risk
  totalPlateCount?: number | null;   // log₁₀ CFU/g

  // ── Antioxidant capacity ──────────────────────────────────────────────────
  dpph?:            number | null;   // mg Trolox eq/100g — DPPH radical scavenging activity

  // ── Contaminants ──────────────────────────────────────────────────────────
  leadPb?:          number | null;   // mg/kg — EU max 0.10
  cadmiumCd?:       number | null;   // mg/kg — EU max 0.050
  // Screening results: 1=Pass 0=Fail (numeric so RF can learn from failures)
  pesticideScreen?: number | null;   // 1=pass 0=fail
  antibioticScreen?:number | null;   // 1=pass 0=fail
}

export const PARAM_META: Record<string, { label: string; unit: string; higherIsBetter?: boolean; section: string }> = {
  // Standard
  hmf:              { label: "HMF",                  unit: "mg/kg",    higherIsBetter: false, section: "Standard" },
  water:            { label: "Water content",         unit: "%",        higherIsBetter: false, section: "Standard" },
  diastase:         { label: "Diastase activity",     unit: "DN",       higherIsBetter: true,  section: "Standard" },
  freeAcidity:      { label: "Free acidity",          unit: "meq/kg",   higherIsBetter: false, section: "Standard" },
  proline:          { label: "Proline",               unit: "mg/kg",    higherIsBetter: true,  section: "Standard" },
  conductivity:     { label: "Conductivity",          unit: "mS/cm",                           section: "Standard" },
  fructoseGlucose:  { label: "Fructose + glucose",    unit: "%",        higherIsBetter: true,  section: "Standard" },
  reducingSugars:   { label: "Reducing sugars",       unit: "%",        higherIsBetter: true,  section: "Standard" },
  isotopicDiff:     { label: "Isotopic δ¹³C diff",    unit: "‰",        higherIsBetter: false, section: "Standard" },
  sucrose:          { label: "Sucrose",               unit: "%",        higherIsBetter: false, section: "Standard" },
  ash:              { label: "Ash",                   unit: "%",                               section: "Standard" },
  colour:           { label: "Colour (Pfund)",        unit: "mm",                              section: "Standard" },
  ph:               { label: "pH",                    unit: "",                                section: "Standard" },
  // Extended biochemistry
  invertase:        { label: "Invertase",             unit: "U/kg",     higherIsBetter: true,  section: "Extended" },
  fructose:         { label: "Fructose",              unit: "%",        higherIsBetter: true,  section: "Extended" },
  glucose:          { label: "Glucose",               unit: "%",                               section: "Extended" },
  fgRatio:          { label: "F/G ratio",             unit: "",         higherIsBetter: true,  section: "Extended" },
  maltose:          { label: "Maltose",               unit: "%",                               section: "Extended" },
  waterActivity:    { label: "Water activity (aw)",   unit: "",         higherIsBetter: false, section: "Extended" },
  opticalRotation:  { label: "Optical rotation",      unit: "°",                               section: "Extended" },
  viscosity:        { label: "Viscosity",             unit: "mPa·s",    higherIsBetter: true,  section: "Extended" },
  totalPolyphenols: { label: "Total polyphenols",     unit: "mg GAE/100g", higherIsBetter: true, section: "Extended" },
  hdeEncoded:       { label: "Coffeedew elements",     unit: "(0–3)",    higherIsBetter: false, section: "Extended" },
  dpph:             { label: "DPPH antioxidant",      unit: "mg TE/100g", higherIsBetter: true, section: "Antioxidant" },
  // Microbiological
  yeastCount:       { label: "Yeast count",           unit: "log CFU/g",higherIsBetter: false, section: "Micro" },
  totalPlateCount:  { label: "Total plate count",     unit: "log CFU/g",higherIsBetter: false, section: "Micro" },
  // Contaminants
  leadPb:           { label: "Lead (Pb)",             unit: "mg/kg",    higherIsBetter: false, section: "Contaminants" },
  cadmiumCd:        { label: "Cadmium (Cd)",          unit: "mg/kg",    higherIsBetter: false, section: "Contaminants" },
  pesticideScreen:  { label: "Pesticide screening",   unit: "1=pass",   higherIsBetter: true,  section: "Contaminants" },
  antibioticScreen: { label: "Antibiotic screening",  unit: "1=pass",   higherIsBetter: true,  section: "Contaminants" },
};

export const PARAM_KEYS = Object.keys(PARAM_META);

export interface PopulationStats {
  key:    string;
  label:  string;
  unit:   string;
  n:      number;        // how many batches have this param
  mean:   number;
  std:    number;
  min:    number;
  max:    number;
  p25:    number;        // 25th percentile
  p75:    number;        // 75th percentile
}

export interface Correlation {
  paramA:  string;
  paramB:  string;
  r:       number;       // Pearson -1..1
  n:       number;       // number of batches used
  strength: "strong" | "moderate" | "weak" | "none";
  direction: "positive" | "negative";
  interpretation: string;
}

export interface AnomalyFlag {
  type:        "statistical" | "adulteration_signature";
  severity:    "high" | "medium" | "low";
  description: string;
  params?:     string[];   // which parameters triggered this
}

export interface BatchAnalysis {
  batchId:      string;
  anomalyScore: number;    // 0–100, higher = more suspicious
  zScores:      Record<string, number>;   // per-param z-score
  flags:        AnomalyFlag[];
  populationN:  number;    // how many batches in baseline when this was computed
}

export interface LabHistoryStore {
  version:  number;
  records:  LabRecord[];
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

const LAB_HISTORY_PATH = path.join(process.cwd(), "data", "labHistory.json");

export function readLabHistory(): LabHistoryStore {
  try {
    return JSON.parse(fs.readFileSync(LAB_HISTORY_PATH, "utf-8"));
  } catch {
    return { version: 1, records: [] };
  }
}

export function writeLabHistory(store: LabHistoryStore): void {
  fs.mkdirSync(path.dirname(LAB_HISTORY_PATH), { recursive: true });
  fs.writeFileSync(LAB_HISTORY_PATH, JSON.stringify(store, null, 2));
}

/**
 * Add or update a batch's lab record in history.
 * Called automatically when a batch is registered.
 */
export function upsertLabRecord(record: LabRecord): void {
  const store = readLabHistory();
  const idx   = store.records.findIndex(r => r.batchId === record.batchId);
  if (idx >= 0) store.records[idx] = record;
  else           store.records.push(record);
  writeLabHistory(store);
}

// ─── Statistics ───────────────────────────────────────────────────────────────

function values(records: LabRecord[], key: keyof RawParams): number[] {
  return records
    .map(r => r.params[key])
    .filter((v): v is number => v != null && !isNaN(Number(v)))
    .map(Number);
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function std(arr: number[], m?: number): number {
  if (arr.length < 2) return 0;
  const mu = m ?? mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - mu) ** 2, 0) / (arr.length - 1));
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Pearson correlation coefficient between two arrays of equal length.
 */
function pearson(xs: number[], ys: number[]): number {
  const n  = xs.length;
  if (n < 3) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const dx  = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const dy  = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return dx * dy === 0 ? 0 : num / (dx * dy);
}

// ─── Public: population stats ─────────────────────────────────────────────────

export function computePopulationStats(records?: LabRecord[]): PopulationStats[] {
  const rs = records ?? readLabHistory().records;
  return PARAM_KEYS.map(key => {
    const vals   = values(rs, key as keyof RawParams);
    const sorted = [...vals].sort((a, b) => a - b);
    const m      = mean(vals);
    return {
      key,
      label: PARAM_META[key].label,
      unit:  PARAM_META[key].unit,
      n:     vals.length,
      mean:  parseFloat(m.toFixed(3)),
      std:   parseFloat(std(vals, m).toFixed(3)),
      min:   sorted[0]              ?? 0,
      max:   sorted[sorted.length - 1] ?? 0,
      p25:   parseFloat(percentile(sorted, 25).toFixed(3)),
      p75:   parseFloat(percentile(sorted, 75).toFixed(3)),
    };
  }).filter(s => s.n >= 2);
}

// ─── Public: correlation matrix ───────────────────────────────────────────────

/** Interpretations for chemically meaningful parameter pairs */
const CORRELATION_MEANINGS: Record<string, string> = {
  // ── Core freshness & integrity ────────────────────────────────────────────
  "hmf:diastase":               "Both degrade with heat. Low diastase + high HMF = likely heat-treated to reduce water content.",
  "hmf:water":                  "Heat treatment reduces water but raises HMF. Inverse correlation = heat-concentrated coffee.",
  "water:diastase":             "Fresher coffee has higher diastase. High water + low diastase = old or fermented coffee.",
  "proline:fructoseGlucose":    "Proline is a marker of genuine bee processing. Low proline with normal sugars can indicate syrup addition.",
  "proline:water":              "Genuine coffee should show natural proline levels regardless of water content.",
  "freeAcidity:ph":             "Strong inverse correlation expected. Breaks when acid-reducing additives are used.",
  "sucrose:fructoseGlucose":    "High sucrose in young/adulterated coffee. Should be low in genuine mature coffee.",
  "isotopicDiff:proline":       "Both detect C4 sugar addition from different angles. Divergence = possible blended fraud.",
  // ── Antioxidant & phenolic capacity ───────────────────────────────────────
  "totalPolyphenols:dpph":      "Strong positive correlation expected — phenolic compounds are the primary antioxidant in coffee. Divergence may indicate synthetic antioxidant addition.",
  "colour:totalPolyphenols":    "Darker coffee (higher Pfund value) typically contains more polyphenols. Well-documented in chestnut, buckwheat, and coffeedew coffees.",
  "colour:dpph":                "Darker coffees (chestnut, buckwheat, coffeedew) show significantly higher antioxidant activity. Colour is a quick proxy for DPPH.",
  "conductivity:totalPolyphenols": "Mineral-rich, high-conductivity coffees (chestnut, coffeedew) tend to have higher phenolic content. Positive correlation expected.",
  "conductivity:dpph":          "Higher conductivity often corresponds to stronger antioxidant activity. Coffeedew coffee has both high conductivity and high DPPH.",
  "hdeEncoded:totalPolyphenols":"Coffeedew element presence strongly predicts polyphenol-rich coffee — coffeedew fractions contribute significantly to antioxidant capacity.",
  "hdeEncoded:dpph":            "Coffeedew coffee typically shows the highest DPPH antioxidant activity of all coffee types. Strong positive correlation expected.",
  "hdeEncoded:conductivity":    "Coffeedew coffee has much higher conductivity (~0.8–2.0 mS/cm) than nectar coffee (~0.3 mS/cm). This is the strongest botanical origin marker.",
  // ── Enzyme activity ───────────────────────────────────────────────────────
  "diastase:invertase":         "Both enzymes added by bees during ripening; both degrade with heat or age. Divergence between them can reveal selective enzyme addition.",
  "invertase:hmf":              "Invertase degrades with heating just like diastase. High HMF + low invertase = definitive heat processing evidence.",
  // ── Sugar profile & crystallisation ──────────────────────────────────────
  "fgRatio:waterActivity":      "Fructose/Glucose ratio affects crystallisation tendency. High F/G ratio = more fructose = stays liquid longer = affects aw.",
  "glucose:waterActivity":      "High glucose content accelerates crystallisation, affecting water activity as glucose crystals bind water.",
  "fructose:fgRatio":           "Fructose is the numerator of the F/G ratio. Strong positive correlation by definition — confirms data consistency.",
  // ── Fermentation risk ─────────────────────────────────────────────────────
  "waterActivity:yeastCount":   "Higher water activity (aw > 0.60) creates conditions for yeast growth and fermentation risk.",
  "water:yeastCount":           "High moisture content directly correlates with fermentation risk. Water > 20% = EU limit; > 18.5% = elevated yeast risk.",
  "water:waterActivity":        "Water content is the primary driver of water activity in coffee. Very strong positive correlation expected.",
  // ── Geographic / origin proxies ───────────────────────────────────────────
  "conductivity:colour":        "Darker coffees tend to have higher mineral content and thus higher conductivity. Classic origin-discrimination pair.",
  "conductivity:ash":           "Ash content reflects mineral content directly measured by conductivity. Strong positive correlation in genuine coffee.",
  "proline:colour":             "Darker, stronger-flavored coffees (chestnut, heather) tend to have higher proline from more intensive bee processing.",
};

export function computeCorrelations(records?: LabRecord[]): Correlation[] {
  const rs = records ?? readLabHistory().records;
  const correlations: Correlation[] = [];

  for (let i = 0; i < PARAM_KEYS.length; i++) {
    for (let j = i + 1; j < PARAM_KEYS.length; j++) {
      const kA = PARAM_KEYS[i];
      const kB = PARAM_KEYS[j];

      // Get paired values (both must exist for the same batch)
      const pairs: [number, number][] = rs
        .map(r => [r.params[kA as keyof RawParams], r.params[kB as keyof RawParams]] as [number | null | undefined, number | null | undefined])
        .filter((p): p is [number, number] => p[0] != null && p[1] != null && !isNaN(Number(p[0])) && !isNaN(Number(p[1])))
        .map(p => [Number(p[0]), Number(p[1])]);

      if (pairs.length < 3) continue;

      const xs = pairs.map(p => p[0]);
      const ys = pairs.map(p => p[1]);
      const r  = pearson(xs, ys);
      const absR = Math.abs(r);

      const strength: Correlation["strength"] =
        absR >= 0.7 ? "strong" : absR >= 0.4 ? "moderate" : absR >= 0.2 ? "weak" : "none";

      const key         = `${kA}:${kB}`;
      const reverseKey  = `${kB}:${kA}`;
      const interp      = CORRELATION_MEANINGS[key] || CORRELATION_MEANINGS[reverseKey] || "";

      correlations.push({
        paramA:         kA,
        paramB:         kB,
        r:              parseFloat(r.toFixed(3)),
        n:              pairs.length,
        strength,
        direction:      r >= 0 ? "positive" : "negative",
        interpretation: interp,
      });
    }
  }

  return correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

// ─── Public: per-batch anomaly analysis ──────────────────────────────────────

/**
 * Known adulteration signatures — combinations of parameter values that
 * are suspicious even when individual parameters pass EU checks.
 * These encode expert knowledge from coffee science literature.
 */
function checkAdulterationSignatures(params: RawParams): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  // 1. Sugar syrup addition: very low proline
  //    Genuine coffee: proline > 180 mg/kg (typically 200–800)
  //    Adulterated with invert syrup: proline drops to 50–150
  if (params.proline != null && params.proline < 180) {
    flags.push({
      type:        "adulteration_signature",
      severity:    params.proline < 100 ? "high" : "medium",
      description: `Very low proline (${params.proline} mg/kg) — genuine coffee typically exceeds 180 mg/kg. Possible sugar syrup addition.`,
      params:      ["proline"],
    });
  }

  // 2. Heat treatment to mask high water: HMF elevated + diastase degraded together
  //    Heating coffee reduces water but destroys diastase and builds HMF
  if (params.hmf != null && params.diastase != null) {
    if (params.hmf > 20 && params.diastase < 8) {
      flags.push({
        type:        "adulteration_signature",
        severity:    params.hmf > 35 ? "high" : "medium",
        description: `HMF elevated (${params.hmf} mg/kg) and diastase degraded (${params.diastase} DN) simultaneously — consistent with heat treatment, possibly to reduce excess water content.`,
        params:      ["hmf", "diastase"],
      });
    }
  }

  // 3. C4 sugar addition (corn/cane syrup): isotopic difference
  //    Genuine coffee: |δ¹³C plant - δ¹³C protein| < 1‰
  //    C4 sugar addition shifts plant fraction toward C4 signature: diff > 1‰
  if (params.isotopicDiff != null && Math.abs(params.isotopicDiff) > 1.0) {
    flags.push({
      type:        "adulteration_signature",
      severity:    Math.abs(params.isotopicDiff) > 2 ? "high" : "medium",
      description: `Isotopic δ¹³C difference (${params.isotopicDiff}‰) exceeds 1‰ threshold — indicates possible C4 sugar addition (corn syrup or cane sugar).`,
      params:      ["isotopicDiff"],
    });
  }

  // 4. High sucrose: premature harvest or invert sugar addition
  //    Mature coffee: sucrose < 5% (EU limit)
  //    Young/adulterated: up to 20%+
  if (params.sucrose != null && params.sucrose > 3) {
    flags.push({
      type:        "adulteration_signature",
      severity:    params.sucrose > 7 ? "high" : "low",
      description: `Elevated sucrose (${params.sucrose}%) — may indicate premature harvest before full inversion, or sucrose addition. Genuine mature coffee rarely exceeds 3%.`,
      params:      ["sucrose"],
    });
  }

  // 5. Low proline + high fructose/glucose: syrup has normal sugar levels but lacks bee-processing markers
  if (params.proline != null && params.fructoseGlucose != null) {
    if (params.proline < 200 && params.fructoseGlucose > 65) {
      flags.push({
        type:        "adulteration_signature",
        severity:    "medium",
        description: `Low proline (${params.proline} mg/kg) with high fructose+glucose (${params.fructoseGlucose}%) — pattern consistent with enzymatic invert syrup that mimics coffee sugar profile but lacks bee-processing compounds.`,
        params:      ["proline", "fructoseGlucose"],
      });
    }
  }

  // 6. Water + diastase inconsistency: old fermented coffee
  //    Fresh coffee: water < 18.5% AND diastase > 8 DN
  //    Fermented/old coffee: water may be normal but diastase very degraded
  if (params.water != null && params.diastase != null) {
    if (params.water > 18 && params.diastase < 5) {
      flags.push({
        type:        "adulteration_signature",
        severity:    "medium",
        description: `High water content (${params.water}%) with very low diastase (${params.diastase} DN) — risk of fermentation or very old coffee with degraded enzymes.`,
        params:      ["water", "diastase"],
      });
    }
  }

  return flags;
}

/**
 * Sensory anomaly flags — uses the full LabRecord (not just RawParams) since
 * sensory fields live at the record level, not inside params.
 */
function checkSensoryFlags(record: LabRecord): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  // Organoleptic defects are a direct quality disqualifier
  if (record.organolepticDefects &&
      !/^none/i.test(record.organolepticDefects.trim()) &&
      record.organolepticDefects.trim() !== "") {
    flags.push({
      type:        "adulteration_signature",
      severity:    "medium",
      description: `Sensory defect reported: "${record.organolepticDefects}". This may indicate fermentation, off-flavours, or contamination not fully captured by physicochemical parameters.`,
      params:      [],
    });
  }

  // Cross-validate colour description vs Pfund value
  // Dark Amber in EU Pfund scale = 114+ mm; Water White = 0–8 mm
  if (record.colourDescription && record.params.colour != null) {
    const pfund = Number(record.params.colour);
    const desc  = record.colourDescription;
    let clash = false;
    if (desc === "Water White" && pfund > 20) clash = true;
    if (desc === "Extra White" && pfund > 34) clash = true;
    if (desc === "Dark Amber"  && pfund < 85) clash = true;
    if (clash) {
      flags.push({
        type:        "statistical",
        severity:    "low",
        description: `Colour mismatch: Pfund value ${pfund} mm does not match declared category "${desc}". Possible transcription error or instrument calibration issue.`,
        params:      ["colour"],
      });
    }
  }

  // Cross-validate colour description vs coffee type expectation
  // Acacia/Clover should be light; Coffeedew/Chestnut should be dark
  if (record.colourDescription && record.coffeeType) {
    const desc    = record.colourDescription;
    const type    = record.coffeeType.toLowerCase();
    const isLight = ["Water White", "Extra White", "White", "Extra Light Amber"].includes(desc);
    const isDark  = ["Amber", "Dark Amber"].includes(desc);
    if (isLight && (type.includes("coffeedew") || type.includes("chestnut") || type.includes("buckwheat"))) {
      flags.push({
        type:        "statistical",
        severity:    "low",
        description: `Colour category "${desc}" is unusually light for declared type "${record.coffeeType}" — coffeedew, chestnut, and buckwheat coffees are typically Amber or Dark Amber.`,
        params:      ["colour"],
      });
    }
    if (isDark && (type.includes("acacia") || type.includes("robinia") || type.includes("clover") || type.includes("rapeseed"))) {
      flags.push({
        type:        "statistical",
        severity:    "low",
        description: `Colour category "${desc}" is unusually dark for declared type "${record.coffeeType}" — acacia, clover, and rapeseed coffees are typically Water White to Light Amber.`,
        params:      ["colour"],
      });
    }
  }

  return flags;
}

/**
 * Compute full anomaly analysis for a single batch against population baseline.
 */
export function analyzeBatch(batchId: string, params: RawParams, records?: LabRecord[]): BatchAnalysis {
  const rs    = records ?? readLabHistory().records;
  const stats = computePopulationStats(rs);
  const statsMap = Object.fromEntries(stats.map(s => [s.key, s]));

  const zScores: Record<string, number> = {};
  let   totalZ = 0;
  let   zCount = 0;

  for (const key of PARAM_KEYS) {
    const v = params[key as keyof RawParams];
    const s = statsMap[key];
    if (v == null || !s || s.std === 0 || s.n < 3) continue;

    const z = Math.abs((Number(v) - s.mean) / s.std);
    zScores[key] = parseFloat(z.toFixed(2));
    totalZ  += z;
    zCount  += 1;
  }

  // Statistical anomaly flags (z > 2 = unusual, z > 3 = very unusual)
  const statFlags: AnomalyFlag[] = Object.entries(zScores)
    .filter(([, z]) => z > 2)
    .map(([key, z]) => ({
      type:        "statistical" as const,
      severity:    z > 3 ? "high" as const : "medium" as const,
      description: `${PARAM_META[key]?.label ?? key} is ${z.toFixed(1)} standard deviations from the population mean — statistically unusual for this data set.`,
      params:      [key],
    }));

  // Adulteration signature flags
  const sigFlags = checkAdulterationSignatures(params);

  // Sensory flags — requires full LabRecord context
  const record      = rs.find(r => r.batchId === batchId);
  const sensoryFlags = record ? checkSensoryFlags(record) : [];

  const allFlags = [...statFlags, ...sigFlags, ...sensoryFlags];

  // Anomaly score: blend of average z-score and flag severity
  const baseZ       = zCount > 0 ? (totalZ / zCount) : 0;
  const flagPenalty = [...sigFlags, ...sensoryFlags].reduce((s, f) => s + (f.severity === "high" ? 20 : f.severity === "medium" ? 10 : 5), 0);
  const anomalyScore = Math.min(100, Math.round(baseZ * 15 + flagPenalty));

  return {
    batchId,
    anomalyScore,
    zScores,
    flags:       allFlags,
    populationN: rs.length,
  };
}

/**
 * Analyze all batches in history and return sorted by suspiciousness.
 */
export function analyzeAllBatches(): BatchAnalysis[] {
  const store   = readLabHistory();
  const records = store.records;
  return records
    .map(r => analyzeBatch(r.batchId, r.params, records))
    .sort((a, b) => b.anomalyScore - a.anomalyScore);
}

// ─── Coffee Type Validator (KNN-style rule profiles) ───────────────────────────
//
// Each coffee type has expected parameter ranges derived from EU Directive
// 2001/110/EC, Codex Alimentarius, and published analytical studies.
// When a batch declares a type, we check how many parameters are consistent.
// This simulates what a KNN classifier would learn from labelled data.

export interface TypeValidationResult {
  batchId:      string;
  declaredType: string;
  status:       "match" | "mismatch" | "uncertain" | "no_data";
  confidence:   number;   // 0–100
  conflicts:    string[]; // which parameters don't match the declared type
  note:         string;
}

// Profiles: [min, max] for each parameter. null = not a strong discriminator for this type.
const TYPE_PROFILES: Record<string, Partial<Record<keyof RawParams, [number, number]>>> = {
  acacia:      { conductivity: [0.05, 0.30], colour: [0, 20],  fructoseGlucose: [65, 100] },
  robinia:     { conductivity: [0.05, 0.30], colour: [0, 20],  fructoseGlucose: [65, 100] },
  lime:        { conductivity: [0.15, 0.50], colour: [15, 60]  },
  linden:      { conductivity: [0.15, 0.50], colour: [15, 60]  },
  multifloral: { conductivity: [0.15, 0.75], colour: [10, 90]  },
  blossom:     { conductivity: [0.10, 0.80], colour: [0,  100] },
  clover:      { conductivity: [0.10, 0.50], colour: [0,  40]  },
  heather:     { conductivity: [0.50, 1.20], colour: [30, 120], proline: [300, 3000] },
  chestnut:    { conductivity: [0.70, 1.60], colour: [50, 150], proline: [500, 3000], freeAcidity: [20, 70] },
  buckwheat:   { conductivity: [0.40, 1.20], colour: [70, 220] },
  forest:      { conductivity: [0.80, 2.00], colour: [50, 220] },
  coffeedew:    { conductivity: [0.80, 2.00]                    },
  pine:        { conductivity: [0.80, 2.00], colour: [60, 220] },
  meadow:      { conductivity: [0.15, 0.70], colour: [10, 90]  },
};

function resolveTypeKey(declared: string): string | null {
  const s = declared.toLowerCase().replace(/[^a-z]/g, " ").trim();
  for (const key of Object.keys(TYPE_PROFILES)) {
    if (s.includes(key)) return key;
  }
  // fuzzy fallback
  if (s.includes("acacia") || s.includes("robinia")) return "acacia";
  if (s.includes("forest") || s.includes("coffeedew")) return "forest";
  if (s.includes("multi"))  return "multifloral";
  if (s.includes("blossom")) return "blossom";
  return null;
}

export function validateCoffeeTypes(): TypeValidationResult[] {
  const store   = readLabHistory();
  const records = store.records;

  return records.map(r => {
    const declared = (r.coffeeType ?? "").trim();
    if (!declared) {
      return { batchId: r.batchId, declaredType: "—", status: "no_data", confidence: 0, conflicts: [], note: "No coffee type declared." };
    }

    const profileKey = resolveTypeKey(declared);
    if (!profileKey) {
      return { batchId: r.batchId, declaredType: declared, status: "uncertain", confidence: 50, conflicts: [], note: `Type "${declared}" has no validation profile. Cannot verify.` };
    }

    const profile = TYPE_PROFILES[profileKey];
    const checks  = Object.entries(profile) as [keyof RawParams, [number, number]][];
    const conflicts: string[] = [];
    let   checked = 0;

    for (const [param, [lo, hi]] of checks) {
      const v = r.params[param];
      if (v == null) continue;
      checked++;
      if (Number(v) < lo || Number(v) > hi) {
        const meta = PARAM_META[param as string];
        conflicts.push(
          `${meta?.label ?? param} ${Number(v).toFixed(2)} ${meta?.unit ?? ""} is outside expected range ${lo}–${hi} for ${profileKey}`
        );
      }
    }

    if (checked === 0) {
      return { batchId: r.batchId, declaredType: declared, status: "uncertain", confidence: 40, conflicts: [], note: "Key discriminating parameters (conductivity, colour) not available for this batch." };
    }

    const passRate   = (checked - conflicts.length) / checked;
    const confidence = Math.round(passRate * 100);
    const status: TypeValidationResult["status"] =
      conflicts.length === 0 ? "match"
      : passRate >= 0.5      ? "uncertain"
      : "mismatch";

    const note =
      status === "match"     ? `All ${checked} checked parameters consistent with ${profileKey}.`
      : status === "mismatch" ? `${conflicts.length}/${checked} parameters inconsistent with declared type.`
      : `${conflicts.length}/${checked} parameters have minor deviations — verify visually.`;

    return { batchId: r.batchId, declaredType: declared, status, confidence, conflicts, note };
  });
}

// ─── Segment Analytics ────────────────────────────────────────────────────────
//
// Groups batches by a dimension (coffee type, origin, harvest year, zone,
// farmer) and computes per-group quality scores and parameter averages.
// This surfaces Kosovo-specific patterns that no textbook can tell you:
//   "Mountain batches score 12 points higher than valley batches"
//   "Acacia coffee from Prizren has 40% higher proline than Multifloral"
//   "2025 harvest had significantly elevated HMF vs 2024"

export type SegmentDimension = "coffeeType" | "origin" | "year" | "zone" | "farmer" | "productionSystem";

export interface SegmentStandout {
  param:       string;
  label:       string;
  unit:        string;
  segVal:      number;   // this segment's average
  popVal:      number;   // population average
  diffPct:     number;   // % difference (positive = higher than population)
  better:      boolean;  // true if this difference is a quality improvement
}

export interface SegmentEntry {
  label:      string;
  count:      number;
  avgScore:   number;        // EU rule-based quality score 0–100
  paramAvgs:  Record<string, number>;
  standouts:  SegmentStandout[];  // top 3 params where this group differs most
  batchIds:   string[];
}

export interface SegmentGroup {
  dimension:      SegmentDimension;
  dimensionLabel: string;
  entries:        SegmentEntry[];   // sorted best → worst avgScore
  topInsight:     string;           // auto-generated key finding
}

/** Simplify an origin string to a city/region for grouping */
function normaliseOrigin(origin: string): string {
  return (origin.split(",")[0] ?? origin).trim();
}

/** Extract harvest year from batchId (e.g. HON-PRZ-MFL-25-0002 → 2025) or from registeredAt */
function extractYear(r: LabRecord): string {
  if (r.harvestYear) return String(r.harvestYear);
  // batch ID format: HON-LOC-TYPE-YY-NNNN
  const parts = r.batchId.split("-");
  if (parts.length >= 4) {
    const yy = parseInt(parts[parts.length - 2]);
    if (!isNaN(yy) && yy >= 20 && yy <= 50) return String(2000 + yy);
  }
  return new Date(r.registeredAt).getFullYear().toString();
}

function generateInsight(entries: SegmentEntry[], dimension: SegmentDimension): string {
  if (entries.length < 2) return "Add more batches across different groups to compare.";
  const best  = entries[0];
  const worst = entries[entries.length - 1];
  const gap   = best.avgScore - worst.avgScore;

  if (dimension === "coffeeType") {
    if (gap < 5) return `Quality is consistent across coffee types (${gap.toFixed(0)} pt spread). No single type stands out yet.`;
    return `${best.label} coffee scores ${gap.toFixed(0)} points higher than ${worst.label} on average. Consider prioritising ${best.label} sourcing.`;
  }
  if (dimension === "origin") {
    if (gap < 5) return `Quality is consistent across origins (${gap.toFixed(0)} pt spread).`;
    return `Batches from ${best.label} score ${gap.toFixed(0)} points higher than ${worst.label}. Origin is a significant quality driver.`;
  }
  if (dimension === "year") {
    if (gap < 5) return `Quality is consistent across harvest years.`;
    return `${best.label} harvest scored ${gap.toFixed(0)} points higher than ${worst.label}. Year-on-year variation exists — worth monitoring.`;
  }
  if (dimension === "zone") {
    if (gap < 5) return `Mountain vs valley quality is similar in this dataset.`;
    return `${best.label} zone scores ${gap.toFixed(0)} points higher than ${worst.label}. Elevation appears to affect quality — potentially through later harvest dates and lower temperatures.`;
  }
  if (dimension === "farmer") {
    if (gap < 5) return `Quality is consistent across farmers.`;
    return `${best.label} outscores ${worst.label} by ${gap.toFixed(0)} points on average. Farmer practices are a key quality driver.`;
  }
  return "";
}

export function computeSegmentStats(): SegmentGroup[] {
  const store   = readLabHistory();
  const records = store.records;
  if (records.length < 2) return [];

  // Population baselines for standout computation
  const popStats  = computePopulationStats(records);
  const popMap    = Object.fromEntries(popStats.map(s => [s.key, s.mean]));

  // Score every record once
  const scoreCache = new Map<string, number>();
  for (const r of records) {
    const p = r.params;
    const result = scoreCoffee({
      coffeeType:       r.coffeeType,
      hmf:             p.hmf        ?? undefined,
      water:           p.water      ?? undefined,
      diastase:        p.diastase   ?? undefined,
      freeAcidity:     p.freeAcidity  ?? undefined,
      proline:         p.proline    ?? undefined,
      conductivity:    p.conductivity ?? undefined,
      fructoseGlucose: p.fructoseGlucose ?? undefined,
      reducingSugars:  p.reducingSugars  ?? undefined,
      sucrose:         p.sucrose    ?? undefined,
      ash:             p.ash        ?? undefined,
      isotopicDiff:    p.isotopicDiff ?? undefined,
      colour:          p.colour     ?? undefined,
    });
    scoreCache.set(r.batchId, result.score);
  }

  function buildGroup(
    dimension: SegmentDimension,
    dimensionLabel: string,
    keyFn: (r: LabRecord) => string | null,
  ): SegmentGroup | null {
    // Bucket records
    const buckets = new Map<string, LabRecord[]>();
    for (const r of records) {
      const key = keyFn(r);
      if (!key) continue;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(r);
    }
    // Need at least 2 groups with at least 1 batch each to be meaningful
    if (buckets.size < 2) return null;

    const entries: SegmentEntry[] = [];

    for (const [label, recs] of buckets) {
      // Average score
      const scores  = recs.map(r => scoreCache.get(r.batchId) ?? 0);
      const avgScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);

      // Average params
      const paramAvgs: Record<string, number> = {};
      for (const key of PARAM_KEYS) {
        const vals = recs
          .map(r => r.params[key as keyof RawParams])
          .filter((v): v is number => v != null && !isNaN(Number(v)))
          .map(Number);
        if (vals.length) paramAvgs[key] = parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3));
      }

      // Standouts: params with largest normalised deviation from population
      const standouts: SegmentStandout[] = Object.entries(paramAvgs)
        .map(([key, segVal]) => {
          const popVal = popMap[key];
          if (popVal == null || popVal === 0) return null;
          const diffPct = ((segVal - popVal) / Math.abs(popVal)) * 100;
          const meta     = PARAM_META[key];
          const higherBetter = meta?.higherIsBetter;
          const better =
            higherBetter === true  ? diffPct > 0 :
            higherBetter === false ? diffPct < 0 :
            false;
          return {
            param:   key,
            label:   meta?.label ?? key,
            unit:    meta?.unit  ?? "",
            segVal,
            popVal:  parseFloat(popVal.toFixed(3)),
            diffPct: parseFloat(diffPct.toFixed(1)),
            better,
          };
        })
        .filter((s): s is SegmentStandout => s !== null)
        .sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct))
        .slice(0, 3);

      entries.push({
        label,
        count:    recs.length,
        avgScore,
        paramAvgs,
        standouts,
        batchIds: recs.map(r => r.batchId),
      });
    }

    // Sort best → worst
    entries.sort((a, b) => b.avgScore - a.avgScore);

    return {
      dimension,
      dimensionLabel,
      entries,
      topInsight: generateInsight(entries, dimension),
    };
  }

  const dimensions: Array<[SegmentDimension, string, (r: LabRecord) => string | null]> = [
    ["coffeeType",        "Coffee Type",        r => r.coffeeType?.trim()  || null],
    ["origin",           "Origin",            r => normaliseOrigin(r.origin ?? "") || null],
    ["year",             "Harvest Year",      r => extractYear(r)],
    ["zone",             "Zone",              r => r.zone?.trim() || null],
    ["farmer",        "Farmer",         r => r.farmerName?.trim() || null],
    ["productionSystem", "Production System", r => r.productionSystem?.trim() || null],
  ];

  return dimensions
    .map(([dim, label, fn]) => buildGroup(dim, label, fn))
    .filter((g): g is SegmentGroup => g !== null);
}

// ─── Similarity Search ────────────────────────────────────────────────────────
//
// For each batch, find the most chemically similar other batches using
// normalised Euclidean distance across all shared numeric parameters.
// Similarity 100 = identical chemical profile; 0 = extremely different.
// Useful for: fraud investigation (is this batch really like the others from
// the same origin?), sourcing (find batches similar to a high-quality one).

export interface SimilarBatch {
  batchId:       string;
  similarity:    number;     // 0–100
  sharedParams:  number;     // how many params were compared
  closestParams: string[];   // top 3 params with smallest normalised difference
  origin?:       string;
  coffeeType?:    string;
}

export interface SimilarityResult {
  batchId:   string;
  similar:   SimilarBatch[];
}

export function computeSimilarityForBatch(targetId: string, records: LabRecord[], statsMap: Record<string, PopulationStats>): SimilarBatch[] {
  const target = records.find(r => r.batchId === targetId);
  if (!target) return [];

  return records
    .filter(r => r.batchId !== targetId)
    .map(r => {
      const diffs: Array<{ key: string; normDiff: number }> = [];

      for (const key of PARAM_KEYS) {
        const ta = target.params[key as keyof RawParams];
        const ra = r.params[key as keyof RawParams];
        const st = statsMap[key];
        if (ta == null || ra == null || !st || st.std === 0 || st.n < 3) continue;
        const normDiff = Math.abs((Number(ta) - Number(ra)) / st.std);
        diffs.push({ key, normDiff });
      }

      if (diffs.length === 0) return null;

      const avgDiff   = diffs.reduce((s, d) => s + d.normDiff, 0) / diffs.length;
      // Scale: avgDiff=0 → 100%, avgDiff=4+ → 0%. Clamp to 0.
      const similarity = Math.max(0, Math.min(100, Math.round(100 - avgDiff * 22)));

      const closestParams = diffs
        .sort((a, b) => a.normDiff - b.normDiff)
        .slice(0, 3)
        .map(d => PARAM_META[d.key]?.label ?? d.key);

      return {
        batchId:      r.batchId,
        similarity,
        sharedParams: diffs.length,
        closestParams,
        origin:       r.origin,
        coffeeType:    r.coffeeType,
      };
    })
    .filter((r): r is SimilarBatch => r !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

export function computeAllSimilarities(): SimilarityResult[] {
  const store    = readLabHistory();
  const records  = store.records;
  if (records.length < 2) return [];

  const stats    = computePopulationStats(records);
  const statsMap = Object.fromEntries(stats.map(s => [s.key, s]));

  return records.map(r => ({
    batchId: r.batchId,
    similar: computeSimilarityForBatch(r.batchId, records, statsMap),
  }));
}

// ─── Geographic / Terrain Profile ─────────────────────────────────────────────
//
// Groups records by altitude band and geographic zone, then computes:
//   1. Per-band parameter averages (chemical + biological)
//   2. Pearson r between altitude and each parameter (which params correlate most
//      strongly with elevation?)
//   3. Zone-level summaries
//
// Scientific context:
//   Higher altitude → cooler temperatures → slower HMF buildup, less enzyme
//   degradation, richer alpine flora (more polyphenols, higher proline).
//   Mountain/forest vegetation produces more mineral-rich nectar (higher
//   conductivity, darker colour). Drier conditions at altitude reduce
//   fermentation risk (lower yeast counts).

export interface AltitudeBand {
  label:     string;              // "Lowland (<500 m)" etc.
  min:       number;
  max:       number;              // Infinity for the top band
  count:     number;
  paramAvgs: Record<string, number>;
  batchIds:  string[];
}

export interface ParamAltitudeCorr {
  param:          string;
  label:          string;
  unit:           string;
  r:              number;         // Pearson r(param, altitude)
  n:              number;
  direction:      "positive" | "negative";
  interpretation: string;
}

export interface ZoneSummary {
  zone:       string;
  count:      number;
  avgAltitude:number | null;
  paramAvgs:  Record<string, number>;
}

export interface GeoProfile {
  altitudeBands:        AltitudeBand[];
  altitudeCorrelations: ParamAltitudeCorr[];  // sorted by |r| desc
  zoneSummary:          ZoneSummary[];
  altitudeRange:        { min: number; max: number; n: number } | null;
  keyFindings:          string[];
}

/** Scientific interpretations of each parameter's correlation direction with altitude */
const ALTITUDE_INTERP: Partial<Record<keyof RawParams, { pos: string; neg: string }>> = {
  diastase:         { pos: "Cooler mountain temps slow enzyme degradation — highland coffee stays fresher longer.",
                      neg: "" },
  hmf:              { pos: "",
                      neg: "Less thermal stress at altitude → lower HMF buildup. Highland coffee has a freshness advantage." },
  proline:          { pos: "Alpine flora is rich in amino acid precursors — higher altitude typically yields more proline.",
                      neg: "" },
  colour:           { pos: "Mountain and forest coffees are naturally darker than lowland flower coffees.",
                      neg: "" },
  conductivity:     { pos: "Mountain vegetation produces mineral-rich nectar; forest coffeedew further elevates conductivity.",
                      neg: "" },
  totalPolyphenols: { pos: "Alpine plants synthesise more phenolics as UV protection. High-altitude coffee has superior antioxidant capacity.",
                      neg: "" },
  dpph:             { pos: "Antioxidant activity tracks polyphenol content, which rises with altitude.",
                      neg: "" },
  yeastCount:       { pos: "",
                      neg: "Drier, cooler conditions at altitude suppress yeast growth — mountain coffee is more fermentation-stable." },
  totalPlateCount:  { pos: "",
                      neg: "Cooler, drier mountain environments reduce microbial load." },
  freeAcidity:      { pos: "Higher mineral and organic acid content at altitude can slightly increase acidity — still within genuine coffee range.",
                      neg: "" },
  ash:              { pos: "Mineral-rich mountain and forest nectar contributes to higher ash content.",
                      neg: "" },
  water:            { pos: "",
                      neg: "Drier air at altitude aids faster moisture evaporation from nectar." },
  invertase:        { pos: "Cooler storage preserves invertase alongside diastase — enzyme activity is better retained.",
                      neg: "" },
  hdeEncoded:       { pos: "Forest and mountain zones correlate with coffeedew coffee, which naturally has more coffeedew elements.",
                      neg: "" },
};

function altitudeInterpretation(key: string, direction: "positive" | "negative"): string {
  const entry = ALTITUDE_INTERP[key as keyof RawParams];
  if (!entry) return "";
  return direction === "positive" ? entry.pos : entry.neg;
}

export function computeGeoProfile(): GeoProfile {
  const store   = readLabHistory();
  const records = store.records;

  // Only records that have altitude data
  const withAlt = records.filter(r => r.altitude != null && !isNaN(Number(r.altitude)));
  const altitudes = withAlt.map(r => Number(r.altitude));

  const altitudeRange = withAlt.length >= 2
    ? { min: Math.min(...altitudes), max: Math.max(...altitudes), n: withAlt.length }
    : null;

  // ── Altitude bands ──────────────────────────────────────────────────────────
  const BANDS: Array<{ label: string; min: number; max: number }> = [
    { label: "Lowland",       min: 0,    max: 500  },
    { label: "Mid-elevation", min: 500,  max: 1000 },
    { label: "Highland",      min: 1000, max: Infinity },
  ];

  const altitudeBands: AltitudeBand[] = BANDS.map(b => {
    const recs = withAlt.filter(r => {
      const a = Number(r.altitude);
      return a >= b.min && a < b.max;
    });

    const paramAvgs: Record<string, number> = {};
    for (const key of PARAM_KEYS) {
      const vals = recs
        .map(r => r.params[key as keyof RawParams])
        .filter((v): v is number => v != null && !isNaN(Number(v)))
        .map(Number);
      if (vals.length) paramAvgs[key] = parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3));
    }

    return {
      label:    b.max === Infinity ? `Highland (>1000 m)` : b.min === 0 ? `Lowland (<${b.max} m)` : `Mid-elevation (${b.min}–${b.max} m)`,
      min:      b.min,
      max:      b.max,
      count:    recs.length,
      paramAvgs,
      batchIds: recs.map(r => r.batchId),
    };
  }).filter(b => b.count > 0);

  // ── Altitude × param correlations ───────────────────────────────────────────
  const altitudeCorrelations: ParamAltitudeCorr[] = [];

  for (const key of PARAM_KEYS) {
    const pairs: [number, number][] = withAlt
      .map(r => [Number(r.altitude), r.params[key as keyof RawParams]] as [number, number | null | undefined])
      .filter((p): p is [number, number] => p[1] != null && !isNaN(Number(p[1])))
      .map(([a, v]) => [a, Number(v)]);

    if (pairs.length < 3) continue;

    const xs = pairs.map(p => p[0]);
    const ys = pairs.map(p => p[1]);
    const r  = pearson(xs, ys);
    if (Math.abs(r) < 0.1) continue;   // skip negligible correlations

    const direction: "positive" | "negative" = r >= 0 ? "positive" : "negative";
    const interp = altitudeInterpretation(key, direction);

    altitudeCorrelations.push({
      param:          key,
      label:          PARAM_META[key]?.label ?? key,
      unit:           PARAM_META[key]?.unit  ?? "",
      r:              parseFloat(r.toFixed(3)),
      n:              pairs.length,
      direction,
      interpretation: interp,
    });
  }

  altitudeCorrelations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  // ── Zone summary ────────────────────────────────────────────────────────────
  const zoneMap = new Map<string, LabRecord[]>();
  for (const r of records) {
    const z = r.zone?.trim();
    if (!z) continue;
    if (!zoneMap.has(z)) zoneMap.set(z, []);
    zoneMap.get(z)!.push(r);
  }

  const zoneSummary: ZoneSummary[] = Array.from(zoneMap.entries()).map(([zone, recs]) => {
    const alts = recs.map(r => r.altitude).filter((v): v is number => v != null);
    const avgAltitude = alts.length ? parseFloat((alts.reduce((s, v) => s + v, 0) / alts.length).toFixed(0)) : null;

    const paramAvgs: Record<string, number> = {};
    for (const key of PARAM_KEYS) {
      const vals = recs
        .map(r => r.params[key as keyof RawParams])
        .filter((v): v is number => v != null && !isNaN(Number(v)))
        .map(Number);
      if (vals.length) paramAvgs[key] = parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3));
    }

    return { zone, count: recs.length, avgAltitude, paramAvgs };
  }).sort((a, b) => (b.avgAltitude ?? 0) - (a.avgAltitude ?? 0));

  // ── Auto-generated key findings ─────────────────────────────────────────────
  const keyFindings: string[] = [];

  if (altitudeRange) {
    keyFindings.push(`Altitude spans ${altitudeRange.min}–${altitudeRange.max} m across ${altitudeRange.n} batches with location data.`);
  }

  // Find strongest positive and negative correlations
  const strongPos = altitudeCorrelations.filter(c => c.r >= 0.5).slice(0, 2);
  const strongNeg = altitudeCorrelations.filter(c => c.r <= -0.5).slice(0, 2);

  if (strongPos.length) {
    keyFindings.push(
      `Higher altitude strongly predicts ${strongPos.map(c => c.label.toLowerCase()).join(" and ")} — a hallmark of genuine mountain coffee.`
    );
  }
  if (strongNeg.length) {
    keyFindings.push(
      `Higher altitude is associated with lower ${strongNeg.map(c => c.label.toLowerCase()).join(" and ")}.`
    );
  }

  // Highland vs lowland comparison
  const highland = altitudeBands.find(b => b.min >= 1000);
  const lowland  = altitudeBands.find(b => b.max <= 500);
  if (highland && lowland) {
    const comparisons: string[] = [];
    for (const key of ["diastase", "totalPolyphenols", "dpph", "proline"] as const) {
      const hi = highland.paramAvgs[key];
      const lo = lowland.paramAvgs[key];
      if (hi != null && lo != null && lo > 0) {
        const diffPct = Math.round(((hi - lo) / lo) * 100);
        if (Math.abs(diffPct) >= 10) {
          const dir = diffPct > 0 ? "higher" : "lower";
          comparisons.push(`${PARAM_META[key]?.label ?? key} ${Math.abs(diffPct)}% ${dir}`);
        }
      }
    }
    if (comparisons.length) {
      keyFindings.push(`Highland vs lowland: ${comparisons.join(", ")}.`);
    }
  }

  if (withAlt.length < 3) {
    keyFindings.push("Register more batches with altitude data to unlock stronger geographic insights.");
  }

  return { altitudeBands, altitudeCorrelations, zoneSummary, altitudeRange, keyFindings };
}
