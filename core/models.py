from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class ItemSpec:
    sku: str
    length_mm: int
    width_mm: int
    rotatable: bool = True

@dataclass(frozen=True)
class Item:
    sku: str
    w: int
    h: int
    rotatable: bool

@dataclass(frozen=True)
class Rect:
    x: int
    y: int
    w: int
    h: int

@dataclass(frozen=True)
class Placement:
    sku: str
    x: int
    y: int
    w: int
    h: int
    rotated: bool
