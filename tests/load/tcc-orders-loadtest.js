import http from 'k6/http';
import { check, sleep } from 'k6';

// Read-only load against the real tcc-orders Edge Function.
// The synthetic future-dated order reference cannot create or modify an order.
const BASE_URL = __ENV.TCC_ORDERS_URL || 'https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders';
const LOOKUP_REF = 'TCC-20990101-LOAD50';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY;

export const options = {
  stages: [
    { duration: '1m', target: 5 },
    { duration: '2m', target: 10 },
    { duration: '2m', target: 25 },
    { duration: '10m', target: 50 },
    { duration: '2m', target: 5 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  const response = http.get(
    `${BASE_URL}?action=order-lookup&lookup=${LOOKUP_REF}`,
    {
      headers: {
        Accept: 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      tags: { endpoint: 'read-only-order-lookup' },
      timeout: '10s',
    },
  );

  let payload = null;
  try {
    payload = response.json();
  } catch (_) {
    // The checks below report a malformed/non-JSON response.
  }

  check(response, {
    'lookup returns HTTP 200': (r) => r.status === 200,
    'lookup returns an orders array': () => Array.isArray(payload?.orders),
    'synthetic reference returns no records': () =>
      Array.isArray(payload?.orders) && payload.orders.length === 0,
  });

  sleep(1);
}
