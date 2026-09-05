// app/api/upload-lab-report/route.ts
// PDF text extraction — tries Claude AI first (handles any PDF format incl. custom fonts),
// then pdftotext (Poppler), then pdfjs-dist, then falls back to zlib.

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { inflateSync, inflateRawSync } from "zlib";
import { execFileSync } from "child_process";
import os from "os";
import path from "path";
import fs from "fs/promises";

const knownPath   = path.join(process.cwd(), "data", "coffeeTypes.json");
const unknownPath = path.join(process.cwd(), "data", "unknownCoffeeTypes.json");

// ── Claude AI PDF extraction ──────────────────────────────────────────────────
// Works with any PDF format including custom font encodings and scanned documents.
// Requires ANTHROPIC_API_KEY in .env.local.

async function tryClaudeExtraction(buf: Buffer): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_key_here" || apiKey.trim() === "") return null;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const base64Pdf = buf.toString("base64");

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            } as any,
            {
              type: "text",
              text: `Extract ALL coffee lab parameters from this document. Return ONLY a JSON object with these exact keys (use null for any not found):
{
  "humidity": <water content % as number>,
  "hmf": <HMF mg/kg as number>,
  "diastase": <diastase activity DN as number>,
  "freeAcidity": <free acidity meq/kg as number>,
  "proline": <proline mg/kg as number>,
  "conductivity": <electrical conductivity mS/cm as number>,
  "fructoseGlucose": <fructose+glucose total % as number>,
  "fructose": <fructose alone % as number>,
  "glucose": <glucose alone % as number>,
  "fgRatio": <fructose/glucose ratio as number>,
  "reducingSugars": <reducing sugars % as number>,
  "sucrose": <sucrose % as number>,
  "maltose": <maltose % as number>,
  "ash": <ash % as number>,
  "isotopicDiff": <delta13C difference ‰ as number, use absolute value>,
  "colour": <colour mm Pfund as number>,
  "ph": <pH as number>,
  "invertase": <invertase activity U/kg as number>,
  "waterActivity": <water activity aw as number, typically 0.5-0.7>,
  "opticalRotation": <optical rotation degrees as number, can be negative>,
  "viscosity": <viscosity mPa·s as number>,
  "totalPolyphenols": <total polyphenols mg GAE/100g as number>,
  "dpph": <DPPH radical scavenging activity mg Trolox eq/100g as number, null if not present>,
  "yeastCount": <yeast count as log10 CFU/g number>,
  "totalPlateCount": <total plate count as log10 CFU/g number>,
  "leadPb": <lead Pb mg/kg as number>,
  "cadmiumCd": <cadmium Cd mg/kg as number>,
  "pesticideScreen": <pesticide screening: 1 if pass/not detected, 0 if fail/detected, null if not tested>,
  "antibioticScreen": <antibiotic screening: 1 if pass/not detected, 0 if fail/detected, null if not tested>,
  "altitude": <sample collection altitude in metres as number or null>,
  "latitude": <GPS latitude decimal degrees or null if not present>,
  "longitude": <GPS longitude decimal degrees or null if not present>,
  "harvestMonth": <harvest month 1-12 as integer or null>,
  "harvestYear": <harvest year integer or null>,
  "crystallisation": <crystallisation tendency: "slow", "fast", "partial", "liquid", or null>,
  "hde": <coffeedew elements description: "Absent", "Traces", "Present", "Abundant", or null>,
  "dominantPollen": <dominant pollen species name or null>,
  "dominantPollenPct": <dominant pollen percentage as number or null>,
  "secondaryPollens": <comma-separated secondary pollen species or null>,
  "pollenConcentration": <pollen concentration: "Very Low", "Low", "Normal", "High", or null>,
  "botanicalConfirmed": <"Yes" if botanical origin confirmed, "No" if not, null if not assessed>,
  "geographicConfirmed": <"Yes" if geographic origin confirmed, "No" if not, null if not assessed>,
  "palynologicalNotes": <any palynological/botanical notes as string or null>,
  "coffeedewSpecies": <probable tree species for coffeedew coffee e.g. "cf. fir", "cf. pine", "cf. oak", or null>,
  "nectarlessSpecies": <nectarless plant species present as comma-separated string or null>,
  "coffeeType": <coffee type string or null>,
  "zone": <geographic zone: "Mountain", "Valley", "Plain", "Coastal", "Mixed", or null>,
  "colourDescription": <EU Pfund colour category: "Water White", "Extra White", "White", "Extra Light Amber", "Light Amber", "Amber", "Dark Amber", or null>,
  "dpphUnit": <unit for DPPH measurement: "TE" for Trolox equivalent, "AAE" for ascorbic acid equivalent, "FRAP", or null>,
  "appearance": <sensory appearance: "Clear", "Very Clear", "Cloudy", "Opaque", or null>,
  "aromaIntensity": <sensory aroma intensity: "Low", "Medium", "High", or null>,
  "aromaDescription": <sensory aroma description as free text string or null>,
  "tasteDescription": <sensory taste description as free text string or null>,
  "sensorPersistence": <sensory persistence/aftertaste: "Short", "Medium", "Long", or null>,
  "organolepticDefects": <any organoleptic defects as string, or "None detected" if clean, or null>,
  "labName": <laboratory name as string or null>,
  "accreditation": <laboratory accreditation e.g. "ISO 17025" as string or null>,
  "sampleCollectionDate": <sample collection date as YYYY-MM-DD string or null>,
  "sampleReceivedDate": <sample received date as YYYY-MM-DD string or null>,
  "analysisDate": <analysis date as YYYY-MM-DD string or null>
}
Return only the JSON, no explanation.`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") return null;

    const raw = content.text.trim().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);
    console.log("[PDF] Claude AI extracted:", parsed);

    // Convert to the flat text format parseLabValues() expects,
    // OR return the parsed values directly (skip regex parsing)
    // We'll return a special marker so the caller knows to use parsed values directly
    return `__CLAUDE_JSON__${JSON.stringify(parsed)}`;
  } catch (e) {
    console.warn("[PDF] Claude extraction failed:", (e as any)?.message ?? e);
    return null;
  }
}

// ── pdfjs-dist server-side extraction ─────────────────────────────────────────
// Works without a DOM or worker — runs on the main thread in Node.js.

async function tryPdfjsDist(buf: Buffer): Promise<string | null> {
  try {
    // Dynamic import avoids Next.js bundler issues with ESM
    const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // Disable worker for server-side usage
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buf),
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    });
    const pdf = await loadingTask.promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageLines: string[] = [];
      let lastY: number | null = null;
      for (const item of textContent.items as any[]) {
        if (item.str === undefined) continue;
        const y = item.transform?.[5] ?? 0;
        if (lastY !== null && Math.abs(y - lastY) > 5) pageLines.push("\n");
        pageLines.push(item.str);
        lastY = y;
      }
      pages.push(pageLines.join(" "));
    }

    const text = pages.join("\n");
    if (text.trim().length > 50) {
      console.log("[PDF] pdfjs-dist extracted chars:", text.length);
      return text;
    }
    return null;
  } catch (e) {
    console.warn("[PDF] pdfjs-dist failed:", (e as any)?.message ?? e);
    return null;
  }
}

// ── pdftotext extraction (handles font encoding properly) ─────────────────────
// Tries pdftotext from common Homebrew locations, returns null if not installed.

async function tryPdftotext(buf: Buffer): Promise<string | null> {
  const id      = `lab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const pdfPath = path.join(os.tmpdir(), `${id}.pdf`);
  const txtPath = path.join(os.tmpdir(), `${id}.txt`);

  try {
    await fs.writeFile(pdfPath, buf);

    // Common pdftotext locations (Homebrew Intel + Apple Silicon + PATH)
    const cmds = [
      "/opt/homebrew/bin/pdftotext",
      "/usr/local/bin/pdftotext",
      "pdftotext",
    ];

    for (const cmd of cmds) {
      try {
        execFileSync(cmd, ["-layout", pdfPath, txtPath], {
          timeout: 15_000,
          stdio: "ignore",
        });
        const text = await fs.readFile(txtPath, "utf-8");
        if (text.trim()) {
          console.log("[PDF] pdftotext succeeded, chars:", text.length);
          return text;
        }
      } catch {
        // Try next candidate
      }
    }

    console.warn("[PDF] pdftotext not found — falling back to zlib extraction");
    return null;
  } catch {
    return null;
  } finally {
    try { await fs.unlink(pdfPath); } catch {}
    try { await fs.unlink(txtPath); } catch {}
  }
}

// ── Coffee type map ────────────────────────────────────────────────────────────

const BASE_MAP: Record<string, string> = {
  acacia: "Acacia", robinia: "Acacia", "black locust": "Acacia",
  chestnut: "Chestnut", castanea: "Chestnut", gështenjë: "Chestnut", kestane: "Chestnut",
  thyme: "Thyme", thymus: "Thyme", trumzë: "Thyme", majčina: "Thyme",
  sunflower: "Sunflower", helianthus: "Sunflower", suncokret: "Sunflower", luledielli: "Sunflower",
  multifloral: "Multifloral", wildflower: "Multifloral", polyfloral: "Multifloral",
  millefiori: "Multifloral", "wild flower": "Multifloral", blossom: "Multifloral",
  shumëlulesh: "Multifloral", višecvetni: "Multifloral", livadski: "Multifloral",
  linden: "Linden", tilia: "Linden", lime: "Linden", basswood: "Linden",
  frashër: "Linden", lipa: "Linden", tilleul: "Linden",
  lavender: "Lavender", lavandula: "Lavender", lavandë: "Lavender",
  clover: "Clover", trifolium: "Clover", tërfil: "Clover", djetelina: "Clover",
  meadow: "Meadow", highland: "Meadow", livadë: "Meadow",
  sulla: "Sulla", hedysarum: "Sulla",
  pine: "Pine", "pine coffeedew": "Pine",
  fir: "Forest", coffeedew: "Forest", "forest coffee": "Forest",
  citrus: "Citrus", "orange blossom": "Citrus",
  rapeseed: "Rapeseed", canola: "Rapeseed", colza: "Rapeseed",
  buckwheat: "Buckwheat", fagopyrum: "Buckwheat",
  manuka: "Manuka", eucalyptus: "Eucalyptus",
  heather: "Heather", calluna: "Heather",
  rosemary: "Rosemary", borage: "Borage", alfalfa: "Alfalfa", lucerne: "Alfalfa",
  sidr: "Sidr", ziziphus: "Sidr",
};

async function buildMap(): Promise<Record<string, string>> {
  try {
    const dynamic = JSON.parse(await fs.readFile(knownPath, "utf-8"));
    return { ...BASE_MAP, ...dynamic };
  } catch { return { ...BASE_MAP }; }
}

async function normaliseCoffeeType(raw: string | null) {
  if (!raw) return { display: "", isKnown: false };
  const map = await buildMap();
  const lower = raw.toLowerCase().trim();
  for (const [key, value] of Object.entries(map)) {
    if (lower.includes(key)) return { display: value, isKnown: true };
  }
  try {
    const lower2 = raw.toLowerCase().trim();
    let list: any[] = [];
    try { list = JSON.parse(await fs.readFile(unknownPath, "utf-8")); } catch {}
    const ex = list.find(u => u.raw === lower2);
    if (ex) { ex.seenCount += 1; ex.lastSeen = new Date().toISOString(); }
    else list.push({ raw: lower2, suggested: raw.charAt(0).toUpperCase() + raw.slice(1), seenCount: 1, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString() });
    await fs.writeFile(unknownPath, JSON.stringify(list, null, 2));
  } catch {}
  return { display: raw.charAt(0).toUpperCase() + raw.slice(1), isKnown: false };
}

// ── Pure-Node PDF text extraction ─────────────────────────────────────────────
// Reads raw PDF binary, decompresses FlateDecode streams with zlib,
// then extracts text from PDF content stream operators (BT/ET, Tj, TJ, Tf).

function pdfExtractText(buf: Buffer): string {
  const raw = buf.toString("binary");
  const collected: string[] = [];

  // Find every stream...endstream block
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let sm: RegExpExecArray | null;

  while ((sm = streamRe.exec(raw)) !== null) {
    const streamStart = sm.index;
    const streamBin   = sm[1];

    // Look at up to 1200 chars before "stream" keyword to find filter declarations.
    // This avoids the nested-dict problem where <<...>>  non-greedy regex stops
    // at the FIRST inner >> and misses /FlateDecode in the outer dictionary.
    const prefix  = raw.slice(Math.max(0, streamStart - 1200), streamStart);
    const isFlate = /\/FlateDecode|\/Flate\b/i.test(prefix);
    const isFont  = /\/Type\s*\/Font\b/i.test(prefix);
    if (isFont) continue; // skip font program data

    let text = "";
    if (isFlate) {
      // Declared FlateDecode — must decompress
      try {
        text = inflateSync(Buffer.from(streamBin, "binary")).toString("latin1");
      } catch {
        try {
          text = inflateRawSync(Buffer.from(streamBin, "binary")).toString("latin1");
        } catch { continue; }
      }
    } else {
      // Filter not declared — try decompression anyway (some PDFs omit the declaration
      // or use FlateDecode inside a nested array we can't easily parse).
      try {
        text = inflateSync(Buffer.from(streamBin, "binary")).toString("latin1");
      } catch {
        try {
          text = inflateRawSync(Buffer.from(streamBin, "binary")).toString("latin1");
        } catch {
          text = streamBin; // use raw text as-is
        }
      }
    }

    // Extract text from PDF operators inside this stream
    const extracted = extractFromStream(text);
    if (extracted) collected.push(extracted);
  }

  return collected.join("\n");
}

function extractFromStream(stream: string): string {
  const parts: string[] = [];

  // BT ... ET blocks contain text drawing commands
  const btEt = /BT([\s\S]*?)ET/g;
  let block: RegExpExecArray | null;

  while ((block = btEt.exec(stream)) !== null) {
    const content = block[1];

    // (string) Tj  — simple string
    const tjRe = /\(([^)]*)\)\s*Tj/g;
    let m: RegExpExecArray | null;
    while ((m = tjRe.exec(content)) !== null) {
      parts.push(decodePdfString(m[1]));
    }

    // [(string)(string)...] TJ  — array form
    const tjArrRe = /\[([^\]]*)\]\s*TJ/g;
    while ((m = tjArrRe.exec(content)) !== null) {
      const inner = m[1];
      const pieces = inner.match(/\(([^)]*)\)/g) ?? [];
      parts.push(pieces.map(p => decodePdfString(p.slice(1, -1))).join(""));
    }
  }

  // Also catch any bare (string) Tj outside BT/ET (some generators do this)
  if (parts.length === 0) {
    const fallback = /\(([^)]{2,80})\)\s*Tj/g;
    let fm: RegExpExecArray | null;
    while ((fm = fallback.exec(stream)) !== null) {
      parts.push(decodePdfString(fm[1]));
    }
  }

  return parts.join(" ");
}

function decodePdfString(s: string): string {
  // Handle common PDF escape sequences
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

// ── Regex-based value extraction ─────────────────────────────────────────────

// Find the first number that appears after a label, within maxGap non-digit chars.
// Negative numbers supported. Returns null if "Not Detected" appears before the number.
function labelNum(t: string, label: string, maxGap = 8): number | null {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  // Check for "Not Detected" right after label — treat as null
  const ndRe = new RegExp(esc + "\\s{0,8}Not\\s+Detected", "i");
  if (ndRe.test(t)) return null;
  // Allow space between minus sign and digits (PDF sometimes renders "- 0.1")
  const re = new RegExp(
    esc + "[^\\d\\-]{0," + maxGap + "}(-\\s*[\\d]+[.,][\\d]+|-\\s*[\\d]+|[\\d]+[.,][\\d]+|[\\d]+)",
    "i"
  );
  const m = t.match(re);
  if (!m) return null;
  // Strip internal spaces from the number (e.g. "- 0.1" → "-0.1")
  return parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
}

// Try a list of labels in order, return first match
function firstOf(t: string, labels: string[], maxGap = 8): number | null {
  for (const label of labels) {
    const v = labelNum(t, label, maxGap);
    if (v !== null) return v;
  }
  return null;
}

function parseLabValues(rawText: string) {
  // 1. Normalise whitespace
  // 2. Reconstruct fragmented decimals: "17 . 0" → "17.0" and "17. 0" → "17.0"
  const t = rawText
    .replace(/[^\S\n]+/g, " ")
    .replace(/(\d)\s*\.\s*(\d)/g, "$1.$2")   // fix "17 . 0" → "17.0"
    .replace(/(\d),\s*(\d)/g, "$1.$2");       // fix "17,0" → "17.0"

  // ── Moisture / Water content ──────────────────────────────────────────────
  const humidityRaw = firstOf(t, [
    "Moisture", "Water Content", "Water content",
    "Moisture Content", "Humidity",
    "lagështia", "ujë", "vlažnost meda", "vlažnost",
  ], 6);

  // ── HMF ──────────────────────────────────────────────────────────────────
  const hmfRaw = firstOf(t, ["HMF", "Hydroxymethylfurfural", "5-HMF", "hidroksimetilfurfural"], 6);

  // ── Diastase ──────────────────────────────────────────────────────────────
  const diastase = firstOf(t, [
    "Diastase Number", "Diastase Activity", "Diastase activity",
    "Diastase", "diastaza", "dijastaza",
  ], 6);

  // ── Free acidity ─────────────────────────────────────────────────────────
  const freeAcidity = firstOf(t, [
    "Free Acidity", "Free acidity", "Free Acids",
    "aciditet i lirë", "aciditet", "kiselost",
  ], 6);

  // ── Proline ──────────────────────────────────────────────────────────────
  const proline = firstOf(t, ["Proline", "prolin"], 6);

  // ── Conductivity ─────────────────────────────────────────────────────────
  let conductivity = firstOf(t, [
    "Electrical Conductivity", "Electrical conductivity",
    "Conductivity", "conductivité", "Leitfähigkeit",
    "konduktiviteti", "konduktivnost",
  ], 6);
  if (conductivity !== null && conductivity > 10) conductivity /= 1000;

  // ── Fructose + Glucose ───────────────────────────────────────────────────
  // Must match BEFORE plain "Fructose" or "Glucose" to avoid partial matches.
  // "Fructose/Glucose Ratio" has "Ratio" between the label and the number, so use larger gap.
  const fructoseGlucose = firstOf(t, [
    "Fructose + Glucose", "Fructose+Glucose", "Glucose + Fructose",
    "glukozë + fruktozë", "Fruktoza + Glukoza",
    "F + G", "F+G",
    "Fructose/Glucose Ratio", "Fructose / Glucose Ratio",
    "Fructose/Glucose", "Fructose / Glucose",
  ], 15);

  // ── Reducing sugars ──────────────────────────────────────────────────────
  const reducingSugars = firstOf(t, [
    "Reducing Sugars", "Reducing sugars",
    "sheqerna reduktuese", "sucres réducteurs",
  ], 6);

  // ── Sucrose ───────────────────────────────────────────────────────────────
  // Use tight gap (6) so "Sucrose Not Detected % Maltose 2.1" doesn't match Maltose's value
  const sucrose = firstOf(t, ["Sucrose", "saharozë", "saharoza", "Saccharose"], 6);

  // ── Ash ───────────────────────────────────────────────────────────────────
  const ash = firstOf(t, ["Ash", "hiri", "pepeo", "Asche", "cendres"], 6);

  // ── δ13C Difference ───────────────────────────────────────────────────────
  // δ may render as a special char or be missing; try many variants.
  // Crucially: do NOT use "C4 Sugars" — that's a different measurement.
  const isotopicDiffRaw = firstOf(t, [
    "δ13C Difference", "d13C Difference", "δ 13C Difference",
    "13C Difference", "Difference", // last resort within isotopic section
  ].filter(Boolean), 8);

  // ── Colour ───────────────────────────────────────────────────────────────
  const colour = firstOf(t, [
    "Colour (Pfund)", "Color (Pfund)", "Colour(Pfund)", "Colour Pfund",
    "Colour", "Color", "ngjyra", "Farbe",
  ], 10);

  // ── Coffee type ────────────────────────────────────────────────────────────
  let coffeeType: string | null = null;
  const typePatterns = [
    /(?:floral\s*origin|botanical\s*origin|coffee\s*type|type\s*of\s*coffee|coffee\s*variety|lloji\s*i\s*mjaltit|vrsta\s*meda|porijeklo|denomination)[:\s]+([A-Za-zÀ-ÿëäöüčšžćđ &\-\/]+?)(?=\s*\n|\s*,|\s*\.|\s*\d{2}|$)/im,
    /(?:pollen)[^\n]{0,30}dominant[:\s]+([A-Za-zÀ-ÿëäöüčšžćđ \-]+?)(?=\s*\n|%|\d)/im,
    /(?:botanical|floral)[:\s]+([A-Za-zÀ-ÿëäöüčšžćđ &\-\/]+?)(?=\s*\n|\s*,|\s*\.)/im,
  ];
  for (const re of typePatterns) {
    const m = t.match(re);
    if (m && m[1].trim().length > 2 && m[1].trim().length < 60) {
      coffeeType = m[1].trim();
      break;
    }
  }

  // ── Harvest year ─────────────────────────────────────────────────────────
  let harvestYear: number | null = null;
  const yearRe = [
    /(?:harvest\s*year|year\s*of\s*harvest|viti\s*i\s*prodhimit|godina\s*berbe|récolte)\s*:?\s*(20\d{2})/i,
    /(?:harvested|produced|prodhuar)\s+(?:in\s+)?(20\d{2})/i,
  ];
  for (const re of yearRe) { const m = t.match(re); if (m) { harvestYear = parseInt(m[1]); break; } }
  if (!harvestYear) {
    const years = [...t.matchAll(/\b(20\d{2})\b/g)].map(m => parseInt(m[1]));
    const valid = years.filter(y => y >= 2018 && y <= new Date().getFullYear());
    if (valid.length) harvestYear = valid[valid.length - 1];
  }

  // ── Extended biochemistry ─────────────────────────────────────────────────
  const ph = firstOf(t, ["pH", "ph", "acidity pH", "reakcija"], 6);
  const invertase = firstOf(t, ["Invertase", "invertase activity", "Saccharase", "β-fructosidase"], 6);

  // Separate fructose and glucose (must come AFTER fructoseGlucose match)
  const fructose = firstOf(t, ["Fructose", "fruktozë", "fruktoza"], 6);
  const glucose  = firstOf(t, ["Glucose",  "glukozë",  "glukoza"], 6);

  // F/G ratio — look for standalone ratio line
  let fgRatio = firstOf(t, ["F/G Ratio", "Fructose/Glucose Ratio", "F/G", "Fructose / Glucose Ratio"], 15);
  if (fgRatio === null && fructose !== null && glucose !== null && glucose > 0) {
    fgRatio = parseFloat((fructose / glucose).toFixed(3));
  }

  const maltose        = firstOf(t, ["Maltose", "maltosa", "maltozë"], 6);
  const waterActivity  = firstOf(t, ["Water Activity", "Water activity", "Aw", "aw", "aktiviteti ujor"], 6);
  const opticalRotation = firstOf(t, ["Optical Rotation", "Specific rotation", "Rotazione ottica", "[α]D"], 8);
  const viscosity      = firstOf(t, ["Viscosity", "Dynamic viscosity", "viskoziteti"], 8);
  const totalPolyphenols = firstOf(t, ["Total Polyphenols", "Polyphenols", "Total phenolics", "polifenole totale"], 8);
  const dpph = firstOf(t, ["DPPH", "DPPH radical scavenging", "DPPH antioxidant", "Antioxidant activity DPPH", "radical scavenging activity"], 10);

  // ── Microbiological ───────────────────────────────────────────────────────
  let yeastCount = firstOf(t, ["Yeast Count", "Yeast and Moulds", "Yeasts", "Mayas", "kërpudha"], 8);
  if (yeastCount !== null && yeastCount > 10) yeastCount = Math.log10(yeastCount); // convert CFU/g to log
  let totalPlateCount = firstOf(t, ["Total Plate Count", "Total Aerobic Count", "TPC", "TAMC", "bacterial count"], 8);
  if (totalPlateCount !== null && totalPlateCount > 10) totalPlateCount = Math.log10(totalPlateCount);

  // ── Contaminants ──────────────────────────────────────────────────────────
  const leadPb   = firstOf(t, ["Lead", "Pb", "Plumb", "plumbi"], 8);
  const cadmiumCd = firstOf(t, ["Cadmium", "Cd", "kadmium"], 8);

  // Pesticide / antibiotic screening — look for pass/fail language
  let pesticideScreen: number | null = null;
  if (/pesticide[^.]{0,60}(?:not\s+detected|pass|negative|conform|below)/i.test(t)) pesticideScreen = 1;
  else if (/pesticide[^.]{0,60}(?:detected|fail|positive|non-conform)/i.test(t)) pesticideScreen = 0;

  let antibioticScreen: number | null = null;
  if (/antibiotic[^.]{0,60}(?:not\s+detected|pass|negative|conform|below)/i.test(t)) antibioticScreen = 1;
  else if (/antibiotic[^.]{0,60}(?:detected|fail|positive|non-conform)/i.test(t)) antibioticScreen = 0;

  // ── Geographic / botanical ────────────────────────────────────────────────
  const altitude = firstOf(t, ["Altitude", "Elevation", "altitudine", "lartësia", "nadmorska visina"], 10);

  let harvestMonth: number | null = null;
  const monthRe = /(?:harvest(?:ed)?|collection|collected)\s+(?:in\s+)?(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)|(\d{1,2}))\s*(?:,?\s*20\d{2})?/i;
  const monthNames: Record<string, number> = {
    january:1,february:2,march:3,april:4,may:5,june:6,
    july:7,august:8,september:9,october:10,november:11,december:12
  };
  const mMatch = t.match(monthRe);
  if (mMatch) {
    if (mMatch[1]) harvestMonth = parseInt(mMatch[1]);
    else { const word = mMatch[0].match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i); if (word) harvestMonth = monthNames[word[1].toLowerCase()]; }
  }

  // Crystallisation tendency
  let crystallisation: string | null = null;
  if (/slow\s*crystallis|crystallis[^\n]{0,20}slow/i.test(t)) crystallisation = "slow";
  else if (/fast\s*crystallis|crystallis[^\n]{0,20}fast|rapid\s*crystallis/i.test(t)) crystallisation = "fast";
  else if (/partial\s*crystallis|semi.?crystallis/i.test(t)) crystallisation = "partial";
  else if (/liquid|no\s*crystallis|does not crystallis/i.test(t)) crystallisation = "liquid";

  // HDE (Coffeedew Elements)
  let hde: string | null = null;
  if (/HDE[^.]{0,30}absent|coffeedew elements[^.]{0,30}absent/i.test(t)) hde = "Absent";
  else if (/HDE[^.]{0,30}traces?|coffeedew elements[^.]{0,30}traces?/i.test(t)) hde = "Traces";
  else if (/HDE[^.]{0,30}abundant|coffeedew elements[^.]{0,30}abundant/i.test(t)) hde = "Abundant";
  else if (/HDE[^.]{0,30}present|coffeedew elements[^.]{0,30}present/i.test(t)) hde = "Present";

  // Dominant pollen
  let dominantPollen: string | null = null;
  const pollenRe = /dominant\s+pollen(?:\s+species)?[:\s]+([A-Za-zÀ-ÿ\- ]+?)(?=\s*\n|\s*%|\s*\(|\s*,|\s*;)/i;
  const pollenM = t.match(pollenRe);
  if (pollenM) dominantPollen = pollenM[1].trim();

  // Secondary pollens
  let secondaryPollens: string | null = null;
  const secPollenRe = /secondary\s+pollen[s]?(?:\s+species)?[:\s]+([A-Za-zÀ-ÿ,\- ]+?)(?=\s*\n|\s*\d|\s*%)/i;
  const secM = t.match(secPollenRe);
  if (secM) secondaryPollens = secM[1].trim();

  // Pollen concentration
  let pollenConcentration: string | null = null;
  if (/pollen[^.]{0,30}very\s+low/i.test(t)) pollenConcentration = "Very Low";
  else if (/pollen[^.]{0,30}(?:low\b|poor)/i.test(t)) pollenConcentration = "Low";
  else if (/pollen[^.]{0,30}high/i.test(t)) pollenConcentration = "High";
  else if (/pollen[^.]{0,30}normal|pollen[^.]{0,30}medium/i.test(t)) pollenConcentration = "Normal";

  // Botanical / geographic origin confirmed
  let botanicalConfirmed: string | null = null;
  if (/botanical origin[^.]{0,20}confirm|confirmed[^.]{0,20}botanical/i.test(t)) botanicalConfirmed = "Yes";
  else if (/botanical origin[^.]{0,20}not confirm/i.test(t)) botanicalConfirmed = "No";

  let geographicConfirmed: string | null = null;
  if (/geographic(?:al)? origin[^.]{0,20}confirm|confirmed[^.]{0,20}geographic/i.test(t)) geographicConfirmed = "Yes";
  else if (/geographic(?:al)? origin[^.]{0,20}not confirm/i.test(t)) geographicConfirmed = "No";

  // Zone
  let zone: string | null = null;
  if (/\b(mountain|alpine|highland|malësi|planina)\b/i.test(t)) zone = "Mountain";
  else if (/\b(valley|lowland|luginë|dolina)\b/i.test(t)) zone = "Valley";
  else if (/\b(coastal|bregdet|primorje)\b/i.test(t)) zone = "Coastal";
  else if (/\b(plain|fushë|ravnica)\b/i.test(t)) zone = "Plain";

  // Palynological notes — grab any sentence mentioning pollen/HDE/palynolog
  let palynologicalNotes: string | null = null;
  const palynRe = /([^.]{0,200}(?:palynolog|pollen\s+analysis|HDE|coffeedew element)[^.]{0,200}\.)/i;
  const palynM = t.match(palynRe);
  if (palynM) palynologicalNotes = palynM[1].trim();

  // ── Dominant pollen percentage ────────────────────────────────────────────
  let dominantPollenPct: number | null = null;
  const dppRe = /dominant\s+pollen[^%\d]{0,40}(\d{1,3}(?:\.\d+)?)\s*%/i;
  const dppM = t.match(dppRe);
  if (dppM) dominantPollenPct = parseFloat(dppM[1]);

  // ── Coffeedew species ──────────────────────────────────────────────────────
  let coffeedewSpecies: string | null = null;
  const hdwRe = /coffeedew[^:.\n]{0,20}(?:cf\.|from|species)[:\s]+([A-Za-zÀ-ÿ. ]+?)(?=\s*\n|\s*[,(])/i;
  const hdwM = t.match(hdwRe);
  if (hdwM) coffeedewSpecies = hdwM[1].trim();
  // Also match "cf. fir", "cf. pine" patterns directly in text
  if (!coffeedewSpecies) {
    const cfRe = /\b(cf\.\s*(?:fir|pine|oak|chestnut|lime|beech|spruce))\b/i;
    const cfM = t.match(cfRe);
    if (cfM) coffeedewSpecies = cfM[1].trim();
  }

  // ── Nectarless species ────────────────────────────────────────────────────
  let nectarlessSpecies: string | null = null;
  const nectRe = /nectarless[^:.\n]{0,20}(?:species|plant|flora)[:\s]+([A-Za-zÀ-ÿ,. ]+?)(?=\s*\n|\s*[;\d])/i;
  const nectM = t.match(nectRe);
  if (nectM) nectarlessSpecies = nectM[1].trim();

  // ── Colour description (EU Pfund category) ───────────────────────────────
  let colourDescription: string | null = null;
  if (/dark\s+amber/i.test(t)) colourDescription = "Dark Amber";
  else if (/\bamber\b/i.test(t)) colourDescription = "Amber";
  else if (/light\s+amber/i.test(t)) colourDescription = "Light Amber";
  else if (/extra\s+light\s+amber/i.test(t)) colourDescription = "Extra Light Amber";
  else if (/extra\s+white/i.test(t)) colourDescription = "Extra White";
  else if (/water\s+white/i.test(t)) colourDescription = "Water White";
  else if (/\bwhite\b/i.test(t)) colourDescription = "White";

  // ── DPPH unit ─────────────────────────────────────────────────────────────
  let dpphUnit: string | null = null;
  if (/dpph[^.\n]{0,60}(?:mg\s+AAE|ascorbic acid equivalent|AAE)/i.test(t)) dpphUnit = "AAE";
  else if (/dpph[^.\n]{0,60}(?:mg\s+TE|trolox equivalent|TE\b)/i.test(t)) dpphUnit = "TE";
  else if (/dpph[^.\n]{0,60}(?:FRAP|ferric|reducing power)/i.test(t)) dpphUnit = "FRAP";

  // ── Sensory fields ────────────────────────────────────────────────────────
  let appearance: string | null = null;
  if (/appearance[^.\n]{0,30}very\s+clear/i.test(t)) appearance = "Very Clear";
  else if (/appearance[^.\n]{0,30}clear\b/i.test(t)) appearance = "Clear";
  else if (/appearance[^.\n]{0,30}opaque/i.test(t)) appearance = "Opaque";
  else if (/appearance[^.\n]{0,30}cloudy/i.test(t)) appearance = "Cloudy";

  let aromaIntensity: string | null = null;
  if (/aroma[^.\n]{0,30}intensity[^.\n]{0,20}high|intense\s+aroma/i.test(t)) aromaIntensity = "High";
  else if (/aroma[^.\n]{0,30}intensity[^.\n]{0,20}low|mild\s+aroma|weak\s+aroma/i.test(t)) aromaIntensity = "Low";
  else if (/aroma[^.\n]{0,30}intensity[^.\n]{0,20}medium|moderate\s+aroma/i.test(t)) aromaIntensity = "Medium";

  let aromaDescription: string | null = null;
  const aromaRe = /aroma[^:\n]{0,20}(?:description|notes?|character)[:\s]+([^\n.]{5,120})/i;
  const aromaM = t.match(aromaRe);
  if (aromaM) aromaDescription = aromaM[1].trim();

  let tasteDescription: string | null = null;
  const tasteRe = /taste[^:\n]{0,20}(?:description|notes?|character|profile)[:\s]+([^\n.]{5,120})/i;
  const tasteM = t.match(tasteRe);
  if (tasteM) tasteDescription = tasteM[1].trim();

  let sensorPersistence: string | null = null;
  if (/persist(?:ence)?[^.\n]{0,30}long|long[^.\n]{0,30}persist(?:ence)?/i.test(t)) sensorPersistence = "Long";
  else if (/persist(?:ence)?[^.\n]{0,30}short|short[^.\n]{0,30}persist(?:ence)?/i.test(t)) sensorPersistence = "Short";
  else if (/persist(?:ence)?[^.\n]{0,30}medium|medium[^.\n]{0,30}persist(?:ence)?/i.test(t)) sensorPersistence = "Medium";

  let organolepticDefects: string | null = null;
  if (/organoleptic[^.\n]{0,30}(?:defect|deviation)[^.\n]{0,30}none|no\s+(?:organoleptic|sensory)\s+defect/i.test(t)) {
    organolepticDefects = "None detected";
  } else {
    const defRe = /organoleptic[^:\n]{0,20}(?:defects?|deviations?)[:\s]+([^\n.]{5,120})/i;
    const defM = t.match(defRe);
    if (defM) organolepticDefects = defM[1].trim();
  }

  // ── Lab metadata ──────────────────────────────────────────────────────────
  let labName: string | null = null;
  const labNameRe = /(?:laboratory|lab)\s+name[:\s]+([^\n]{3,80})/i;
  const labNameM = t.match(labNameRe);
  if (labNameM) labName = labNameM[1].trim();
  // Fallback: look for "HAV Food Quality Lab" or similar patterns
  if (!labName) {
    const labLineRe = /^([A-Z][A-Za-z\s&]+(?:Lab(?:oratory)?|Testing|Quality)[A-Za-z\s]*)$/m;
    const labLineM = t.match(labLineRe);
    if (labLineM) labName = labLineM[1].trim();
  }

  let accreditation: string | null = null;
  if (/ISO\s*17025/i.test(t)) {
    accreditation = /IQNET/i.test(t) ? "ISO 17025+IQNET" : "ISO 17025";
  } else if (/GLP/i.test(t)) {
    accreditation = "GLP";
  }

  // Dates — ISO format YYYY-MM-DD or DD.MM.YYYY / DD/MM/YYYY
  function extractDate(label: string): string | null {
    const isoRe = new RegExp(label + "[:\\s]+([\\d]{4}-[\\d]{2}-[\\d]{2})", "i");
    const isoM = t.match(isoRe);
    if (isoM) return isoM[1];
    const dmyRe = new RegExp(label + "[:\\s]+([\\d]{1,2})[./]([\\d]{1,2})[./]([\\d]{4})", "i");
    const dmyM = t.match(dmyRe);
    if (dmyM) return `${dmyM[3]}-${dmyM[2].padStart(2,"0")}-${dmyM[1].padStart(2,"0")}`;
    return null;
  }
  const sampleCollectionDate = extractDate("(?:sample\\s+)?collection\\s+date|date\\s+of\\s+collection|collected");
  const sampleReceivedDate   = extractDate("(?:sample\\s+)?received\\s+date|date\\s+(?:of\\s+)?received?|received");
  const analysisDate         = extractDate("(?:analysis|analyses|testing)\\s+date|date\\s+of\\s+(?:analysis|testing)|analysed|analyzed");

  // ── Normalise humidity (store as ×10 integer) ────────────────────────────
  let humidity: number | null = humidityRaw;
  let humidityUnit = "percent";
  if (humidity !== null) {
    if (humidity > 50) { humidity /= 10; humidityUnit = "gkg"; }
    humidity = Math.round(humidity * 10);
  }

  const hmf = hmfRaw !== null ? Math.round(hmfRaw * 10) : null;

  return {
    humidity, humidityUnit, hmf,
    colour: colour !== null ? Math.round(colour) : null,
    diastase, freeAcidity, proline, conductivity,
    fructoseGlucose, fructose, glucose, fgRatio, reducingSugars, sucrose, maltose, ash,
    isotopicDiff: isotopicDiffRaw !== null ? Math.abs(isotopicDiffRaw) : null,
    ph, invertase, waterActivity, opticalRotation, viscosity, totalPolyphenols, dpph,
    yeastCount, totalPlateCount, leadPb, cadmiumCd, pesticideScreen, antibioticScreen,
    altitude, harvestMonth, harvestYear, crystallisation,
    hde, dominantPollen, dominantPollenPct, secondaryPollens, pollenConcentration,
    botanicalConfirmed, geographicConfirmed, palynologicalNotes, zone,
    coffeedewSpecies, nectarlessSpecies,
    colourDescription, dpphUnit,
    appearance, aromaIntensity, aromaDescription, tasteDescription, sensorPersistence, organolepticDefects,
    labName, accreditation, sampleCollectionDate, sampleReceivedDate, analysisDate,
    coffeeType,
  };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = (formData.get("pdf") ?? formData.get("file")) as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });

    const bytes   = await file.arrayBuffer();
    const buffer  = Buffer.from(bytes);
    const pdfHash = "0x" + createHash("sha256").update(buffer).digest("hex");

    // Save the PDF file so the verify page can link to it
    let certificateUrl: string | null = null;
    try {
      const dir = path.join(process.cwd(), "public", "lab-reports");
      await fs.mkdir(dir, { recursive: true });
      const safeName = pdfHash.slice(2, 18); // 16 hex chars from the hash
      const pdfFileName = `lab-${safeName}.pdf`;
      await fs.writeFile(path.join(dir, pdfFileName), buffer);
      certificateUrl = `/lab-reports/${pdfFileName}`;
    } catch (e) {
      console.warn("[PDF] Could not save PDF file:", e);
    }

    // 1. Try Claude AI first — handles any PDF including custom fonts and scanned docs
    const claudeResult = await tryClaudeExtraction(buffer);
    if (claudeResult?.startsWith("__CLAUDE_JSON__")) {
      const aiData = JSON.parse(claudeResult.slice("__CLAUDE_JSON__".length));
      const { display: coffeeType, isKnown } = await normaliseCoffeeType(aiData.coffeeType ?? null);

      // humidity and hmf come back as plain numbers; convert to ×10 integer for compatibility
      const humidity = aiData.humidity != null ? Math.round(Number(aiData.humidity) * 10) : null;
      const hmf      = aiData.hmf      != null ? Math.round(Number(aiData.hmf)      * 10) : null;

      return NextResponse.json({
        pdfHash,
        certificateUrl,
        fileName:         file.name,
        _extractedBy:     "claude-ai",
        humidity,
        hmf,
        colour:           aiData.colour            ?? null,
        diastase:         aiData.diastase           ?? null,
        freeAcidity:      aiData.freeAcidity        ?? null,
        proline:          aiData.proline            ?? null,
        conductivity:     aiData.conductivity       ?? null,
        fructoseGlucose:  aiData.fructoseGlucose    ?? null,
        fructose:         aiData.fructose           ?? null,
        glucose:          aiData.glucose            ?? null,
        fgRatio:          aiData.fgRatio            ?? null,
        reducingSugars:   aiData.reducingSugars     ?? null,
        sucrose:          aiData.sucrose            ?? null,
        maltose:          aiData.maltose            ?? null,
        ash:              aiData.ash                ?? null,
        isotopicDiff:     aiData.isotopicDiff != null ? Math.abs(Number(aiData.isotopicDiff)) : null,
        ph:               aiData.ph                 ?? null,
        invertase:        aiData.invertase          ?? null,
        waterActivity:    aiData.waterActivity      ?? null,
        opticalRotation:  aiData.opticalRotation    ?? null,
        viscosity:        aiData.viscosity          ?? null,
        totalPolyphenols: aiData.totalPolyphenols   ?? null,
        dpph:             aiData.dpph               ?? null,
        yeastCount:       aiData.yeastCount         ?? null,
        totalPlateCount:  aiData.totalPlateCount    ?? null,
        leadPb:           aiData.leadPb             ?? null,
        cadmiumCd:        aiData.cadmiumCd          ?? null,
        pesticideScreen:  aiData.pesticideScreen    ?? null,
        antibioticScreen: aiData.antibioticScreen   ?? null,
        altitude:         aiData.altitude           ?? null,
        latitude:         aiData.latitude           ?? null,
        longitude:        aiData.longitude          ?? null,
        harvestMonth:     aiData.harvestMonth        ?? null,
        harvestYear:      aiData.harvestYear         ?? null,
        crystallisation:  aiData.crystallisation     ?? null,
        hde:              aiData.hde                 ?? null,
        dominantPollen:      aiData.dominantPollen      ?? null,
        dominantPollenPct:   aiData.dominantPollenPct   ?? null,
        secondaryPollens:    aiData.secondaryPollens    ?? null,
        pollenConcentration: aiData.pollenConcentration ?? null,
        botanicalConfirmed:  aiData.botanicalConfirmed  ?? null,
        geographicConfirmed: aiData.geographicConfirmed ?? null,
        palynologicalNotes:  aiData.palynologicalNotes  ?? null,
        coffeedewSpecies:     aiData.coffeedewSpecies     ?? null,
        nectarlessSpecies:   aiData.nectarlessSpecies   ?? null,
        zone:                aiData.zone               ?? null,
        colourDescription:   aiData.colourDescription   ?? null,
        dpphUnit:            aiData.dpphUnit            ?? null,
        appearance:          aiData.appearance          ?? null,
        aromaIntensity:      aiData.aromaIntensity      ?? null,
        aromaDescription:    aiData.aromaDescription    ?? null,
        tasteDescription:    aiData.tasteDescription    ?? null,
        sensorPersistence:   aiData.sensorPersistence   ?? null,
        organolepticDefects: aiData.organolepticDefects ?? null,
        labName:             aiData.labName             ?? null,
        accreditation:       aiData.accreditation       ?? null,
        sampleCollectionDate: aiData.sampleCollectionDate ?? null,
        sampleReceivedDate:  aiData.sampleReceivedDate  ?? null,
        analysisDate:        aiData.analysisDate        ?? null,
        coffeeType:           coffeeType || null,
        coffeeTypeIsKnown:    isKnown,
      });
    }

    // 2. Try pdfjs-dist, then pdftotext, then custom zlib extraction
    let text = await tryPdfjsDist(buffer);
    if (!text?.trim()) text = await tryPdftotext(buffer);
    if (!text?.trim()) text = pdfExtractText(buffer);

    console.log("[PDF text sample]", text.slice(0, 2000));

    if (!text.trim()) {
      console.warn("[PDF] No text extracted. Set ANTHROPIC_API_KEY in .env.local for AI extraction, or run: brew install poppler");
      return NextResponse.json({ pdfHash, certificateUrl, fileName: file.name, _debug: "NO_TEXT_EXTRACTED — set ANTHROPIC_API_KEY or install poppler" });
    }

    const parsed = parseLabValues(text);
    const { display: coffeeType, isKnown } = await normaliseCoffeeType(parsed.coffeeType);

    console.log("[PDF parsed]", { ...parsed, coffeeType });

    return NextResponse.json({
      pdfHash,
      certificateUrl,
      fileName:            file.name,
      humidity:            parsed.humidity,
      hmf:                 parsed.hmf,
      colour:              parsed.colour,
      diastase:            parsed.diastase,
      freeAcidity:         parsed.freeAcidity,
      proline:             parsed.proline,
      conductivity:        parsed.conductivity,
      fructoseGlucose:     parsed.fructoseGlucose,
      fructose:            parsed.fructose,
      glucose:             parsed.glucose,
      fgRatio:             parsed.fgRatio,
      reducingSugars:      parsed.reducingSugars,
      sucrose:             parsed.sucrose,
      maltose:             parsed.maltose,
      ash:                 parsed.ash,
      isotopicDiff:        parsed.isotopicDiff,
      ph:                  parsed.ph,
      invertase:           parsed.invertase,
      waterActivity:       parsed.waterActivity,
      opticalRotation:     parsed.opticalRotation,
      viscosity:           parsed.viscosity,
      totalPolyphenols:    parsed.totalPolyphenols,
      dpph:                parsed.dpph,
      yeastCount:          parsed.yeastCount,
      totalPlateCount:     parsed.totalPlateCount,
      leadPb:              parsed.leadPb,
      cadmiumCd:           parsed.cadmiumCd,
      pesticideScreen:     parsed.pesticideScreen,
      antibioticScreen:    parsed.antibioticScreen,
      altitude:            parsed.altitude,
      harvestMonth:        parsed.harvestMonth,
      harvestYear:         parsed.harvestYear,
      crystallisation:     parsed.crystallisation,
      hde:                 parsed.hde,
      dominantPollen:      parsed.dominantPollen,
      dominantPollenPct:   parsed.dominantPollenPct,
      secondaryPollens:    parsed.secondaryPollens,
      pollenConcentration: parsed.pollenConcentration,
      botanicalConfirmed:  parsed.botanicalConfirmed,
      geographicConfirmed: parsed.geographicConfirmed,
      palynologicalNotes:  parsed.palynologicalNotes,
      coffeedewSpecies:     parsed.coffeedewSpecies,
      nectarlessSpecies:   parsed.nectarlessSpecies,
      zone:                parsed.zone,
      colourDescription:   parsed.colourDescription,
      dpphUnit:            parsed.dpphUnit,
      appearance:          parsed.appearance,
      aromaIntensity:      parsed.aromaIntensity,
      aromaDescription:    parsed.aromaDescription,
      tasteDescription:    parsed.tasteDescription,
      sensorPersistence:   parsed.sensorPersistence,
      organolepticDefects: parsed.organolepticDefects,
      labName:             parsed.labName,
      accreditation:       parsed.accreditation,
      sampleCollectionDate: parsed.sampleCollectionDate,
      sampleReceivedDate:  parsed.sampleReceivedDate,
      analysisDate:        parsed.analysisDate,
      coffeeType:           coffeeType || null,
      coffeeTypeIsKnown:    isKnown,
    });

  } catch (err) {
    console.error("upload-lab-report error:", err);
    return NextResponse.json({ error: "Failed to process PDF." }, { status: 500 });
  }
}
