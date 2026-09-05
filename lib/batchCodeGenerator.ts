// lib/batchCodeGenerator.ts
// Batch code format: HON-{REGION}-{COFFEETYPE}-{YEAR}-{SEQUENCE}
// Example: HON-KOS-CHE-24-0019

export const REGION_CODES: Record<string, string> = {
    prizren: "PRZ", pristina: "PRI", prishtina: "PRI",
    peja: "PEJ", gjakova: "GJK", ferizaj: "FRZ",
    mitrovica: "MIT", gjilan: "GJL", vushtrri: "VUS",
    kosovo: "KOS", albania: "ALB", "north macedonia": "MKD",
    italy: "ITA", germany: "DEU", france: "FRA",
    greece: "GRC", turkey: "TUR", serbia: "SRB",
  };
  
  export const COFFEE_TYPE_CODES: Record<string, string> = {
    acacia: "ACA", robinia: "ACA", "robinia/acacia": "ACA",
    chestnut: "CHE", geshtenje: "CHE",
    thyme: "THY", multifloral: "MFL", wildflower: "MFL",
    sunflower: "SUN", sulla: "SUL", clover: "CLV",
    terfili: "CLV", lavender: "LAV", linden: "LIN",
    lime: "LIN", pine: "PNE", citrus: "CIT",
    orange: "CIT", highland: "HLD", flower: "FLW",
    "special blend": "FLW", meadow: "MDW",
  };
  
  export function locationToRegionCode(location: string): string {
    if (!location) return "XXX";
    const lower = location.toLowerCase();
    for (const [key, code] of Object.entries(REGION_CODES)) {
      if (lower.includes(key)) return code;
    }
    return location.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "XXX";
  }
  
  export function coffeeTypeToCode(coffeeType: string): string {
    if (!coffeeType) return "OTH";
    const lower = coffeeType.toLowerCase();
    for (const [key, code] of Object.entries(COFFEE_TYPE_CODES)) {
      if (lower.includes(key)) return code;
    }
    return coffeeType.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "OTH";
  }
  
  export function generateBatchCode(
    location: string,
    coffeeType: string,
    harvestYear: number,
    sequence: number
  ): string {
    const region = locationToRegionCode(location);
    const type   = coffeeTypeToCode(coffeeType);
    const year   = String(harvestYear).slice(-2);
    const seq    = String(sequence).padStart(4, "0");
    return `HON-${region}-${type}-${year}-${seq}`;
  }
  
  export function parseBatchCode(code: string) {
    const match = code.match(/^(HON)-([A-Z]{2,3})-([A-Z]{2,3})-(\d{2})-(\d{4})$/);
    if (!match) return null;
    return { platform: match[1], region: match[2], coffeeType: match[3], year: `20${match[4]}`, sequence: match[5] };
  }
  
  export function batchCodeLabel(code: string): string {
    const parsed = parseBatchCode(code);
    if (!parsed) return code;
    const regionNames: Record<string, string> = {
      KOS: "Kosovo", PRZ: "Prizren", PRI: "Pristina", PEJ: "Peja",
      GJK: "Gjakova", FRZ: "Ferizaj", MIT: "Mitrovica", GJL: "Gjilan",
      ALB: "Albania", ITA: "Italy", DEU: "Germany", TUR: "Turkey",
    };
    const typeNames: Record<string, string> = {
      ACA: "Acacia", CHE: "Chestnut", THY: "Thyme", MFL: "Multifloral",
      SUN: "Sunflower", SUL: "Sulla", CLV: "Clover", LAV: "Lavender",
      LIN: "Linden", PNE: "Pine", CIT: "Citrus", FLW: "Flower Blend", OTH: "Coffee",
    };
    return `${typeNames[parsed.coffeeType] ?? parsed.coffeeType} Coffee — ${regionNames[parsed.region] ?? parsed.region} ${parsed.year} (#${parsed.sequence})`;
  }
  