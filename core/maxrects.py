from __future__ import annotations
from typing import List, Optional, Tuple
from .models import Rect, Item, Placement

def rect_area(r: Rect) -> int:
    return r.w * r.h

def intersects(a: Rect, b: Rect) -> bool:
    return not (a.x + a.w <= b.x or b.x + b.w <= a.x or a.y + a.h <= b.y or b.y + b.h <= a.y)

def contains(a: Rect, b: Rect) -> bool:
    return a.x <= b.x and a.y <= b.y and a.x + a.w >= b.x + b.w and a.y + a.h >= b.y + b.h

class MaxRectsBinPack:
    """
    MaxRects with Best Short Side Fit (BSSF)
    Good practical heuristic, easy to test and explain in README.
    """
    def __init__(self, bin_w: int, bin_h: int):
        self.bin_w = bin_w
        self.bin_h = bin_h
        self.free: List[Rect] = [Rect(0, 0, bin_w, bin_h)]
        self.used: List[Rect] = []

    def insert(self, item: Item) -> Optional[Tuple[Rect, bool]]:
        # returns (placed_rect, rotated)
        best = None  # (score1, score2, rect, rotated)
        for free in self.free:
            # not rotated
            if item.w <= free.w and item.h <= free.h:
                score = self._score_bssf(free, item.w, item.h)
                cand = (score[0], score[1], Rect(free.x, free.y, item.w, item.h), False)
                best = cand if best is None or cand[:2] < best[:2] else best
            # rotated
            if item.rotatable and item.h <= free.w and item.w <= free.h:
                score = self._score_bssf(free, item.h, item.w)
                cand = (score[0], score[1], Rect(free.x, free.y, item.h, item.w), True)
                best = cand if best is None or cand[:2] < best[:2] else best

        if best is None:
            return None

        _, _, placed, rotated = best
        self._place(placed)
        return placed, rotated

    def _score_bssf(self, free: Rect, w: int, h: int) -> Tuple[int, int]:
        leftover_h = abs(free.h - h)
        leftover_w = abs(free.w - w)
        short_side_fit = min(leftover_h, leftover_w)
        long_side_fit = max(leftover_h, leftover_w)
        return short_side_fit, long_side_fit

    def _place(self, placed: Rect) -> None:
        i = 0
        while i < len(self.free):
            free = self.free[i]
            if not intersects(placed, free):
                i += 1
                continue

            # Split free rect into up to 4 rects around placed
            new_rects = []

            # left
            if placed.x > free.x:
                new_rects.append(Rect(free.x, free.y, placed.x - free.x, free.h))
            # right
            if placed.x + placed.w < free.x + free.w:
                new_rects.append(Rect(placed.x + placed.w, free.y, (free.x + free.w) - (placed.x + placed.w), free.h))
            # top
            if placed.y > free.y:
                new_rects.append(Rect(free.x, free.y, free.w, placed.y - free.y))
            # bottom
            if placed.y + placed.h < free.y + free.h:
                new_rects.append(Rect(free.x, placed.y + placed.h, free.w, (free.y + free.h) - (placed.y + placed.h)))

            # remove old free
            self.free.pop(i)
            # add new
            self.free.extend([r for r in new_rects if r.w > 0 and r.h > 0])
            # don't increment i because we removed current
        self.used.append(placed)
        self._prune_free_list()

    def _prune_free_list(self) -> None:
        # Remove redundant free rects contained in others
        pruned: List[Rect] = []
        for r in self.free:
            redundant = False
            for o in self.free:
                if r is o:
                    continue
                if contains(o, r):
                    redundant = True
                    break
            if not redundant:
                pruned.append(r)
        self.free = pruned
