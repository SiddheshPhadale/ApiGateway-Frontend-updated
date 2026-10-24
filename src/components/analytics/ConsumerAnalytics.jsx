
import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchSubscriberStream,
  fetchSubscriberUsage,
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

export function ConsumerAnalytics({ subscription, subscriptionId, consumerId, onBack }) {
  const [usage, setUsage] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async (quiet = false) => {
    if (subscriptionId == null) {
      setError('The selected subscription does not have a subId.');
      setLoading(false);
      return;
    }

    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const [nextUsage, nextEvents] = await Promise.all([
        fetchSubscriberUsage(consumerId, subscriptionId),
        fetchSubscriberStream(consumerId, subscriptionId),
      ]);

      setUsage(nextUsage);
      setEvents(nextEvents);
      setError('');
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.response?.data?.message ||
        `Unable to load subscription analytics (${err.response?.status ?? err.message}).`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subscriptionId, consumerId]);

  useEffect(() => {
    load();

    const timer = window.setInterval(() => load(true), 10000);

    return () => window.clearInterval(timer);
  }, [load]);

  if (loading && !usage) {
    return (
      <section className="glass-panel">
        <button className="btn" onClick={onBack}>
          ← Back to subscriptions
        </button>
        <p style={{ ...muted, marginTop: '1rem' }}>
          Loading subscription usage…
        </p>
      </section>
    );
  }

  const totalRequests = Number(usage?.totalRequestsMade ?? 0);
  const errors = events.filter(
    (event) => Number(event.statusCode) >= 400
  ).length;
  const successful = events.filter(
    (event) =>
      Number(event.statusCode) >= 200 &&
      Number(event.statusCode) < 400
  ).length;

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
            ← Back to subscriptions
          </button>

          <h2 style={{ margin: 0 }}>
            Usage analytics — {subscription?.apiName || `Subscription #${subscriptionId}`}
          </h2>

          <p style={{ ...muted, marginTop: '0.4rem' }}>
            Usage is calculated from persisted gateway request logs. No
            fabricated metrics or forecasts are shown.
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
          <div style={muted}>Successful recent requests</div>
          <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.5rem' }}>
            {successful.toLocaleString()}
          </strong>
          <small style={muted}>From the latest returned events</small>
        </div>

        <div style={panel}>
          <div style={muted}>Recent errors</div>
          <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.5rem' }}>
            {errors.toLocaleString()}
          </strong>
          <small style={muted}>HTTP status ≥ 400 in recent events</small>
        </div>

        <div style={panel}>
          <div style={muted}>Subscription status</div>
          <strong style={{ display: 'block', fontSize: '1.5rem', marginTop: '0.75rem' }}>
            {subscription?.status || 'Unknown'}
          </strong>
          <small style={muted}>Subscription ID: {subscriptionId}</small>
        </div>
      </div>

      <div style={panel}>
        <h3 style={{ marginTop: 0 }}>Recent requests for this subscription</h3>

        {events.length === 0 ? (
          <p style={muted}>
            No request logs have been recorded for this subscription yet.
            Send a request through the gateway and refresh.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  {['Time', 'Method', 'Endpoint', 'Status', 'Latency'].map((label) => (
                    <th key={label} style={cell}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.requestId ?? `${event.occurredAt}-${event.route}`}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
