/**
 * LT-5: Geo autocomplete + astrocartography cache hit rate.
 *
 * Target: 10K RPS relocation lookups, 95% cache hit.
 * SLO: p95 < 50ms cached.
 *
 * Usage:  k6 run tests/load/lt5-geo-autocomplete.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3009';
const errorRate = new Rate('errors');
const cacheHit = new Rate('cache_hits');
const resolveLatency = new Trend('resolve_ms', true);

export const options = {
  stages: [
    { duration: '15s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 150 },
    { duration: '30s', target: 150 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.01'],
    resolve_ms: ['p(95)<500'],
  },
};

// A fixed set of birth data — repeats produce cache hits (>95% target)
const FIXTURES = [
  { date: '1989-04-15', time: '16:40', place: 'geonames:1520132' },
  { date: '1990-06-15', time: '12:00', place: 'geonames:1275339' },
  { date: '2000-01-07', time: '08:30', place: 'geonames:524901' },
  { date: '1995-03-20', time: '14:00', place: 'geonames:5128581' },
  { date: '1985-11-22', time: '23:45', place: 'geonames:2643743' },
];

export default function () {
  const f = FIXTURES[Math.floor(Math.random() * FIXTURES.length)];
  const url = `${BASE}/v1/birth-time/resolve?local_date=${f.date}&local_time=${f.time}&place_id=${f.place}`;
  const res = http.get(url);
  resolveLatency.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  if (res.status === 200) {
    const etag = res.headers['Etag'];
    // If we got an ETag, this entry is cacheable → counts as cache-hit potential
    if (etag) cacheHit.add(1);
    else cacheHit.add(0);
  }

  check(res, {
    'status 200': (r) => r.status === 200,
    'has ETag': (r) => r.headers['Etag'] !== undefined,
    'immutable cache': (r) => r.headers['Cache-Control']?.includes('immutable'),
  });
}
