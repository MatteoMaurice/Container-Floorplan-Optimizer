import React, { useMemo } from "react";
import type { OptimizePlacement } from "../types";

function mm2_to_m2(mm2: number) {
  return mm2 / 1_000_000;
}

export function LayoutSvg({
  title,
  L,
  W,
  placements,
}: {
  title: string;
  L: number;
  W: number;
  placements: OptimizePlacement[];
}) {
  const viewBox = `0 0 ${L} ${W}`;

  // deterministic color per sku
  const colorFor = useMemo(() => {
    const map = new Map<string, string>();
    const palette = ["#2D7FF9", "#00A878", "#FFB703", "#FB5607", "#8338EC", "#06D6A0", "#EF476F", "#118AB2"];
    let idx = 0;
    return (sku: string) => {
      if (!map.has(sku)) {
        map.set(sku, palette[idx % palette.length]);
        idx++;
      }
      return map.get(sku)!;
    };
  }, []);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>

      <div style={{ width: "100%", overflow: "auto", border: "1px solid #eee", borderRadius: 12 }}>
        <svg
          viewBox={viewBox}
          style={{ width: "100%", height: 520, background: "#fafafa" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x={0} y={0} width={L} height={W} fill="white" stroke="#111" strokeWidth={10} />

          {placements.map((p, i) => (
            <g key={i}>
              <rect
                x={p.x}
                y={p.y}
                width={p.w_mm}
                height={p.h_mm}
                fill={colorFor(p.sku)}
                opacity={0.25}
                stroke={colorFor(p.sku)}
                strokeWidth={6}
              />
              <text x={p.x + 20} y={p.y + 60} fontSize={60} fill="#111" opacity={0.75}>
                {p.sku}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
        Container: {L}×{W} mm
      </div>
    </div>
  );
}
