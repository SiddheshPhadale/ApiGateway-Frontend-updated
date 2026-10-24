import axios from 'axios';

// Analytics requests go directly to the Python FastAPI service.
// Core API management/auth/payment requests in App.jsx still use Spring Boot.
const analyticsApi = axios.create({
  baseURL: import.meta.env.VITE_ANALYTICS_API_URL || 'http://localhost:8000',
  timeout: 15000,
});

analyticsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const asArray = (value) => Array.isArray(value) ? value : [];
const first = (...values) => values.find((v) => v !== undefined && v !== null);
const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

async function get(url, params) {
  const { data } = await analyticsApi.get(url, { params });
  return data;
}

// FastAPI: GET /analytics/provider/{providerId}/summary
// Optional revenue and consumer endpoints enrich the provider summary.
export async function fetchProviderMetrics(providerId, apiId) {
  if (providerId == null || providerId === '') {
    throw new Error('Provider ID is missing from the logged-in user.');
  }
  const params = apiId != null ? { api_id: apiId } : undefined;
  const [summary, revenue, consumers] = await Promise.all([
    get(`/analytics/provider/${encodeURIComponent(providerId)}/summary`, params),
    get(`/analytics/provider/${encodeURIComponent(providerId)}/revenue`, params).catch(() => ({})),
    get(`/analytics/provider/${encodeURIComponent(providerId)}/consumers`, params).catch(() => ({})),
  ]);

  return {
    ...summary,
    totalRequests: asNumber(first(summary.total_requests, summary.totalRequests, summary.request_count, summary.requests)),
    totalErrors: asNumber(first(summary.total_errors, summary.totalErrors, summary.error_count)),
    errorRatePercentage: asNumber(first(summary.error_rate_percentage, summary.errorRatePercentage, summary.error_rate_percent, summary.errorRate)),
    revenue,
    consumers,
  };
}

// FastAPI: GET /analytics/anomalies/{apiId}
export async function fetchProviderAnomalies(apiId) {
  if (apiId == null || apiId === '') return [];
  return asArray(await get(`/analytics/anomalies/${encodeURIComponent(apiId)}`));
}

// The currently specified FastAPI contract does not define request-stream,
// leaderboard, or slow-endpoint routes. Return empty collections instead of
// accidentally calling the old Spring analytics endpoints.
export async function fetchProviderStream() { return []; }
export async function fetchProviderLeaderboard() { return []; }
export async function fetchProviderSlowestEndpoints() { return []; }

// FastAPI: GET /analytics/consumer/{consumerId}/usage
export async function fetchSubscriberUsage(consumerId, subscriptionId) {
  if (consumerId == null || consumerId === '') {
    throw new Error('Consumer ID is missing from the logged-in user.');
  }
  const params = subscriptionId != null ? { subscription_id: subscriptionId } : undefined;
  const data = await get(`/analytics/consumer/${encodeURIComponent(consumerId)}/usage`, params);
  return {
    ...data,
    totalRequestsMade: asNumber(first(data.total_requests, data.totalRequests, data.requests_today, data.totalRequestsMade)),
  };
}

// FastAPI currently exposes rate-limit status, not a request stream.
export async function fetchSubscriberStream(consumerId, subscriptionId) {
  if (consumerId == null || consumerId === '') {
    throw new Error('Consumer ID is missing from the logged-in user.');
  }
  const params = subscriptionId != null ? { subscription_id: subscriptionId } : undefined;
  const data = await get(`/analytics/consumer/${encodeURIComponent(consumerId)}/rate-limit-status`, params);
  // Preserve the component's list-based display without inventing events.
  return asArray(data.recent_events);
}

export async function fetchProviderRevenue(providerId, apiId) {
  const params = apiId != null ? { api_id: apiId } : undefined;
  return get(`/analytics/provider/${encodeURIComponent(providerId)}/revenue`, params);
}

export async function fetchProviderConsumers(providerId, apiId) {
  const params = apiId != null ? { api_id: apiId } : undefined;
  return get(`/analytics/provider/${encodeURIComponent(providerId)}/consumers`, params);
}

export async function fetchApiPrediction(apiId) {
  if (apiId == null || apiId === '') return {};
  return get(`/analytics/prediction/${encodeURIComponent(apiId)}`);
}

export default analyticsApi;
