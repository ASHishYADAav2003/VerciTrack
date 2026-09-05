// app/api/admin/lab-analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  readLabHistory,
  computePopulationStats,
  computeCorrelations,
  analyzeAllBatches,
  validateCoffeeTypes,
  computeSegmentStats,
  computeAllSimilarities,
  computeGeoProfile,
} from "@/lib/labAnalytics";
import { getModelStats, backfillFromHistory, predictQuality, getBatchRecords } from "@/lib/mlScorer";

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("user_role")?.value === "admin";
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Auto-backfill RF from labHistory so historical batches train the model
    // even if they were registered before mlScorer was wired up.
    backfillFromHistory();

    const store           = readLabHistory();
    const records         = store.records;
    const populationStats = computePopulationStats(records);
    const correlations    = computeCorrelations(records);
    const batchAnalyses   = analyzeAllBatches();
    const typeValidation  = validateCoffeeTypes();
    const rfModel         = getModelStats();
    const segments        = computeSegmentStats();
    const similarities    = computeAllSimilarities();
    const geoProfile      = computeGeoProfile();

    // Per-batch RF predictions — only meaningful when model is trained
    const mlRecords = getBatchRecords();
    const batchPredictions = records.map(r => {
      const pred = predictQuality({
        batchId:        r.batchId,
        humidity:       r.params.humidity,
        hmf:            r.params.hmf,
        diastase:       r.params.diastase,
        freeAcidity:    r.params.freeAcidity,
        proline:        r.params.proline,
        conductivity:   r.params.conductivity,
        fructoseGlucose: r.params.fructoseGlucose,
        reducingSugars: r.params.reducingSugars,
        sucrose:        r.params.sucrose,
        ash:            r.params.ash,
        isotopicDiff:   r.params.isotopicDiff,
        colour:         r.params.colour,
        ph:             r.params.ph,
        invertase:      r.params.invertase,
        fgRatio:        r.params.fgRatio,
        waterActivity:  r.params.waterActivity,
        opticalRotation: r.params.opticalRotation,
        totalPolyphenols: r.params.totalPolyphenols,
        hdeEncoded:     r.params.hdeEncoded,
        maltose:        r.params.maltose,
        viscosity:      r.params.viscosity,
        yeastCount:     r.params.yeastCount,
        totalPlateCount: r.params.totalPlateCount,
        leadPb:         r.params.leadPb,
        cadmiumCd:      r.params.cadmiumCd,
        pesticideScreen: r.params.pesticideScreen,
        antibioticScreen: r.params.antibioticScreen,
        altitude:       r.params.altitude,
        harvestMonth:   r.params.harvestMonth,
        dpph:           r.params.dpph,
      });
      // Rule score from stored ML record (computed at registration time)
      const mlRec   = mlRecords.find(m => m.batchId === r.batchId);
      const analysis = batchAnalyses.find(b => b.batchId === r.batchId);
      const ruleScore = mlRec?.ruleScore ?? null;
      // Derive tier from ruleScore
      const qualityTier =
        ruleScore == null  ? null :
        ruleScore >= 85    ? "Exceptional" :
        ruleScore >= 70    ? "Premium" :
        ruleScore >= 55    ? "Very Good" :
        ruleScore >= 40    ? "Good" : "Non-Compliant";
      return {
        batchId:      r.batchId,
        coffeeType:    r.coffeeType  ?? null,
        origin:       r.origin     ?? null,
        mlScore:      pred?.score      ?? null,
        confidence:   pred?.confidence ?? null,
        ruleScore,
        qualityTier,
        anomalyScore: analysis?.anomalyScore ?? null,
      };
    });

    return NextResponse.json({
      recordCount:    records.length,
      populationStats,
      correlations:   correlations.filter(c => c.strength !== "none"),
      batchAnalyses,
      typeValidation,
      rfModel,
      segments,
      similarities,
      geoProfile,
      batchPredictions,
    });
  } catch (err) {
    console.error("[lab-analytics GET]", err);
    return NextResponse.json({ error: "Analytics computation failed" }, { status: 500 });
  }
}
