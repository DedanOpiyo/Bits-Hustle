# Bits Hustle Hub — Workspace Rules for Kilo

## Entry points
- Full architectural patterns, naming conventions, and coding rules: `.kilo/command/etiquette.md`
- Legacy BRD gap analysis (largest reference doc; read before any structural changes): `fix.md`

## What to do first
1. Read `fix.md` for the business-context evaluation of every notable gap.
2. Read `.kilo/command/etiquette.md` for the enforced code rules before touching any file.

## How to run
```bash
# Backend (from flask-api/)
pip install -r requirements.txt
flask run                    # or: python run.py

# Frontend (from frontend/)
npm install
npm run dev
```

## Testing
```bash
# Backend
cd flask-api && pytest

# Frontend
cd frontend && npm run lint && npm run typecheck
```
