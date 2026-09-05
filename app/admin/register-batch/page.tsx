"use client";
// app/admin/register-batch/page.tsx — PDF-first batch registration for admins

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createWalletClient, createPublicClient, custom, http } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI, activeChain, RPC_URL } from "@/lib/contractConfig";
import { scoreCoffee, TIER_COLOR, TIER_BG, TIER_BORDER, type LabParams, type QualityResult } from "@/lib/coffeeQuality";

// ─── Types ────────────────────────────────────────────────────────────────────

type BatchForm = {
  batchId: string;
  farmerName: string;
  origin: string;
  coffeeType: string;
  harvestYear: number;
  producerDeclaration: string;
  // Quality — all stored as display strings (decimal)
  humidity: string;
  hmf: string;
  colour: string;
  diastase: string;
  freeAcidity: string;
  proline: string;
  conductivity: string;
  fructoseGlucose: string;
  reducingSugars: string;
  sucrose: string;
  ash: string;
  isotopicDiff: string;
  // Marketplace
  price: string;
  wholesaleQty: string;
  wholesaleUnit: string;
  jarSizeG: string;
  description: string;
  imageUrl: string;
  // Extended — geographic/harvest
  zone: string;
  altitude: string;
  latitude: string;
  longitude: string;
  harvestMonth: string;
  crystallisation: string;
  productionSystem: string;
  // Extended biochemistry
  ph: string;
  invertase: string;
  fructose: string;
  glucose: string;
  fgRatio: string;
  maltose: string;
  waterActivity: string;
  opticalRotation: string;
  viscosity: string;
  totalPolyphenols: string;
  hdeEncoded: string;
  dpph: string;
  // Botanical & pollen
  hde: string;
  dominantPollen: string;
  secondaryPollens: string;
  pollenConcentration: string;
  botanicalConfirmed: string;
  geographicConfirmed: string;
  palynologicalNotes: string;
  // Microbiological & contaminants
  yeastCount: string;
  totalPlateCount: string;
  leadPb: string;
  cadmiumCd: string;
  pesticideScreen: string;
  antibioticScreen: string;
  // Sensory analysis
  appearance: string;
  aromaIntensity: string;
  aromaDescription: string;
  tasteDescription: string;
  sensorPersistence: string;
  organolepticDefects: string;
  texture: string;
  // Physical — additional
  colourDescription: string;
  dpphUnit: string;
  // Botanical — additional
  coffeedewSpecies: string;
  dominantPollenPct: string;
  nectarlessSpecies: string;
  // Lab metadata
  labName: string;
  accreditation: string;
  sampleCollectionDate: string;
  sampleReceivedDate: string;
  analysisDate: string;
};

const EMPTY_FORM: BatchForm = {
  batchId: "", farmerName: "", origin: "Prizren", coffeeType: "Multifloral",
  harvestYear: new Date().getFullYear(), producerDeclaration: "",
  humidity: "", hmf: "", colour: "", diastase: "", freeAcidity: "",
  proline: "", conductivity: "", fructoseGlucose: "", reducingSugars: "",
  sucrose: "", ash: "", isotopicDiff: "",
  price: "", wholesaleQty: "", wholesaleUnit: "kg", jarSizeG: "500", description: "", imageUrl: "",
  zone: "", altitude: "", latitude: "", longitude: "", harvestMonth: "", crystallisation: "", productionSystem: "",
  ph: "", invertase: "", fructose: "", glucose: "", fgRatio: "", maltose: "",
  waterActivity: "", opticalRotation: "", viscosity: "", totalPolyphenols: "", hdeEncoded: "", dpph: "",
  hde: "", dominantPollen: "", secondaryPollens: "", pollenConcentration: "",
  botanicalConfirmed: "", geographicConfirmed: "", palynologicalNotes: "",
  yeastCount: "", totalPlateCount: "", leadPb: "", cadmiumCd: "",
  pesticideScreen: "", antibioticScreen: "",
  appearance: "", aromaIntensity: "", aromaDescription: "", tasteDescription: "", sensorPersistence: "", organolepticDefects: "", texture: "",
  colourDescription: "", dpphUnit: "",
  coffeedewSpecies: "", dominantPollenPct: "", nectarlessSpecies: "",
  labName: "", accreditation: "", sampleCollectionDate: "", sampleReceivedDate: "", analysisDate: "",
};

const COFFEE_TYPES = [
  "Acacia", "Alfalfa", "Borage", "Buckwheat", "Chestnut", "Citrus", "Clover",
  "Coriander", "Cornflower", "Eucalyptus", "Forest", "Heather", "Highland Flower",
  "Coffeedew", "Lavender", "Linden", "Manuka", "Meadow", "Multifloral", "Flower Blend",
  "Paliurus", "Phacelia", "Pine", "Rapeseed", "Raspberry", "Rosemary", "Sainfoin",
  "Sulla", "Sunflower", "Thyme", "Other",
];

const REGIONS = [
  "Prizren", "Pristina", "Peja", "Gjakova", "Ferizaj",
  "Mitrovica", "Gjilan", "Kosovo", "Albania", "North Macedonia", "Montenegro", "Italy",
  "Germany", "France", "Greece", "Turkey", "Other",
];

// ─── Quality param grid definition ───────────────────────────────────────────

type ParamField = {
  key: keyof BatchForm;
  scoreKey: string;
  label: string;
  unit: string;
  placeholder: string;
  step?: string;
  limit?: string;
};

const QUALITY_PARAMS: ParamField[] = [
  { key: "humidity",        scoreKey: "water",          label: "Water Content",   unit: "%",       placeholder: "e.g. 17.2", step: "0.1",  limit: "max 20%" },
  { key: "hmf",             scoreKey: "hmf",            label: "HMF",             unit: "mg/kg",   placeholder: "e.g. 12.5", step: "0.1",  limit: "max 40" },
  { key: "diastase",        scoreKey: "diastase",       label: "Diastase",        unit: "DN",      placeholder: "e.g. 14.5", step: "0.1",  limit: "min 8" },
  { key: "freeAcidity",     scoreKey: "freeAcidity",    label: "Free Acidity",    unit: "meq/kg",  placeholder: "e.g. 22.4", step: "0.1",  limit: "max 50" },
  { key: "proline",         scoreKey: "proline",        label: "Proline",         unit: "mg/kg",   placeholder: "e.g. 420",  step: "1",    limit: "min 300" },
  { key: "conductivity",    scoreKey: "conductivity",   label: "Conductivity",    unit: "mS/cm",   placeholder: "e.g. 0.32", step: "0.01", limit: "max 0.8" },
  { key: "fructoseGlucose", scoreKey: "fructoseGlucose",label: "F + G",           unit: "%",       placeholder: "e.g. 68.4", step: "0.1",  limit: "min 60%" },
  { key: "reducingSugars",  scoreKey: "reducingSugars", label: "Reducing Sugars", unit: "%",       placeholder: "e.g. 71.2", step: "0.1",  limit: "min 60%" },
  { key: "sucrose",         scoreKey: "purity",         label: "Sucrose",         unit: "%",       placeholder: "e.g. 1.3",  step: "0.1",  limit: "max 5%" },
  { key: "ash",             scoreKey: "ash",            label: "Ash",             unit: "%",       placeholder: "e.g. 0.18", step: "0.01", limit: "max 0.6%" },
  { key: "isotopicDiff",    scoreKey: "isotopicDiff",   label: "δ¹³C Diff",       unit: "‰",       placeholder: "e.g. 0.3",  step: "0.01", limit: "max 1.0‰" },
  { key: "colour",          scoreKey: "",               label: "Colour",          unit: "mm Pfund",placeholder: "e.g. 45",   step: "1" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(s: string): number | null {
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

function buildLabParams(form: BatchForm): LabParams {
  return {
    coffeeType:       form.coffeeType,
    hmf:             n(form.hmf),
    water:           n(form.humidity),
    diastase:        n(form.diastase),
    freeAcidity:     n(form.freeAcidity),
    proline:         n(form.proline),
    conductivity:    n(form.conductivity),
    fructoseGlucose: n(form.fructoseGlucose),
    reducingSugars:  n(form.reducingSugars),
    sucrose:         n(form.sucrose),
    ash:             n(form.ash),
    isotopicDiff:    n(form.isotopicDiff),
    colour:          n(form.colour),
  };
}

function toDisplay(x10: number | null): string {
  if (x10 == null) return "";
  return (x10 / 10).toFixed(1);
}

const TIER_ICON: Record<string, string> = {
  Exceptional: "", Premium: "", "Very Good": "", Good: "", "Non-Compliant": "",
};

// ─── Collapsible section helper ───────────────────────────────────────────────

function ExtSection({ title, hint, children, defaultOpen, forceOpen }: { title: string; hint: string; children: React.ReactNode; defaultOpen?: boolean; forceOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  // When forceOpen flips to true (e.g. after PDF parse), open the section
  const prevForce = React.useRef(false);
  React.useEffect(() => {
    if (forceOpen && !prevForce.current) setOpen(true);
    prevForce.current = !!forceOpen;
  }, [forceOpen]);
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</span>
          {!open && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
        </div>
        <span className="text-slate-400 text-lg leading-none">{open ? "−" : "+"}</span>
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminRegisterBatchPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editMode     = searchParams.get("edit") !== null;

  const [form, setForm]         = useState<BatchForm>(EMPTY_FORM);
  const [pdfHash, setPdfHash]         = useState("");
  const [pdfName, setPdfName]         = useState("");
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pdfDone, setPdfDone]   = useState(false);
  const [autoDetected, setAutoDetected] = useState<Set<keyof BatchForm>>(new Set());
  const [quality, setQuality]   = useState<QualityResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle"|"waiting"|"mining"|"done"|"error">("idle");
  const [txHash, setTxHash]     = useState("");
  const [error, setError]       = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [producers, setProducers] = useState<{ name: string; role: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef  = useRef<HTMLInputElement>(null);

  // Load producers (farmers + admin = HAV Company)
  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then((data: any) => {
        const list: any[] = Array.isArray(data) ? data : (data.users ?? []);
        const farmers = list
          .filter((u: any) => u.role === "farmer" && u.name)
          .map((u: any) => ({ name: u.name, role: "farmer" }));
        setProducers(farmers);
        setForm(f => ({ ...f, farmerName: f.farmerName || "HAV Company" }));
      })
      .catch(() => {
        setForm(f => ({ ...f, farmerName: f.farmerName || "HAV Company" }));
      });
  }, []);

  // Pre-fill form when opened in edit mode (?edit=batchId&...fields)
  useEffect(() => {
    if (!editMode) return;
    const p = searchParams;
    const str = (k: string) => p.get(k) ?? "";
    setForm({
      batchId:             str("batchId"),
      farmerName:       str("farmerName"),
      origin:              str("origin")       || "Prizren",
      coffeeType:           str("coffeeType")    || "Multifloral",
      harvestYear:         parseInt(str("harvestYear")) || new Date().getFullYear(),
      producerDeclaration: str("producerDeclaration"),
      humidity:            str("humidity"),
      hmf:                 str("hmf"),
      colour:              str("colour"),
      diastase:            str("diastase"),
      freeAcidity:         str("freeAcidity"),
      proline:             str("proline"),
      conductivity:        str("conductivity"),
      fructoseGlucose:     str("fructoseGlucose"),
      reducingSugars:      str("reducingSugars"),
      sucrose:             str("sucrose"),
      ash:                 str("ash"),
      isotopicDiff:        str("isotopicDiff"),
      price:               str("price"),
      wholesaleQty:        str("wholesaleQty"),
      wholesaleUnit:       str("wholesaleUnit") || "kg",
      jarSizeG:            str("jarSizeG")      || "500",
      description:         str("description"),
      imageUrl:            str("imageUrl"),
      // Extended
      zone:                str("zone"),
      altitude:            str("altitude"),
      latitude:            str("latitude"),
      longitude:           str("longitude"),
      harvestMonth:        str("harvestMonth"),
      crystallisation:     str("crystallisation"),
      productionSystem:    str("productionSystem"),
      ph:                  str("ph"),
      invertase:           str("invertase"),
      fructose:            str("fructose"),
      glucose:             str("glucose"),
      fgRatio:             str("fgRatio"),
      maltose:             str("maltose"),
      waterActivity:       str("waterActivity"),
      opticalRotation:     str("opticalRotation"),
      viscosity:           str("viscosity"),
      totalPolyphenols:    str("totalPolyphenols"),
      hdeEncoded:          str("hdeEncoded"),
      dpph:                str("dpph"),
      hde:                 str("hde"),
      dominantPollen:      str("dominantPollen"),
      secondaryPollens:    str("secondaryPollens"),
      pollenConcentration: str("pollenConcentration"),
      botanicalConfirmed:  str("botanicalConfirmed"),
      geographicConfirmed: str("geographicConfirmed"),
      palynologicalNotes:  str("palynologicalNotes"),
      yeastCount:          str("yeastCount"),
      totalPlateCount:     str("totalPlateCount"),
      leadPb:              str("leadPb"),
      cadmiumCd:           str("cadmiumCd"),
      pesticideScreen:     str("pesticideScreen"),
      antibioticScreen:    str("antibioticScreen"),
      appearance:          str("appearance"),
      aromaIntensity:      str("aromaIntensity"),
      aromaDescription:    str("aromaDescription"),
      tasteDescription:    str("tasteDescription"),
      sensorPersistence:   str("sensorPersistence"),
      organolepticDefects: str("organolepticDefects"),
      texture:             str("texture"),
      colourDescription:   str("colourDescription"),
      dpphUnit:            str("dpphUnit"),
      coffeedewSpecies:     str("coffeedewSpecies"),
      dominantPollenPct:   str("dominantPollenPct"),
      nectarlessSpecies:   str("nectarlessSpecies"),
      labName:             str("labName"),
      accreditation:       str("accreditation"),
      sampleCollectionDate: str("sampleCollectionDate"),
      sampleReceivedDate:  str("sampleReceivedDate"),
      analysisDate:        str("analysisDate"),
    });
    if (str("pdfHash")) setPdfHash(str("pdfHash"));
    if (str("pdfName")) { setPdfName(str("pdfName")); setPdfDone(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  // Re-score whenever quality fields or coffee type change
  useEffect(() => {
    const params = buildLabParams(form);
    const hasAny = Object.entries(params).some(([k, v]) => k !== "coffeeType" && v !== null);
    setQuality(hasAny ? scoreCoffee(params) : null);
  }, [
    form.humidity, form.hmf, form.diastase, form.freeAcidity, form.proline,
    form.conductivity, form.fructoseGlucose, form.reducingSugars, form.sucrose,
    form.ash, form.isotopicDiff, form.coffeeType,
  ]);

  // Re-generate batch code when origin / type / year change (skip in edit mode)
  useEffect(() => {
    if (editMode) return;
    if (!form.origin || !form.coffeeType) return;
    generateCode();
  }, [form.origin, form.coffeeType, form.harvestYear, editMode]);

  function set(field: keyof BatchForm, value: string | number) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function generateCode() {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/batch/generate-code?location=${encodeURIComponent(form.origin)}&coffeeType=${encodeURIComponent(form.coffeeType)}&year=${form.harvestYear}`
      );
      const d = await res.json();
      if (d.batchCode) setForm(f => ({ ...f, batchId: d.batchCode }));
    } catch {}
    setGenerating(false);
  }

  async function handlePdfUpload(file: File) {
    setUploading(true);
    setError("");
    setPdfName(file.name);
    setPdfDone(false);
    setCertificateUrl(null);
    setAutoDetected(new Set());

    try {
      // SHA-256 hash client-side
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      setPdfHash(hash);

      const fd = new FormData();
      fd.append("pdf", file);
      const res  = await fetch("/api/upload-lab-report", { method: "POST", body: fd });
      const data = await res.json();

      if (data.certificateUrl) setCertificateUrl(data.certificateUrl);

      if (!res.ok) {
        // PDF is still hashed and attached — just no auto-fill available
        setPdfDone(true);
        setUploading(false);
        return;
      }

      const detected = new Set<keyof BatchForm>();

      setForm(prev => {
        const next = { ...prev };

        function fill(field: keyof BatchForm, val: string | number | null | undefined) {
          if (val !== null && val !== undefined && String(val) !== "") {
            (next as any)[field] = String(val);
            detected.add(field);
          }
        }

        // Humidity/HMF come as ×10 integers from the API
        if (data.humidity != null) fill("humidity", toDisplay(data.humidity));
        if (data.hmf      != null) fill("hmf",      toDisplay(data.hmf));
        if (data.colour   != null) fill("colour",   String(data.colour));

        // Standard params
        fill("diastase",        data.diastase);
        fill("freeAcidity",     data.freeAcidity);
        fill("proline",         data.proline);
        fill("conductivity",    data.conductivity);
        fill("fructoseGlucose", data.fructoseGlucose);
        fill("reducingSugars",  data.reducingSugars);
        fill("sucrose",         data.sucrose);
        fill("ash",             data.ash);
        fill("isotopicDiff",    data.isotopicDiff);

        // Extended biochemistry
        fill("ph",              data.ph);
        fill("invertase",       data.invertase);
        fill("fructose",        data.fructose);
        fill("glucose",         data.glucose);
        fill("fgRatio",         data.fgRatio);
        fill("maltose",         data.maltose);
        fill("waterActivity",   data.waterActivity);
        fill("opticalRotation", data.opticalRotation);
        fill("viscosity",       data.viscosity);
        fill("totalPolyphenols",data.totalPolyphenols);
        fill("dpph",            data.dpph);

        // Microbiological & contaminants
        fill("yeastCount",      data.yeastCount);
        fill("totalPlateCount", data.totalPlateCount);
        fill("leadPb",          data.leadPb);
        fill("cadmiumCd",       data.cadmiumCd);
        if (data.pesticideScreen  != null) fill("pesticideScreen",  data.pesticideScreen);
        if (data.antibioticScreen != null) fill("antibioticScreen", data.antibioticScreen);

        // Geographic / harvest
        fill("altitude",        data.altitude);
        fill("latitude",        data.latitude);
        fill("longitude",       data.longitude);
        if (data.harvestMonth)  { next.harvestMonth = String(data.harvestMonth); detected.add("harvestMonth"); }
        if (data.zone)          { next.zone = data.zone; detected.add("zone"); }
        if (data.crystallisation) { next.crystallisation = data.crystallisation; detected.add("crystallisation"); }

        // Botanical & pollen
        if (data.hde)                { next.hde = data.hde; detected.add("hde");
          // auto-encode hdeEncoded 0-3
          const hdeMap: Record<string,string> = { "Absent": "0", "Traces": "1", "Present": "2", "Abundant": "3" };
          if (hdeMap[data.hde]) { next.hdeEncoded = hdeMap[data.hde]; detected.add("hdeEncoded"); }
        }
        if (data.dominantPollen)     { next.dominantPollen = data.dominantPollen; detected.add("dominantPollen"); }
        if (data.secondaryPollens)   { next.secondaryPollens = data.secondaryPollens; detected.add("secondaryPollens"); }
        if (data.pollenConcentration){ next.pollenConcentration = data.pollenConcentration; detected.add("pollenConcentration"); }
        if (data.botanicalConfirmed) { next.botanicalConfirmed = data.botanicalConfirmed; detected.add("botanicalConfirmed"); }
        if (data.geographicConfirmed){ next.geographicConfirmed = data.geographicConfirmed; detected.add("geographicConfirmed"); }
        if (data.palynologicalNotes) { next.palynologicalNotes = data.palynologicalNotes; detected.add("palynologicalNotes"); }

        if (data.coffeeType) {
          const match = COFFEE_TYPES.find(t => t.toLowerCase() === data.coffeeType.toLowerCase());
          if (match) { next.coffeeType = match; detected.add("coffeeType"); }
        }
        if (data.harvestYear) { next.harvestYear = data.harvestYear; detected.add("harvestYear"); }

        // New fields
        if (data.colourDescription)  { next.colourDescription  = data.colourDescription;  detected.add("colourDescription"); }
        if (data.dpphUnit)           { next.dpphUnit           = data.dpphUnit;            detected.add("dpphUnit"); }
        if (data.coffeedewSpecies)    { next.coffeedewSpecies    = data.coffeedewSpecies;     detected.add("coffeedewSpecies"); }
        fill("dominantPollenPct",  data.dominantPollenPct);
        if (data.nectarlessSpecies)  { next.nectarlessSpecies  = data.nectarlessSpecies;   detected.add("nectarlessSpecies"); }
        if (data.appearance)         { next.appearance         = data.appearance;          detected.add("appearance"); }
        if (data.aromaIntensity)     { next.aromaIntensity     = data.aromaIntensity;      detected.add("aromaIntensity"); }
        if (data.aromaDescription)   { next.aromaDescription   = data.aromaDescription;   detected.add("aromaDescription"); }
        if (data.tasteDescription)   { next.tasteDescription   = data.tasteDescription;   detected.add("tasteDescription"); }
        if (data.sensorPersistence)  { next.sensorPersistence  = data.sensorPersistence;  detected.add("sensorPersistence"); }
        if (data.organolepticDefects){ next.organolepticDefects = data.organolepticDefects; detected.add("organolepticDefects"); }
        if (data.labName)            { next.labName            = data.labName;             detected.add("labName"); }
        if (data.accreditation)      { next.accreditation      = data.accreditation;       detected.add("accreditation"); }
        if (data.sampleCollectionDate){ next.sampleCollectionDate = data.sampleCollectionDate; detected.add("sampleCollectionDate"); }
        if (data.sampleReceivedDate) { next.sampleReceivedDate = data.sampleReceivedDate;  detected.add("sampleReceivedDate"); }
        if (data.analysisDate)       { next.analysisDate       = data.analysisDate;        detected.add("analysisDate"); }

        return next;
      });

      setAutoDetected(detected);
      setPdfDone(true);

    } catch {
      // Hash was already set — mark as attached even if parsing failed
      setPdfDone(true);
    }
    setUploading(false);
  }

  async function handleImageUpload(file: File) {
    setImgUploading(true);
    setImgPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("batchId", form.batchId || `tmp-${Date.now()}`);
      const res  = await fetch("/api/admin/upload-batch-photo", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) set("imageUrl", data.imageUrl);
      else setError(data.error || "Photo upload failed.");
    } catch {
      setError("Photo upload failed.");
    }
    setImgUploading(false);
  }

  async function handleSubmit() {
    setError("");
    if (!form.batchId || !form.farmerName || !form.origin || !form.coffeeType) {
      setError("Fill all required fields before registering.");
      return;
    }

    // Non-compliant batches can still be registered — admin will review and can reject.
    // Blocking registration would deprive the ML models of negative-class training examples.

    try {
      setTxStatus("waiting");
      const [account] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });

      // Auto-switch to Hardhat Localhost (chain 31337)
      const chainHex: string = await (window as any).ethereum.request({ method: "eth_chainId" });
      if (parseInt(chainHex, 16) !== 31337) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x7a69" }],
          });
        } catch (e: any) {
          if (e.code === 4902) {
            await (window as any).ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x7a69",
                chainName: "Hardhat Localhost",
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                rpcUrls: [RPC_URL],
              }],
            });
          } else throw e;
        }
      }

      const walletClient = createWalletClient({
        chain: activeChain,
        transport: custom((window as any).ethereum),
      });
      const publicClient = createPublicClient({
        chain: activeChain,
        transport: http(RPC_URL),
      });

      const humX10 = Math.round(parseFloat(form.humidity || "0") * 10);
      const hmfX10 = Math.round(parseFloat(form.hmf      || "0") * 10);
      const col    = Math.round(parseFloat(form.colour   || "0"));

      // Extended quality params — encoded per contract spec
      const extParams: [bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint] = [
        BigInt(Math.round(parseFloat(form.diastase        || "0") * 10)),   // diastase ×10
        BigInt(Math.round(parseFloat(form.freeAcidity     || "0") * 10)),   // freeAcidity ×10
        BigInt(Math.round(parseFloat(form.proline         || "0"))),        // proline ×1
        BigInt(Math.round(parseFloat(form.conductivity    || "0") * 1000)), // conductivity ×1000
        BigInt(Math.round(parseFloat(form.fructoseGlucose || "0") * 10)),   // fructoseGlucose ×10
        BigInt(Math.round(parseFloat(form.reducingSugars  || "0") * 10)),   // reducingSugars ×10
        BigInt(Math.round(parseFloat(form.sucrose         || "0") * 10)),   // sucrose ×10
        BigInt(Math.round(parseFloat(form.ash             || "0") * 1000)), // ash ×1000
        BigInt(Math.round(parseFloat(form.isotopicDiff    || "0") * 100)),  // isotopicDiff ×100
      ];

      // Price: convert € to ETH placeholder (1 ETH ≈ 3000 EUR rough rate for prototype)
      // In production this would use a real oracle. For now: priceWei = 0 (off-chain price only).
      const priceWei = BigInt(0);
      const jarSizeG = BigInt(Math.round(parseFloat(form.jarSizeG || "0")));
      const wqG = form.wholesaleUnit === "kg"
        ? parseFloat(form.wholesaleQty || "0") * 1000
        : parseFloat(form.wholesaleQty || "0");
      const totalStockBig = BigInt(
        jarSizeG > BigInt(0) && wqG > 0
          ? Math.floor(wqG / Number(jarSizeG))
          : 0
      );

      setTxStatus("mining");

      const txArgs = [
        form.batchId, form.farmerName, form.origin, form.coffeeType,
        pdfHash, form.producerDeclaration,
        BigInt(humX10), BigInt(hmfX10), BigInt(col), BigInt(form.harvestYear),
        extParams,
        BigInt(quality?.score ?? 0),
        quality?.tier ?? "Unknown",
        priceWei,
        jarSizeG,
        totalStockBig,
      ] as const;

      let txh: `0x${string}`;
      if (editMode) {
        // Edit mode — go straight to updateBatch (batch already exists on-chain)
        txh = await walletClient.writeContract({
          address: CONTRACT_ADDRESS, abi: CONTRACT_ABI,
          functionName: "updateBatch",
          chain: activeChain, gas: 8_000_000n,
          args: txArgs, account,
        });
      } else {
        try {
          txh = await walletClient.writeContract({
            address: CONTRACT_ADDRESS, abi: CONTRACT_ABI,
            functionName: "registerBatch",
            chain: activeChain, gas: 8_000_000n,
            args: txArgs, account,
          });
        } catch (regErr: any) {
          const msg = regErr?.message ?? "";
          if (msg.includes("Batch already registered")) {
            // Batch exists on-chain — update it instead
            txh = await walletClient.writeContract({
              address: CONTRACT_ADDRESS, abi: CONTRACT_ABI,
              functionName: "updateBatch",
              chain: activeChain, gas: 8_000_000n,
              args: txArgs, account,
            });
          } else {
            throw regErr;
          }
        }
      }

      setTxHash(txh);
      await publicClient.waitForTransactionReceipt({ hash: txh });

      const wqGrams = form.wholesaleUnit === "kg"
        ? parseFloat(form.wholesaleQty) * 1000
        : parseFloat(form.wholesaleQty);
      const totalStock = (wqGrams && form.jarSizeG)
        ? Math.floor(wqGrams / parseFloat(form.jarSizeG))
        : null;

      // Save display-only extras (everything core is already on the blockchain)
      await fetch("/api/admin/batch-extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId:        form.batchId,
          description:    form.description    || null,
          price:          form.price ? parseFloat(form.price) : null,
          image:          form.imageUrl        || null,
          certificateUrl: certificateUrl       || null,
          pdfName:        pdfName              || null,
          pdfHash:        pdfHash              || null,
          jarSizeG:       form.jarSizeG ? parseFloat(form.jarSizeG) : null,
          wholesaleQty:   form.wholesaleQty ? parseFloat(form.wholesaleQty) : null,
          wholesaleUnit:  form.wholesaleUnit,
          weight:         form.jarSizeG ? `${form.jarSizeG}g` : null,
        }),
      });

      // Save lab params to history for ML analytics (fire-and-forget)
      fetch("/api/admin/lab-history", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId:              form.batchId,
          coffeeType:            form.coffeeType            || null,
          origin:               form.origin               || null,
          farmerName:        form.farmerName         || null,
          harvestYear:          form.harvestYear           || null,
          zone:                 form.zone                 || null,
          altitude:             form.altitude             ? parseFloat(form.altitude)             : null,
          latitude:             form.latitude             ? parseFloat(form.latitude)             : null,
          longitude:            form.longitude            ? parseFloat(form.longitude)            : null,
          harvestMonth:         form.harvestMonth         ? parseInt(form.harvestMonth)           : null,
          crystallisation:      form.crystallisation      || null,
          productionSystem:     form.productionSystem     || null,
          // Botanical
          hde:                  form.hde                  || null,
          dominantPollen:       form.dominantPollen       || null,
          secondaryPollens:     form.secondaryPollens     || null,
          pollenConcentration:  form.pollenConcentration  || null,
          botanicalConfirmed:   form.botanicalConfirmed   || null,
          geographicConfirmed:  form.geographicConfirmed  || null,
          palynologicalNotes:   form.palynologicalNotes   || null,
          // Extended botanical
          coffeedewSpecies:      form.coffeedewSpecies      || null,
          dominantPollenPct:    form.dominantPollenPct    ? parseFloat(form.dominantPollenPct) : null,
          nectarlessSpecies:    form.nectarlessSpecies    || null,
          // Physical extra
          colourDescription:    form.colourDescription    || null,
          dpphUnit:             form.dpphUnit             || null,
          // Sensory
          appearance:           form.appearance           || null,
          aromaIntensity:       form.aromaIntensity       || null,
          aromaDescription:     form.aromaDescription     || null,
          tasteDescription:     form.tasteDescription     || null,
          sensorPersistence:    form.sensorPersistence    || null,
          organolepticDefects:  form.organolepticDefects  || null,
          texture:              form.texture              || null,
          // Lab metadata
          labName:              form.labName              || null,
          accreditation:        form.accreditation        || null,
          sampleCollectionDate: form.sampleCollectionDate || null,
          sampleReceivedDate:   form.sampleReceivedDate   || null,
          analysisDate:         form.analysisDate         || null,
          params: {
            // Standard
            hmf:              form.hmf             ? parseFloat(form.hmf)             : null,
            water:            form.humidity         ? parseFloat(form.humidity)         : null,
            diastase:         form.diastase         ? parseFloat(form.diastase)         : null,
            freeAcidity:      form.freeAcidity      ? parseFloat(form.freeAcidity)      : null,
            proline:          form.proline          ? parseFloat(form.proline)          : null,
            conductivity:     form.conductivity     ? parseFloat(form.conductivity)     : null,
            fructoseGlucose:  form.fructoseGlucose  ? parseFloat(form.fructoseGlucose)  : null,
            reducingSugars:   form.reducingSugars   ? parseFloat(form.reducingSugars)   : null,
            isotopicDiff:     form.isotopicDiff     ? parseFloat(form.isotopicDiff)     : null,
            sucrose:          form.sucrose          ? parseFloat(form.sucrose)          : null,
            ash:              form.ash              ? parseFloat(form.ash)              : null,
            colour:           form.colour           ? parseFloat(form.colour)           : null,
            ph:               form.ph               ? parseFloat(form.ph)               : null,
            // Extended biochemistry
            invertase:        form.invertase        ? parseFloat(form.invertase)        : null,
            fructose:         form.fructose         ? parseFloat(form.fructose)         : null,
            glucose:          form.glucose          ? parseFloat(form.glucose)          : null,
            fgRatio:          form.fgRatio          ? parseFloat(form.fgRatio)          : null,
            maltose:          form.maltose          ? parseFloat(form.maltose)          : null,
            waterActivity:    form.waterActivity    ? parseFloat(form.waterActivity)    : null,
            opticalRotation:  form.opticalRotation  ? parseFloat(form.opticalRotation)  : null,
            viscosity:        form.viscosity        ? parseFloat(form.viscosity)        : null,
            totalPolyphenols: form.totalPolyphenols ? parseFloat(form.totalPolyphenols) : null,
            hdeEncoded:       form.hdeEncoded       ? parseFloat(form.hdeEncoded)       : null,
            dpph:             form.dpph             ? parseFloat(form.dpph)             : null,
            // Micro
            yeastCount:       form.yeastCount       ? parseFloat(form.yeastCount)       : null,
            totalPlateCount:  form.totalPlateCount  ? parseFloat(form.totalPlateCount)  : null,
            // Contaminants
            leadPb:           form.leadPb           ? parseFloat(form.leadPb)           : null,
            cadmiumCd:        form.cadmiumCd        ? parseFloat(form.cadmiumCd)        : null,
            pesticideScreen:  form.pesticideScreen  !== "" ? parseFloat(form.pesticideScreen)  : null,
            antibioticScreen: form.antibioticScreen !== "" ? parseFloat(form.antibioticScreen) : null,
          },
        }),
      }).catch(() => { /* non-critical */ });

      setTxStatus("done");
    } catch (e: any) {
      console.error(e);
      setError(e?.message?.slice(0, 300) ?? "Transaction failed.");
      setTxStatus("error");
    }
  }

  // ─── Success screen ───────────────────────────────────────────────────────

  if (txStatus === "done") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl mx-auto mb-5" />
          <h2 className="text-xl font-bold text-slate-800 mb-1">{editMode ? "Batch updated" : "Batch registered"}</h2>
          <p className="text-slate-500 text-sm mb-3">
            <span className="font-mono font-semibold text-slate-700">{form.batchId}</span> {editMode ? "has been updated on the blockchain." : "is on the blockchain."}
          </p>
          {quality && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
              style={{ background: TIER_BG[quality.tier], color: TIER_COLOR[quality.tier], border: `1px solid ${TIER_BORDER[quality.tier]}` }}>
              {TIER_ICON[quality.tier]} {quality.tier} · {quality.score}/100
            </div>
          )}
          <p className="text-xs text-slate-400 font-mono mb-6 break-all">tx: {txHash}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push(`/verify/${form.batchId}`)}
              className="rounded-xl bg-blue-600 text-white px-5 py-2.5 font-semibold text-sm hover:bg-blue-700">
              View verify page
            </button>
            <button onClick={() => router.push("/admin")}
              className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-sm text-slate-600 hover:bg-slate-50">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main form ────────────────────────────────────────────────────────────

  const filledCount   = QUALITY_PARAMS.filter(p => (form[p.key] as string) !== "").length;
  const busy          = txStatus === "waiting" || txStatus === "mining";
  const canRegister   = !!(form.batchId && form.farmerName && quality && !busy);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-5 py-8">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-xs text-slate-400 hover:text-slate-600 mb-2 block">← Back</button>
          <h1 className="text-2xl font-bold text-slate-800">
            {editMode ? `Edit Batch — ${searchParams.get("batchId") ?? ""}` : "Register Coffee Batch"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {editMode
              ? "Correct any fields below and re-submit. The contract will update the on-chain record."
              : "Drop a lab report PDF — all fields auto-fill from the document."}
          </p>
          {editMode && (
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
              Edit mode — submitting will call <code>updateBatch</code> on the contract and overwrite the on-chain values.
            </div>
          )}
        </div>

        {/* ── PDF Drop Zone ── */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f?.type === "application/pdf") handlePdfUpload(f);
          }}
          className="rounded-2xl border-2 transition-all cursor-pointer mb-5"
          style={{
            borderStyle: "dashed",
            borderColor: dragOver ? "#2563EB" : pdfDone ? "#22C55E" : "#CBD5E1",
            background:  dragOver ? "#EFF6FF" : pdfDone ? "#F0FDF4" : "#FFFFFF",
            padding: pdfDone ? "16px 20px" : "40px 24px",
          }}
        >
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }} />

          {uploading ? (
            <div className="flex items-center gap-3 justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Parsing lab report…</p>
                <p className="text-xs text-slate-400 mt-0.5">Extracting all quality parameters with AI</p>
              </div>
            </div>
          ) : pdfDone ? (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-lg flex-shrink-0 text-green-700 font-bold text-xs">PDF</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800 text-sm truncate">{pdfName}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{pdfHash.slice(0, 42)}…</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-green-700">{filledCount}/{QUALITY_PARAMS.length} fields filled</p>
                <p className="text-xs text-slate-400 mt-0.5">Click to replace PDF</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-semibold text-slate-700">Drop lab report PDF here</p>
              <p className="text-xs text-slate-400 mt-1.5">or click to browse · AI auto-fills all quality fields</p>
            </div>
          )}
        </div>

        {/* ── Quality Score Card (shown once any field is scored) ── */}
        {quality && (
          <div className="rounded-2xl p-4 mb-5 border" style={{
            background: TIER_BG[quality.tier],
            borderColor: TIER_BORDER[quality.tier],
          }}>
            <div className="flex items-center gap-5">
              <div className="text-center flex-shrink-0">
                <div className="text-4xl font-black leading-none" style={{ color: TIER_COLOR[quality.tier] }}>
                  {quality.score}
                </div>
                <div className="text-xs text-slate-400 mt-1">/ 100</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-sm font-bold" style={{ color: TIER_COLOR[quality.tier] }}>
                    {TIER_ICON[quality.tier]} {quality.tier}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    quality.compliant
                      ? "text-green-700 bg-green-100"
                      : "text-red-700 bg-red-100"
                  }`}>
                    {quality.compliant ? "EU Compliant" : "Non-Compliant"}
                  </span>
                </div>
                {quality.flags.length > 0 ? (
                  <div className="space-y-0.5">
                    {quality.flags.slice(0, 3).map((f, i) => (
                      <p key={i} className="text-xs text-slate-600 truncate">• {f}</p>
                    ))}
                    {quality.flags.length > 3 && (
                      <p className="text-xs text-slate-400">+{quality.flags.length - 3} more issues</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">All parameters within EU Directive 2001/110/EC limits.</p>
                )}
              </div>
              {/* Mini bar chart */}
              <div className="hidden sm:flex flex-col gap-1.5 flex-shrink-0 w-32">
                {quality.breakdown.filter(p => p.tier !== "na").slice(0, 6).map(p => (
                  <div key={p.key} className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 w-14 truncate text-right">{p.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${p.score}%`,
                        background: p.tier === "fail" ? "#EF4444"
                          : p.tier === "caution" ? "#F59E0B"
                          : "#22C55E",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Two-column: Batch identity + Quality params ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Left: Batch identity */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Batch identity</h2>
            <div className="space-y-3">

              <div>
                <label className="label">Batch ID</label>
                <div className="flex gap-2">
                  <input
                    value={generating ? "Generating…" : form.batchId}
                    onChange={e => !generating && setForm(f => ({ ...f, batchId: e.target.value.toUpperCase() }))}
                    className="input font-mono flex-1 text-slate-700 text-sm font-semibold"
                    placeholder="HON-XXX-XXX-26-0001"
                  />
                  <button onClick={generateCode} disabled={generating} title="Regenerate"
                    className="px-3 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50">↻</button>
                </div>
              </div>

              <div>
                <label className="label">Producer *</label>
                <select
                  value={form.farmerName}
                  onChange={e => set("farmerName", e.target.value)}
                  className="input"
                >
                  <option value="HAV Company">HAV Company</option>
                  {producers.length > 0 && (
                    <optgroup label="Registered farmers">
                      {producers.map((p, i) => (
                        <option key={`${p.name}-${i}`} value={p.name}>{p.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Region *</label>
                  <select value={form.origin} onChange={e => set("origin", e.target.value)} className="input">
                    {REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Zone</label>
                  <select value={form.zone ?? ""} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} className="input">
                    <option value="">— Not specified</option>
                    <option>Mountain</option>
                    <option>Hilly</option>
                    <option>Valley</option>
                    <option>Plain</option>
                    <option>Coastal</option>
                    <option>Mixed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label flex items-center gap-1">
                    Latitude
                    {autoDetected.has("latitude" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
                  </label>
                  <input
                    value={form.latitude ?? ""}
                    onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                    className="input text-sm"
                    type="number" step="0.0001" placeholder="e.g. 42.2141"
                  />
                  <p className="text-xs text-slate-400 mt-0.5">Decimal degrees (WGS84)</p>
                </div>
                <div>
                  <label className="label flex items-center gap-1">
                    Longitude
                    {autoDetected.has("longitude" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
                  </label>
                  <input
                    value={form.longitude ?? ""}
                    onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                    className="input text-sm"
                    type="number" step="0.0001" placeholder="e.g. 20.7422"
                  />
                  <p className="text-xs text-slate-400 mt-0.5">Decimal degrees (WGS84)</p>
                </div>
              </div>

              <div>
                <label className="label flex items-center gap-1">
                  Altitude
                  {autoDetected.has("altitude" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
                </label>
                <div className="relative">
                  <input
                    value={form.altitude ?? ""}
                    onChange={e => setForm(f => ({ ...f, altitude: e.target.value }))}
                    className="input pr-8 text-sm"
                    type="number" step="1" placeholder="e.g. 800"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">m</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label flex items-center gap-1">
                    Coffee type *
                    {autoDetected.has("coffeeType") && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
                  </label>
                  <select value={form.coffeeType}
                    onChange={e => {
                      set("coffeeType", e.target.value);
                      setAutoDetected(a => { const n = new Set(a); n.delete("coffeeType"); return n; });
                    }}
                    className="input">
                    {COFFEE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Production system</label>
                  <select value={form.productionSystem ?? ""} onChange={e => setForm(f => ({ ...f, productionSystem: e.target.value }))} className="input">
                    <option value="">— Not specified</option>
                    <option value="organic">Organic</option>
                    <option value="conventional">Conventional</option>
                    <option value="transitional">Transitional</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label flex items-center gap-1">
                  Harvest year
                  {autoDetected.has("harvestYear") && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
                </label>
                <select value={form.harvestYear}
                  onChange={e => set("harvestYear", parseInt(e.target.value))}
                  className="input">
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Producer declaration</label>
                <textarea value={form.producerDeclaration}
                  onChange={e => set("producerDeclaration", e.target.value)}
                  className="input resize-none text-sm" rows={3}
                  placeholder="e.g. Harvested from highland meadows, no treatments applied…" />
              </div>

            </div>
          </section>

          {/* Right: Quality measurements */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
              Lab parameters
              <span className="font-normal normal-case text-slate-400">{filledCount}/{QUALITY_PARAMS.length} filled</span>
            </h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
              {QUALITY_PARAMS.map(p => {
                const val = form[p.key] as string;
                const isAuto = autoDetected.has(p.key);
                const paramResult = quality?.breakdown.find(b => b.key === p.scoreKey);
                const tier = paramResult?.tier;
                const borderColor = !val ? "#E2E8F0"
                  : tier === "fail" ? "#FCA5A5"
                  : tier === "caution" ? "#FCD34D"
                  : (tier === "exceptional" || tier === "premium" || tier === "good") ? "#86EFAC"
                  : "#E2E8F0";

                return (
                  <div key={p.key}>
                    <label className="label flex items-center gap-1">
                      {p.label}
                      {isAuto && <span className="text-blue-500 font-normal text-xs normal-case leading-none">auto</span>}
                    </label>
                    <div className="relative">
                      <input
                        value={val}
                        onChange={e => {
                          set(p.key, e.target.value);
                          if (isAuto) setAutoDetected(a => { const n2 = new Set(a); n2.delete(p.key); return n2; });
                        }}
                        className="input pr-14 text-sm"
                        style={{ borderColor, borderWidth: val ? "1.5px" : "1px" }}
                        placeholder={p.placeholder}
                        type="number"
                        step={p.step}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none whitespace-nowrap">
                        {p.unit}
                      </span>
                    </div>
                    {p.limit && <p className="text-xs text-slate-400 mt-0.5">{p.limit}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Extended Biochemistry (collapsible) ── */}
        <ExtSection title="Extended Biochemistry" hint="Invertase, sugar profile, water activity, polyphenols — not required by EU but highly informative for ML"
          defaultOpen={!!(form.ph || form.invertase || form.fructose || form.glucose || form.fgRatio || form.maltose || form.waterActivity || form.opticalRotation || form.viscosity || form.totalPolyphenols || form.dpph)}
          forceOpen={["ph","invertase","fructose","glucose","fgRatio","maltose","waterActivity","opticalRotation","viscosity","totalPolyphenols","dpph"].some(k => autoDetected.has(k as any))}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-5 pb-5">
            {[
              { key: "invertase",        label: "Invertase",           unit: "U/kg",      placeholder: "e.g. 120",   step: "1",    hint: "Degrades with heat like diastase. Min 35 U/kg = fresh." },
              { key: "fructose",         label: "Fructose",            unit: "%",         placeholder: "e.g. 38.2",  step: "0.1",  hint: "Separate from glucose. Typical 35–45%." },
              { key: "glucose",          label: "Glucose",             unit: "%",         placeholder: "e.g. 31.4",  step: "0.1",  hint: "Typical 25–38%." },
              { key: "fgRatio",          label: "F/G ratio",           unit: "",          placeholder: "e.g. 1.22",  step: "0.01", hint: ">1.14 = slow crystallisation. <1.0 = rapid." },
              { key: "maltose",          label: "Maltose",             unit: "%",         placeholder: "e.g. 3.5",   step: "0.1",  hint: "Typical 0.5–10%." },
              { key: "waterActivity",    label: "Water activity (aw)", unit: "",          placeholder: "e.g. 0.58",  step: "0.01", hint: ">0.60 = fermentation risk." },
              { key: "opticalRotation",  label: "Optical rotation",    unit: "°",         placeholder: "e.g. -8.4",  step: "0.1",  hint: "Negative = fructose-dominant. Positive = suspect adulteration." },
              { key: "viscosity",        label: "Viscosity",           unit: "mPa·s",     placeholder: "e.g. 8200",  step: "100",  hint: "Higher = thicker coffee. Water content dependent." },
              { key: "totalPolyphenols", label: "Total polyphenols",   unit: "mg GAE/100g", placeholder: "e.g. 62", step: "0.1",  hint: "Antioxidant capacity. Darker coffees typically higher." },
              { key: "dpph",            label: "DPPH antioxidant",    unit: "mg/100g",    placeholder: "e.g. 45.2", step: "0.1",  hint: "Radical scavenging activity. Set unit below (TE/AAE/FRAP). Correlated with TPC and colour." },
              { key: "ph",              label: "pH",                  unit: "",          placeholder: "e.g. 3.9",   step: "0.01", hint: "Genuine range: 3.5–5.5." },
            ].map(f => {
              const isAuto = autoDetected.has(f.key as any);
              return (
                <div key={f.key}>
                  <label className="label flex items-center gap-1">
                    {f.label}
                    {isAuto && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
                  </label>
                  <div className="relative">
                    <input
                      value={(form as any)[f.key] ?? ""}
                      onChange={e => {
                        setForm(frm => ({ ...frm, [f.key]: e.target.value }));
                        if (isAuto) setAutoDetected(a => { const n = new Set(a); n.delete(f.key as any); return n; });
                      }}
                      className="input pr-12 text-sm"
                      style={isAuto ? { borderColor: "#60A5FA", borderWidth: "1.5px" } : {}}
                      placeholder={f.placeholder}
                      type="number"
                      step={f.step}
                    />
                    {f.unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none whitespace-nowrap">{f.unit}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{f.hint}</p>
                </div>
              );
            })}

            {/* Colour description + DPPH unit — span 2 cols each */}
            <div>
              <label className="label">Colour category</label>
              <select value={form.colourDescription ?? ""} onChange={e => setForm(f => ({ ...f, colourDescription: e.target.value }))} className="input text-sm">
                <option value="">— Not specified</option>
                <option>Water White</option>
                <option>Extra White</option>
                <option>White</option>
                <option>Extra Light Amber</option>
                <option>Light Amber</option>
                <option>Amber</option>
                <option>Dark Amber</option>
              </select>
              <p className="text-xs text-slate-400 mt-0.5">EU Pfund scale category. Used in type validation.</p>
            </div>
            <div>
              <label className="label">DPPH unit</label>
              <select value={form.dpphUnit ?? ""} onChange={e => setForm(f => ({ ...f, dpphUnit: e.target.value }))} className="input text-sm">
                <option value="">— Not specified</option>
                <option value="TE">mg TE/100g (Trolox equiv.)</option>
                <option value="AAE">mg AAE/100g (Ascorbic acid equiv.)</option>
                <option value="FRAP">mmol FRAP/100g</option>
                <option value="other">Other</option>
              </select>
              <p className="text-xs text-slate-400 mt-0.5">Labs use different reference compounds. Affects cross-lab comparison.</p>
            </div>
          </div>
        </ExtSection>

        {/* ── Botanical & Pollen (collapsible) ── */}
        <ExtSection title="Botanical & Pollen Analysis" hint="From melissopalynological report. Unlocks geographic origin verification and type authentication in ML."
          defaultOpen={!!(form.hde || form.dominantPollen || form.secondaryPollens || form.botanicalConfirmed || form.geographicConfirmed || form.palynologicalNotes)}
          forceOpen={["hde","dominantPollen","secondaryPollens","botanicalConfirmed","geographicConfirmed","palynologicalNotes","dominantPollenPct","nectarlessSpecies"].some(k => autoDetected.has(k as any))}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 pb-5">

            {/* Row 1: Dominant Pollen + Dominant Pollen % */}
            <div>
              <label className="label">Dominant Pollen</label>
              <input value={form.dominantPollen ?? ""} onChange={e => setForm(f => ({ ...f, dominantPollen: e.target.value }))} className={`input text-sm${autoDetected.has("dominantPollen") ? " ring-2 ring-blue-300" : ""}`} placeholder="e.g. Trifolium pratense" />
            </div>
            <div>
              <label className="label">Dominant Pollen (%)</label>
              <div className="relative">
                <input value={form.dominantPollenPct ?? ""} onChange={e => setForm(f => ({ ...f, dominantPollenPct: e.target.value }))} className={`input pr-8 text-sm${autoDetected.has("dominantPollenPct") ? " ring-2 ring-blue-300" : ""}`} type="number" step="0.1" placeholder="e.g. 48.5" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Monofloral threshold typically ≥45%.</p>
            </div>

            {/* Row 2: Secondary Pollens (full width) */}
            <div className="sm:col-span-2">
              <label className="label">Secondary Pollens</label>
              <input value={form.secondaryPollens ?? ""} onChange={e => setForm(f => ({ ...f, secondaryPollens: e.target.value }))} className={`input text-sm${autoDetected.has("secondaryPollens") ? " ring-2 ring-blue-300" : ""}`} placeholder="e.g. Thymus, Lotus, Centaurea" />
            </div>

            {/* Row 3: HDE + Nectarless Species */}
            <div>
              <label className="label">Coffeedew Elements (HDE)</label>
              <select
                value={form.hde ?? ""}
                onChange={e => {
                  const hde = e.target.value;
                  const enc = hde === "None" ? 0 : hde === "Few" ? 1 : hde === "Moderate" ? 2 : hde === "Many" ? 3 : null;
                  setForm(f => ({ ...f, hde, hdeEncoded: enc != null ? String(enc) : "" }));
                }}
                className={`input${autoDetected.has("hde") ? " ring-2 ring-blue-300" : ""}`}
              >
                <option value="">— Not tested</option>
                <option>None</option>
                <option>Few</option>
                <option>Moderate</option>
                <option>Many</option>
              </select>
            </div>
            <div>
              <label className="label">Nectarless Species</label>
              <input value={form.nectarlessSpecies ?? ""} onChange={e => setForm(f => ({ ...f, nectarlessSpecies: e.target.value }))} className={`input text-sm${autoDetected.has("nectarlessSpecies") ? " ring-2 ring-blue-300" : ""}`} placeholder="e.g. Pinus, Cerealia" />
            </div>

            {/* Row 4: Botanical Origin Confirmed + Geographic Origin Confirmed */}
            <div>
              <label className="label">Botanical Origin Confirmed</label>
              <select value={form.botanicalConfirmed ?? ""} onChange={e => setForm(f => ({ ...f, botanicalConfirmed: e.target.value }))} className="input">
                <option value="">— Not assessed</option>
                <option>Confirmed</option>
                <option>Partially confirmed</option>
                <option>Not confirmed</option>
              </select>
            </div>
            <div>
              <label className="label">Geographic Origin Confirmed</label>
              <select value={form.geographicConfirmed ?? ""} onChange={e => setForm(f => ({ ...f, geographicConfirmed: e.target.value }))} className="input">
                <option value="">— Not assessed</option>
                <option>Confirmed</option>
                <option>Partially confirmed</option>
                <option>Not confirmed</option>
              </select>
            </div>

            {/* Row 5: Comments (full width) */}
            <div className="sm:col-span-2">
              <label className="label">Comments</label>
              <textarea value={form.palynologicalNotes ?? ""} onChange={e => setForm(f => ({ ...f, palynologicalNotes: e.target.value }))} className="input text-sm" rows={2} placeholder="Any additional notes from the palynological report." />
            </div>

          </div>
        </ExtSection>

        {/* ── Microbiological (collapsible) ── */}
        <ExtSection title="Microbiological & Contaminants" hint="Not in EU standard coffee analysis but critical for safety and ML anomaly detection."
          defaultOpen={!!(form.yeastCount || form.totalPlateCount || form.leadPb || form.cadmiumCd || form.pesticideScreen || form.antibioticScreen)}
          forceOpen={["yeastCount","totalPlateCount","leadPb","cadmiumCd","pesticideScreen","antibioticScreen"].some(k => autoDetected.has(k as any))}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-5 pb-5">
            <div>
              <label className="label">Yeast count</label>
              <input value={form.yeastCount ?? ""} onChange={e => setForm(f => ({ ...f, yeastCount: e.target.value }))} className="input text-sm" type="number" step="0.1" placeholder="e.g. 1.8" />
              <p className="text-xs text-slate-400 mt-0.5">log₁₀ CFU/g. &gt;2.7 = fermentation risk.</p>
            </div>
            <div>
              <label className="label">Total plate count</label>
              <input value={form.totalPlateCount ?? ""} onChange={e => setForm(f => ({ ...f, totalPlateCount: e.target.value }))} className="input text-sm" type="number" step="0.1" placeholder="e.g. 2.4" />
              <p className="text-xs text-slate-400 mt-0.5">log₁₀ CFU/g.</p>
            </div>
            <div>
              <label className="label">Lead (Pb)</label>
              <input value={form.leadPb ?? ""} onChange={e => setForm(f => ({ ...f, leadPb: e.target.value }))} className="input text-sm" type="number" step="0.001" placeholder="e.g. 0.02" />
              <p className="text-xs text-slate-400 mt-0.5">mg/kg. EU max 0.10.</p>
            </div>
            <div>
              <label className="label">Cadmium (Cd)</label>
              <input value={form.cadmiumCd ?? ""} onChange={e => setForm(f => ({ ...f, cadmiumCd: e.target.value }))} className="input text-sm" type="number" step="0.001" placeholder="e.g. 0.004" />
              <p className="text-xs text-slate-400 mt-0.5">mg/kg. EU max 0.050.</p>
            </div>
            <div>
              <label className="label">Pesticide screening</label>
              <select value={form.pesticideScreen ?? ""} onChange={e => setForm(f => ({ ...f, pesticideScreen: e.target.value }))} className="input">
                <option value="">— Not tested</option>
                <option value="1">Pass</option>
                <option value="0">Fail</option>
              </select>
            </div>
            <div>
              <label className="label">Antibiotic screening</label>
              <select value={form.antibioticScreen ?? ""} onChange={e => setForm(f => ({ ...f, antibioticScreen: e.target.value }))} className="input">
                <option value="">— Not tested</option>
                <option value="1">Pass</option>
                <option value="0">Fail</option>
              </select>
            </div>
          </div>
        </ExtSection>

        {/* ── Sensory Analysis (collapsible) ── */}
        <ExtSection title="Sensory Analysis" hint="Appearance, aroma, taste and organoleptic defects from ISO-accredited lab sensory evaluation. Cross-validated with physicochemical results by the ML."
          defaultOpen={!!(form.appearance || form.aromaIntensity || form.aromaDescription || form.tasteDescription || form.sensorPersistence || form.organolepticDefects || form.texture || form.crystallisation)}
          forceOpen={["appearance","aromaIntensity","aromaDescription","tasteDescription","sensorPersistence","organolepticDefects"].some(k => autoDetected.has(k as any))}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-5 pb-5">
            <div>
              <label className="label flex items-center gap-1">
                Appearance
                {autoDetected.has("appearance" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
              </label>
              <select value={form.appearance ?? ""} onChange={e => setForm(f => ({ ...f, appearance: e.target.value }))} className="input">
                <option value="">— Not assessed</option>
                <option>Clear</option>
                <option>Very Clear</option>
                <option>Cloudy</option>
                <option>Opaque</option>
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1">
                Aroma Intensity
                {autoDetected.has("aromaIntensity" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
              </label>
              <select value={form.aromaIntensity ?? ""} onChange={e => setForm(f => ({ ...f, aromaIntensity: e.target.value }))} className="input">
                <option value="">— Not assessed</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1">
                Persistence
                {autoDetected.has("sensorPersistence" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
              </label>
              <select value={form.sensorPersistence ?? ""} onChange={e => setForm(f => ({ ...f, sensorPersistence: e.target.value }))} className="input">
                <option value="">— Not assessed</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <p className="text-xs text-slate-400 mt-0.5">Aftertaste duration. High = premium indicator for mountain coffees.</p>
            </div>
            <div>
              <label className="label">Texture / Consistency</label>
              <select value={form.texture ?? ""} onChange={e => setForm(f => ({ ...f, texture: e.target.value }))} className="input">
                <option value="">— Not assessed</option>
                <option>Liquid</option>
                <option>Semi-liquid</option>
                <option>Creamy</option>
                <option>Granular</option>
                <option>Solid</option>
              </select>
            </div>
            <div>
              <label className="label">Crystallization</label>
              <select value={form.crystallisation ?? ""} onChange={e => setForm(f => ({ ...f, crystallisation: e.target.value }))} className="input">
                <option value="">— Not assessed</option>
                <option>None</option>
                <option>Partial</option>
                <option>Total — fine grain</option>
                <option>Total — coarse grain</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="label flex items-center gap-1">
                Aroma Description
                {autoDetected.has("aromaDescription" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
              </label>
              <input value={form.aromaDescription ?? ""} onChange={e => setForm(f => ({ ...f, aromaDescription: e.target.value }))} className="input text-sm" placeholder="e.g. Woody, resinous with subtle herbal notes" />
            </div>
            <div className="sm:col-span-3">
              <label className="label flex items-center gap-1">
                Taste Description
                {autoDetected.has("tasteDescription" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
              </label>
              <input value={form.tasteDescription ?? ""} onChange={e => setForm(f => ({ ...f, tasteDescription: e.target.value }))} className="input text-sm" placeholder="e.g. Rich, moderately sweet with malty and slightly resinous characteristics" />
            </div>
            <div className="sm:col-span-3">
              <label className="label flex items-center gap-1">
                Organoleptic Defects
                {autoDetected.has("organolepticDefects" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
              </label>
              <input value={form.organolepticDefects ?? ""} onChange={e => setForm(f => ({ ...f, organolepticDefects: e.target.value }))} className="input text-sm"
                style={form.organolepticDefects && !/^none/i.test(form.organolepticDefects.trim()) ? { borderColor: '#FCA5A5', borderWidth: '1.5px' } : {}}
                placeholder="None detected" />
              <p className="text-xs text-slate-400 mt-0.5">Any fermentation, off-flavour, or contamination detected. "None detected" = clean. Defects trigger an ML anomaly flag.</p>
            </div>
          </div>
        </ExtSection>

        {/* ── Lab Metadata (collapsible) ── */}
        <ExtSection title="Lab Metadata & Provenance" hint="Laboratory name, accreditation, and sample timeline. Used for data reliability scoring and traceability."
          defaultOpen={!!(form.labName || form.accreditation || form.sampleCollectionDate || form.analysisDate)}
          forceOpen={["labName","accreditation","sampleCollectionDate","analysisDate"].some(k => autoDetected.has(k as any))}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-5 pb-5">
            <div>
              <label className="label flex items-center gap-1">
                Laboratory name
                {autoDetected.has("labName" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
              </label>
              <input value={form.labName ?? ""} onChange={e => setForm(f => ({ ...f, labName: e.target.value }))} className="input text-sm" placeholder="e.g. HAV Food Quality Lab" />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                Accreditation
                {autoDetected.has("accreditation" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
              </label>
              <select value={form.accreditation ?? ""} onChange={e => setForm(f => ({ ...f, accreditation: e.target.value }))} className="input">
                <option value="">— Not specified</option>
                <option value="ISO 17025">ISO 17025</option>
                <option value="ISO 17025 + IQNET">ISO 17025 + IQNET</option>
                <option value="GLP">GLP</option>
                <option value="other">Other accreditation</option>
                <option value="none">No accreditation</option>
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1">
                Sample collection date
                {autoDetected.has("sampleCollectionDate" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
              </label>
              <input value={form.sampleCollectionDate ?? ""} onChange={e => setForm(f => ({ ...f, sampleCollectionDate: e.target.value }))} className="input text-sm" type="date" />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                Sample received date
                {autoDetected.has("sampleReceivedDate" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
              </label>
              <input value={form.sampleReceivedDate ?? ""} onChange={e => setForm(f => ({ ...f, sampleReceivedDate: e.target.value }))} className="input text-sm" type="date" />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                Analysis date
                {autoDetected.has("analysisDate" as any) && <span className="text-blue-500 font-normal text-xs normal-case">auto</span>}
              </label>
              <input value={form.analysisDate ?? ""} onChange={e => setForm(f => ({ ...f, analysisDate: e.target.value }))} className="input text-sm" type="date" />
              <p className="text-xs text-slate-400 mt-0.5">Gap from collection date = pre-analysis storage time.</p>
            </div>
          </div>
        </ExtSection>

        {/* ── Marketplace listing (collapsible) ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 overflow-hidden">
          <button
            onClick={() => setShowMarketplace(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
          >
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Marketplace listing</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Optional</span>
              <span className="text-slate-400 text-xs">{showMarketplace ? "▲" : "▼"}</span>
            </div>
          </button>
          {showMarketplace && (
            <div className="px-5 pb-5 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Price (€)</label>
                  <input value={form.price} onChange={e => set("price", e.target.value)}
                    className="input" placeholder="e.g. 12.50" type="number" step="0.01" />
                </div>
                <div>
                  <label className="label">Wholesale quantity</label>
                  <div className="flex gap-2">
                    <input value={form.wholesaleQty} onChange={e => set("wholesaleQty", e.target.value)}
                      className="input" placeholder="e.g. 20" type="number" step="0.1"
                      style={{ flex: 2 }} />
                    <select value={form.wholesaleUnit} onChange={e => set("wholesaleUnit", e.target.value)}
                      className="input" style={{ flex: 1 }}>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Jar size</label>
                  <select value={form.jarSizeG} onChange={e => set("jarSizeG", e.target.value)} className="input">
                    <option value="250">250g</option>
                    <option value="500">500g</option>
                    <option value="1000">1 kg</option>
                    <option value="1500">1.5 kg</option>
                    <option value="2000">2 kg</option>
                  </select>
                </div>
                {form.wholesaleQty && form.jarSizeG && (() => {
                  const wqG = form.wholesaleUnit === "kg"
                    ? parseFloat(form.wholesaleQty) * 1000
                    : parseFloat(form.wholesaleQty);
                  const jars = Math.floor(wqG / parseFloat(form.jarSizeG));
                  return jars > 0 ? (
                    <div className="flex items-end pb-1">
                      <p className="text-sm font-semibold text-green-700">= {jars} jars of {form.jarSizeG}g</p>
                    </div>
                  ) : null;
                })()}
                <div className="col-span-2">
                  <label className="label">Description</label>
                  <textarea value={form.description} onChange={e => set("description", e.target.value)}
                    className="input resize-none text-sm" rows={3}
                    placeholder="Public-facing product description for marketplace…" />
                </div>

              </div>
            </div>
          )}
        </section>

        {/* ── Product photo ── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Product photo</h2>
          <p className="text-xs text-slate-400 mb-4">Shown on marketplace cards. JPG, PNG or WebP — max 8 MB.</p>
          <div className="flex gap-5 items-start">
            {/* Preview box */}
            <div
              onClick={() => imgRef.current?.click()}
              className="flex-shrink-0 cursor-pointer rounded-xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-yellow-400 transition-colors"
              style={{ width: 130, height: 130, background: "#FAFAFA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {(imgPreview || form.imageUrl) ? (
                <img src={imgPreview || form.imageUrl} alt="Product" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <p style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", lineHeight: 1.4 }}>Click to<br/>upload photo</p>
                </>
              )}
            </div>
            {/* Controls */}
            <div className="flex flex-col gap-2 justify-center" style={{ paddingTop: 8 }}>
              <input
                ref={imgRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
              />
              <button
                type="button"
                onClick={() => imgRef.current?.click()}
                disabled={imgUploading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {imgUploading ? "Uploading…" : form.imageUrl ? "Change photo" : "Choose photo"}
              </button>
              {form.imageUrl && !imgUploading && (
                <button
                  type="button"
                  onClick={() => { set("imageUrl", ""); setImgPreview(null); if (imgRef.current) imgRef.current.value = ""; }}
                  className="rounded-xl border border-red-100 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
              {form.imageUrl && !imgUploading && (
                <p className="text-xs text-green-600 font-medium">Photo ready</p>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">{error}</div>
        )}

        {quality?.tier === "Non-Compliant" && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-4">
            Warning: <strong>EU compliance check failed.</strong> You can still register this batch — it will go to pending admin review and will not appear on the marketplace until approved. Non-compliant batches also help train the ML quality model.
          </div>
        )}

        {/* ── Submit button ── */}
        <button
          onClick={handleSubmit}
          disabled={!canRegister}
          className="w-full rounded-2xl py-4 font-bold text-white text-base transition-all"
          style={{
            background: quality?.tier === "Non-Compliant" ? "#B45309"
              : quality?.tier === "Exceptional" ? "#166534"
              : quality?.tier === "Premium" ? "#1D4ED8"
              : !canRegister ? "#CBD5E1"
              : "#15803D",
            cursor: canRegister ? "pointer" : "not-allowed",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy && txStatus === "waiting" ? "Waiting for MetaMask…"
            : busy && txStatus === "mining" ? "Mining transaction…"
            : quality?.tier === "Non-Compliant" ? "Register for Review (Non-Compliant)"
            : quality ? `Register on Blockchain · ${quality.tier} ${quality.score}/100`
            : "Register Batch on Blockchain"}
        </button>

        <p className="text-center text-xs text-slate-400 py-5">
          Batch goes to pending approval before appearing on the marketplace.
        </p>
      </div>

      <style>{`
        .label {
          display: flex; align-items: center; gap: 4px;
          font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: #94A3B8; margin-bottom: 4px;
        }
        .input {
          width: 100%; border: 1px solid #E2E8F0; border-radius: 10px;
          padding: 9px 12px; font-size: 0.875rem; outline: none; background: white;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input:focus {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        select.input { cursor: pointer; }
      `}</style>
    </div>
  );
}
