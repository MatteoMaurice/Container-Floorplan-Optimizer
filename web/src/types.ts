export type ContainersMap = Record<string, { name: string; L_mm: number; W_mm: number }>;

export type OptimizePlacement = {
  sku: string;
  x: number;
  y: number;
  w_mm: number;
  h_mm: number;
  rotated: boolean;
};

export type OptimizeResult = {
  strategy: string;
  container: { L_mm: number; W_mm: number };
  margin_mm: number;
  summary: {
    placed: number;
    unplaced: number;
    utilization_area: number;
    leftover_area_mm2: number;
    largest_free_rect_mm2: number;
  };
  placements: OptimizePlacement[];
  unplaced_items: any[];
};

export type SingleResponse = {
  mode: "single";
  container_code: string;
  meta: { name: string; L_mm: number; W_mm: number };
  result: OptimizeResult;
};

export type CompareResponse = {
  mode: "compare_all";
  best_container: string;
  results: Record<string, { meta: { name: string; L_mm: number; W_mm: number }; result: OptimizeResult }>;
};
