# Container Floorplan Optimizer

Upload a CSV of pallet dimensions + quantities, pick a container type (built-in internal dimensions), and generate an optimized 2D floor plan with remaining space metrics.

## Features
- Built-in container library (20GP / 40GP / 40HC / 45HC)
- CSV input: qty, length_mm, width_mm (optional sku, rotatable)
- 2D packing using MaxRects heuristic (Best Short Side Fit)
- Compare all container types and pick the best fit
- Intuitive 2D SVG layout

## Run (Backend)
```bash
cd api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..
uvicorn api.main:app --reload --port 8000
