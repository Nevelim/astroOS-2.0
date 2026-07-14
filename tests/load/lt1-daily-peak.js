/**
 * LT-1: Daily ritual peak — simulated morning rush on Daily Content.
 *
 * Target (per Architecture ADR): 50K RPS on BFF /daily (5K raw after CDN).
 * This local test uses a smaller target to validate correctness; the real
 * distributed run needs k6 Cloud or multiple load generators.
 *
 * SLO: p95 < 100ms, error rate < 0.1%
 *
 * Usage:  k6 run tests/load/lt1-daily-peak.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3007';
const errorRate = new Rate('errors');
const latency = new Trend('daily_latency', true);

export const options = {
  stages: [
    { duration: '30s', target: 50 },    // ramp up
    { duration: '1m', target: 50 },     // hold
    { duration: '30s', target: 200 },   // burst
    { duration: '30s', target: 200 },   // hold burst
    { duration: '15s', target: 0 },     // ramp down
  ],
  thresholds: {
    errors: ['rate<0.01'],               // < 1% errors
    http_req_duration: ['p(95)<200'],    // p95 < 200ms (local, relaxed)
  },
};

const SIGNS = ['aries','taurus','gemini','cancer','leo','virgo',
               'libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

export default function () {
  const sign = SIGNS[Math.floor(Math.random() * 12)];
  const lang = Math.random() > 0.5 ? 'ru' : 'en';
  const url = `${BASE}/v1/daily/${sign}?lang=${lang}`;
  const res = http.get(url);
  latency.add(res.timings.duration);
  errorRate.add(res.status !== 200);
  check(res, {
    'status 200': (r) => r.status === 200,
    'has body': (r) => r.json('body') !== undefined && r.json('body').length > 10,
  });
}
