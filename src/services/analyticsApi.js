import axios from 'axios';

// Analytics & ML microservice runs on Python FastAPI (http://localhost:8000 by default)
const analyticsApi = axios.create({
  baseURL: import.meta.env.VITE_ANALYTICS_API_URL || 'http://localhost:8000',
  timeout: 15000,
});

const DEFAULT_UUID = '00000000-0000-0000-0000-000000000000';

analyticsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function safeGet(url, params = {}) {
  try {
    const response = await analyticsApi.get(url, { params });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Request failed';
    const err = new Error(typeof message === 'string' ? message : JSON.stringify(message));
    err.status = error.response?.status;
    err.original = error;
    throw err;
  }
}

async function safePost(url, data = {}) {
  try {
    const response = await analyticsApi.post(url, data);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Request failed';
    const err = new Error(typeof message === 'string' ? message : JSON.stringify(message));
    err.status = error.response?.status;
    err.original = error;
    throw err;
  }
}

/* =======================================================================
   1. 📊 Provider Analytics Endpoints
   ======================================================================= */

/**
 * 1.1 Summary Metrics
 * GET /analytics/provider/{providerId}/apis/{apiId}/summary
 */
export async function fetchProviderSummary(providerId, apiId) {
  if (!apiId) throw new Error('apiId is required');
  const pid = providerId || DEFAULT_UUID;
  return safeGet(`/analytics/provider/${encodeURIComponent(pid)}/apis/${encodeURIComponent(apiId)}/summary`);
}

/**
 * 1.2 Requests Trend (Graph Data)
 * GET /analytics/provider/{providerId}/apis/{apiId}/requests
 */
export async function fetchProviderRequestsTrend(providerId, apiId, { period = 'day', days = 30 } = {}) {
  if (!apiId) throw new Error('apiId is required');
  const pid = providerId || DEFAULT_UUID;
  return safeGet(`/analytics/provider/${encodeURIComponent(pid)}/apis/${encodeURIComponent(apiId)}/requests`, {
    period,
    days,
  });
}

/**
 * 1.3 Endpoints Breakdown
 * GET /analytics/provider/{providerId}/apis/{apiId}/endpoints
 */
export async function fetchProviderEndpoints(providerId, apiId) {
  if (!apiId) throw new Error('apiId is required');
  const pid = providerId || DEFAULT_UUID;
  return safeGet(`/analytics/provider/${encodeURIComponent(pid)}/apis/${encodeURIComponent(apiId)}/endpoints`);
}

/**
 * 1.4 Peak Hours (00:00 - 23:00)
 * GET /analytics/provider/{providerId}/apis/{apiId}/peak-hours
 */
export async function fetchProviderPeakHours(providerId, apiId) {
  if (!apiId) throw new Error('apiId is required');
  const pid = providerId || DEFAULT_UUID;
  return safeGet(`/analytics/provider/${encodeURIComponent(pid)}/apis/${encodeURIComponent(apiId)}/peak-hours`);
}

/**
 * 1.5 Revenue Analytics
 * GET /analytics/provider/{providerId}/apis/{apiId}/revenue
 */
export async function fetchProviderRevenue(providerId, apiId) {
  if (!apiId) throw new Error('apiId is required');
  const pid = providerId || DEFAULT_UUID;
  return safeGet(`/analytics/provider/${encodeURIComponent(pid)}/apis/${encodeURIComponent(apiId)}/revenue`);
}

/**
 * 1.6 Plans Performance
 * GET /analytics/provider/{providerId}/apis/{apiId}/plans/performance
 */
export async function fetchProviderPlansPerformance(providerId, apiId) {
  if (!apiId) throw new Error('apiId is required');
  const pid = providerId || DEFAULT_UUID;
  return safeGet(`/analytics/provider/${encodeURIComponent(pid)}/apis/${encodeURIComponent(apiId)}/plans/performance`);
}

/**
 * 1.7 Errors Breakdown
 * GET /analytics/provider/{providerId}/apis/{apiId}/errors
 */
export async function fetchProviderErrors(providerId, apiId) {
  if (!apiId) throw new Error('apiId is required');
  const pid = providerId || DEFAULT_UUID;
  return safeGet(`/analytics/provider/${encodeURIComponent(pid)}/apis/${encodeURIComponent(apiId)}/errors`);
}

/**
 * 1.8 Response Time Trends
 * GET /analytics/provider/{providerId}/apis/{apiId}/response-time
 */
export async function fetchProviderResponseTime(providerId, apiId, { days = 30 } = {}) {
  if (!apiId) throw new Error('apiId is required');
  const pid = providerId || DEFAULT_UUID;
  return safeGet(`/analytics/provider/${encodeURIComponent(pid)}/apis/${encodeURIComponent(apiId)}/response-time`, {
    days,
  });
}

/**
 * 1.9 Top Consumers
 * GET /analytics/provider/{providerId}/apis/{apiId}/consumers
 */
export async function fetchProviderConsumers(providerId, apiId) {
  if (!apiId) throw new Error('apiId is required');
  const pid = providerId || DEFAULT_UUID;
  return safeGet(`/analytics/provider/${encodeURIComponent(pid)}/apis/${encodeURIComponent(apiId)}/consumers`);
}

/* =======================================================================
   2. 👤 Consumer Analytics Endpoints
   ======================================================================= */

/**
 * 2.1 Consumer Usage
 * GET /analytics/consumer/{consumerId}/apis/{apiId}/usage
 */
export async function fetchConsumerUsage(consumerId, apiId) {
  if (!consumerId || !apiId) throw new Error('consumerId and apiId are required');
  return safeGet(`/analytics/consumer/${encodeURIComponent(consumerId)}/apis/${encodeURIComponent(apiId)}/usage`);
}

/**
 * 2.2 Rate Limit Gauge
 * GET /analytics/consumer/{consumerId}/apis/{apiId}/rate-limit
 */
export async function fetchConsumerRateLimit(consumerId, apiId) {
  if (!consumerId || !apiId) throw new Error('consumerId and apiId are required');
  return safeGet(`/analytics/consumer/${encodeURIComponent(consumerId)}/apis/${encodeURIComponent(apiId)}/rate-limit`);
}

/**
 * 2.3 Consumer Top Endpoints
 * GET /analytics/consumer/{consumerId}/apis/{apiId}/endpoints
 */
export async function fetchConsumerEndpoints(consumerId, apiId) {
  if (!consumerId || !apiId) throw new Error('consumerId and apiId are required');
  return safeGet(`/analytics/consumer/${encodeURIComponent(consumerId)}/apis/${encodeURIComponent(apiId)}/endpoints`);
}

/**
 * 2.4 Consumer Errors
 * GET /analytics/consumer/{consumerId}/apis/{apiId}/errors
 */
export async function fetchConsumerErrors(consumerId, apiId) {
  if (!consumerId || !apiId) throw new Error('consumerId and apiId are required');
  return safeGet(`/analytics/consumer/${encodeURIComponent(consumerId)}/apis/${encodeURIComponent(apiId)}/errors`);
}

/**
 * 2.5 Subscription Card
 * GET /analytics/consumer/{consumerId}/apis/{apiId}/subscription
 */
export async function fetchConsumerSubscription(consumerId, apiId) {
  if (!consumerId || !apiId) throw new Error('consumerId and apiId are required');
  return safeGet(`/analytics/consumer/${encodeURIComponent(consumerId)}/apis/${encodeURIComponent(apiId)}/subscription`);
}

/* =======================================================================
   3. 🧠 ML & Predictive Analytics Endpoints
   ======================================================================= */

/**
 * 3.1 Anomaly Status (API-Level)
 * GET /ml/anomaly/{apiId}/status
 */
export async function fetchAnomalyStatus(apiId) {
  if (!apiId) throw new Error('apiId is required');
  return safeGet(`/ml/anomaly/${encodeURIComponent(apiId)}/status`);
}

/**
 * 3.2 Anomaly History
 * GET /ml/anomaly/{apiId}/history?limit={limit}
 */
export async function fetchAnomalyHistory(apiId, { limit = 50 } = {}) {
  if (!apiId) throw new Error('apiId is required');
  return safeGet(`/ml/anomaly/${encodeURIComponent(apiId)}/history`, { limit });
}

/**
 * 3.3 Consumer Anomaly Check
 * GET /ml/anomaly/consumer/{consumerId}/apis/{apiId}
 */
export async function fetchConsumerAnomalyCheck(consumerId, apiId) {
  if (!consumerId || !apiId) throw new Error('consumerId and apiId are required');
  return safeGet(`/ml/anomaly/consumer/${encodeURIComponent(consumerId)}/apis/${encodeURIComponent(apiId)}`);
}

/**
 * 3.4 Retrain Anomaly Model
 * POST /ml/anomaly/{apiId}/train
 */
export async function retrainAnomalyModel(apiId) {
  if (!apiId) throw new Error('apiId is required');
  return safePost(`/ml/anomaly/${encodeURIComponent(apiId)}/train`, {});
}

/**
 * 3.5 Next-Hour Forecast (Minute-by-Minute)
 * GET /ml/prediction/{apiId}/next-hour
 */
export async function fetchNextHourForecast(apiId) {
  if (!apiId) throw new Error('apiId is required');
  return safeGet(`/ml/prediction/${encodeURIComponent(apiId)}/next-hour`);
}

/**
 * 3.6 Next-24-Hours Forecast (Hourly Forecast)
 * GET /ml/prediction/{apiId}/next-24-hours
 */
export async function fetchNext24HoursForecast(apiId) {
  if (!apiId) throw new Error('apiId is required');
  return safeGet(`/ml/prediction/${encodeURIComponent(apiId)}/next-24-hours`);
}

/**
 * 3.7 Peak Traffic Forecast
 * GET /ml/prediction/{apiId}/peak-forecast
 */
export async function fetchPeakTrafficForecast(apiId) {
  if (!apiId) throw new Error('apiId is required');
  return safeGet(`/ml/prediction/${encodeURIComponent(apiId)}/peak-forecast`);
}

/**
 * 3.8 Smart Alerts
 * GET /ml/alerts/{targetId}
 */
export async function fetchSmartAlerts(targetId) {
  if (!targetId) throw new Error('targetId is required');
  return safeGet(`/ml/alerts/${encodeURIComponent(targetId)}`);
}

export async function fetchProviderSmartAlerts(providerId) {
  const pid = providerId || DEFAULT_UUID;
  return safeGet(`/ml/alerts/provider/${encodeURIComponent(pid)}`);
}

export async function fetchApiSmartAlerts(apiId) {
  if (!apiId) throw new Error('apiId is required');
  return safeGet(`/ml/alerts/api/${encodeURIComponent(apiId)}`);
}

/* =======================================================================
   4. Service Health
   ======================================================================= */

/**
 * GET /health
 */
export async function fetchAnalyticsHealth() {
  return safeGet('/health');
}

export default analyticsApi;
