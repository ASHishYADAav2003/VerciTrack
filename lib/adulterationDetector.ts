/**
 * lib/adulterationDetector.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Coffee adulteration risk detector based purely on lab parameters.
 *
 * Detects four main fraud types documented in the literature:
 *
 *  1. C4 sugar adulteration (corn syrup / beet syrup)
 *     → isotopic difference δ13C > 1.0‰ (coffee protein vs coffee sugars)
 *     Ref: Stefas et al. (2021) LIBS + LDA, >90% accuracy
 *          Hu et al. (2022) Raman + SVM/CNN, 99.75–100% accuracy
 *
 *  2. Sucrose syrup addition
 *     → sucrose > 5% (EU Directive 2001/110/EC limit)
 *
 *  3. Dilution / artificial coffee
 *     → proline < 300 mg/kg (< 180 for acacia) — lowest single-parameter
 *       predictor of bee-origin authenticity (Bogdanov, 2009)
 *
 *  4. Conductivity / coffee type mismatch
 *     → flower coffee conductivity should be ≤ 0.8 mS/cm;
 *       coffeedew/forest coffee should be > 0.8 mS/cm
 *
 * Risk levels: low | medium | high
 * Returned flags are human-readable — shown in admin batch review.
 */

export interface AdulterationResult {
  risk:   "low" | "medium" | "high";
  score:  number;   // 0–100 composite suspicion score
  flags:  string[]; // specific concerns (empty = clean)
  clean:  boolean;
}

export interface AdulterationParams {
  isotopicDiff?:    number | null; // δ13C difference ‰
  sucrose?:         number | null; // %
  proline?:         number | null; // mg/kg
  fructoseGlucose?: number | null; // %
  conductivity?:    number | null; // mS/cm
  coffeeType?:       string | null;
}

export function detectAdulteration(p: AdulterationParams): AdulterationResult {
  const flags: string[] = [];
  let score = 0;

  const typeStr   = (p.coffeeType ?? "").toLowerCase();
  const isAcacia  = typeStr.includes("acacia") || typeStr.includes("robinia");
  const isForest  = ["pine", "forest", "coffeedew", "fir"].some(t => typeStr.includes(t));

  // ── 1. C4 sugar adulteration — isotopic difference ───────────────────────
  // EU/AOAC official method: δ13C(coffee) − δ13C(protein) > 1.0‰ = suspect
  // Source: Stefas et al. (2021), Hu et al. (2022)
  if (p.isotopicDiff != null) {
    if (p.isotopicDiff > 2.1) {
      flags.push(
        `Very high δ13C difference (${p.isotopicDiff.toFixed(2)}‰) — strong C4 sugar signal (corn/beet syrup)`
      );
      score += 50;
    } else if (p.isotopicDiff > 1.0) {
      flags.push(
        `Elevated δ13C difference (${p.isotopicDiff.toFixed(2)}‰) — possible C4 sugar addition (limit: 1.0‰)`
      );
      score += 25;
    }
  }

  // ── 2. Sucrose — sugar syrup addition ─────────────────────────────────────
  // EU Directive 2001/110/EC: max 5% (10% for some special varieties)
  if (p.sucrose != null) {
    if (p.sucrose > 10) {
      flags.push(
        `Very high sucrose (${p.sucrose.toFixed(1)}%) — strong indicator of sugar syrup addition (EU limit: 5%)`
      );
      score += 40;
    } else if (p.sucrose > 5) {
      flags.push(
        `Elevated sucrose (${p.sucrose.toFixed(1)}%) — possible sugar syrup addition (EU limit: 5%)`
      );
      score += 20;
    }
  }

  // ── 3. Proline — dilution / artificial coffee ──────────────────────────────
  // Genuine coffee minimum: 300 mg/kg (acacia: 180 mg/kg)
  // Most reliable single indicator of bee-origin authenticity
  if (p.proline != null) {
    const prolineMin = isAcacia ? 180 : 300;
    if (p.proline < prolineMin * 0.6) {
      flags.push(
        `Very low proline (${p.proline} mg/kg) — strong dilution or artificial coffee signal (min: ${prolineMin} mg/kg)`
      );
      score += 35;
    } else if (p.proline < prolineMin) {
      flags.push(
        `Low proline (${p.proline} mg/kg, below minimum ${prolineMin} mg/kg) — possible dilution`
      );
      score += 15;
    }
  }

  // ── 4. Fructose + Glucose — unusually low ─────────────────────────────────
  // Genuine coffee: F+G ≥ 60%. Values below 55% suggest water or syrup addition.
  if (p.fructoseGlucose != null) {
    if (p.fructoseGlucose < 50) {
      flags.push(
        `Very low fructose+glucose (${p.fructoseGlucose.toFixed(1)}%) — possible adulteration (genuine coffee ≥ 60%)`
      );
      score += 20;
    } else if (p.fructoseGlucose < 60) {
      flags.push(
        `Below-minimum fructose+glucose (${p.fructoseGlucose.toFixed(1)}%) — EU minimum is 60%`
      );
      score += 10;
    }
  }

  // ── 5. Conductivity vs declared coffee type ────────────────────────────────
  // Flower coffee: ≤ 0.8 mS/cm  |  Coffeedew/Forest: > 0.8 mS/cm (EU)
  if (p.conductivity != null && p.coffeeType) {
    if (!isForest && p.conductivity > 0.8) {
      flags.push(
        `High conductivity (${p.conductivity.toFixed(3)} mS/cm) inconsistent with declared flower coffee — expected ≤ 0.8`
      );
      score += 10;
    } else if (isForest && p.conductivity < 0.8) {
      flags.push(
        `Low conductivity (${p.conductivity.toFixed(3)} mS/cm) inconsistent with declared forest/coffeedew type — expected > 0.8`
      );
      score += 10;
    }
  }

  const capped = Math.min(100, score);
  const risk: AdulterationResult["risk"] =
    capped >= 50 ? "high" : capped >= 20 ? "medium" : "low";

  return { risk, score: capped, flags, clean: flags.length === 0 };
}
