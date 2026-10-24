import React, { useState, useEffect } from 'react';
import { Radio, Play, Pause, Trash2, Copy, Check, Filter, Terminal, Zap, Shield, ArrowUpRight } from 'lucide-react';
import { generateKafkaEvent } from '../../services/analyticsData';

export function KafkaStreamDrawer({
  apiName = 'Weather API',
  isOpen = true,
  onClose = null,
  onNewEvent = null,
  embedded = false,
}) {
  const [events, setEvents] = useState(() => {
    // Initial batch of 4 events
    return [
      {
        apiKey: 'key_prod_89a2bc41',
        apiName: 'Weather API',
        consumerName: 'fintech_flow',
        planName: 'Enterprise',
        endpoint: '/v1/current.json',
        method: 'GET',
        statusCode: 200,
        responseTime: 112,
        timestamp: new Date(Date.now() - 4000).toISOString(),
      },
      {
        apiKey: 'key_live_33b118a9',
        apiName: 'Weather API',
        consumerName: 'cloud_mobile_apps',
        planName: 'Pro',
        endpoint: '/v1/forecast.json',
        method: 'GET',
        statusCode: 200,
        responseTime: 145,
        timestamp: new Date(Date.now() - 8000).toISOString(),
      },
      {
        apiKey: 'key_anon_9f8219x9',
        apiName: 'Weather API',
        consumerName: 'bot_crawler_99',
        planName: 'Basic',
        endpoint: '/v1/history.json',
        method: 'GET',
        statusCode: 429,
        responseTime: 28,
        timestamp: new Date(Date.now() - 14000).toISOString(),
      },
      {
        apiKey: 'key_dev_09a27715',
        apiName: 'Weather API',
        consumerName: 'john_developer',
        planName: 'Free',
        endpoint: '/v1/locations.json',
        method: 'POST',
        statusCode: 201,
        responseTime: 284,
        timestamp: new Date(Date.now() - 22000).toISOString(),
      }
    ];
  });

  const [isStreaming, setIsStreaming] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, 2XX, 4XX, 5XX

  // Background stream simulation
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      const newEv = generateKafkaEvent(apiName);
      setEvents(prev => [newEv, ...prev.slice(0, 49)]); // keep last 50
      if (onNewEvent) onNewEvent(newEv);
    }, 2800);

    return () => clearInterval(interval);
  }, [isStreaming, apiName, onNewEvent]);

  const handleCopy = (ev, idx) => {
    navigator.clipboard.writeText(JSON.stringify(ev, null, 2));
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const filteredEvents = events.filter(ev => {
    if (statusFilter === '2XX') return ev.statusCode >= 200 && ev.statusCode < 300;
    if (statusFilter === '4XX') return ev.statusCode >= 400 && ev.statusCode < 500;
    if (statusFilter === '5XX') return ev.statusCode >= 500;
    return true;
  });

  const getStatusBadge = (code) => {
    if (code >= 200 && code < 300) {
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (code >= 400 && code < 500) {
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
    }
    return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    }}>
      {/* Stream Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            position: 'relative',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: isStreaming ? '#10b981' : '#64748b',
            boxShadow: isStreaming ? '0 0 10px #10b981' : 'none'
          }}>
            {isStreaming && (
              <span style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse 1.8s infinite',
                opacity: 0.75
              }} />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} color="var(--primary)" />
                Kafka Proxy Event Stream
              </h3>
              <span style={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#c4b5fd',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}>
                topic: api-gateway.proxy-events
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Every proxy request publishes this schema. Analytics, Redis rate-counters, and ML layer consume from here.
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className="btn"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.85rem',
              background: isStreaming ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              borderColor: isStreaming ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
              color: isStreaming ? '#fca5a5' : '#6ee7b7'
            }}
          >
            {isStreaming ? <><Pause size={14} /> Pause Stream</> : <><Play size={14} /> Resume Stream</>}
          </button>

          <button
            onClick={() => setEvents([])}
            className="btn"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
            title="Clear Event Feed"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', '2XX', '4XX', '5XX'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                background: statusFilter === f ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: statusFilter === f ? 'var(--primary)' : 'var(--text-secondary)',
                border: statusFilter === f ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {f === 'ALL' ? `All (${events.length})` : f}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
          Partition 0 • Offset {events.length > 0 ? 104820 + events.length : 104820}
        </div>
      </div>

      {/* Event Stream List & Preview Split */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedEvent ? '1.2fr 1fr' : '1fr', gap: '1rem', minHeight: '320px', maxHeight: '440px' }}>
        {/* Stream List */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
          {filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No events captured yet. Click Resume Stream or trigger an API request.
            </div>
          ) : (
            filteredEvents.map((ev, idx) => {
              const badge = getStatusBadge(ev.statusCode);
              const isSelected = selectedEvent === ev;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedEvent(ev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    gap: '0.75rem',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`,
                      fontFamily: 'monospace'
                    }}>
                      {ev.statusCode}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      color: ev.method === 'GET' ? '#38bdf8' : '#10b981',
                      fontFamily: 'monospace'
                    }}>
                      {ev.method}
                    </span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {ev.endpoint}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      by <strong style={{ color: '#e2e8f0' }}>{ev.consumerName}</strong> ({ev.planName})
                    </span>
                    <span style={{
                      color: ev.responseTime > 300 ? '#f59e0b' : '#10b981',
                      fontWeight: '600',
                      fontFamily: 'monospace'
                    }}>
                      {ev.responseTime}ms
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(ev, idx);
                      }}
                      title="Copy event payload"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedId === idx ? '#10b981' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px'
                      }}
                    >
                      {copiedId === idx ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* JSON Inspector View */}
        {selectedEvent && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Event Payload Inspector
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Close ✕
              </button>
            </div>
            <pre style={{
              margin: 0,
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              color: '#38bdf8',
              overflowY: 'auto',
              flex: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {JSON.stringify(selectedEvent, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
