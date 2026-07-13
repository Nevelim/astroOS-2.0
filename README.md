# AstroOS · Birth-Time Resolution Service

Resolves a user-reported wall-clock birth time into the **UTC / LMT / TST**
decomposition that astrology (especially BaZi) requires — with full
**historical DST awareness** and **Equation of Time** correction.

This is the **most consequential calculation in the whole product**: the BaZi
hour-pillar (时辰) depends on **True Solar Time**, not clock time, and the
difference changes a person's reading. Getting it wrong silently breaks the
entire chart. Everything in this service is built to make that calculation
auditable and provably correct.

## Canonical verified case

**Input:** Pavlodar, Kazakhstan, 15 April 1989, 16:40 local clock time

```
16:40 local  →  09:40 UTC  →  14:47:48 LMT  →  14:47:33 TST
                                                ↑ BaZi uses THIS
shichen = wei (未, 13:00–15:00)
note: naive clock time 16:40 would imply shen — a different hour pillar
```

The `09:40` UTC step matches what the user reported. The critical correction
is that BaZi uses **TST (14:47:33)**, not UTC and not clock time — a
distinction the spec is explicit about, and which this service computes.

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/v1/geo/autocomplete?q=Павло` | City search (returns IANA zone + coords) |
| `GET`  | `/v1/birth-time/resolve` | Resolve a birth instant → UTC/LMT/TST/shichen |
| `GET`  | `/healthz` `/readyz` | Liveness / readiness probes |

Errors follow **RFC 7807 problem+json**. Resolutions are **immutable**
(`Cache-Control: public, max-age=31536000, immutable` + `ETag`).

### Example

```bash
curl "http://127.0.0.1:8765/v1/birth-time/resolve?\
local_date=1989-04-15&local_time=16:40&place_id=geonames:1520132"
```

```json
{
  "birth_data_hash": "sha256:50990e64…",
  "resolution": {
    "utc": "1989-04-15T09:40:00Z",
    "utc_offset_minutes": 420,
    "dst_active": true,
    "local_mean_time": "14:47:48",
    "true_solar_time": "14:47:33",
    "equation_of_time_minutes": -0.2404,
    "tzdata_version": "2026c",
    "ambiguity": "none"
  },
  "bazi": {
    "shichen": "wei",
    "note": "TST places birth in wei hour; naive clock time would imply shen."
  }
}
```

## Architecture

Clean / Hexagonal architecture — **the dependency rule** is enforced by
package layout: dependencies point inward toward the domain.

```
services/birth_time/
├── domain/         # PURE — zero external imports. Entities, value objects,
│   │                  pure functions (shichen mapping). Tested in isolation.
│   └── entities.py
├── usecase/        # Application orchestration. Defines PORTS (abstract
│   │                  interfaces) that adapters implement. DI-friendly.
│   └── resolve_birth_time.py
├── adapter/        # OUTER ring — the only place that imports zoneinfo,
│   │                  httpx, NOAA math, tzdata. Each adapter = one port impl.
│   ├── timezone_resolver.py   # ZoneInfoResolver + TzdataVersion
│   └── solar_time.py          # NoaaSolarProvider (Equation of Time)
├── api/            # FastAPI app + composition root. Wires concrete adapters
│   │                  to ports. No module-level mutable state — factory FTW.
│   └── app.py
└── tests/
    ├── unit/         # pure logic (fake ports)       — 45 tests
    ├── golden/       # REAL adapters, frozen values   — 12 tests
    └── integration/  # full HTTP stack (TestClient)   — 14 tests
```

### Why this layering
- **`domain`** never imports DB/HTTP/logging → unit tests run in ~40ms, fully deterministic.
- **Ports live in `usecase`**, not adapters — the high level owns the abstraction (dependency inversion).
- **`api/app.py:create_app(deps)`** is the single composition root; tests inject fakes for speed, integration tests use the real adapters.

## Testing

```bash
.venv/bin/python -m pytest services/birth_time/tests -v
.venv/bin/python -m pytest --cov=services/birth_time/domain --cov=services/birth_time/usecase --cov-report=term-missing
```

**71 tests, 95% coverage on domain+usecase+adapter.** Coverage breakdown:
- `domain/entities.py` — 93% (pure logic, every public function table-driven)
- `usecase/resolve_birth_time.py` — 98%
- `adapter/timezone_resolver.py` — 96% (incl. real fold/gap DST detection)
- `adapter/solar_time.py` — 100%

### Golden tests
The `tests/golden/test_pavlodar_1989.py` file wires the **real** `ZoneInfoResolver`,
`NoaaSolarProvider`, `TzdataVersion` (not fakes) and asserts the spec-verified
numbers. If a tzdata update or an EoT formula change shifts the output, these
tests fail before users see wrong charts.

## Run

```bash
.venv/bin/uvicorn services.birth_time.api.app:app --host 0.0.0.0 --port 8080
# Swagger UI at http://localhost:8080/docs
```

## Decisions (and the ADRs they answer)

- **Python 3.9 + stdlib `zoneinfo` + `tzdata` package** — embedded IANA database gives byte-deterministic historical offsets across deployments. The ADR lists Go (`time/tzdata`) as the production target for the BaZi/Astro engines; this Python implementation mirrors the same algorithm and is the canonical reference.
- **NOAA Equation of Time formula** — sub-minute accuracy, more than sufficient for the 2-hour shichen granularity. Documented upgrade path to VSOP87 for arcsecond rigor.
- **DST fold/gap detection via neighbour-offset probing** — works on Python 3.9 (no `.exists()`, added in 3.10). The signature: in a spring-forward gap, the wall-clock offset matches the post-gap neighbour but not the pre-gap one.
- **SHA-256 `birth_data_hash` as ETag** — folds together wall-clock, coordinates, IANA zone, time quality, **tzdata version**, and **EoT**. Equal inputs ⇒ equal hash ⇒ perfect cache identity. A tzdata bump automatically invalidates stale entries.

## Open items (next iterations)
- Swap `CatalogueGeoRepository` for `GeoNamesRepository` in production (set `GEONAMES_USERNAME`).
- Move the service into the Go Astro/BaZi engine per the Architecture ADR (this Python implementation is the verified reference).
- Add OpenTelemetry tracing + `/metrics` for the Prometheus scrape.
