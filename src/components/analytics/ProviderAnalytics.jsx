import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Brain,
  ShieldAlert,
  Flame,
  Zap,
  DollarSign,
  Users,
  Clock,
  Layers,
  Sparkles,
  Calendar,
  X,
} from 'lucide-react';
import {
  fetchProviderSummary,
  fetchProviderRequestsTrend,
  fetchProviderEndpoints,
  fetchProviderPeakHours,
  fetchProviderRevenue,
  fetchProviderPlansPerformance,
  fetchProviderErrors,
  fetchProviderResponseTime,
  fetchProviderConsumers,
  fetchAnomalyStatus,
  fetchAnomalyHistory,
  fetchConsumerAnomalyCheck,
  retrainAnomalyModel,
  fetchNextHourForecast,
  fetchNext24HoursForecast,
  fetchPeakTrafficForecast,
  fetchSmartAlerts,
} from '../../services/analyticsApi';
import { AreaLineChart } from './AnalyticsCharts';

const panel = {
  background: 'var(--surface-color, rgba(30, 41, 59, 0.7))',
  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
  borderRadius: 14,
  padding: '1.25rem',
  backdropFilter: 'blur(16px)',
  minWidth: 0,
};

const muted = { color: 'var(--text-secondary, #94a3b8)' };

const cell = {
  padding: '0.65rem',
  borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
  textAlign: 'left',
};

export function ProviderAnalytics({ api, apiId, providerId, onBack }) {
  // Navigation tab
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [days, setDays] = useState(30);
  const [period, setPeriod] = useState('day');

  // Telemetry state
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [endpointsData, setEndpointsData] = useState(null);
  const [peakHours, setPeakHours] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [plans, setPlans] = useState([]);
  const [errorsData, setErrorsData] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [consumersData, setConsumersData] = useState(null);

  // ML & Alerts state
  const [anomalyStatus, setAnomalyStatus] = useState(null);
  const [anomalyHistory, setAnomalyHistory] = useState([]);
  const [nextHourForecast, setNextHourForecast] = useState(null);
  const [next24hForecast, setNext24hForecast] = useState(null);
  const [peakForecast, setPeakForecast] = useState(null);
  const [smartAlerts, setSmartAlerts] = useState([]);

  // Retrain model status
  const [training, setTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState(null);

  // Consumer Anomaly Inspection Modal
  const [inspectingConsumer, setInspectingConsumer] = useState(null);
  const [consumerAnomalyResult, setConsumerAnomalyResult] = useState(null);
  const [consumerAnomalyLoading, setConsumerAnomalyLoading] = useState(false);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const effectiveProviderId =
    providerId ||
    api?.providerId ||
    api?.userId ||
    api?.user_id ||
    api?.provider_id ||
    '00000000-0000-0000-0000-000000000000';

  const loadData = useCallback(async (isSilent = false) => {
    if (!apiId) {
      setError('API ID is missing. Please select an API to view analytics.');
      setLoading(false);
      return;
    }

    if (isSilent) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const results = await Promise.allSettled([
        fetchProviderSummary(effectiveProviderId, apiId),
        fetchProviderRequestsTrend(effectiveProviderId, apiId, { period, days }),
        fetchProviderEndpoints(effectiveProviderId, apiId),
        fetchProviderPeakHours(effectiveProviderId, apiId),
        fetchProviderRevenue(effectiveProviderId, apiId),
        fetchProviderPlansPerformance(effectiveProviderId, apiId),
        fetchProviderErrors(effectiveProviderId, apiId),
        fetchProviderResponseTime(effectiveProviderId, apiId, { days }),
        fetchProviderConsumers(effectiveProviderId, apiId),
        fetchAnomalyStatus(apiId),
        fetchAnomalyHistory(apiId, { limit: 20 }),
        fetchNextHourForecast(apiId),
        fetchNext24HoursForecast(apiId),
        fetchPeakTrafficForecast(apiId),
        fetchSmartAlerts(apiId),
      ]);

      const [
        sumRes,
        trendRes,
        epRes,
        peakRes,
        revRes,
        plansRes,
        errRes,
        rtRes,
        consRes,
        anomRes,
        anomHistRes,
        nhRes,
        n24Res,
        pfRes,
        alertRes,
      ] = results;

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (trendRes.status === 'fulfilled') setTrend(trendRes.value);
      if (epRes.status === 'fulfilled') setEndpointsData(epRes.value);
      if (peakRes.status === 'fulfilled') setPeakHours(peakRes.value);
      if (revRes.status === 'fulfilled') setRevenue(revRes.value);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value?.plans || []);
      if (errRes.status === 'fulfilled') setErrorsData(errRes.value);
      if (rtRes.status === 'fulfilled') setResponseTime(rtRes.value);
      if (consRes.status === 'fulfilled') setConsumersData(consRes.value);

      if (anomRes.status === 'fulfilled') setAnomalyStatus(anomRes.value);
      if (anomHistRes.status === 'fulfilled') setAnomalyHistory(anomHistRes.value?.events || []);
      if (nhRes.status === 'fulfilled') setNextHourForecast(nhRes.value);
      if (n24Res.status === 'fulfilled') setNext24hForecast(n24Res.value);
      if (pfRes.status === 'fulfilled') setPeakForecast(pfRes.value);
      if (alertRes.status === 'fulfilled') setSmartAlerts(alertRes.value?.alerts || []);

      const allRejected = results.every((r) => r.status === 'rejected');
      if (allRejected) {
        setError(sumRes.reason?.message || 'Failed to reach Python microservice.');
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Error communicating with analytics microservice.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveProviderId, apiId, period, days]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle Model Retraining
  const handleRetrain = async () => {
    if (!apiId) return;
    setTraining(true);
    setTrainingResult(null);
    try {
      const res = await retrainAnomalyModel(apiId);
      setTrainingResult({
        success: true,
        message: `Successfully retrained ${res.model_type || 'Isolation Forest'}. Fitted ${res.samples_fitted ?? 0} data samples.`,
      });
      // Refresh anomaly status
      const updatedStatus = await fetchAnomalyStatus(apiId).catch(() => null);
      if (updatedStatus) setAnomalyStatus(updatedStatus);
    } catch (err) {
      setTrainingResult({
        success: false,
        message: err.message || 'Failed to retrain model.',
      });
    } finally {
      setTraining(false);
    }
  };

  // Inspect Consumer Anomaly
  const handleInspectConsumer = async (consumer) => {
    setInspectingConsumer(consumer);
    setConsumerAnomalyLoading(true);
    setConsumerAnomalyResult(null);
    try {
      const result = await fetchConsumerAnomalyCheck(consumer.consumer_id, apiId);
      setConsumerAnomalyResult(result);
    } catch (err) {
      setConsumerAnomalyResult({
        error: err.message || 'Unable to fetch consumer anomaly assessment.',
      });
    } finally {
      setConsumerAnomalyLoading(false);
    }
  };

  // Prepare chart series from requests trend data
  const chartData = (trend?.data || []).map((item) => ({
    hour: item.bucket ? String(item.bucket).replace('T', ' ').slice(5, 16) : '—',
    actual: item.request_count || 0,
    errors: item.error_count || 0,
    throttled: item.rate_limit_count || 0,
    latency: item.avg_latency_ms ? Math.round(item.avg_latency_ms) : undefined,
  }));

  const apiTitle = api?.apiName || `API #${apiId}`;

  return (
    <section className="animation-fade-in" style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Top Header Bar */}
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
            <ArrowLeft size={16} /> Back to APIs
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={24} color="#8b5cf6" />
              {apiTitle}
            </h2>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                background: 'rgba(255, 255, 255, 0.07)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
              }}
            >
              API ID: {apiId}
            </span>
          </div>
          <p style={{ ...muted, marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Powered by Python ML &amp; Analytics Microservice &middot; Port 8000
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Days selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 8 }}>
            <Calendar size={14} style={muted} />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value={7} style={{ background: '#1e293b' }}>Last 7 Days</option>
              <option value={14} style={{ background: '#1e293b' }}>Last 14 Days</option>
              <option value={30} style={{ background: '#1e293b' }}>Last 30 Days</option>
              <option value={90} style={{ background: '#1e293b' }}>Last 90 Days</option>
            </select>
          </div>

          {/* Period selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 8 }}>
            <Clock size={14} style={muted} />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="hour" style={{ background: '#1e293b' }}>Hourly</option>
              <option value="day" style={{ background: '#1e293b' }}>Daily</option>
              <option value="week" style={{ background: '#1e293b' }}>Weekly</option>
            </select>
          </div>

          {/* Retrain ML Model Button */}
          <button
            className="btn"
            onClick={handleRetrain}
            disabled={training}
            title="Trigger retraining of the Isolation Forest model on latest API data"
            style={{
              borderColor: 'rgba(139, 92, 246, 0.4)',
              background: 'rgba(139, 92, 246, 0.1)',
            }}
          >
            <Sparkles size={16} color="#a78bfa" className={training ? 'spinning' : ''} />
            {training ? 'Retraining ML…' : 'Retrain ML Model'}
          </button>

          {/* Refresh Button */}
          {lastUpdated && (
            <span style={{ ...muted, fontSize: '0.85rem' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            className="btn btn-primary"
            onClick={() => loadData(false)}
            disabled={loading || refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Retraining notification banner */}
      {trainingResult && (
        <div
          className={`alert ${trainingResult.success ? 'alert-success' : 'alert-error'}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {trainingResult.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{trainingResult.message}</span>
          </div>
          <button
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            onClick={() => setTrainingResult(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Smart Alerts Banner (Endpoint 3.8) */}
      {smartAlerts.length > 0 && (
        <div
          style={{
            ...panel,
            borderColor: 'rgba(239, 68, 68, 0.4)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <ShieldAlert size={20} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#f87171' }}>
              Active Smart Alerts ({smartAlerts.length})
            </h3>
          </div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {smartAlerts.map((alert, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  background: 'rgba(0, 0, 0, 0.25)',
                  fontSize: '0.85rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    className={`badge ${
                      alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
                        ? 'badge-error'
                        : 'badge-primary'
                    }`}
                  >
                    {alert.severity || 'ALERT'}
                  </span>
                  <span>{alert.message}</span>
                </div>
                {alert.consumer_name && (
                  <span style={muted}>Consumer: {alert.consumer_name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <nav
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.5rem',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', label: 'Overview & ML', icon: Brain },
          { id: 'forecast', label: 'Traffic & Forecast', icon: TrendingUp },
          { id: 'endpoints', label: 'Endpoints & Latency', icon: Layers },
          { id: 'revenue', label: 'Revenue & Plans', icon: DollarSign },
          { id: 'consumers', label: 'Top Consumers', icon: Users },
          { id: 'errors', label: 'Error Diagnostics', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn"
              style={{
                background: isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                boxShadow: isSelected ? '0 0 12px var(--primary-glow)' : 'none',
                fontWeight: isSelected ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {loading && !summary ? (
        <div style={{ ...panel, textAlign: 'center', padding: '3.5rem' }}>
          <p style={muted}>Fetching real-time analytics from Python ML microservice...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & ML */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {/* 1.1 Summary Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div style={panel}>
                  <div style={{ ...muted, fontSize: '0.85rem' }}>Total Requests</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem' }}>
                    {Number(summary?.total_requests ?? 0).toLocaleString()}
                  </strong>
                  <small style={muted}>Recorded in database</small>
                </div>

                <div style={panel}>
                  <div style={{ ...muted, fontSize: '0.85rem' }}>Subscribers</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#38bdf8' }}>
                    {Number(summary?.total_subscribers ?? 0).toLocaleString()}
                  </strong>
                  <small style={muted}>Active consumer keys</small>
                </div>

                <div style={panel}>
                  <div style={{ ...muted, fontSize: '0.85rem' }}>Active Plans</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#a78bfa' }}>
                    {summary?.active_plans ?? plans.length ?? 0}
                  </strong>
                  <small style={muted}>Configured tiers</small>
                </div>

                <div style={panel}>
                  <div style={{ ...muted, fontSize: '0.85rem' }}>Error Rate</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: (summary?.error_rate_percent ?? 0) > 5 ? '#ef4444' : '#10b981' }}>
                    {summary?.error_rate_percent ?? 0}%
                  </strong>
                  <small style={muted}>{summary?.total_errors ?? 0} failed calls</small>
                </div>

                <div style={panel}>
                  <div style={{ ...muted, fontSize: '0.85rem' }}>Average Latency</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#f59e0b' }}>
                    {summary?.avg_response_time_ms ? `${summary.avg_response_time_ms} ms` : '—'}
                  </strong>
                  <small style={muted}>Round-trip duration</small>
                </div>

                <div style={panel}>
                  <div style={{ ...muted, fontSize: '0.85rem' }}>Rate Limit Hits</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#ef4444' }}>
                    {summary?.rate_limit_hits ?? 0}
                  </strong>
                  <small style={muted}>429 throttled requests</small>
                </div>
              </div>

              {/* Real-time ML Anomaly Threat Assessment (Endpoint 3.1) */}
              <div
                style={{
                  ...panel,
                  border: anomalyStatus?.is_anomalous
                    ? '1px solid rgba(239, 68, 68, 0.5)'
                    : '1px solid rgba(16, 185, 129, 0.3)',
                  background: anomalyStatus?.is_anomalous
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(16, 185, 129, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Brain size={22} color={anomalyStatus?.is_anomalous ? '#ef4444' : '#10b981'} />
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                      ML Anomaly Status: {anomalyStatus?.is_anomalous ? 'Threat / Spike Detected' : 'Traffic Healthy & Baseline Normal'}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      className={`badge ${
                        anomalyStatus?.is_anomalous ? 'badge-error' : 'badge-success'
                      }`}
                    >
                      Severity: {anomalyStatus?.severity || 'NORMAL'}
                    </span>
                    {anomalyStatus?.anomaly_score != null && (
                      <span style={{ fontSize: '0.85rem', ...muted }}>
                        Score: <strong>{(anomalyStatus.anomaly_score * 100).toFixed(1)}%</strong>
                      </span>
                    )}
                  </div>
                </div>

                {anomalyStatus?.reasons?.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f87171', marginBottom: '0.25rem' }}>
                      Detected Anomalies:
                    </div>
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                      {anomalyStatus.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Window vs Hourly Baseline comparison */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1rem',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span style={muted}>Current 1h Window:</span>
                    <div style={{ marginTop: '0.25rem' }}>
                      Requests: <strong>{anomalyStatus?.current_window?.requests ?? '—'}</strong> &middot;{' '}
                      Errors: <strong>{anomalyStatus?.current_window?.errors ?? '—'}</strong> &middot;{' '}
                      Latency: <strong>{anomalyStatus?.current_window?.avg_latency_ms ? `${anomalyStatus.current_window.avg_latency_ms}ms` : '—'}</strong>
                    </div>
                  </div>
                  <div>
                    <span style={muted}>Historical Hourly Baseline:</span>
                    <div style={{ marginTop: '0.25rem' }}>
                      Requests: <strong>{anomalyStatus?.baseline_hourly?.requests ?? '—'}</strong> &middot;{' '}
                      Errors: <strong>{anomalyStatus?.baseline_hourly?.errors ?? '—'}</strong> &middot;{' '}
                      Latency: <strong>{anomalyStatus?.baseline_hourly?.avg_latency_ms ? `${anomalyStatus.baseline_hourly.avg_latency_ms}ms` : '—'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Peak Hours Heat / Bar Distribution (Endpoint 1.4) */}
              {peakHours && (
                <div style={panel}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Flame size={18} color="#f59e0b" />
                      24-Hour Traffic Distribution &amp; Peak Hour
                    </h3>
                    {peakHours.peak_hour != null && (
                      <span className="badge badge-primary">
                        Peak: {peakHours.peak_hour}:00 ({Number(peakHours.peak_request_count ?? 0).toLocaleString()} reqs)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '4px', alignItems: 'end', height: '110px' }}>
                    {(peakHours.traffic_by_hour || []).map((h) => {
                      const maxHourReq = Math.max(
                        ...((peakHours.traffic_by_hour || []).map((x) => x.request_count || 1)),
                        1
                      );
                      const heightPct = Math.max(6, Math.round(((h.request_count || 0) / maxHourReq) * 100));
                      const isPeak = h.hour === peakHours.peak_hour;
                      return (
                        <div
                          key={h.hour}
                          title={`${h.hour}:00 - ${h.request_count || 0} reqs (${h.avg_response_time_ms ? `${h.avg_response_time_ms}ms` : ''})`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            height: '100%',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: `${heightPct}%`,
                              background: isPeak
                                ? 'linear-gradient(to top, #f59e0b, #ef4444)'
                                : 'linear-gradient(to top, #8b5cf6, #38bdf8)',
                              borderRadius: '3px 3px 0 0',
                              transition: 'height 0.4s ease',
                              cursor: 'pointer',
                            }}
                          />
                          <span style={{ fontSize: '0.65rem', ...muted, marginTop: '4px' }}>
                            {h.hour % 3 === 0 ? `${h.hour}h` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRAFFIC & FORECAST */}
          {activeTab === 'forecast' && (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {/* Peak Forecast Recommendation Card (Endpoint 3.7) */}
              {peakForecast && (
                <div
                  style={{
                    ...panel,
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(30, 41, 59, 0.7) 100%)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Zap size={20} color="#38bdf8" />
                      <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                        Predictive Traffic Peak &amp; Autoscaling Advisory
                      </h3>
                    </div>
                    <span className="badge badge-primary">
                      Surge Factor: {peakForecast.surge_multiplier || '1.0x'}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '1rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div>
                      <span style={muted}>Next Peak Arrival:</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                        {peakForecast.hours_until_peak != null
                          ? `In ${peakForecast.hours_until_peak} hours (${peakForecast.peak_hour_of_day}:00)`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <span style={muted}>Predicted Peak Rate:</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#38bdf8' }}>
                        {peakForecast.predicted_peak_requests ?? '—'} req/hr
                      </div>
                      <small style={muted}>Upper: {peakForecast.peak_upper_bound} req/hr</small>
                    </div>
                    <div>
                      <span style={muted}>Baseline Rate:</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                        {peakForecast.baseline_hourly_requests ?? '—'} req/hr
                      </div>
                    </div>
                  </div>

                  {peakForecast.recommended_action && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.65rem 0.85rem', borderRadius: 8, fontSize: '0.85rem' }}>
                      <strong style={{ color: '#38bdf8' }}>Action Recommendation:</strong>{' '}
                      {peakForecast.recommended_action}
                    </div>
                  )}
                </div>
              )}

              {/* Time Series Graph (Endpoint 1.2) */}
              <div style={panel}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                    Traffic Volume &amp; Error Trends ({days} Days &middot; {period})
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', ...muted }}>
                      <span style={{ width: 10, height: 10, background: '#8b5cf6', borderRadius: 2 }} />
                      Requests
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', ...muted }}>
                      <span style={{ width: 10, height: 10, background: '#ef4444', borderRadius: 2 }} />
                      Errors
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', ...muted }}>
                      <span style={{ width: 10, height: 10, background: '#f59e0b', borderRadius: 2 }} />
                      Throttled
                    </span>
                  </div>
                </div>

                {chartData.length === 0 ? (
                  <p style={{ ...muted, textAlign: 'center', padding: '2rem' }}>No trend data recorded for this window.</p>
                ) : (
                  <AreaLineChart
                    data={chartData}
                    xKey="hour"
                    series={[
                      { key: 'actual', label: 'Requests', color: '#8b5cf6' },
                      { key: 'errors', label: 'Errors', color: '#ef4444' },
                      { key: 'throttled', label: 'Rate Limits', color: '#f59e0b' },
                    ]}
                    height={260}
                  />
                )}
              </div>

              {/* 24-Hour Diurnal ML Forecast Table / Visual (Endpoint 3.6) */}
              {next24hForecast?.hourly_forecast?.length > 0 && (
                <div style={panel}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Brain size={18} color="#a78bfa" />
                      Next 24 Hours Diurnal ML Forecast (90% Confidence Interval)
                    </h3>
                    <span style={muted}>
                      Projected 24h Total: <strong>{next24hForecast.predicted_24h_total} reqs</strong>
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={cell}>Offset</th>
                          <th style={cell}>Time</th>
                          <th style={cell}>Hour of Day</th>
                          <th style={cell}>Predicted Reqs</th>
                          <th style={cell}>90% Lower Bound</th>
                          <th style={cell}>90% Upper Bound</th>
                        </tr>
                      </thead>
                      <tbody>
                        {next24hForecast.hourly_forecast.map((hf, i) => (
                          <tr key={i}>
                            <td style={cell}>+{hf.hour_offset}h</td>
                            <td style={cell}>{hf.timestamp ? String(hf.timestamp).replace('T', ' ').slice(11, 16) : '—'}</td>
                            <td style={cell}>{hf.hour_of_day}:00</td>
                            <td style={cell}>
                              <strong style={{ color: '#38bdf8' }}>{hf.predicted_requests}</strong>
                            </td>
                            <td style={cell}>{hf.confidence_interval?.lower ?? '—'}</td>
                            <td style={cell}>{hf.confidence_interval?.upper ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Next-Hour Minute-by-Minute Forecast (Endpoint 3.5) */}
              {nextHourForecast?.minutes?.length > 0 && (
                <div style={panel}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={18} color="#10b981" />
                      Next 60 Minutes Granular Projection
                    </h3>
                    <span style={muted}>
                      Predicted 60m Total: <strong>{nextHourForecast.predicted_total_requests} reqs</strong>
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: '240px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={cell}>Minute</th>
                          <th style={cell}>Timestamp</th>
                          <th style={cell}>Predicted Rate</th>
                          <th style={cell}>Lower Bound</th>
                          <th style={cell}>Upper Bound</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nextHourForecast.minutes.slice(0, 20).map((m, i) => (
                          <tr key={i}>
                            <td style={cell}>+{m.minute_offset} min</td>
                            <td style={cell}>{m.timestamp ? String(m.timestamp).slice(11, 19) : '—'}</td>
                            <td style={cell}><strong style={{ color: '#10b981' }}>{m.predicted_requests}</strong> /min</td>
                            <td style={cell}>{m.lower_bound}</td>
                            <td style={cell}>{m.upper_bound}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ENDPOINTS & LATENCY */}
          {activeTab === 'endpoints' && (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {/* Endpoints Breakdown Table (Endpoint 1.3) */}
              <div style={panel}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>All API Routes &amp; Endpoints</h3>
                {!endpointsData?.endpoints?.length ? (
                  <p style={muted}>No endpoint metrics recorded yet.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={cell}>Method</th>
                          <th style={cell}>Endpoint Path</th>
                          <th style={cell}>Requests</th>
                          <th style={cell}>Errors</th>
                          <th style={cell}>Avg Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpointsData.endpoints.map((ep, idx) => (
                          <tr key={idx}>
                            <td style={cell}>
                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 4,
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
                            <td style={cell}>
                              {ep.error_count > 0 ? (
                                <span style={{ color: '#ef4444' }}>{ep.error_count}</span>
                              ) : (
                                <span style={{ color: '#10b981' }}>0</span>
                              )}
                            </td>
                            <td style={cell}>{ep.avg_response_time_ms ? `${ep.avg_response_time_ms} ms` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Response Time Trends (Endpoint 1.8) */}
              {responseTime?.trends?.length > 0 && (
                <div style={panel}>
                  <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>
                    Response Time Trends &amp; Latency Percentiles (P95)
                  </h3>
                  <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={cell}>Time Bucket</th>
                          <th style={cell}>Average Latency</th>
                          <th style={cell}>Min</th>
                          <th style={cell}>P95 Percentile</th>
                          <th style={cell}>Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responseTime.trends.map((t, idx) => (
                          <tr key={idx}>
                            <td style={cell}>{t.bucket ? String(t.bucket).replace('T', ' ').slice(0, 16) : '—'}</td>
                            <td style={cell}><strong>{t.average_ms} ms</strong></td>
                            <td style={cell}>{t.min_ms} ms</td>
                            <td style={cell}><span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{t.p95_ms} ms</span></td>
                            <td style={cell}>{t.max_ms} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REVENUE & PLANS */}
          {activeTab === 'revenue' && (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {/* Revenue Summary Cards (Endpoint 1.5) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div style={panel}>
                  <div style={muted}>Total Gross Earned</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#10b981' }}>
                    ${Number(revenue?.total_earned ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                  <small style={muted}>All billing subscriptions</small>
                </div>

                <div style={panel}>
                  <div style={muted}>Platform Commission</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#f59e0b' }}>
                    ${Number(revenue?.commission_deducted ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                  <small style={muted}>Gateway fee</small>
                </div>

                <div style={panel}>
                  <div style={muted}>Net Provider Payout</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#38bdf8' }}>
                    ${Number(revenue?.net_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                  <small style={muted}>After commission</small>
                </div>

                <div style={panel}>
                  <div style={muted}>Total Transactions</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem' }}>
                    {revenue?.total_transactions ?? 0}
                  </strong>
                  <small style={muted}>Paid orders processed</small>
                </div>
              </div>

              {/* Plans Performance Comparison (Endpoint 1.6) */}
              <div style={panel}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Pricing Tiers &amp; Plans Performance</h3>
                {plans.length === 0 ? (
                  <p style={muted}>No plan performance data recorded.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={cell}>Plan Name</th>
                          <th style={cell}>Price</th>
                          <th style={cell}>Rate Limit</th>
                          <th style={cell}>Status</th>
                          <th style={cell}>Subscribers</th>
                          <th style={cell}>Total Revenue</th>
                          <th style={cell}>Provider Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plans.map((p, idx) => (
                          <tr key={p.plan_id || idx}>
                            <td style={cell}><strong>{p.plan_name}</strong></td>
                            <td style={cell}>${p.price}</td>
                            <td style={cell}>{p.rate_limit_per_minute}/min</td>
                            <td style={cell}>
                              <span className={`badge ${p.status === 'ACTIVE' ? 'badge-success' : 'badge-primary'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td style={cell}>{p.subscriber_count ?? 0}</td>
                            <td style={cell}>${Number(p.total_revenue ?? 0).toFixed(2)}</td>
                            <td style={cell}>
                              <strong style={{ color: '#10b981' }}>
                                ${Number(p.provider_revenue ?? 0).toFixed(2)}
                              </strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Monthly Breakdown Table */}
              {revenue?.monthly_breakdown?.length > 0 && (
                <div style={panel}>
                  <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Monthly Revenue History</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={cell}>Month</th>
                          <th style={cell}>Earned</th>
                          <th style={cell}>Commission</th>
                          <th style={cell}>Net Payout</th>
                          <th style={cell}>Transactions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenue.monthly_breakdown.map((m, idx) => (
                          <tr key={idx}>
                            <td style={cell}><strong>{m.month}</strong></td>
                            <td style={cell}>${Number(m.earned ?? 0).toFixed(2)}</td>
                            <td style={cell}>${Number(m.commission ?? 0).toFixed(2)}</td>
                            <td style={cell}><strong style={{ color: '#38bdf8' }}>${Number(m.net ?? 0).toFixed(2)}</strong></td>
                            <td style={cell}>{m.transactions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TOP CONSUMERS */}
          {activeTab === 'consumers' && (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div style={panel}>
                  <div style={muted}>Total Consumers</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem' }}>
                    {consumersData?.total_consumers ?? 0}
                  </strong>
                </div>
                <div style={panel}>
                  <div style={muted}>New Consumers</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#10b981' }}>
                    {consumersData?.new_consumers ?? 0}
                  </strong>
                </div>
                <div style={panel}>
                  <div style={muted}>Returning Consumers</div>
                  <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.4rem', color: '#38bdf8' }}>
                    {consumersData?.returning_consumers ?? 0}
                  </strong>
                </div>
              </div>

              {/* Consumer Table (Endpoint 1.9) with ML Anomaly Check (Endpoint 3.3) */}
              <div style={panel}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Consumer Directory &amp; Traffic Share</h3>
                {!consumersData?.consumers?.length ? (
                  <p style={muted}>No consumer activity recorded.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={cell}>Consumer</th>
                          <th style={cell}>Email</th>
                          <th style={cell}>Requests</th>
                          <th style={cell}>Errors</th>
                          <th style={cell}>Status</th>
                          <th style={cell}>Last Seen</th>
                          <th style={cell}>ML Safety</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consumersData.consumers.map((c, idx) => (
                          <tr key={c.consumer_id || idx}>
                            <td style={cell}>
                              <strong>{c.consumer_name || 'Client'}</strong>
                            </td>
                            <td style={cell}>{c.consumer_email || '—'}</td>
                            <td style={cell}><strong>{Number(c.request_count ?? 0).toLocaleString()}</strong></td>
                            <td style={cell}>{c.error_count ?? 0}</td>
                            <td style={cell}>
                              <span className={`badge ${c.is_new ? 'badge-primary' : 'badge-success'}`}>
                                {c.is_new ? 'NEW' : 'RETURNING'}
                              </span>
                            </td>
                            <td style={cell}>
                              {c.last_seen ? new Date(c.last_seen).toLocaleDateString() : '—'}
                            </td>
                            <td style={cell}>
                              <button
                                className="btn"
                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                onClick={() => handleInspectConsumer(c)}
                              >
                                <Brain size={12} /> Check Anomaly
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: ERROR DIAGNOSTICS */}
          {activeTab === 'errors' && (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {/* Errors Breakdown (Endpoint 1.7) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div style={panel}>
                  <div style={muted}>Total Requests</div>
                  <strong style={{ display: 'block', fontSize: '1.8rem', marginTop: '0.4rem' }}>
                    {Number(errorsData?.summary?.total_requests ?? summary?.total_requests ?? 0).toLocaleString()}
                  </strong>
                </div>

                <div style={panel}>
                  <div style={muted}>Total Errors</div>
                  <strong style={{ display: 'block', fontSize: '1.8rem', marginTop: '0.4rem', color: '#ef4444' }}>
                    {errorsData?.summary?.total_errors ?? 0}
                  </strong>
                </div>

                <div style={panel}>
                  <div style={muted}>4xx Client Errors</div>
                  <strong style={{ display: 'block', fontSize: '1.8rem', marginTop: '0.4rem', color: '#f59e0b' }}>
                    {errorsData?.summary?.errors_4xx ?? 0}
                  </strong>
                </div>

                <div style={panel}>
                  <div style={muted}>5xx Server Errors</div>
                  <strong style={{ display: 'block', fontSize: '1.8rem', marginTop: '0.4rem', color: '#ef4444' }}>
                    {errorsData?.summary?.errors_5xx ?? 0}
                  </strong>
                </div>

                <div style={panel}>
                  <div style={muted}>Rate Limit Errors (429)</div>
                  <strong style={{ display: 'block', fontSize: '1.8rem', marginTop: '0.4rem', color: '#a855f7' }}>
                    {errorsData?.summary?.rate_limit_errors ?? 0}
                  </strong>
                </div>
              </div>

              {/* Most Failing Endpoints */}
              <div style={panel}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Most Failing Endpoints</h3>
                {!errorsData?.most_failing_endpoints?.length ? (
                  <p style={muted}>No failing endpoint patterns detected.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={cell}>Method</th>
                          <th style={cell}>Endpoint</th>
                          <th style={cell}>Status Code</th>
                          <th style={cell}>Error Type</th>
                          <th style={cell}>Failures</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errorsData.most_failing_endpoints.map((fe, idx) => (
                          <tr key={idx}>
                            <td style={cell}>
                              <span className="badge badge-primary">{fe.http_method || 'GET'}</span>
                            </td>
                            <td style={{ ...cell, fontFamily: 'monospace' }}>{fe.endpoint}</td>
                            <td style={cell}>
                              <span className="badge badge-error">{fe.status_code}</span>
                            </td>
                            <td style={cell}>{fe.error_type}</td>
                            <td style={cell}><strong style={{ color: '#ef4444' }}>{fe.failure_count}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Anomaly History Log (Endpoint 3.2) */}
              <div style={panel}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={18} color="#ef4444" />
                  ML Historical Anomaly Incidents Log
                </h3>
                {anomalyHistory.length === 0 ? (
                  <p style={muted}>No past anomaly incidents found for this API.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={cell}>Timestamp</th>
                          <th style={cell}>Incident Type</th>
                          <th style={cell}>Requests</th>
                          <th style={cell}>Errors</th>
                          <th style={cell}>Avg Latency</th>
                          <th style={cell}>Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anomalyHistory.map((ah, i) => (
                          <tr key={i}>
                            <td style={cell}>{ah.timestamp ? new Date(ah.timestamp).toLocaleString() : '—'}</td>
                            <td style={cell}><strong>{ah.type}</strong></td>
                            <td style={cell}>{ah.request_count}</td>
                            <td style={cell}><span style={{ color: '#ef4444' }}>{ah.error_count}</span></td>
                            <td style={cell}>{ah.avg_latency_ms ? `${ah.avg_latency_ms} ms` : '—'}</td>
                            <td style={cell}>
                              <span className={`badge ${ah.severity === 'HIGH' ? 'badge-error' : 'badge-primary'}`}>
                                {ah.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Consumer Anomaly Assessment Modal (Endpoint 3.3) */}
      {inspectingConsumer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              ...panel,
              maxWidth: '560px',
              width: '100%',
              background: '#0f172a',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Brain size={20} color="#8b5cf6" />
                Consumer ML Threat Assessment
              </h3>
              <button
                className="btn"
                style={{ padding: '4px' }}
                onClick={() => setInspectingConsumer(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
              <div>Client: <strong>{inspectingConsumer.consumer_name || 'Consumer'}</strong> ({inspectingConsumer.consumer_email})</div>
              <div style={muted}>Consumer ID: {inspectingConsumer.consumer_id}</div>
            </div>

            {consumerAnomalyLoading ? (
              <p style={{ textAlign: 'center', ...muted, padding: '1.5rem' }}>Evaluating behavioral telemetry with ML model...</p>
            ) : consumerAnomalyResult?.error ? (
              <div className="alert alert-error">{consumerAnomalyResult.error}</div>
            ) : consumerAnomalyResult ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 8,
                    background: consumerAnomalyResult.is_anomalous
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                    border: consumerAnomalyResult.is_anomalous
                      ? '1px solid #ef4444'
                      : '1px solid #10b981',
                  }}
                >
                  <strong style={{ color: consumerAnomalyResult.is_anomalous ? '#ef4444' : '#10b981' }}>
                    {consumerAnomalyResult.is_anomalous
                      ? '⚠️ Anomalous / Abusive Behavior Flagged'
                      : '✅ Normal Behavior Verified'}
                  </strong>
                  {consumerAnomalyResult.reasons?.length > 0 && (
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                      {consumerAnomalyResult.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {consumerAnomalyResult.recent_metrics && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem', borderRadius: 6 }}>
                      <div style={muted}>Recent Window Requests</div>
                      <strong>{consumerAnomalyResult.recent_metrics.requests}</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem', borderRadius: 6 }}>
                      <div style={muted}>Recent Window Throttles</div>
                      <strong style={{ color: '#ef4444' }}>{consumerAnomalyResult.recent_metrics.rate_limits}</strong>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn" onClick={() => setInspectingConsumer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProviderAnalytics;
