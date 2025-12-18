from __future__ import annotations
from typing import Dict, List, Tuple
from .models import ItemSpec, Item, Placement, Rect
from .maxrects import MaxRectsBinPack, rect_area

def expand_items(specs: List[dict]) -> List[Item]:
    items: List[Item] = []
    for row in specs:
        sku = str(row.get("sku", "")).strip() or "ITEM"
        qty = int(row.get("qty", 1))
        L = int(row.get("length_mm"))
        W = int(row.get("width_mm"))
        rot = row.get("rotatable", True)
        rot = True if str(rot).lower() in ("1","true","yes","y","t","") else False
        for _ in range(qty):
            items.append(Item(sku=sku, w=L, h=W, rotatable=rot))
    return items

def normalize_and_validate(items: List[Item], container_L: int, container_W: int, margin: int) -> Tuple[List[Item], List[dict]]:
    ok: List[Item] = []
    rejected: List[dict] = []
    for it in items:
        w = it.w + margin
        h = it.h + margin
        # quick feasibility check: either orientation must fit
        fits = (w <= container_L and h <= container_W) or (it.rotatable and (h <= container_L and w <= container_W))
        if not fits:
            rejected.append({
                "sku": it.sku,
                "reason": f"Does not fit in container even with rotation (with margin={margin}mm)."
            })
        else:
            ok.append(Item(sku=it.sku, w=w, h=h, rotatable=it.rotatable))
    return ok, rejected

def run_once(container_L: int, container_W: int, items: List[Item]) -> Tuple[List[Placement], List[Item], List[Rect]]:
    packer = MaxRectsBinPack(container_L, container_W)

    placements: List[Placement] = []
    unplaced: List[Item] = []

    for it in items:
        res = packer.insert(it)
        if res is None:
            unplaced.append(it)
            continue
        rect, rotated = res
        placements.append(Placement(
            sku=it.sku,
            x=rect.x,
            y=rect.y,
            w=rect.w,
            h=rect.h,
            rotated=rotated
        ))

    return placements, unplaced, packer.free

def optimize_layout(container_L: int, container_W: int, csv_rows: List[dict], margin: int = 0) -> dict:
    raw_items = expand_items(csv_rows)
    # Sort strategies (multi-run) for better results
    # Score priority: maximize placed count, then maximize used area.
    candidates = []
    sorters = [
        ("area_desc", lambda it: -(it.w * it.h)),
        ("maxside_desc", lambda it: -max(it.w, it.h)),
        ("perimeter_desc", lambda it: -(it.w + it.h)),
    ]

    # Validate / apply margin after expansion
    items_ok, rejected = normalize_and_validate(raw_items, container_L, container_W, margin)

    for name, keyfn in sorters:
        items_sorted = sorted(items_ok, key=keyfn)
        placements, unplaced, free_rects = run_once(container_L, container_W, items_sorted)
        used_area = sum(p.w * p.h for p in placements)
        candidates.append((len(placements), used_area, name, placements, unplaced, free_rects))

    best = max(candidates, key=lambda t: (t[0], t[1]))
    placed_count, used_area, strategy, placements, unplaced, free_rects = best

    total_area = container_L * container_W
    leftover_area = total_area - used_area
    largest_free = max((rect_area(r) for r in free_rects), default=0)

    # remove margin from displayed sizes (so UI shows real pallet dims)
    placements_display = []
    for p in placements:
        placements_display.append({
            "sku": p.sku,
            "x": p.x,
            "y": p.y,
            "w_mm": max(0, p.w - margin),
            "h_mm": max(0, p.h - margin),
            "rotated": p.rotated
        })

    return {
        "strategy": strategy,
        "container": {"L_mm": container_L, "W_mm": container_W},
        "margin_mm": margin,
        "summary": {
            "placed": placed_count,
            "unplaced": len(unplaced) + len(rejected),
            "utilization_area": (used_area / total_area) if total_area else 0.0,
            "leftover_area_mm2": leftover_area,
            "largest_free_rect_mm2": largest_free,
        },
        "placements": placements_display,
        "unplaced_items": (
            [{"sku": u.sku, "length_mm": u.w, "width_mm": u.h, "rotatable": u.rotatable, "reason": "No space left"} for u in unplaced]
            + rejected
        )
    }
