"use client";
// app/farmer/register-batch/page.tsx — PDF-first batch registration for farmers

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { scoreCoffee, TIER_COLOR, TIER_BG, TIER_BORDER, type LabParams, type QualityResult } from "@/lib/coffeeQuality";

// ─── Types ────────────────────────────────────────────────────────────────────

type BatchForm = {
  batchId: string;
  farmerName: string;
  origin: string;
  coffeeType: string;
  harvestYear: number;
  producerDeclaration: string;
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
  price: string;
  wholesaleQty: string;
  wholesaleUnit: string;
  jarSizeG: string;
  description: string;
  imageUrl: string;
};

const EMPTY_FORM: BatchForm = {
  batchId: "", farmerName: "", origin: "Prizren", coffeeType: "Multifloral",
  harvestYear: new Date().getFullYear(), producerDeclaration: "",
  humidity: "", hmf: "", colour: "", diastase: "", freeAcidity: "",
  proline: "", conductivity: "", fructoseGlucose: "", reducingSugars: "",
  sucrose: "", ash: "", isotopicDiff: "",
  price: "", wholesaleQty: "", wholesaleUnit: "kg", jarSizeG: "500", description: "", imageUrl: "",
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
  { key: "humidity",        scoreKey: "water",           label: "Water Content",   unit: "%",        placeholder: "e.g. 17.2", step: "0.1",  limit: "max 20%" },
  { key: "hmf",             scoreKey: "hmf",             label: "HMF",             unit: "mg/kg",    placeholder: "e.g. 12.5", step: "0.1",  limit: "max 40" },
  { key: "diastase",        scoreKey: "diastase",        label: "Diastase",        unit: "DN",       placeholder: "e.g. 14.5", step: "0.1",  limit: "min 8" },
  { key: "freeAcidity",     scoreKey: "freeAcidity",     label: "Free Acidity",    unit: "meq/kg",   placeholder: "e.g. 22.4", step: "0.1",  limit: "max 50" },
  { key: "proline",         scoreKey: "proline",         label: "Proline",         unit: "mg/kg",    placeholder: "e.g. 420",  step: "1",    limit: "min 300" },
  { key: "conductivity",    scoreKey: "conductivity",    label: "Conductivity",    unit: "mS/cm",    placeholder: "e.g. 0.32", step: "0.01", limit: "max 0.8" },
  { key: "fructoseGlucose", scoreKey: "fructoseGlucose", label: "F + G",           unit: "%",        placeholder: "e.g. 68.4", step: "0.1",  limit: "min 60%" },
  { key: "reducingSugars",  scoreKey: "reducingSugars",  label: "Reducing Sugars", unit: "%",        placeholder: "e.g. 71.2", step: "0.1",  limit: "min 60%" },
  { key: "sucrose",         scoreKey: "purity",          label: "Sucrose",         unit: "%",        placeholder: "e.g. 1.3",  step: "0.1",  limit: "max 5%" },
  { key: "ash",             scoreKey: "ash",             label: "Ash",             unit: "%",        placeholder: "e.g. 0.18", step: "0.01", limit: "max 0.6%" },
  { key: "isotopicDiff",    scoreKey: "isotopicDiff",    label: "δ¹³C Diff",       unit: "‰",        placeholder: "e.g. 0.3",  step: "0.01", limit: "max 1.0‰" },
  { key: "colour",          scoreKey: "",                label: "Colour",          unit: "mm Pfund", placeholder: "e.g. 45",   step: "1" },
];

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function FarmerRegisterBatchPage() {
  const router = useRouter();

  const [form, setForm]             = useState<BatchForm>(EMPTY_FORM);
  const [pdfHash, setPdfHash]       = useState("");
  const [pdfName, setPdfName]       = useState("");
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [pdfDone, setPdfDone]       = useState(false);
  const [autoDetected, setAutoDetected] = useState<Set<keyof BatchForm>>(new Set());
  const [quality, setQuality]       = useState<QualityResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState("");
  const [dragOver, setDragOver]     = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef  = useRef<HTMLInputElement>(null);

  // Load farmer name from session
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then((data: any) => {
        const name = data?.user?.name ?? data?.name;
        if (name) setForm(f => ({ ...f, farmerName: name }));
      })
      .catch(() => {});
  }, []);

  // Re-score whenever quality fields change
  useEffect(() => {
    const params = buildLabParams(form);
    const hasAny = Object.entries(params).some(([k, v]) => k !== "coffeeType" && v !== null);
    setQuality(hasAny ? scoreCoffee(params) : null);
  }, [
    form.humidity, form.hmf, form.diastase, form.freeAcidity, form.proline,
    form.conductivity, form.fructoseGlucose, form.reducingSugars, form.sucrose,
    form.ash, form.isotopicDiff, form.coffeeType,
  ]);

  // Re-generate batch code when origin / type / year change
  useEffect(() => {
    if (!form.origin || !form.coffeeType) return;
    generateCode();
  }, [form.origin, form.coffeeType, form.harvestYear]);

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

        if (data.humidity != null) fill("humidity", toDisplay(data.humidity));
        if (data.hmf      != null) fill("hmf",      toDisplay(data.hmf));
        if (data.colour   != null) fill("colour",   String(data.colour));

        fill("diastase",        data.diastase);
        fill("freeAcidity",     data.freeAcidity);
        fill("proline",         data.proline);
        fill("conductivity",    data.conductivity);
        fill("fructoseGlucose", data.fructoseGlucose);
        fill("reducingSugars",  data.reducingSugars);
        fill("sucrose",         data.sucrose);
        fill("ash",             data.ash);
        fill("isotopicDiff",    data.isotopicDiff);

        if (data.coffeeType) {
          const match = COFFEE_TYPES.find(t => t.toLowerCase() === data.coffeeType.toLowerCase());
          if (match) { next.coffeeType = match; detected.add("coffeeType"); }
        }
        if (data.harvestYear) { next.harvestYear = data.harvestYear; detected.add("harvestYear"); }

        return next;
      });

      setAutoDetected(detected);
      setPdfDone(true);

    } catch {
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
      const res  = await fetch("/api/farmer/upload-batch-photo", { method: "POST", body: fd });
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
      setError("Fill all required fields before submitting.");
      return;
    }
    if (quality?.tier === "Non-Compliant") {
      setError("Cannot submit — batch fails EU compliance limits.");
      return;
    }

    setSubmitting(true);
    try {
      const wqGrams = form.wholesaleUnit === "kg"
        ? parseFloat(form.wholesaleQty || "0") * 1000
        : parseFloat(form.wholesaleQty || "0");
      const totalStock = (wqGrams && form.jarSizeG)
        ? Math.floor(wqGrams / parseFloat(form.jarSizeG))
        : null;

      const res = await fetch("/api/farmer/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId:             form.batchId,
          farmerName:       form.farmerName,
          origin:              form.origin,
          coffeeType:           form.coffeeType,
          harvestYear:         form.harvestYear,
          producerDeclaration: form.producerDeclaration || null,
          pdfHash:             pdfHash || null,
          pdfName:             pdfName || null,
          certificateUrl:      certificateUrl || null,
          humidity:        form.humidity        ? parseFloat(form.humidity)        : null,
          hmf:             form.hmf             ? parseFloat(form.hmf)             : null,
          colour:          form.colour          ? parseFloat(form.colour)          : null,
          diastase:        form.diastase        ? parseFloat(form.diastase)        : null,
          freeAcidity:     form.freeAcidity     ? parseFloat(form.freeAcidity)     : null,
          proline:         form.proline         ? parseFloat(form.proline)         : null,
          conductivity:    form.conductivity    ? parseFloat(form.conductivity)    : null,
          fructoseGlucose: form.fructoseGlucose ? parseFloat(form.fructoseGlucose) : null,
          reducingSugars:  form.reducingSugars  ? parseFloat(form.reducingSugars)  : null,
          sucrose:         form.sucrose         ? parseFloat(form.sucrose)         : null,
          ash:             form.ash             ? parseFloat(form.ash)             : null,
          isotopicDiff:    form.isotopicDiff    ? parseFloat(form.isotopicDiff)    : null,
          qualityScore:    quality?.score  ?? null,
          qualityTier:     quality?.tier   ?? null,
          qualityStatus:   quality ? (quality.compliant ? "Passed" : "Failed") : "Unknown",
          price:           form.price       ? parseFloat(form.price)        : null,
          wholesaleQty:    form.wholesaleQty ? parseFloat(form.wholesaleQty) : null,
          wholesaleUnit:   form.wholesaleUnit,
          jarSizeG:        form.jarSizeG    ? parseFloat(form.jarSizeG)      : null,
          totalStock,
          weight:          form.jarSizeG    ? `${form.jarSizeG}g`            : null,
          description:     form.description || null,
          image:           form.imageUrl    || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit batch.");
        setSubmitting(false);
        return;
      }

      // Save lab params to history for analytics (fire-and-forget)
      fetch("/api/admin/lab-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId:   form.batchId,
          coffeeType: form.coffeeType || null,
          origin:    form.origin    || null,
          params: {
            hmf:             form.hmf             ? parseFloat(form.hmf)             : null,
            water:           form.humidity         ? parseFloat(form.humidity)         : null,
            diastase:        form.diastase         ? parseFloat(form.diastase)         : null,
            freeAcidity:     form.freeAcidity      ? parseFloat(form.freeAcidity)      : null,
            proline:         form.proline          ? parseFloat(form.proline)          : null,
            conductivity:    form.conductivity     ? parseFloat(form.conductivity)     : null,
            fructoseGlucose: form.fructoseGlucose  ? parseFloat(form.fructoseGlucose)  : null,
            reducingSugars:  form.reducingSugars   ? parseFloat(form.reducingSugars)   : null,
            isotopicDiff:    form.isotopicDiff     ? parseFloat(form.isotopicDiff)     : null,
            sucrose:         form.sucrose          ? parseFloat(form.sucrose)          : null,
            ash:             form.ash              ? parseFloat(form.ash)              : null,
            colour:          form.colour           ? parseFloat(form.colour)           : null,
          },
        }),
      }).catch(() => {});

      setDone(true);
    } catch (e: any) {
      setError(e?.message?.slice(0, 300) ?? "Submission failed.");
      setSubmitting(false);
    }
  }

  // ─── Success screen ────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center text-2xl mx-auto mb-5"></div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Batch submitted!</h2>
          <p className="text-slate-500 text-sm mb-3">
            <span className="font-mono font-semibold text-slate-700">{form.batchId}</span> is pending admin review.
          </p>
          {quality && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
              style={{ background: TIER_BG[quality.tier], color: TIER_COLOR[quality.tier], border: `1px solid ${TIER_BORDER[quality.tier]}` }}>
              {TIER_ICON[quality.tier]} {quality.tier} · {quality.score}/100
            </div>
          )}
          <p className="text-xs text-slate-400 mb-6">You'll be notified once it's approved and appears on the marketplace.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push("/farmer")}
              className="rounded-xl px-5 py-2.5 font-bold text-sm text-black"
              style={{ background: "#EAB307" }}>
              Dashboard
            </button>
            <button onClick={() => {
              setDone(false); setForm(EMPTY_FORM); setPdfHash(""); setPdfName("");
              setPdfDone(false); setQuality(null); setImgPreview(null);
            }}
              className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-sm text-slate-600 hover:bg-slate-50">
              Register another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main form ─────────────────────────────────────────────────────────────

  const filledCount = QUALITY_PARAMS.filter(p => (form[p.key] as string) !== "").length;
  const canSubmit   = !!(form.batchId && form.farmerName && quality?.tier !== "Non-Compliant" && !submitting);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-5 py-8">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-xs text-slate-400 hover:text-slate-600 mb-2 block">← Back</button>
          <h1 className="text-2xl font-bold text-slate-800">Register Coffee Batch</h1>
          <p className="text-slate-500 text-sm mt-1">Drop a lab report PDF — all fields auto-fill from the document.</p>
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
            borderColor: dragOver ? "#EAB307" : pdfDone ? "#22C55E" : "#CBD5E1",
            background:  dragOver ? "#FFFBEB" : pdfDone ? "#F0FDF4" : "#FFFFFF",
            padding: pdfDone ? "16px 20px" : "40px 24px",
          }}
        >
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }} />

          {uploading ? (
            <div className="flex items-center gap-3 justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-200 border-t-yellow-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Parsing lab report…</p>
                <p className="text-xs text-slate-400 mt-0.5">Extracting all quality parameters with AI</p>
              </div>
            </div>
          ) : pdfDone ? (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-lg flex-shrink-0">PDF</div>
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
              <div className="text-4xl mb-3"></div>
              <p className="font-semibold text-slate-700">Drop lab report PDF here</p>
              <p className="text-xs text-slate-400 mt-1.5">or click to browse · AI auto-fills all quality fields</p>
            </div>
          )}
        </div>

        {/* ── Quality Score Card ── */}
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
                  <input value={generating ? "Generating…" : form.batchId} readOnly
                    className="input font-mono bg-slate-50 flex-1 text-slate-700 text-sm font-semibold" />
                  <button onClick={generateCode} disabled={generating} title="Regenerate"
                    className="px-3 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50">↻</button>
                </div>
              </div>

              <div>
                <label className="label">Producer</label>
                <input value={form.farmerName} readOnly
                  className="input bg-slate-50 text-slate-700 font-semibold" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Region *</label>
                  <select value={form.origin} onChange={e => set("origin", e.target.value)} className="input">
                    {REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label flex items-center gap-1">
                    Coffee type *
                    {autoDetected.has("coffeeType") && <span className="text-yellow-600 font-normal text-xs normal-case">auto</span>}
                  </label>
                  <select value={form.coffeeType}
                    onChange={e => {
                      set("coffeeType", e.target.value);
                      setAutoDetected(a => { const nd = new Set(a); nd.delete("coffeeType"); return nd; });
                    }}
                    className="input">
                    {COFFEE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label flex items-center gap-1">
                  Harvest year
                  {autoDetected.has("harvestYear") && <span className="text-yellow-600 font-normal text-xs normal-case">auto</span>}
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
                      {isAuto && <span className="text-yellow-600 font-normal text-xs normal-case leading-none">auto</span>}
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
            <div
              onClick={() => imgRef.current?.click()}
              className="flex-shrink-0 cursor-pointer rounded-xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-yellow-400 transition-colors"
              style={{ width: 130, height: 130, background: "#FAFAFA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {(imgPreview || form.imageUrl) ? (
                <img src={imgPreview || form.imageUrl} alt="Product" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <div style={{ fontSize: "2rem" }}></div>
                  <p style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", lineHeight: 1.4 }}>Click to<br/>upload photo</p>
                </>
              )}
            </div>
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

        {/* ── Submit button ── */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-2xl py-4 font-bold text-base transition-all"
          style={{
            background: (!canSubmit || quality?.tier === "Non-Compliant") ? "#CBD5E1" : "#EAB307",
            color: (!canSubmit || quality?.tier === "Non-Compliant") ? "#94A3B8" : "#000",
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Submitting…"
            : quality?.tier === "Non-Compliant" ? "Cannot submit — EU compliance failed"
            : quality ? `Submit for review · ${quality.tier} ${quality.score}/100`
            : "Submit Batch for Admin Review"}
        </button>

        <p className="text-center text-xs text-slate-400 py-5">
          Your batch will be reviewed by an admin before appearing on the marketplace.
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
          border-color: #EAB307 !important;
          box-shadow: 0 0 0 3px rgba(234,179,7,0.15);
        }
        select.input { cursor: pointer; }
      `}</style>
    </div>
  );
}
