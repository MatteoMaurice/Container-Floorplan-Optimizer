# Container Floorplan Optimizer

A 2D container loading optimizer for palletized freight.

Upload a CSV or Excel file with pallet dimensions and quantities, select a container type with built-in internal dimensions, and generate an optimized **2D floor plan** with utilization and remaining-space metrics.

This project focuses on **real-world logistics constraints** and provides an intuitive visual representation of container loading.

---

## Features
- Built-in container library (20GP / 40GP / 40HC / 45HC)
- CSV / Excel input  
  (`qty`, `length_mm`, `width_mm` – optional `sku`, `rotatable`)
- 2D packing using **MaxRects heuristic** (Best Short Side Fit)
- Compare all container types and automatically pick the best fit
- Intuitive **SVG-based 2D layout**
- Remaining space, utilization ratio, and largest free-rectangle metrics

---

## Tech Stack
**Backend**
- Python
- FastAPI
- MaxRects-style packing algorithm

**Frontend**
- React
- TypeScript
- Vite
- SVG rendering

---

## Project Structure
api/ # FastAPI backend (CSV / Excel parsing, optimization API)
core/ # Packing algorithm & domain logic
web/ # React frontend (UI + SVG visualization)

---

## Example Input (CSV)

```csv
sku,qty,length_mm,width_mm,rotatable
EURO,10,1200,800,true
US48x40,8,1219,1016,true
ODD,2,1500,900,false
```

Run Locally
Backend
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r api/requirements.txt
uvicorn api.main:app --reload --port 8000
```

Frontend
```bash
cd web
npm install
npm run dev
```
Frontend runs at:
```bash
http://localhost:5173
```
Backend API runs at:

```bash
http://127.0.0.1:8000
```

**Motivation**

This project was built to explore practical container loading optimization, bridging algorithmic packing logic with a clean, visual UI.
It is designed as a realistic engineering tool rather than a toy demo.

**Future Improvements**

-Weight constraints
-Pallet stacking logic
-3D visualization
-Exportable loading plans
