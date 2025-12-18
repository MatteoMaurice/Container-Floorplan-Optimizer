import React, { useEffect, useMemo, useState } from "react";
import type { CompareResponse, ContainersMap, SingleResponse, OptimizeResult, OptimizePlacement } from "./types";
import { LayoutSvg } from "./components/LayoutSvg";

const API = (import.meta as any).env?.VITE_API_URL ?? "http://127.0.0.1:8000";

function pct(x: number) {
  return (x * 100).toFixed(1) + "%";
}
function mm2_to_m2(mm2: number) {
  return mm2 / 1_000_000;
}

type UploadSnapshot = {
  name: string;
  bytes: Uint8Array;
  mime: string;
  size: number;
  lastModified: number;
};

export default function App() {
  const [containers, setContainers] = useState<ContainersMap>({});
  const [containerCode, setContainerCode] = useState<string>("40GP");
  const [compareAll, setCompareAll] = useState<boolean>(false);
  const [marginMm, setMarginMm] = useState<number>(0);

  const [upload, setUpload] = useState<UploadSnapshot | null>(null);

  const [loading, setLoading] = useState(false);
  const [single, setSingle] = useState<SingleResponse | null>(null);
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerList = useMemo(() => Object.entries(containers), [containers]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/containers`);
        if (!r.ok) throw new Error(await r.text());
        const j = (await r.json()) as ContainersMap;
        setContainers(j);

        // pick a default if available
        if (j["40GP"]) setContainerCode("40GP");
        else {
          const first = Object.keys(j)[0];
          if (first) setContainerCode(first);
        }
      } catch (e: any) {
        setError(
          `Could not load containers from backend.\n` +
            `Check backend is running and API URL is correct.\n\n` +
            `API = ${API}\n` +
            `Error: ${e?.message ?? String(e)}`
        );
      }
    })();
  }, []);

  async function onPickFile(file: File) {
    setError(null);
    setSingle(null);
    setCompare(null);

    try {
      // Snapshot in RAM (avoids Excel/OneDrive rewriting issues after selection)
      const buf = await file.arrayBuffer();
      setUpload({
        name: file.name,
        bytes: new Uint8Array(buf),
        mime: file.type || "application/octet-stream",
        size: file.size,
        lastModified: file.lastModified,
      });
    } catch (e: any) {
      setUpload(null);
      setError(
        `Could not read the selected file.\n` +
          `If this is an Excel-exported CSV, try: Save As to a NEW filename, close Excel, then re-select the file.\n\n` +
          `Error: ${e?.message ?? String(e)}`
      );
    }
  }

  async function runOptimize() {
    setError(null);
    setLoading(true);
    setSingle(null);
    setCompare(null);

    try {
      if (!upload) {
        throw new Error("Upload a CSV or Excel file first.");
      }

      // Build FormData from snapshot bytes (stable even if file changes later)
      const form = new FormData();
      const blob = new Blob([upload.bytes.buffer as ArrayBuffer], { type: upload.mime });
      form.append("file", blob, upload.name);

      const url = new URL(`${API}/optimize_csv`);
      url.searchParams.set("container_code", containerCode);
      url.searchParams.set("margin_mm", String(marginMm));
      url.searchParams.set("compare_all", String(compareAll));

      const res = await fetch(url.toString(), { method: "POST", body: form });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();

      if (data.mode === "single") setSingle(data as SingleResponse);
      else setCompare(data as CompareResponse);
    } catch (e: any) {
      const msg = e?.message ?? String(e);

      // Friendly hints for common cases
      if (msg.includes("ERR_UPLOAD_FILE_CHANGED")) {
        setError(
          `Upload failed because the file changed during upload.\n` +
            `This is often caused by Excel/OneDrive/preview tools rewriting the file.\n\n` +
            `Fix: Save As to a NEW filename (e.g. C:\\temp\\pallets.csv), close Excel, re-select the file.\n`
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui", padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Container Floorplan Optimizer</h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        Upload pallet dimensions (CSV / Excel), pick a container type, get an optimized 2D floor plan + remaining space.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        {/* Upload card */}
        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>1) Upload file</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
            Accepted: <code>.csv</code>, <code>.xlsx</code>, <code>.xlsm</code>
            <br />
            Expected columns: <code>sku</code>, <code>qty</code>, <code>length_mm</code>, <code>width_mm</code> (rotatable optional)
          </div>

          <input
            type="file"
            accept=".csv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
            }}
          />

          {upload && (
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
              <b>Selected:</b> {upload.name}{" "}
              <span style={{ opacity: 0.7 }}>
                ({Math.round(upload.size / 1024)} KB)
              </span>
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            API: <code>{API}</code>
          </div>
        </div>

        {/* Options card */}
        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>2) Container & options</div>

          <label style={{ display: "block", marginBottom: 10 }}>
            Container:
            <select
              value={containerCode}
              onChange={(e) => setContainerCode(e.target.value)}
              style={{ marginLeft: 8 }}
              disabled={compareAll}
            >
              {containerList.map(([code, c]) => (
                <option key={code} value={code}>
                  {code} — {c.name} ({c.L_mm}×{c.W_mm} mm)
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            Margin (mm):
            <input
              type="number"
              value={marginMm}
              onChange={(e) => setMarginMm(parseInt(e.target.value || "0", 10))}
              style={{ marginLeft: 8, width: 100 }}
              min={0}
            />
            <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.75 }}>
              (Tip: 0–10mm for testing)
            </span>
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={compareAll} onChange={(e) => setCompareAll(e.target.checked)} />
            Compare all container types (pick best)
          </label>

          <div style={{ marginTop: 12 }}>
            <button
              onClick={runOptimize}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: loading ? "#eee" : "#111",
                color: loading ? "#111" : "white",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              {loading ? "Optimizing..." : "Optimize"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid #f2c", background: "#fff5fb" }}>
          <b>Error:</b>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{error}</pre>
        </div>
      )}

      {/* SINGLE RESULT */}
      {single && (
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <SummaryBlock title={`${single.container_code} — ${single.meta.name}`} result={single.result} />
          <LayoutSvg
            title={`Layout (${single.result.strategy})`}
            L={single.result.container.L_mm}
            W={single.result.container.W_mm}
            placements={single.result.placements}
          />
        </div>
      )}

      {/* COMPARE RESULT */}
      {compare && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 12, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
            <div style={{ fontWeight: 900 }}>Best container: {compare.best_container}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Chosen by max placed items, then max area utilization.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {Object.entries(compare.results).map(([code, entry]) => (
              <div key={code} style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                <SummaryBlock title={`${code} — ${entry.meta.name}`} result={entry.result} />
                <LayoutSvg
                  title={`Layout (${entry.result.strategy})`}
                  L={entry.result.container.L_mm}
                  W={entry.result.container.W_mm}
                  placements={entry.result.placements}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryBlock({ title, result }: { title: string; result: OptimizeResult }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 14 }}>
        <div>
          <b>Placed:</b> {result.summary.placed}
        </div>
        <div>
          <b>Unplaced:</b> {result.summary.unplaced}
        </div>
        <div>
          <b>Utilization:</b> {pct(result.summary.utilization_area)}
        </div>
        <div>
          <b>Leftover area:</b> {mm2_to_m2(result.summary.leftover_area_mm2).toFixed(2)} m²
        </div>
        <div>
          <b>Largest free rect:</b> {mm2_to_m2(result.summary.largest_free_rect_mm2).toFixed(2)} m²
        </div>
        <div>
          <b>Margin:</b> {result.margin_mm} mm
        </div>
      </div>

      {result.unplaced_items?.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer" }}>Unplaced items ({result.unplaced_items.length})</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#fafafa", padding: 10, borderRadius: 10 }}>
            {JSON.stringify(result.unplaced_items.slice(0, 80), null, 2)}
            {result.unplaced_items.length > 80 ? "\n... (truncated)" : ""}
          </pre>
        </details>
      )}
    </div>
  );
}
