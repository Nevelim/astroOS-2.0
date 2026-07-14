/**
 * LT-3: Onboarding burst — parallel birth-time resolutions.
 *
 * Target: 1K parallel registrations, 5K cold computes.
 * SLO: WOW moment < 3s p95.
 *
 * Usage:  k6 run tests/load/lt3-onboarding-burst.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3009';
const errorRate = new Rate('errors');
const resolveLatency = new Trend('birth_time_resolve_ms', true);

export const options = {
  stages: [
    { duration: '20s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '20s', target: 300 },
    { duration: '30s', target: 300 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.02'],
    birth_time_resolve_ms: ['p(95)<1000'],
    http_req_duration: ['p(95)<1200'],
  },
};

const PLACES = [
  { placeId: 'geonames:1520132', name: 'Pavlodar' },
  { placeId: 'geonames:524901',  name: 'Moscow' },
  { placeId: 'geonames:5128581', name: 'NewYork' },
  { placeId: 'geonames:2643743', name: 'London' },
  { placeId: 'geonames:1275339', name: 'Mumbai' },
];

export default function () {
  const place = PLACES[Math.floor(Math.random() * PLACES.length)];
  const year = 1960 + Math.floor(Math.random() * 45);
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  const hour = Math.floor(Math.random() * 24);
  const min = Math.floor(Math.random() * 60);

  const url = `${BASE}/v1/birth-time/resolve?local_date=${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}&local_time=${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}&place_id=${place.placeId}`;

  const res = http.get(url);
  resolveLatency.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  check(res, {
    'status 200': (r) => r.status === 200,
    'has TST': (r) => r.json('resolution.true_solar_time') !== undefined,
    'has hash': (r) => r.json('birth_data_hash', '').startsWith('sha256:'),
  });
}
