import { CoffeeBatch, displayHumidity, displayHmf } from "@/lib/mockData";

type QualityBadgeProps = {
  status: CoffeeBatch["qualityStatus"];
};

function QualityBadge({ status }: QualityBadgeProps) {
  const styles = {
    Passed: "bg-green-100 text-green-800 border border-green-200",
    Caution: "bg-amber-100 text-amber-800 border border-amber-200",
    Failed: "bg-red-100 text-red-800 border border-red-200",
  };

  const icons = {
    Passed: "",
    Caution: "",
    Failed: "",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      <span>{icons[status]}</span>
      {status}
    </span>
  );
}

type BatchStatusBadgeProps = {
  status: CoffeeBatch["status"];
};

function BatchStatusBadge({ status }: BatchStatusBadgeProps) {
  const styles = {
    Verified: "bg-green-50 text-green-700",
    "Lab tested": "bg-blue-50 text-blue-700",
    "Pending verification": "bg-yellow-50 text-yellow-700",
    Rejected: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

type MetricPillProps = {
  label: string;
  value: string;
  warn?: boolean;
  fail?: boolean;
};

function MetricPill({ label, value, warn, fail }: MetricPillProps) {
  const colour = fail
    ? "bg-red-50 text-red-700 border-red-200"
    : warn
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <div className={`rounded-lg border px-3 py-2 ${colour}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

type TraceabilityTimelineProps = {
  history: CoffeeBatch["traceabilityHistory"];
};

function TraceabilityTimeline({ history }: TraceabilityTimelineProps) {
  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
        Traceability history
      </p>
      <ol className="space-y-3">
        {history.map((event, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="h-2 w-2 rounded-full bg-amber-400 mt-1 flex-shrink-0" />
              {i < history.length - 1 && (
                <div className="w-px flex-1 bg-gray-200 mt-1" />
              )}
            </div>
            <div className="pb-3">
              <p className="text-xs font-medium text-gray-700">
                {event.stage}
                <span className="ml-2 font-normal text-gray-400">
                  {event.timestamp}
                </span>
              </p>
              <p className="text-xs text-gray-500">{event.actor}</p>
              {event.note && (
                <p className="mt-0.5 text-xs text-gray-400 italic">
                  {event.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

type CoffeeCardProps = {
  batch: CoffeeBatch;
  showTimeline?: boolean;
};

export default function CoffeeCard({ batch, showTimeline = false }: CoffeeCardProps) {
  const humidityWarn = batch.humidity > 186 && batch.humidity <= 200;
  const humidityFail = batch.humidity > 200;
  const hmfWarn = batch.hmf > 300 && batch.hmf <= 400;
  const hmfFail = batch.hmf > 400;

  const colourLabel =
    batch.colour === 0 ? "Water white"
    : batch.colour <= 8 ? "Extra white"
    : batch.colour <= 17 ? "White"
    : batch.colour <= 34 ? "Extra light amber"
    : batch.colour <= 50 ? "Light amber"
    : batch.colour <= 85 ? "Amber"
    : "Dark amber";

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-amber-900">{batch.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {batch.batchId} · {batch.origin} · {batch.harvestYear}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <QualityBadge status={batch.qualityStatus} />
          <BatchStatusBadge status={batch.status} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MetricPill
          label="Humidity"
          value={displayHumidity(batch.humidity)}
          warn={humidityWarn}
          fail={humidityFail}
        />
        <MetricPill
          label="HMF"
          value={displayHmf(batch.hmf)}
          warn={hmfWarn}
          fail={hmfFail}
        />
        <MetricPill
          label="Colour"
          value={`${batch.colour} Pfund`}
        />
      </div>

      <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
        <span className="font-medium text-gray-600">Colour class: </span>
        {colourLabel}
      </div>

      <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
        <p className="text-xs font-medium text-gray-600">Farmer</p>
        <p className="text-xs text-gray-500">{batch.farmerName}</p>
        <p className="mt-1 text-xs font-medium text-gray-600">Producer declaration</p>
        <p className="text-xs text-gray-500 italic">{batch.producerDeclaration}</p>
      </div>

      <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
        <p className="text-xs font-medium text-gray-600">Lab report hash</p>
        <p className="truncate font-mono text-xs text-gray-400">{batch.pdfHash}</p>
      </div>

      {showTimeline && (
        <TraceabilityTimeline history={batch.traceabilityHistory} />
      )}
    </div>
  );
}