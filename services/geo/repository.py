"""Adapter: geographic place lookup.

Two-layer design:
  1. A small built-in catalogue (the cities we test against) for deterministic
     unit tests and offline dev — no network, no API key.
  2. An optional GeoNames HTTP client (enabled when GEONAMES_USERNAME env is
     present) for full global coverage in production.

Both implement the same GeoRepository port, so the use case never knows which
one it is using.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional, Protocol

from services.birth_time.domain.entities import Coordinates, Place


@dataclass(frozen=True)
class GeoResult:
    place_id: str
    name: str
    country: str
    country_code: str
    admin1: str
    lat: float
    lng: float
    iana_zone: str
    population: int = 0


class GeoRepository(Protocol):
    def autocomplete(self, query: str, lang: str = "ru", limit: int = 8) -> List[GeoResult]:
        ...  # pragma: no cover

    def by_place_id(self, place_id: str) -> Optional[Place]:
        ...  # pragma: no cover


# --------------------------------------------------------------------------- #
# Built-in catalogue — deterministic, offline
# --------------------------------------------------------------------------- #
# A small but representative set: covers the spec's test cases (Pavlodar,
# Pavlovsk, Lisbon) and common birthplaces across cultures (Mumbai, Beijing,
# Madrid, New York, São Paulo). Real service would defer to GeoNames.
_CATALOGUE: tuple[GeoResult, ...] = (
    GeoResult("geonames:1520132", "Павлодар", "Казахстан", "KZ",
              "Павлодарская область", 52.30, 76.95, "Asia/Almaty", 360000),
    GeoResult("geonames:1517680", "Павловск", "Россия", "RU",
              "Воронежская область", 50.46, 40.10, "Europe/Moscow", 25000),
    GeoResult("geonames:514179",  "Павловский Посад", "Россия", "RU",
              "Московская область", 55.78, 38.66, "Europe/Moscow", 63000),
    GeoResult("geonames:2267057", "Lisbon", "Portugal", "PT",
              "Lisboa", 38.72, -9.14, "Europe/Lisbon", 550000),
    GeoResult("geonames:1275339", "Mumbai", "India", "IN",
              "Maharashtra", 19.07, 72.87, "Asia/Kolkata", 12400000),
    GeoResult("geonames:1816670", "Beijing", "China", "CN",
              "Beijing", 39.91, 116.40, "Asia/Shanghai", 11700000),
    GeoResult("geonames:3117735", "Madrid", "Spain", "ES",
              "Madrid", 40.42, -3.70, "Europe/Madrid", 3300000),
    GeoResult("geonames:5128581", "New York", "United States", "US",
              "New York", 40.71, -74.01, "America/New_York", 8400000),
    GeoResult("geonames:3448439", "São Paulo", "Brazil", "BR",
              "São Paulo", -23.55, -46.63, "America/Sao_Paulo", 12000000),
    GeoResult("geonames:2643743", "London", "United Kingdom", "GB",
              "England", 51.51, -0.13, "Europe/London", 8900000),
    GeoResult("geonames:524901",  "Moscow", "Россия", "RU",
              "Москва", 55.75, 37.62, "Europe/Moscow", 12000000),
    GeoResult("geonames:1850147", "Tokyo", "Japan", "JP",
              "Tokyo", 35.69, 139.69, "Asia/Tokyo", 14000000),
)


class CatalogueGeoRepository:
    """In-memory deterministic implementation — default for tests & dev."""

    def __init__(self, catalogue: Iterable[GeoResult] = _CATALOGUE) -> None:
        self._by_id = {r.place_id: r for r in catalogue}
        self._items: tuple[GeoResult, ...] = tuple(catalogue)

    def autocomplete(self, query: str, lang: str = "ru", limit: int = 8) -> List[GeoResult]:
        q = (query or "").strip().lower()
        if len(q) < 2:
            return []
        matches = [
            r for r in self._items
            if q in r.name.lower() or q in _ascii(r.name).lower()
        ]
        # Stable order: largest population first (matches user expectation).
        matches.sort(key=lambda r: -r.population)
        return matches[: max(1, min(limit, 10))]

    def by_place_id(self, place_id: str) -> Optional[Place]:
        r = self._by_id.get(place_id)
        if r is None:
            return None
        return Place(
            name=r.name,
            country=r.country,
            coordinates=Coordinates(r.lat, r.lng),
            iana_zone=r.iana_zone,
            place_id=r.place_id,
        )


def _ascii(s: str) -> str:
    """Crude transliteration so "Павлодар"/"Pavlodar" match."""
    table = {
        "А":"A","а":"a","Б":"B","б":"b","В":"V","в":"v","Г":"G","г":"g",
        "Д":"D","д":"d","Е":"E","е":"e","Ё":"E","ё":"e","Ж":"Zh","ж":"zh",
        "З":"Z","з":"z","И":"I","и":"i","Й":"Y","й":"y","К":"K","к":"k",
        "Л":"L","л":"l","М":"M","м":"m","Н":"N","н":"n","О":"O","о":"o",
        "П":"P","п":"p","Р":"R","р":"r","С":"S","с":"s","Т":"T","т":"t",
        "У":"U","у":"u","Ф":"F","ф":"f","Х":"Kh","х":"kh","Ц":"Ts","ц":"ts",
        "Ч":"Ch","ч":"ch","Ш":"Sh","ш":"sh","Щ":"Sch","щ":"sch","Ъ":"",
        "ъ":"","Ы":"Y","ы":"y","Ь":"","ь":"","Э":"E","э":"e","Ю":"Yu","ю":"yu",
        "Я":"Ya","я":"ya",
    }
    return "".join(table.get(c, c) for c in s)


# --------------------------------------------------------------------------- #
# GeoNames HTTP adapter — enabled only with credentials
# --------------------------------------------------------------------------- #
class GeoNamesRepository:
    """Production adapter. Requires GEONAMES_USERNAME to be set.

    Falls back gracefully: if the env var is absent or the request fails, the
    constructor raises so the composition root can wire the catalogue instead.
    """

    BASE = "http://api.geonames.org/searchJSON"

    def __init__(self, username: str, timeout: float = 3.0) -> None:
        if not username:
            raise ValueError("GEONAMES_USERNAME is required")
        import httpx
        self._username = username
        self._timeout = timeout
        self._client = httpx.Client(timeout=timeout)

    def autocomplete(self, query: str, lang: str = "ru", limit: int = 8) -> List[GeoResult]:
        if len((query or "").strip()) < 2:
            return []
        params = {
            "q": query,
            "maxRows": str(min(max(limit, 1), 10)),
            "style": "FULL",
            "username": self._username,
            "lang": lang,
            "featureClass": "P",
        }
        resp = self._client.get(self.BASE, params=params)
        resp.raise_for_status()
        data = resp.json()
        out: List[GeoResult] = []
        for g in data.get("geonames", []):
            out.append(GeoResult(
                place_id=f"geonames:{g.get('geonameId')}",
                name=g.get("name", ""),
                country=g.get("countryName", ""),
                country_code=g.get("countryCode", ""),
                admin1=g.get("adminName1", ""),
                lat=float(g.get("lat", 0)),
                lng=float(g.get("lng", 0)),
                iana_zone=g.get("timezone", {}).get("timeZoneId", "")
                           if isinstance(g.get("timezone"), dict)
                           else (g.get("timezone") or ""),
                population=int(g.get("population", 0) or 0),
            ))
        return out

    def by_place_id(self, place_id: str) -> Optional[Place]:
        # strip prefix
        gid = place_id.split(":", 1)[-1] if ":" in place_id else place_id
        params = {"geonameId": gid, "style": "FULL",
                  "username": self._username}
        resp = self._client.get("http://api.geonames.org/getJSON", params=params)
        resp.raise_for_status()
        g = resp.json()
        if not g or "lat" not in g:
            return None
        tz = g.get("timezone", {})
        return Place(
            name=g.get("name", ""),
            country=g.get("countryName", ""),
            coordinates=Coordinates(float(g["lat"]), float(g["lng"])),
            iana_zone=tz.get("timeZoneId", "") if isinstance(tz, dict) else "",
            place_id=f"geonames:{gid}",
        )
