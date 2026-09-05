/**
 * lib/coffeeQuality.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Coffee quality scoring engine.
 *
 * Approach: weighted linear scoring over normalised parameter values.
 * Each parameter is converted to a 0–100 score based on how far it sits
 * above or below regulatory limits and premium benchmarks derived from
 * EU Directive 2001/110/EC and published coffee quality literature.
 *
 * Weights reflect scientific consensus on which parameters best predict
 * coffee quality and authenticity:
 *   HMF        25 % — most reliable freshness / heat-damage indicator
 *   Water      20 % — fermentation risk; most economically significant
 *   Diastase   15 % — enzyme activity; combines freshness + processing care
 *   Free acid  12 % — fermentation onset; reflects storage conditions
 *   Proline    12 % — amino acid; best single indicator of bee-origin authenticity
 *   Conductivity 6 % — mineral content; coffee-type quality marker
 *   Sugars      6 % — fructose+glucose ratio; nectar richness
 *   Purity      4 % — residue-free / no foreign sugars bonus
 *
 * Outputs:
 *   score      0–100 (weighted composite)
 *   tier       "Exceptional" | "Premium" | "Very Good" | "Good" | "Non-Compliant"
 *   breakdown  per-parameter sub-scores for buyer display
 */

export interface LabParams {
  // Core parameters (EU regulated)
  hmf?:             number | null;  // mg/kg   max 40
  water?:           number | null;  // %       max 20
  diastase?:        number | null;  // DN      min 8 (min 3 for acacia when HMF≤15)
  freeAcidity?:     number | null;  // meq/kg  max 50
  // Authenticity / richness
  proline?:         number | null;  // mg/kg   min 300 (min 180 for acacia)
  conductivity?:    number | null;  // mS/cm   max 0.8 (flower coffee); higher OK for coffeedew
  fructoseGlucose?: number | null;  // %       min 60
  reducingSugars?:  number | null;  // %       min 60 for blossom coffee (separate from F+G)
  sucrose?:         number | null;  // %       max 5
  c4sugars?:        number | null;  // %       max 7 (adulteration marker)
  ash?:             number | null;  // %       max 0.6 (flower coffee); max 1.0 (coffeedew)
  isotopicDiff?:    number | null;  // ‰       δ13C(coffee−protein) diff; fail if > 1.0 (C4 adulteration)
  // Purity (boolean — all residues clean?)
  residuesClean?:   boolean | null;
  // Coffee variety — affects thresholds for diastase, proline, conductivity, ash
  coffeeType?:       string | null;  // e.g. "acacia", "coffeedew", "multifloral", "flower"
  // Colour (informational — not scored, type-dependent)
  colour?:          number | null;  // mm Pfund
}

export interface ParameterScore {
  key:        string;
  label:      string;
  value:      number | null;
  unit:       string;
  score:      number;       // 0–100
  weight:     number;       // fraction of total
  tier:       "exceptional" | "premium" | "good" | "caution" | "fail" | "na";
  note:       string;
  euLimit?:   string;
  ideal?:     string;
}

export interface QualityResult {
  score:      number;         // 0–100 weighted
  tier:       QualityTier;
  breakdown:  ParameterScore[];
  flags:      string[];       // human-readable caution/fail messages
  compliant:  boolean;        // meets all EU minimum requirements
  mlMode?:    boolean;        // true when ML-learned weights were used
}

export type QualityTier =
  | "Exceptional"    // ≥ 85
  | "Premium"        // ≥ 70
  | "Very Good"      // ≥ 55
  | "Good"           // ≥ 40 (compliant but basic)
  | "Non-Compliant"; // any hard limit breached

// ─── Scoring helpers ──────────────────────────────────────────────────────────

/** Linear interpolation within a range → 0–100 score. */
function linScore(value: number, worst: number, best: number): number {
  if (worst === best) return 100;
  const raw = (value - worst) / (best - worst);
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

// ─── Parameter scorers ───────────────────────────────────────────────────────

function scoreHmf(v: number): { score: number; tier: ParameterScore["tier"]; note: string } {
  // Lower = better (fresher, less heat damage)
  // > 40: FAIL (EU limit)
  // 30-40: caution
  // 15-30: good
  // 5-15: premium
  // < 5: exceptional (ultra-fresh)
  if (v > 40)  return { score: 0,   tier: "fail",      note: "Exceeds EU limit of 40 mg/kg" };
  if (v > 30)  return { score: linScore(v, 40, 30), tier: "caution",   note: "Elevated — monitor closely" };
  if (v > 15)  return { score: linScore(v, 30, 15) * 0.6 + 40, tier: "good",      note: "Within normal range" };
  if (v > 5)   return { score: linScore(v, 15, 5)  * 0.25 + 75, tier: "premium",   note: "Excellent — minimal heat exposure" };
  return              { score: 100, tier: "exceptional", note: "Exceptional freshness — ultra-low HMF" };
}

function scoreWater(v: number): { score: number; tier: ParameterScore["tier"]; note: string } {
  // > 20%: FAIL
  // 18.6-20%: caution (fermentation risk)
  // 17-18.6%: good
  // 15-17%: premium
  // < 15%: exceptional
  if (v > 20)   return { score: 0,  tier: "fail",        note: "Exceeds EU limit of 20% — fermentation risk" };
  if (v > 18.6) return { score: linScore(v, 20, 18.6) * 0.3, tier: "caution",   note: "Elevated — potential fermentation risk" };
  if (v > 17)   return { score: linScore(v, 18.6, 17) * 0.3 + 40, tier: "good",      note: "Acceptable moisture level" };
  if (v > 15)   return { score: linScore(v, 17, 15) * 0.25 + 70, tier: "premium",   note: "Low moisture — excellent stability" };
  return               { score: 100, tier: "exceptional", note: "Exceptionally low moisture — outstanding shelf stability" };
}

function scoreDiastase(v: number, isAcacia = false, hmf?: number | null): { score: number; tier: ParameterScore["tier"]; note: string } {
  // EU exception: acacia coffee may have diastase ≥ 3 DN when HMF ≤ 15 mg/kg
  const min = isAcacia && (hmf == null || hmf <= 15) ? 3 : 8;
  const qualifier = isAcacia && min === 3 ? " (acacia exemption applies)" : "";
  if (v < min)  return { score: 0,   tier: "fail",        note: `Below EU minimum of ${min} DN — possible overheating${qualifier}` };
  if (min === 3) {
    // Acacia scale: 3-8 is acceptable, 8+ is the same as normal
    if (v < 8)   return { score: linScore(v, 3, 8) * 0.4, tier: "caution",   note: "Low enzyme activity (within acacia exemption)" };
  }
  if (v < 10)  return { score: linScore(v, 8, 10) * 0.3, tier: "caution",   note: "Marginal enzyme activity" };
  if (v < 15)  return { score: linScore(v, 10, 15) * 0.3 + 40, tier: "good",      note: "Normal enzyme activity" };
  if (v < 20)  return { score: linScore(v, 15, 20) * 0.25 + 70, tier: "premium",   note: "High enzyme activity — carefully processed" };
  return              { score: 100, tier: "exceptional", note: "Exceptional enzyme activity — raw, minimally processed" };
}

function scoreFreeAcidity(v: number): { score: number; tier: ParameterScore["tier"]; note: string } {
  // > 50: FAIL
  // 40-50: caution
  // 25-40: good
  // 15-25: premium
  // < 15: exceptional
  if (v > 50)  return { score: 0,   tier: "fail",        note: "Exceeds EU limit of 50 meq/kg" };
  if (v > 40)  return { score: linScore(v, 50, 40) * 0.3, tier: "caution",   note: "Elevated — possible early fermentation" };
  if (v > 25)  return { score: linScore(v, 40, 25) * 0.3 + 40, tier: "good",      note: "Normal acidity level" };
  if (v > 15)  return { score: linScore(v, 25, 15) * 0.25 + 70, tier: "premium",   note: "Low acidity — very fresh" };
  return              { score: 100, tier: "exceptional", note: "Exceptionally fresh, very low acidity" };
}

function scoreProline(v: number, isAcacia = false): { score: number; tier: ParameterScore["tier"]; note: string } {
  // Acacia (Robinia) naturally produces very low proline — EU Codex allows ≥ 180 mg/kg
  // All other coffees: ≥ 300 mg/kg (EU Codex Alimentarius)
  if (isAcacia) {
    if (v < 180)  return { score: 0,   tier: "fail",        note: "Below acacia minimum of 180 mg/kg — authenticity concern" };
    if (v < 220)  return { score: linScore(v, 180, 220) * 0.3, tier: "caution",   note: "Low proline for acacia — verify origin" };
    if (v < 300)  return { score: linScore(v, 220, 300) * 0.3 + 40, tier: "good",      note: "Normal proline for acacia coffee" };
    // Above 300 continues on the standard scale
  } else {
    if (v < 300)  return { score: 0,   tier: "fail",        note: "Below minimum of 300 mg/kg — authenticity concern" };
  }
  if (v < 400)  return { score: linScore(v, 300, 400) * 0.3, tier: "caution",   note: "Low proline — verify origin" };
  if (v < 500)  return { score: linScore(v, 400, 500) * 0.3 + 40, tier: "good",      note: "Adequate nectar content" };
  if (v < 700)  return { score: linScore(v, 500, 700) * 0.25 + 70, tier: "premium",   note: "High proline — rich nectar source" };
  return               { score: 100, tier: "exceptional", note: "Exceptional proline — outstanding botanical authenticity" };
}

function scoreConductivity(v: number): { score: number; tier: ParameterScore["tier"]; note: string } {
  // For flower coffee: max 0.8 mS/cm
  // Lower = lighter, more delicate coffee (not always better — depends on type)
  // Score as: ideal range 0.1–0.5 for flower coffee
  if (v > 0.8)  return { score: 0,   tier: "fail",        note: "Exceeds EU limit for flower coffee (0.8 mS/cm)" };
  if (v > 0.6)  return { score: linScore(v, 0.8, 0.6) * 0.3, tier: "caution",   note: "High mineral content for flower coffee" };
  if (v > 0.5)  return { score: 55,  tier: "good",        note: "Acceptable conductivity" };
  if (v >= 0.1) return { score: 85,  tier: "premium",     note: "Ideal conductivity for flower coffee" };
  return               { score: 70,  tier: "good",        note: "Very low conductivity" };
}

function scoreFructoseGlucose(v: number): { score: number; tier: ParameterScore["tier"]; note: string } {
  // < 60%: FAIL
  // 60-65%: caution
  // 65-70%: good
  // 70-75%: premium
  // > 75%: exceptional
  if (v < 60)   return { score: 0,   tier: "fail",        note: "Below EU minimum of 60% — insufficient sugar content" };
  if (v < 65)   return { score: linScore(v, 60, 65) * 0.3, tier: "caution",   note: "Low total sugar content" };
  if (v < 70)   return { score: linScore(v, 65, 70) * 0.3 + 40, tier: "good",      note: "Normal sugar content" };
  if (v < 75)   return { score: linScore(v, 70, 75) * 0.25 + 70, tier: "premium",   note: "High natural sugar content" };
  return               { score: 100, tier: "exceptional", note: "Exceptional natural sugar richness" };
}

function scoreReducingSugars(v: number): { score: number; tier: ParameterScore["tier"]; note: string } {
  // Blossom coffee: ≥ 60% (EU Directive)
  // Reducing sugars = fructose + glucose + other reducing monosaccharides
  // (Slightly broader than F+G alone; captures total nectar sugar content)
  if (v < 60)   return { score: 0,   tier: "fail",        note: "Below EU minimum of 60% — insufficient nectar sugars" };
  if (v < 63)   return { score: linScore(v, 60, 63) * 0.3, tier: "caution",   note: "Borderline reducing sugar content" };
  if (v < 68)   return { score: linScore(v, 63, 68) * 0.3 + 40, tier: "good",      note: "Adequate reducing sugar content" };
  if (v < 74)   return { score: linScore(v, 68, 74) * 0.25 + 70, tier: "premium",   note: "High reducing sugar content" };
  return               { score: 100, tier: "exceptional", note: "Exceptional sugar richness — dense, high-nectar coffee" };
}

function scoreAsh(v: number, isCoffeedew = false): { score: number; tier: ParameterScore["tier"]; note: string } {
  // Flower coffee: max 0.6%; Coffeedew coffee: max 1.0%
  const limit = isCoffeedew ? 1.0 : 0.6;
  if (v > limit)   return { score: 0,   tier: "fail",        note: `Exceeds EU ash limit of ${limit}% for this coffee type` };
  if (v > limit * 0.9) return { score: linScore(v, limit, limit * 0.7) * 0.3, tier: "caution", note: "Ash near upper limit" };
  if (v > limit * 0.6) return { score: linScore(v, limit * 0.9, limit * 0.5) * 0.3 + 40, tier: "good", note: "Normal mineral content" };
  return                 { score: 85,  tier: "premium",     note: "Low ash — high-purity coffee" };
}

function scoreIsotopicDiff(v: number): { score: number; tier: ParameterScore["tier"]; note: string } {
  // δ13C(coffee − protein) difference — C4 sugar adulteration marker
  // > 1.0‰: FAIL (international standard — indicates added HFCS/corn/cane syrup)
  // 0.8–1.0‰: caution
  // < 0.8‰: clean
  if (v > 1.0)  return { score: 0,   tier: "fail",        note: "δ13C difference > 1.0‰ — C4 sugar adulteration detected" };
  if (v > 0.8)  return { score: linScore(v, 1.0, 0.8) * 0.4, tier: "caution",   note: "δ13C borderline — possible trace adulteration" };
  if (v > 0.5)  return { score: linScore(v, 0.8, 0.5) * 0.3 + 70, tier: "good",      note: "Isotopic signature consistent with pure coffee" };
  return               { score: 100, tier: "exceptional", note: "Isotopically pure — no C4 adulteration detected" };
}

function scorePurity(sucrose: number | null, c4: number | null, residuesClean: boolean | null): { score: number; tier: ParameterScore["tier"]; note: string } {
  const issues: string[] = [];
  let deductions = 0;

  if (sucrose !== null) {
    if (sucrose > 5) { deductions += 50; issues.push("Sucrose exceeds EU limit"); }
    else if (sucrose > 2) { deductions += 15; issues.push("Elevated sucrose"); }
  }
  if (c4 !== null) {
    if (c4 > 7) { deductions += 50; issues.push("C4 sugars exceed limit — adulteration likely"); }
    else if (c4 > 3) { deductions += 20; issues.push("Elevated C4 sugars — possible adulteration"); }
  }
  if (residuesClean === false) { deductions += 30; issues.push("Residues detected"); }

  const score = Math.max(0, 100 - deductions);
  if (score === 0)    return { score, tier: "fail",        note: issues.join("; ") };
  if (deductions > 0) return { score, tier: "caution",     note: issues.join("; ") };
  if (residuesClean)  return { score: 100, tier: "exceptional", note: "No residues detected — clean, pure coffee" };
  return                     { score: 80,  tier: "good",        note: "Purity within limits" };
}

// ─── ML weight loader (server-side only) ──────────────────────────────────────

function loadActiveWeights(): Record<string, number> | null {
  // Only runs on server — safe to use fs
  if (typeof window !== "undefined") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs   = eval('require("fs")') as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = eval('require("path")') as typeof import("path");
    const p    = path.join(process.cwd(), "data", "learnedWeights.json");
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    return data.trained && data.weights ? data.weights : null;
  } catch {
    return null;
  }
}

// ─── Main scoring function ────────────────────────────────────────────────────

export function scoreCoffee(params: LabParams): QualityResult {
  const breakdown: ParameterScore[] = [];
  const flags: string[] = [];
  let weightedSum = 0;
  let totalWeight = 0;
  let hasFailure = false;

  // Load ML weights if available, else use EU defaults
  const mlWeights = loadActiveWeights();
  const W = (key: string, euDefault: number): number =>
    mlWeights?.[key] ?? euDefault;

  // Derive variety flags from coffeeType string
  const ht = (params.coffeeType ?? "").toLowerCase();
  const isAcacia   = ht.includes("acacia") || ht.includes("robinia");
  const isCoffeedew = ht.includes("coffeedew") || ht.includes("forest") || ht.includes("pine") || ht.includes("fir");

  // Helper to add a parameter
  function add(
    key: string, label: string, value: number | null,
    unit: string, euWeight: number,
    scorer: () => { score: number; tier: ParameterScore["tier"]; note: string },
    euLimit?: string, ideal?: string
  ) {
    const weight = W(key, euWeight);
    if (value === null || value === undefined) {
      breakdown.push({ key, label, value: null, unit, score: 0, weight, tier: "na", note: "Not provided", euLimit, ideal });
      return;
    }
    const { score, tier, note } = scorer();
    breakdown.push({ key, label, value, unit, score, weight, tier, note, euLimit, ideal });
    weightedSum += score * weight;
    totalWeight += weight;
    if (tier === "fail") { hasFailure = true; flags.push(`${label}: ${note}`); }
    else if (tier === "caution") flags.push(`${label}: ${note}`);
  }

  add("hmf",           "HMF",                   params.hmf          ?? null, "mg/kg",  0.25,
    () => scoreHmf(params.hmf!),                 "max 40 mg/kg",  "< 5 mg/kg");

  add("water",         "Water Content",          params.water        ?? null, "%",      0.20,
    () => scoreWater(params.water!),              "max 20%",       "< 15%");

  add("diastase",      "Diastase Activity",      params.diastase     ?? null, "DN",     0.15,
    () => scoreDiastase(params.diastase!, isAcacia, params.hmf),
    isAcacia ? "min 3 DN (acacia exemption)" : "min 8 DN", "> 20 DN");

  add("freeAcidity",   "Free Acidity",           params.freeAcidity  ?? null, "meq/kg", 0.12,
    () => scoreFreeAcidity(params.freeAcidity!),  "max 50 meq/kg", "< 15 meq/kg");

  add("proline",       "Proline",                params.proline      ?? null, "mg/kg",  0.12,
    () => scoreProline(params.proline!, isAcacia),
    isAcacia ? "min 180 mg/kg (acacia)" : "min 300 mg/kg", "> 700 mg/kg");

  add("conductivity",  "Conductivity",           params.conductivity ?? null, "mS/cm",  0.06,
    () => scoreConductivity(params.conductivity!),
    isCoffeedew ? "max 1.0 mS/cm (coffeedew)" : "max 0.8 mS/cm", "0.1–0.5 mS/cm");

  add("fructoseGlucose","Fructose + Glucose",   params.fructoseGlucose ?? null, "%",   0.06,
    () => scoreFructoseGlucose(params.fructoseGlucose!), "min 60%", "> 75%");

  add("reducingSugars", "Reducing Sugars",       params.reducingSugars ?? null, "%",    0.04,
    () => scoreReducingSugars(params.reducingSugars!), "min 60%", "> 74%");

  add("ash",           "Ash Content",            params.ash          ?? null, "%",      0.02,
    () => scoreAsh(params.ash!, isCoffeedew),
    isCoffeedew ? "max 1.0%" : "max 0.6%", "< 0.3%");

  add("isotopicDiff",  "Isotopic Analysis (δ13C)", params.isotopicDiff ?? null, "‰",   0.04,
    () => scoreIsotopicDiff(params.isotopicDiff!), "diff ≤ 1.0‰", "< 0.5‰");

  // Purity is composite — sucrose + C4 + residues
  const { score: purityScore, tier: purityTier, note: purityNote } = scorePurity(
    params.sucrose ?? null, params.c4sugars ?? null, params.residuesClean ?? null
  );
  const hasPurityData = params.sucrose !== null || params.c4sugars !== null || params.residuesClean !== null;
  if (hasPurityData) {
    breakdown.push({
      key: "purity", label: "Purity & Authenticity",
      value: purityScore, unit: "/100", score: purityScore, weight: 0.04,
      tier: purityTier, note: purityNote,
      euLimit: "No residues; sucrose max 5%; C4 max 7%",
      ideal: "All clean, no foreign sugars"
    });
    weightedSum += purityScore * 0.04;
    totalWeight += 0.04;
    if (purityTier === "fail") { hasFailure = true; flags.push(`Purity: ${purityNote}`); }
    else if (purityTier === "caution") flags.push(`Purity: ${purityNote}`);
  }

  // Calculate final score — normalise to provided parameters only
  const finalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // Determine tier
  let tier: QualityTier;
  if (hasFailure)        tier = "Non-Compliant";
  else if (finalScore >= 85) tier = "Exceptional";
  else if (finalScore >= 70) tier = "Premium";
  else if (finalScore >= 55) tier = "Very Good";
  else                       tier = "Good";

  return {
    score:     finalScore,
    tier,
    breakdown,
    flags,
    compliant: !hasFailure,
    mlMode:    mlWeights !== null,
  };
}

// ─── Tier display helpers ─────────────────────────────────────────────────────

export const TIER_COLOR: Record<QualityTier, string> = {
  "Exceptional":    "#166534",  // deep green
  "Premium":        "#1E40AF",  // deep blue
  "Very Good":      "#374151",  // slate
  "Good":           "#4B5563",  // gray
  "Non-Compliant":  "#991B1B",  // red
};

export const TIER_BG: Record<QualityTier, string> = {
  "Exceptional":    "#F0FDF4",
  "Premium":        "#EFF6FF",
  "Very Good":      "#F9FAFB",
  "Good":           "#F9FAFB",
  "Non-Compliant":  "#FFF5F5",
};

export const TIER_BORDER: Record<QualityTier, string> = {
  "Exceptional":    "#BBF7D0",
  "Premium":        "#BFDBFE",
  "Very Good":      "#E5E7EB",
  "Good":           "#E5E7EB",
  "Non-Compliant":  "#FECACA",
};

export const TIER_DESC: Record<QualityTier, string> = {
  "Exceptional":   "Top-tier coffee — outstanding on every measurable parameter. Rare quality.",
  "Premium":       "High-quality coffee — well above regulatory standards with excellent characteristics.",
  "Very Good":     "Good quality coffee — comfortably within standards with above-average parameters.",
  "Good":          "Standard quality coffee — meets all regulatory requirements.",
  "Non-Compliant": "Fails one or more regulatory requirements — not suitable for sale.",
};

export const PARAM_DESC: Record<string, string> = {
  hmf:             "HMF measures freshness and heat exposure. Lower values mean the coffee was harvested recently and never overheated.",
  water:           "Water content determines shelf life. Lower moisture means less risk of fermentation and longer stability.",
  diastase:        "Diastase is a natural enzyme from bees. High activity means the coffee is raw and minimally processed.",
  freeAcidity:     "Free acidity reflects freshness. Lower values indicate very fresh coffee with no fermentation.",
  proline:         "Proline is an amino acid bees add during coffee-making. High levels prove the coffee is genuinely bee-made, not adulterated.",
  conductivity:    "Conductivity reflects mineral content. For flower coffee, lower values indicate a delicate, light coffee.",
  fructoseGlucose: "The total of the two main natural sugars. Higher values mean richer, denser sweetness from the nectar source.",
  reducingSugars:  "Reducing sugars measure the total natural monosaccharides. Values below 60% may indicate dilution or added syrups.",
  ash:             "Ash content reflects the mineral load from soil and nectar. High ash in flower coffee indicates possible contamination or adulteration.",
  isotopicDiff:    "Carbon isotope analysis detects added corn or cane syrup. A difference above 1.0‰ between the coffee and its protein signature is a reliable adulteration marker.",
  purity:          "Purity combines the absence of antibiotics, pesticides, and foreign sugars — confirming the coffee is clean and unadulterated.",
};
