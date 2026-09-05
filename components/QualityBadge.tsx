import { getQualityStatus, displayHumidity, displayHmf } from "@/lib/mockData";

type QualityBadgeProps = {
  humidity: number;
  hmf: number;
  size?: "sm" | "md" | "lg";
  showMetrics?: boolean;
};

type StatusConfig = {
  label: string;
  icon: string;
  badge: string;
  bar: string;
  text: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  Passed: {
    label: "Passed",
    icon: "",
    badge: "bg-green-100 text-green-800 border border-green-200",
    bar: "bg-green-400",
    text: "text-green-700",
  },
  Caution: {
    label: "Caution",
    icon: "",
    badge: "bg-amber-100 text-amber-800 border border-amber-200",
    bar: "bg-amber-400",
    text: "text-amber-700",
  },
  Failed: {
    label: "Failed",
    icon: "",
    badge: "bg-red-100 text-red-800 border border-red-200",
    bar: "bg-red-400",
    text: "text-red-700",
  },
};

const SIZE_STYLES = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-3 py-1 text-xs gap-1",
  lg: "px-4 py-1.5 text-sm gap-1.5",
};

function humidityPercent(raw: number): number {
  // Returns 0-100 fill for the visual bar capped at the EU danger zone
  // 0% bar = 0% humidity, 100% bar = 21% humidity (above limit)
  return Math.min((raw / 210) * 100, 100);
}

function hmfPercent(raw: number): number {
  // 0% bar = 0 HMF, 100% bar = 450 mg/kg (above limit)
  return Math.min((raw / 450) * 100, 100);
}

export default function QualityBadge({
  humidity,
  hmf,
  size = "md",
  showMetrics = false,
}: QualityBadgeProps) {
  const status = getQualityStatus(humidity, hmf);
  const config = STATUS_CONFIG[status];

  if (!showMetrics) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-medium ${config.badge} ${SIZE_STYLES[size]}`}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  }

  const humidityVal = humidity / 10;
  const hmfVal = hmf / 10;
  const humidityOver = humidity > 200;
  const humidityWarn = humidity > 186 && !humidityOver;
  const hmfOver = hmf > 400;
  const hmfWarn = hmf > 300 && !hmfOver;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Quality assessment
        </p>
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium ${config.badge} ${SIZE_STYLES[size]}`}
        >
          <span>{config.icon}</span>
          {config.label}
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-500">Humidity</span>
            <span
              className={`text-xs font-medium ${
                humidityOver
                  ? "text-red-600"
                  : humidityWarn
                  ? "text-amber-600"
                  : "text-green-600"
              }`}
            >
              {displayHumidity(humidity)}
              {humidityOver && " — exceeds EU limit"}
              {humidityWarn && " — fermentation risk"}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                humidityOver ? "bg-red-400" : humidityWarn ? "bg-amber-400" : "bg-green-400"
              }`}
              style={{ width: `${humidityPercent(humidity)}%` }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-xs text-gray-300">0%</span>
            <span className="text-xs text-gray-300">EU limit 20%</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-500">HMF</span>
            <span
              className={`text-xs font-medium ${
                hmfOver
                  ? "text-red-600"
                  : hmfWarn
                  ? "text-amber-600"
                  : "text-green-600"
              }`}
            >
              {displayHmf(hmf)}
              {hmfOver && " — exceeds EU limit"}
              {hmfWarn && " — elevated, monitor"}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                hmfOver ? "bg-red-400" : hmfWarn ? "bg-amber-400" : "bg-green-400"
              }`}
              style={{ width: `${hmfPercent(hmf)}%` }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-xs text-gray-300">0</span>
            <span className="text-xs text-gray-300">EU limit 40 mg/kg</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Thresholds per EU Directive 2001/110/EC
      </p>
    </div>
  );
}