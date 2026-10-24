
import axios from 'axios';

const analyticsApi = axios.create({
  baseURL: import.meta.env.VITE_ANALYTICS_API_URL || 'http://localhost:8000',
  timeout: 10000,
});

analyticsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const first = (...values) =>
  values.find((v) => v !== undefined && v !== null);

const asNumber = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const asArray = (value) => Array.isArray(value) ? value : [];

async function getOptional(url) {
  try {
    const response = await analyticsApi.get(url);
    return { data: response.data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error.response?.data?.detail || error.message || 'Request failed',
    };
  }
}

export async function fetchProviderAnalytics({
  providerId,
  apiId = 'all',
  timeRange = '24h',
}) {
  if (providerId == null || providerId === '') {
    throw new Error('Provider ID is missing from the logged-in user.');
  }

  const params = new URLSearchParams({ range: timeRange });
  if (apiId !== 'all') params.set('api_id', apiId);

  const root = `/analytics/provider/${encodeURIComponent(providerId)}`;
  const results = await Promise.all([
    getOptional(`${root}/summary?${params}`),
    getOptional(`${root}/revenue?${params}`),
    getOptional(`${root}/consumers?${params}`),
    apiId !== 'all'
      ? getOptional(`/analytics/anomalies/${encodeURIComponent(apiId)}`)
      : Promise.resolve({ data: [], error: null }),
    apiId !== 'all'
      ? getOptional(`/analytics/prediction/${encodeURIComponent(apiId)}`)
      : Promise.resolve({ data: {}, error: null }),
  ]);

  const [summary, revenue, consumers, anomalies, prediction] = results;

  return {
    summary: summary.data || {},
    revenue: revenue.data || {},
    consumers: consumers.data || {},
    anomalies: anomalies.data,
    prediction: prediction.data || {},
    errors: results
      .map((r, index) => r.error ? { endpoint: index, message: r.error } : null)
      .filter(Boolean),
  };
}

export async function fetchConsumerAnalytics({
  consumerId,
  subscriptionId,
  timeRange = 'today',
}) {
  if (consumerId == null || consumerId === '') {
    throw new Error('Consumer ID is missing from the logged-in user.');
  }

  const params = new URLSearchParams({ range: timeRange });
  if (subscriptionId != null && subscriptionId !== '') {
    params.set('subscription_id', subscriptionId);
  }

  const root = `/analytics/consumer/${encodeURIComponent(consumerId)}`;
  const results = await Promise.all([
    getOptional(`${root}/usage?${params}`),
    getOptional(`${root}/rate-limit-status?${params}`),
  ]);

  return {
    usage: results[0].data || {},
    rateLimit: results[1].data || {},
    errors: results
      .map((r, index) => r.error ? { endpoint: index, message: r.error } : null)
      .filter(Boolean),
  };
}

export function mergeProviderAnalytics(base, live) {
  const s = live?.summary || {};
  const r = live?.revenue || {};
  const c = live?.consumers || {};
  const p = live?.prediction || {};

  const requestCount = first(
    s.total_requests, s.totalRequests, s.request_count, s.requests
  );
  const avgLatency = first(
    s.avg_response_time_ms, s.avgResponseTime, s.average_latency_ms
  );
  const errorRate = first(s.error_rate_percent, s.errorRate, s.error_rate);
  const activeConsumers = first(c.active_consumers, c.activeConsumers);
  const totalConsumers = first(c.total_consumers, c.totalConsumers);
  const anomalies = live?.anomalies;

  return {
    ...base,
    ...(requestCount !== undefined
      ? { totalRequests: asNumber(requestCount) } : {}),
    ...(avgLatency !== undefined || errorRate !== undefined
      ? {
          health: {
            ...base.health,
            ...(avgLatency !== undefined
              ? { avgResponseTime: asNumber(avgLatency) } : {}),
            ...(errorRate !== undefined
              ? { errorRate: asNumber(errorRate) } : {}),
            ...(s.p50_ms !== undefined ? { p50: asNumber(s.p50_ms) } : {}),
            ...(s.p95_ms !== undefined ? { p95: asNumber(s.p95_ms) } : {}),
            ...(s.p99_ms !== undefined ? { p99: asNumber(s.p99_ms) } : {}),
          },
        } : {}),
    ...(activeConsumers !== undefined || totalConsumers !== undefined
      ? {
          consumers: {
            ...base.consumers,
            ...(activeConsumers !== undefined
              ? { activeSubscribers: asNumber(activeConsumers) } : {}),
            ...(totalConsumers !== undefined
              ? { totalSubscribers: asNumber(totalConsumers) } : {}),
            ...(Array.isArray(c.top_consumers)
              ? { topConsumers: c.top_consumers } : {}),
          },
        } : {}),
    ...(r.total_gross_earnings !== undefined ||
        r.gross_revenue !== undefined ||
        r.totalGrossEarnings !== undefined
      ? {
          revenue: {
            ...base.revenue,
            totalGrossEarnings: asNumber(first(
              r.total_gross_earnings, r.gross_revenue, r.totalGrossEarnings
            )),
            platformCommission: asNumber(first(
              r.platform_commission, r.platformCommission,
              base.revenue.platformCommission
            )),
            netEarnings: asNumber(first(
              r.net_earnings, r.netEarnings, base.revenue.netEarnings
            )),
            earningsPerPlan: asArray(first(
              r.earnings_per_plan, r.earningsPerPlan,
              base.revenue.earningsPerPlan
            )),
            revenueTrend: asArray(first(
              r.revenue_trend, r.revenueTrend, base.revenue.revenueTrend
            )),
          },
        } : {}),
    mlInsights: {
      ...base.mlInsights,
      ...(p.predicted_next_24h_traffic !== undefined
        ? { predictedNext24hTraffic: asNumber(p.predicted_next_24h_traffic) }
        : {}),
      ...(p.expected_growth !== undefined
        ? { expectedGrowth: p.expected_growth } : {}),
      ...(Array.isArray(anomalies) ? { anomalies } : {}),
    },
  };
}

export function mergeConsumerAnalytics(base, live) {
  const u = live?.usage || {};
  const r = live?.rateLimit || {};

  const used = asNumber(first(
    u.requests_today, u.requestsMadeToday, u.total_requests,
    u.totalRequests
  ), base.requestsMadeToday);

  const limit = asNumber(first(
    r.daily_limit, r.dailyLimit, r.daily_quota
  ), base.dailyRateLimit);

  const remaining = first(r.remaining_requests, r.remainingRequests);
  const usagePercent = first(
    r.usage_percent, r.usagePercent, u.usage_percent, u.usagePercent
  );

  const endpoints = first(u.endpoint_breakdown, u.endpointBreakdown);
  const hourly = first(u.hourly_usage, u.hourlyUsage, u.hourly_traffic);
  const avgLatency = first(u.avg_response_time_ms, u.avgResponseTime);
  const totalErrors = first(u.total_errors, u.totalErrors);

  return {
    ...base,
    requestsMadeToday: used,
    dailyRateLimit: limit,
    remainingRequests: remaining !== undefined
      ? asNumber(remaining) : Math.max(0, limit - used),
    quotaUsagePercent: usagePercent !== undefined
      ? asNumber(usagePercent).toFixed(1)
      : (limit ? (used / limit * 100).toFixed(1) : '0.0'),
    ...(Array.isArray(endpoints)
      ? {
          endpointBreakdown: endpoints.map((x) => ({
            endpoint: first(x.endpoint, x.route, 'Unknown'),
            method: first(x.method, x.http_method, 'GET'),
            calls: asNumber(first(x.calls, x.requests, x.count)),
            percentage: asNumber(first(x.percentage, x.share_percent)),
            avgResponseTime: asNumber(first(
              x.avg_response_time_ms, x.avgResponseTime, x.latency_ms
            )),
          })),
        } : {}),
    ...(Array.isArray(hourly)
      ? {
          hourlyUsage: hourly.map((x) => ({
            hour: first(x.hour, x.label, x.timestamp, ''),
            requests: asNumber(first(x.requests, x.actual, x.count)),
            limit: asNumber(first(x.limit, x.rate_limit, 0)),
          })),
        } : {}),
    ...(avgLatency !== undefined || totalErrors !== undefined
      ? {
          performance: {
            ...base.performance,
            ...(avgLatency !== undefined
              ? { avgResponseTime: asNumber(avgLatency) } : {}),
            ...(u.p95_ms !== undefined
              ? { p95ResponseTime: asNumber(u.p95_ms) } : {}),
            ...(u.error_rate !== undefined
              ? { errorRate: asNumber(u.error_rate) } : {}),
            ...(totalErrors !== undefined
              ? { totalErrors: asNumber(totalErrors) } : {}),
          },
        } : {}),
    mlInsights: {
      ...base.mlInsights,
      ...(r.is_approaching_limit !== undefined
        ? { isApproachingLimit: Boolean(r.is_approaching_limit) } : {}),
      ...(u.predicted_day_end_usage !== undefined
        ? { predictedDayEndUsage: asNumber(u.predicted_day_end_usage) } : {}),
      ...(r.velocity_per_minute !== undefined
        ? { velocityPerMinute: asNumber(r.velocity_per_minute) } : {}),
    },
  };
}
