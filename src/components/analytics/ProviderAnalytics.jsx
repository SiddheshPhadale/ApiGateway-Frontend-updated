
import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchProviderAnomalies,
  fetchProviderLeaderboard,
  fetchProviderMetrics,
  fetchProviderSlowestEndpoints,
  fetchProviderStream,
} from '../../services/analyticsApi';

const panel = {
  background: 'var(--panel-bg, rgba(255,255,255,0.04))',
  border: '1px solid var(--border-color)',
  borderRadius: 14,
  padding: '1.25rem',
  minWidth: 0,
};

const muted = { color: 'var(--text-secondary)' };

const cell = {
  padding: '0.65rem',
  borderBottom: '1px solid var(--border-color)',
  textAlign: 'left',
  verticalAlign: 'top',
};

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString();
}

export function ProviderAnalytics({ api, apiId, providerId, onBack }) {
  const [metrics, setMetrics] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [events, setEvents] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [slowEndpoints, setSlowEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async (quiet = false) => {
    if (apiId == null) {
      setError('The selected API has no apiId in the backend response.');
      setLoading(false);
      return;
    }

    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const [
        nextMetrics,
        nextAnomalies,
        nextEvents,
        nextLeaderboard,
        nextSlowEndpoints,
      ] = await Promise.all([
        fetchProviderMetrics(providerId, apiId),
        fetchProviderAnomalies(apiId),
        fetchProviderStream(apiId),
        fetchProviderLeaderboard(apiId),
        fetchProviderSlowestEndpoints(apiId),
      ]);

      setMetrics(nextMetrics);
      setAnomalies(nextAnomalies);
      setEvents(nextEvents);
      setLeaderboard(nextLeaderboard);
      setSlowEndpoints(nextSlowEndpoints);
      setError('');
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.response?.data?.message ||
        `Unable to load analytics (${err.response?.status ?? err.message}).`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiId, providerId]);

  useEffect(() => {
    load();

    const timer = window.setInterval(() => load(true), 10000);

    return () => window.clearInterval(timer);
  }, [load]);

  if (loading && !metrics) {
    return (
      <section className="glass-panel">
        <button className="btn" onClick={onBack}>
          ← Back to APIs
        </button>
        <p style={{ ...muted, marginTop: '1rem' }}>
          Loading analytics from the backend…
        </p>
      </section>
    );
  }

  const totalRequests = Number(metrics?.totalRequests ?? 0);
  const totalErrors = Number(metrics?.totalErrors ?? 0);
  const errorRate = Number(metrics?.errorRatePercentage ?? 0);

  return (
    <section
      className="animation-fade-in"
      style={{ display: 'grid', gap: '1rem' }}
    >
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
            style={{ marginBottom: '0.75rem' }}
          >
            ← Back to APIs
          </button>

          <h2 style={{ margin: 0 }}>
            Analytics — {api?.apiName || `API #${apiId}`}
          </h2>

          <p style={{ ...muted, marginTop: '0.4rem' }}>
            Metrics come from persisted gateway request logs. No sample data
            or fabricated forecasts are displayed.
          </p>
        </div>

        <button
          className="btn btn-primary"
          disabled={refreshing}
          onClick={() => load(true)}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {lastUpdated && (
        <p style={{ ...muted, margin: 0, fontSize: '0.85rem' }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
        }}
      >
        <div style={panel}>
          <div style={muted}>Total requests</div>
          <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.5rem' }}>
            {totalRequests.toLocaleString()}
          </strong>
          <small style={muted}>All recorded time</small>
        </div>

        <div style={panel}>
          <div style={muted}>Failed requests</div>
          <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.5rem' }}>
            {totalErrors.toLocaleString()}
          </strong>
          <small style={muted}>HTTP status ≥ 400</small>
        </div>

        <div style={panel}>
          <div style={muted}>Error rate</div>
          <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.5rem' }}>
            {Number.isFinite(errorRate) ? errorRate.toFixed(2) : '0.00'}%
          </strong>
          <small style={muted}>Errors / recorded requests</small>
        </div>

        <div style={panel}>
          <div style={muted}>Detected anomalies</div>
          <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.5rem' }}>
            {anomalies.length}
          </strong>
          <small style={muted}>Based on recent request logs</small>
        </div>
      </div>

      <div style={panel}>
        <h3 style={{ marginTop: 0 }}>Recent requests</h3>

        {events.length === 0 ? (
          <p style={muted}>
            No request logs have been recorded for this API yet. Send a request
            through the gateway and refresh.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  {['Time', 'Method', 'Endpoint', 'Status', 'Latency', 'Subscription'].map((label) => (
                    <th key={label} style={cell}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.requestId ?? `${event.subId}-${event.occurredAt}-${event.route}`}>
                    <td style={cell}>{formatDate(event.occurredAt)}</td>
                    <td style={cell}>{event.httpMethod || '—'}</td>
                    <td style={{ ...cell, overflowWrap: 'anywhere' }}>
                      {event.route || '—'}
                    </td>
                    <td style={cell}>
                      <span className={`badge ${Number(event.statusCode) < 400 ? 'badge-success' : 'badge-primary'}`}>
                        {event.statusCode ?? '—'}
                      </span>
                    </td>
                    <td style={cell}>
                      {event.latencyMs == null ? '—' : `${event.latencyMs} ms`}
                    </td>
                    <td style={cell}>{event.subId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>Top subscriptions by request count</h3>

          {leaderboard.length === 0 ? (
            <p style={muted}>No subscription request data available.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={cell}>Subscription</th>
                    <th style={cell}>Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item, index) => (
                    <tr key={item.subId ?? index}>
                      <td style={cell}>
                        {item.consumerName || `Subscription ${item.subId}`}
                      </td>
                      <td style={cell}>
                        {Number(item.requestCount ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>Slowest endpoints</h3>

          {slowEndpoints.length === 0 ? (
            <p style={muted}>No endpoint latency data available.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={cell}>Endpoint</th>
                    <th style={cell}>Method</th>
                    <th style={cell}>Average latency</th>
                    <th style={cell}>Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {slowEndpoints.map((item, index) => (
                    <tr key={`${item.endpoint}-${item.method}-${index}`}>
                      <td style={cell}>{item.endpoint || '—'}</td>
                      <td style={cell}>{item.method || '—'}</td>
                      <td style={cell}>{item.avgLatency ?? '—'}</td>
                      <td style={cell}>
                        {Number(item.requestCalls ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={panel}>
        <h3 style={{ marginTop: 0 }}>Detected anomalies</h3>

        {anomalies.length === 0 ? (
          <p style={muted}>
            No anomalies detected from the currently recorded request logs.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {anomalies.map((item, index) => (
              <article
                key={`${item.subscriptionId}-${item.type}-${index}`}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 10,
                  padding: '0.9rem',
                }}
              >
                <strong>{item.type || 'Anomaly'}</strong>
                <div style={{ ...muted, marginTop: '0.3rem' }}>
                  {item.message || 'No details provided.'}
                </div>
                <small style={muted}>
                  Subscription: {item.subscriptionId ?? '—'} · Risk score: {item.riskScore ?? '—'}
                </small>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
