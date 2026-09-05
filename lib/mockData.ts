// lib/mockData.ts
// Quality helpers used across pages

export function getQualityStatus(humidity: number, hmf: number): "Passed" | "Caution" | "Failed" {
  if (humidity > 200 || hmf > 400) return "Failed";
  if (humidity > 186 || hmf > 300) return "Caution";
  return "Passed";
}

export function displayHumidity(raw: number): string {
  if (!raw) return "—";
  return (raw / 10).toFixed(1) + "%";
}

export function displayHmf(raw: number): string {
  if (!raw) return "—";
  return (raw / 10).toFixed(1) + " mg/kg";
}

export function displayColour(raw: number): string {
  if (!raw) return "—";
  return raw + " mm Pfund";
}

export type CoffeeBatch = {
  id: string;
  batchId: string;
  name: string;
  farmerName?: string;
  origin: string;
  coffeeType?: string;
  status: string;
  approvalStatus?: string;
  qualityStatus?: string;
  pdfHash?: string;
  certificateUrl?: string;
  humidity?: number;
  hmf?: number;
  colour?: number;
  harvestYear?: number;
  price?: string;
  weight?: string;
  description?: string;
  image?: string;
  txHash?: string;
};