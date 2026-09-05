"use client";

import { useRef, useState } from "react";
import QualityBadge from "@/components/QualityBadge";

type ParsedLabResult = {
  name: string;
  origin: string | null;
  labRef: string | null;
  humidity: number | null;
  hmf: number | null;
  colour: number | null;
  pdfHash: string;
};

type LabReportUploadProps = {
  onResultAction?: (result: ParsedLabResult) => void;
};

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text +=
      content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ") + "\n";
  }
  return text;
}

function parseLabReport(text: string): Omit<ParsedLabResult, "pdfHash"> {
  const num = (pattern: RegExp) => {
    const match = text.match(pattern)?.[1]?.replace(",", ".");
    return match ? parseFloat(match) : null;
  };

  const humidityRaw =
    num(/[Uu]midit[àa]\s*%[^:]*[:=]?\s*([\d.,]+)/) ??
    num(/[Mm]oisture[^:]*[:=]?\s*([\d.,]+)/) ??
    num(/[Ff]euchtigkeit[^:]*[:=]?\s*([\d.,]+)/) ??
    num(/[Hh]umidity[^:]*[:=]?\s*([\d.,]+)/);

  const hmfRaw = (() => {
    const raw =
      text.match(
        /(?:HMF|Idrossimetil[^\s]*|Hydroxymethylfurfural)[^]*?([\d.,]+|n\.r\.|not detected|<\s*[\d.]+)/i
      )?.[1] ?? null;
    if (!raw) return null;
    if (raw === "n.r." || raw.toLowerCase() === "not detected") return 0;
    if (raw.startsWith("<")) return 0;
    return parseFloat(raw.replace(",", "."));
  })();

  const colourRaw =
    num(/[Cc]olou?r[^:]*mm\s*[Pp]fund[^:]*[:=]?\s*([\d.,]+)/) ??
    num(/[Pp]fund[^:]*[:=]?\s*([\d.,]+)/);

  const botOrigin =
    text
      .match(
        /(?:[Oo]rigine\s+[Bb]ot|[Bb]otanical\s+[Oo]rigin|[Bb]otanische\s+[Hh]erkunft)[^:]*[:=]?\s*([^\n\r|]+)/
      )?.[1]
      ?.trim() ?? null;

  const geoOrigin =
    text
      .match(
        /(?:[Oo]r\.\s*[Gg]eo|[Gg]eo(?:graphical)?\s+[Oo]rigin|[Gg]eografische\s+[Hh]erkunft)[^:]*[:=]?\s*([^\n\r|]+)/
      )?.[1]
      ?.trim() ??
    text
      .match(/(?:Kosovo|Albania|Italia\/Italy|Germany|France)[^)\n]*[-]\s*([^\n|]+)/)
      ?.[1]
      ?.trim() ??
    null;

  const labRef =
    text.match(
      /(?:Nostro riferimento|Riferimento cliente|Sample code|Probennummer|Lab\s*[Rr]ef)[^\n]*?([\w\d-]+)/
    )?.[1] ?? null;

  return {
    name: botOrigin || "Unknown coffee",
    origin: geoOrigin ?? null,
    labRef,
    humidity: humidityRaw !== null ? Math.round(humidityRaw * 10) : null,
    hmf: hmfRaw !== null ? Math.round(hmfRaw * 10) : null,
    colour: colourRaw !== null ? Math.round(colourRaw) : null,
  };
}

type UploadState = "idle" | "parsing" | "done" | "error";

export default function LabReportUpload({
  onResultAction,
}: LabReportUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState<ParsedLabResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function processFile(file: File) {
    if (!file.name.endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      setState("error");
      return;
    }
    setState("parsing");
    setError(null);
    try {
      const [text, hash] = await Promise.all([
        extractTextFromPDF(file),
        hashFile(file),
      ]);
      const parsed = parseLabReport(text);
      const result: ParsedLabResult = { ...parsed, pdfHash: hash };
      setResults((prev) => [...prev, result]);
      setState("done");
      onResultAction?.(result);
    } catch (err) {
      console.error("PDF parse error:", err);
      setError("Could not parse this PDF. Try entering values manually below.");
      setState("error");
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(processFile);
  }

  function getColourLabel(pfund: number): string {
    if (pfund === 0) return "Water white";
    if (pfund <= 8) return "Extra white";
    if (pfund <= 17) return "White";
    if (pfund <= 34) return "Extra light amber";
    if (pfund <= 50) return "Light amber";
    if (pfund <= 85) return "Amber";
    return "Dark amber";
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={[
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver
            ? "border-amber-400 bg-amber-50"
            : "border-gray-200 bg-gray-50 hover:border-amber-300 hover:bg-amber-50",
        ].join(" ")}
      >
        <span className="text-3xl mb-2">PDF</span>
        <p className="text-sm font-medium text-gray-700">Drop lab report PDF here</p>
        <p className="text-xs text-gray-400 mt-1">Any accredited coffee lab report</p>
        <p className="text-xs text-gray-300 mt-0.5">English, Italian, German, French, Albanian and other formats accepted</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {state === "parsing" && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Reading PDF and computing hash...
        </div>
      )}

      {state === "error" && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {results.map((result, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-800">{result.name}</p>
              {result.origin && (
                <p className="text-xs text-gray-400 mt-0.5">{result.origin}</p>
              )}
              {result.labRef && (
                <p className="text-xs text-gray-400">Lab ref: {result.labRef}</p>
              )}
            </div>
            {result.humidity !== null && result.hmf !== null && (
              <QualityBadge humidity={result.humidity} hmf={result.hmf} />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {result.humidity !== null && (
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-400">Humidity</p>
                <p className="text-sm font-medium text-gray-700">{(result.humidity / 10).toFixed(1)}%</p>
              </div>
            )}
            {result.hmf !== null && (
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-400">HMF</p>
                <p className="text-sm font-medium text-gray-700">{(result.hmf / 10).toFixed(1)} mg/kg</p>
              </div>
            )}
            {result.colour !== null && (
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-400">Colour</p>
                <p className="text-sm font-medium text-gray-700">{result.colour} Pfund</p>
                <p className="text-xs text-gray-400">{getColourLabel(result.colour)}</p>
              </div>
            )}
          </div>

          {result.humidity !== null && result.hmf !== null && (
            <QualityBadge humidity={result.humidity} hmf={result.hmf} showMetrics />
          )}

          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-xs font-medium text-gray-500 mb-1">SHA-256 hash stored on-chain</p>
            <p className="break-all font-mono text-xs text-gray-400">{result.pdfHash}</p>
          </div>

          {onResultAction && (
            <button
              onClick={() => onResultAction(result)}
              className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
            >
              Use this result to register batch
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
