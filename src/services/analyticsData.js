// Mock & Live Analytics Data Service for API Gateway
// Generates rich, realistic metrics derived from the Kafka Proxy Request events

export const SAMPLE_APIS = [
  { id: 'all', name: 'All Registered APIs', upstream: '*' },
  { id: '1', name: 'Weather API', upstream: 'https://api.weather.com' },
  { id: '2', name: 'Crypto Exchange API', upstream: 'https://api.coinbase.com/v2' },
  { id: '3', name: 'Payment Gateway Proxy', upstream: 'https://api.stripe.com/v1' },
];

export const INITIAL_ANOMALIES = [
  {
    id: 'anom-1',
    consumerName: 'bot_crawler_99',
    apiKey: 'key_anon_9f82...x91',
    apiName: 'Weather API',
    endpoint: '/api/v1/historical.json',
    anomalyType: 'Abnormal Traffic Spike & High 401s',
    riskScore: 94,
    requestRate: '4,820 req/min',
    errorRate: '68.4%',
    detectedAt: '3 minutes ago',
    details: 'Pattern matches automated credential scraping and endpoint bruteforce.',
    status: 'ACTIVE',
  },
  {
    id: 'anom-2',
    consumerName: 'scraper_alpha',
    apiKey: 'key_prod_33b1...a14',
    apiName: 'Crypto Exchange API',
    endpoint: '/api/v2/orderbook',
    anomalyType: 'High Concurrency Burst',
    riskScore: 78,
    requestRate: '1,450 req/min',
    errorRate: '24.1%',
    detectedAt: '18 minutes ago',
    details: 'Exceeded burst rate limit threshold (120 req/min) by 12x.',
    status: 'ACTIVE',
  }
];

export function getProviderAnalytics(apiId = 'all', timeRange = '24h') {
  const multiplier = timeRange === 'today' || timeRange === '24h' ? 1 : timeRange === '7d' ? 5.8 : 22.4;

  const totalRequestsToday = Math.round(148290);
  const totalRequestsWeek = Math.round(982410);
  const totalRequestsMonth = Math.round(4120800);

  const currentRequests = timeRange === 'today' || timeRange === '24h'
    ? totalRequestsToday
    : timeRange === '7d'
      ? totalRequestsWeek
      : totalRequestsMonth;

  // Requests per hour (24 data points: 00:00 to 23:00) with ML predicted traffic
  const hourlyTraffic = [
    { hour: '00:00', actual: 3200, predicted: 3100, latency: 118 },
    { hour: '02:00', actual: 2100, predicted: 2300, latency: 112 },
    { hour: '04:00', actual: 1850, predicted: 1900, latency: 109 },
    { hour: '06:00', actual: 2900, predicted: 2800, latency: 115 },
    { hour: '08:00', actual: 6400, predicted: 6100, latency: 128 },
    { hour: '10:00', actual: 9800, predicted: 9500, latency: 142 },
    { hour: '12:00', actual: 12400, predicted: 11800, latency: 156 },
    { hour: '14:00', actual: 15800, predicted: 15200, latency: 168 },
    { hour: '15:00', actual: 18200, predicted: 17500, latency: 174 }, // Peak
    { hour: '16:00', actual: 17400, predicted: 18000, latency: 165 }, // Peak
    { hour: '17:00', actual: 16100, predicted: 16800, latency: 160 },
    { hour: '18:00', actual: 14200, predicted: 15100, latency: 152 },
    { hour: '20:00', actual: 10500, predicted: 11200, latency: 139 },
    { hour: '22:00', actual: 6900, predicted: 7200, latency: 125 },
  ];

  // Requests per endpoint
  const endpoints = [
    { endpoint: '/v1/current.json', method: 'GET', calls: Math.round(58400 * (multiplier / (timeRange === '24h' ? 1 : 4))), share: 39.4, avgResponseTime: 112, status: 'Healthy' },
    { endpoint: '/v1/forecast.json', method: 'GET', calls: Math.round(41200 * (multiplier / (timeRange === '24h' ? 1 : 4))), share: 27.8, avgResponseTime: 145, status: 'Healthy' },
    { endpoint: '/v1/history.json', method: 'GET', calls: Math.round(24100 * (multiplier / (timeRange === '24h' ? 1 : 4))), share: 16.2, avgResponseTime: 238, status: 'Slow' },
    { endpoint: '/v1/alerts.json', method: 'GET', calls: Math.round(15300 * (multiplier / (timeRange === '24h' ? 1 : 4))), share: 10.3, avgResponseTime: 98, status: 'Healthy' },
    { endpoint: '/v1/locations.json', method: 'POST', calls: Math.round(9290 * (multiplier / (timeRange === '24h' ? 1 : 4))), share: 6.3, avgResponseTime: 312, status: 'Slow' },
  ];

  // Revenue stats
  const totalGrossEarnings = 92450; // In INR or USD
  const commissionRate = 0.10; // 10% platform fee
  const platformCommission = Math.round(totalGrossEarnings * commissionRate);
  const netEarnings = totalGrossEarnings - platformCommission;

  const earningsPerPlan = [
    { planName: 'Free Tier', subscribers: 54, price: 0, earnings: 0, share: 0, color: '#94a3b8' },
    { planName: 'Basic Tier', subscribers: 48, price: 499, earnings: 23952, share: 25.9, color: '#38bdf8' },
    { planName: 'Pro Tier', subscribers: 32, price: 1499, earnings: 47968, share: 51.9, color: '#8b5cf6' },
    { planName: 'Enterprise Tier', subscribers: 8, price: 2566, earnings: 20530, share: 22.2, color: '#10b981' },
  ];

  const revenueTrend = [
    { period: 'May', gross: 58000, net: 52200 },
    { period: 'Jun', gross: 66400, net: 59760 },
    { period: 'Jul', gross: 74200, net: 66780 },
    { period: 'Aug', gross: 81900, net: 73710 },
    { period: 'Sep', gross: 88500, net: 79650 },
    { period: 'Oct (Current)', gross: 92450, net: 83205 },
  ];

  // Health stats
  const healthStats = {
    avgResponseTime: 138, // ms
    p50: 98,
    p95: 245,
    p99: 410,
    errorRate: 0.42, // %
    totalFailedRequests: Math.round(currentRequests * 0.0042),
    statusBreakdown: {
      success2xx: 99.58,
      client4xx: 0.33, // 78% of errors
      server5xx: 0.09, // 22% of errors
    },
    errorRatio: {
      fourXxPercent: 78.5,
      fiveXxPercent: 21.5,
    },
    slowestEndpoints: [
      { endpoint: '/v1/locations.json', method: 'POST', avgResponseTime: 312, p99: 580, calls: 9290, flag: 'Needs DB Indexing' },
      { endpoint: '/v1/history.json', method: 'GET', avgResponseTime: 238, p99: 490, calls: 24100, flag: 'Cold Cache Misses' },
      { endpoint: '/v1/forecast.json', method: 'GET', avgResponseTime: 145, p99: 290, calls: 41200, flag: 'Optimal' },
    ]
  };

  // Consumer stats
  const consumerStats = {
    totalSubscribers: 142,
    activeSubscribers: 128,
    newSubscriptionsThisMonth: 23,
    mostSubscribedPlan: 'Basic Tier (48 subs)',
    topConsumers: [
      { id: 'c1', name: 'fintech_flow', apiKey: 'key_live_7a9f...3c', requests: 46200, share: 31.2, plan: 'Enterprise', errorRate: '0.12%', status: 'Active' },
      { id: 'c2', name: 'cloud_mobile_apps', apiKey: 'key_live_88b1...91', requests: 38450, share: 25.9, plan: 'Pro', errorRate: '0.24%', status: 'Active' },
      { id: 'c3', name: 'weather_dashboard_pro', apiKey: 'key_live_12c4...e8', requests: 29100, share: 19.6, plan: 'Pro', errorRate: '0.38%', status: 'Active' },
      { id: 'c4', name: 'data_crawler_x', apiKey: 'key_live_44f0...77', requests: 18200, share: 12.3, plan: 'Basic', errorRate: '1.42%', status: 'Active' },
      { id: 'c5', name: 'john_developer', apiKey: 'key_dev_09a2...15', requests: 7420, share: 5.0, plan: 'Free', errorRate: '0.05%', status: 'Active' },
    ]
  };

  // ML Layer
  const mlInsights = {
    predictedNext24hTraffic: 168400,
    expectedGrowth: '+13.5%',
    peakHourPrediction: '15:00 - 17:30 UTC',
    peakTrafficMultiplier: '2.4x baseline',
    trafficForecastAlert: '🔮 High Traffic Surge Predicted: Traffic model projects a 38% spike in calls between 15:00 - 18:00 UTC due to weekend activity peak. Recommended: Ensure upstream auto-scaling is enabled.',
    activeAnomaliesCount: 2,
    anomalies: INITIAL_ANOMALIES,
  };

  return {
    timeRange,
    totalRequests: currentRequests,
    totalRequestsToday,
    totalRequestsWeek,
    totalRequestsMonth,
    hourlyTraffic,
    endpoints,
    revenue: {
      totalGrossEarnings,
      platformCommission,
      netEarnings,
      commissionRate: 10,
      earningsPerPlan,
      revenueTrend,
    },
    health: healthStats,
    consumers: consumerStats,
    mlInsights,
  };
}

export function getConsumerAnalytics(subId = 'sub-1', timeRange = 'today') {
  const requestsMadeToday = 8420;
  const dailyRateLimit = 10000;
  const remainingRequests = Math.max(0, dailyRateLimit - requestsMadeToday);
  const quotaUsagePercent = ((requestsMadeToday / dailyRateLimit) * 100).toFixed(1);

  // Hourly calls made by this consumer
  const hourlyUsage = [
    { hour: '00:00', requests: 120, limit: 416 },
    { hour: '02:00', requests: 90, limit: 416 },
    { hour: '04:00', requests: 80, limit: 416 },
    { hour: '06:00', requests: 140, limit: 416 },
    { hour: '08:00', requests: 460, limit: 416 },
    { hour: '10:00', requests: 890, limit: 416 },
    { hour: '12:00', requests: 1240, limit: 416 },
    { hour: '14:00', requests: 1580, limit: 416 },
    { hour: '16:00', requests: 1820, limit: 416 },
    { hour: '18:00', requests: 1120, limit: 416 },
    { hour: '20:00', requests: 880, limit: 416 },
  ];

  const endpointBreakdown = [
    { endpoint: '/v1/current.json', method: 'GET', calls: 5240, percentage: 62.2, avgResponseTime: 124 },
    { endpoint: '/v1/forecast.json', method: 'GET', calls: 2210, percentage: 26.2, avgResponseTime: 158 },
    { endpoint: '/v1/alerts.json', method: 'GET', calls: 970, percentage: 11.6, avgResponseTime: 92 },
  ];

  const subscriptionInfo = {
    planName: 'Pro Developer Plan',
    rateLimitPerMinute: 60,
    dailyLimit: 10000,
    monthlyLimit: 300000,
    startDate: '2026-10-01',
    renewalDate: '2026-11-01',
    amountPaid: 1499,
    currency: 'INR',
    keyStatus: 'ACTIVE',
    maskedKey: 'key_live_89a2bc••••••••41ef',
  };

  const performance = {
    avgResponseTime: 134, // ms
    p95ResponseTime: 210,
    errorRate: 0.38,
    totalErrors: 32,
    mostCalledEndpoint: '/v1/current.json (5,240 calls)',
    successRate: 99.62,
  };

  // ML Layer for Consumer
  const isApproachingLimit = requestsMadeToday / dailyRateLimit >= 0.75;
  const currentVelocityReqPerMin = 18.2;
  const minutesUntilExhaustion = Math.round(remainingRequests / currentVelocityReqPerMin);

  const mlInsights = {
    isApproachingLimit,
    velocityPerMinute: currentVelocityReqPerMin,
    estimatedMinutesRemaining: minutesUntilExhaustion,
    predictedDayEndUsage: 11350,
    projectedExceedPercent: 13.5,
    warningTitle: '⚠️ Approaching Daily Rate Limit Warning',
    warningMessage: `You have consumed ${quotaUsagePercent}% of your 10,000 daily requests. At your current usage velocity (${currentVelocityReqPerMin} req/min), your remaining quota (${remainingRequests.toLocaleString()}) will exhaust in ~${Math.floor(minutesUntilExhaustion / 60)}h ${minutesUntilExhaustion % 60}m.`,
    recommendation: 'Upgrade to Enterprise tier for unlimited burst allowance, or implement local client-side caching to avoid HTTP 429 throttling.',
  };

  return {
    requestsMadeToday,
    dailyRateLimit,
    remainingRequests,
    quotaUsagePercent,
    hourlyUsage,
    endpointBreakdown,
    subscriptionInfo,
    performance,
    mlInsights,
  };
}

// Generate a realistic single Kafka Proxy Event matching user format:
export function generateKafkaEvent(apiName = 'Weather API', consumerName = 'john') {
  const endpoints = [
    { ep: '/current.json', method: 'GET', baseLatency: 120 },
    { ep: '/forecast.json', method: 'GET', baseLatency: 160 },
    { ep: '/history.json', method: 'GET', baseLatency: 240 },
    { ep: '/alerts.json', method: 'GET', baseLatency: 95 },
  ];
  const consumers = ['john', 'sarah_dev', 'fintech_app', 'alex_bot', 'mobile_client'];
  const plans = ['Basic', 'Pro', 'Enterprise'];
  const statusCodes = [200, 200, 200, 200, 200, 201, 304, 400, 429, 500];

  const chosenEp = endpoints[Math.floor(Math.random() * endpoints.length)];
  const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
  const responseTime = Math.round(chosenEp.baseLatency + (Math.random() * 80 - 40));

  return {
    apiKey: `key_${Math.random().toString(36).substring(2, 8)}`,
    apiName: apiName || 'Weather API',
    consumerName: consumerName || consumers[Math.floor(Math.random() * consumers.length)],
    planName: plans[Math.floor(Math.random() * plans.length)],
    endpoint: chosenEp.ep,
    method: chosenEp.method,
    statusCode: statusCode,
    responseTime: Math.max(25, responseTime),
    timestamp: new Date().toISOString(),
  };
}
