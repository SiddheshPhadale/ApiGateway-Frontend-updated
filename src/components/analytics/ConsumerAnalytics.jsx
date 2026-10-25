import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Clock,
  Key,
  ShieldAlert,
  Flame,
  Zap,
} from 'lucide-react';
import {
  fetchConsumerUsage,
  fetchConsumerRateLimit,
  fetchConsumerEndpoints,
  fetchConsumerErrors,
  fetchConsumerSubscription,
  fetchConsumerAnomalyCheck,
} from '../../services/analyticsApi';
import { RadialRateLimitGauge } from './AnalyticsCharts';

const panel = {
  background: 'var(--surface-color, rgba(30, 41, 59, 0.7))',
  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
  borderRadius: 14,
  padding: '1.25rem',
  backdropFilter: 'blur(16px)',
};

const muted = { color: 'var(--text-secondary, #94a3b8)' };

const cell = {
  padding: '0.65rem',
  borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
  textAlign: 'left',
};

export function ConsumerAnalytics({
  subscription,
  subscriptionId,
  consumerId,
  onBack,
}) {
  const [usage, setUsage] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);
  const [endpoints, setEndpoints] = useState(null);
  const [errorsData, setErrorsData] = useState(null);
  const [subDetails, setSubDetails] = useState(null);
  const [anomaly, setAnomaly] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const subId =
    subscriptionId ??
    subscription?.subId ??
    subscription?.subscriptionId ??
    subscription?.id;

  const apiId =
    subscription?.apiId ??
    subscription?.api?.apiId ??
    subscription?.api?.id;

  const effectiveConsumerId =
    consumerId ||
    subscription?.consumerId ||
    subscription?.userId ||
    subscription?.user_id ||
    '00000000-0000-0000-0000-000000000000';

  const load = useCallback(async (isSilent = false) => {
    if (!apiId) {
      setError('API ID is missing. Ensure you selected a valid subscription.');
      setLoading(false);
      return;
    }

    if (isSilent) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const [uRes, rlRes, epRes, errRes, subRes, anomRes] = await Promise.allSettled([
        fetchConsumerUsage(effectiveConsumerId, apiId),
        fetchConsumerRateLimit(effectiveConsumerId, apiId),
        fetchConsumerEndpoints(effectiveConsumerId, apiId),
        fetchConsumerErrors(effectiveConsumerId, apiId),
        fetchConsumerSubscription(effectiveConsumerId, apiId),
        fetchConsumerAnomalyCheck(effectiveConsumerId, apiId),
      ]);

      if (uRes.status === 'fulfilled') setUsage(uRes.value);
      if (rlRes.status === 'fulfilled') setRateLimit(rlRes.value);
      if (epRes.status === 'fulfilled') setEndpoints(epRes.value?.endpoints || []);
      if (errRes.status === 'fulfilled') setErrorsData(errRes.value);
      if (subRes.status === 'fulfilled') setSubDetails(subRes.value);
      if (anomRes.status === 'fulfilled') setAnomaly(anomRes.value);

      // Check if all rejected
      const allRejected = [uRes, rlRes, epRes, errRes, subRes, anomRes].every(
        (r) => r.status === 'rejected'
      );
      if (allRejected) {
        const firstErr = uRes.reason || rlRes.reason;
        setError(firstErr?.message || 'Failed to load consumer analytics.');
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Unable to connect to analytics microservice.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveConsumerId, apiId]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, [load]);

  const apiDisplayName =
    subDetails?.api_name ||
    subscription?.apiName ||
    subscription?.api?.apiName ||
    `API #${apiId ?? '—'}`;

  return (
    <section className="animation-fade-in" style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <button
            className="btn"
            onClick={onBack}
            style={{ marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ArrowLeft size={16} /> Back to Subscriptions
          </button>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={24} color="#8b5cf6" />
            {apiDisplayName}
          </h2>
          <p style={{ ...muted, marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Consumer Analytics &amp; Quota Monitoring &middot; Subscription #{subId ?? '—'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastUpdated && (
            <span style={{ ...muted, fontSize: '0.85rem' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            className="btn btn-primary"
            onClick={() => load(false)}
            disabled={loading || refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Anomaly / Abuse Alert Banner if detected */}
      {anomaly?.is_anomalous && (
        <div
          style={{
            ...panel,
            borderColor: 'rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 'bold' }}>
            <ShieldAlert size={20} />
            <span>ML Anomaly Alert: Unusual Traffic Pattern Detected on this Subscription</span>
          </div>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
            {anomaly.reasons?.map((reason, idx) => (
              <li key={idx} style={{ marginTop: '0.2rem' }}>{reason}</li>
            ))}
          </ul>
          {anomaly.recent_metrics && (
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
              <span>Recent Requests: <strong>{anomaly.recent_metrics.requests}</strong></span>
              <span>Errors: <strong style={{ color: '#ef4444' }}>{anomaly.recent_metrics.errors}</strong></span>
              <span>Throttles: <strong style={{ color: '#f59e0b' }}>{anomaly.recent_metrics.rate_limits}</strong></span>
            </div>
          )}
        </div>
      )}

      {loading && !usage && !rateLimit ? (
        <div style={{ ...panel, textAlign: 'center', padding: '3rem' }}>
          <p style={muted}>Loading telemetry from Python microservice...</p>
        </div>
      ) : (
        <>
          {/* Top Row: Rate Limit Gauge + Usage Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Rate Limit Gauge Card */}
            <div style={{ ...panel, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem', alignSelf: 'flex-start', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={18} color="#eab308" /> Real-time Rate Limit
              </h3>
              <RadialRateLimitGauge
                used={rateLimit?.current_usage_this_minute ?? 0}
                total={rateLimit?.limit_per_minute ?? 60}
                size={180}
                title="Current Minute"
                subtitle="reqs"
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  width: '100%',
                  marginTop: '0.75rem',
                  fontSize: '0.85rem',
                  borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  paddingTop: '0.75rem',
                }}
              >
                <div>
                  <span style={muted}>Remaining:</span>{' '}
                  <strong>{rateLimit?.remaining_requests_this_minute ?? '—'}</strong>
                </div>
                <div>
                  <span style={muted}>Limit:</span>{' '}
                  <strong>{rateLimit?.limit_per_minute ?? '—'} /min</strong>
                </div>
                <div>
                  <span style={muted}>Status:</span>{' '}
                  {rateLimit?.is_rate_limited ? (
                    <span className="badge badge-error">Throttled</span>
                  ) : (
                    <span className="badge badge-success">Normal</span>
                  )}
                </div>
              </div>
            </div>

            {/* Usage Period Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={panel}>
                <div style={{ ...muted, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={14} /> Requests Today
                </div>
                <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem' }}>
                  {Number(usage?.requests_today ?? 0).toLocaleString()}
                </strong>
                <small style={muted}>00:00 UTC to now</small>
              </div>

              <div style={panel}>
                <div style={{ ...muted, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Flame size={14} color="#f59e0b" /> This Week
                </div>
                <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem' }}>
                  {Number(usage?.requests_this_week ?? 0).toLocaleString()}
                </strong>
                <small style={muted}>Last 7 days</small>
              </div>

              <div style={panel}>
                <div style={{ ...muted, fontSize: '0.85rem' }}>This Month</div>
                <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem' }}>
                  {Number(usage?.requests_this_month ?? 0).toLocaleString()}
                </strong>
                <small style={muted}>Current billing cycle</small>
              </div>

              <div style={panel}>
                <div style={{ ...muted, fontSize: '0.85rem' }}>All-Time Volume</div>
                <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem' }}>
                  {Number(usage?.requests_all_time ?? 0).toLocaleString()}
                </strong>
                <small style={muted}>Lifetime API calls</small>
              </div>
            </div>

            {/* Subscription & Key Card */}
            <div style={panel}>
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Key size={18} color="#8b5cf6" /> Subscription &amp; Plan
              </h3>
              <div style={{ display: 'grid', gap: '0.6rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={muted}>Plan Tier:</span>
                  <strong>{subDetails?.plan_details?.plan_name || subscription?.planName || 'Active Plan'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={muted}>Plan Price:</span>
                  <span>
                    {subDetails?.plan_details?.price != null ? `$${subDetails.plan_details.price}/mo` : 'Included'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={muted}>Masked API Key:</span>
                  <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>
                    {subDetails?.api_key_masked || 'key_***'}
                  </code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={muted}>Key Status:</span>
                  <span className={`badge ${subDetails?.key_status === 'ACTIVE' ? 'badge-success' : 'badge-primary'}`}>
                    {subDetails?.key_status || 'ACTIVE'}
                  </span>
                </div>
                {subDetails?.amount_paid != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={muted}>Amount Paid:</span>
                    <span>${subDetails.amount_paid} {subDetails.currency || 'USD'}</span>
                  </div>
                )}
                {subDetails?.last_payment_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={muted}>Last Payment:</span>
                    <span>{new Date(subDetails.last_payment_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Daily Breakdown & Top Endpoints */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Daily Trend Table */}
            <div style={panel}>
              <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Daily Usage History</h3>
              {!usage?.daily_breakdown?.length ? (
                <p style={muted}>No daily breakdown recorded yet.</p>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={cell}>Date</th>
                        <th style={cell}>Requests</th>
                        <th style={cell}>Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.daily_breakdown.map((row, idx) => (
                        <tr key={idx}>
                          <td style={cell}>
                            {row.day ? String(row.day).slice(0, 10) : '—'}
                          </td>
                          <td style={cell}>
                            <strong>{Number(row.request_count ?? 0).toLocaleString()}</strong>
                          </td>
                          <td style={cell}>
                            {row.error_count > 0 ? (
                              <span style={{ color: '#ef4444' }}>{row.error_count}</span>
                            ) : (
                              <span style={{ color: '#10b981' }}>0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Endpoints Called by this consumer */}
            <div style={panel}>
              <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Most Called Endpoints</h3>
              {!endpoints?.length ? (
                <p style={muted}>No endpoint activity recorded yet.</p>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={cell}>Method</th>
                        <th style={cell}>Endpoint</th>
                        <th style={cell}>Calls</th>
                        <th style={cell}>Avg Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoints.map((ep, idx) => (
                        <tr key={idx}>
                          <td style={cell}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                background: ep.method === 'GET' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: ep.method === 'GET' ? '#38bdf8' : '#10b981',
                              }}
                            >
                              {ep.method || 'GET'}
                            </span>
                          </td>
                          <td style={{ ...cell, fontFamily: 'monospace' }}>{ep.endpoint}</td>
                          <td style={cell}><strong>{Number(ep.request_count ?? 0).toLocaleString()}</strong></td>
                          <td style={cell}>{ep.avg_response_time_ms ? `${ep.avg_response_time_ms} ms` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Consumer Errors Breakdown Card */}
          {errorsData && (
            <div style={panel}>
              <h3 style={{ marginTop: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={18} color="#f59e0b" /> Error &amp; Throttling Diagnostics
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 8 }}>
                  <span style={muted}>Error Rate:</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                    {errorsData.summary?.error_rate_percent ?? 0}%
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 8 }}>
                  <span style={muted}>4xx Client Errors:</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f59e0b' }}>
                    {errorsData.summary?.errors_4xx ?? 0}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 8 }}>
                  <span style={muted}>5xx Server Errors:</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444' }}>
                    {errorsData.summary?.errors_5xx ?? 0}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 8 }}>
                  <span style={muted}>Rate Limit Violations:</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#a855f7' }}>
                    {errorsData.summary?.rate_limit_hits ?? 0}
                  </div>
                </div>
              </div>

              {errorsData.common_errors?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>Common Encountered Errors</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={cell}>Status</th>
                          <th style={cell}>Endpoint</th>
                          <th style={cell}>Error Type</th>
                          <th style={cell}>Occurrences</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errorsData.common_errors.map((ce, i) => (
                          <tr key={i}>
                            <td style={cell}>
                              <span className="badge badge-error">{ce.status_code}</span>
                            </td>
                            <td style={{ ...cell, fontFamily: 'monospace' }}>{ce.endpoint}</td>
                            <td style={cell}>{ce.error_type}</td>
                            <td style={cell}><strong>{ce.occurrences}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default ConsumerAnalytics;
