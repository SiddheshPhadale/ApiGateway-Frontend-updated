
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  BarChart2,
  Check,
  Code,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Key,
  Layers,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Server,
  Send,
  UserPlus,
  X,
  Trash2,
} from 'lucide-react';
import { ProviderAnalytics } from './components/analytics/ProviderAnalytics';
import { ConsumerAnalytics } from './components/analytics/ConsumerAnalytics';
import './index.css';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 20000,
});

const PAYMENT_CREATE_ORDER_PATH = '/api/v1/payment/create-order';
const PAYMENT_VERIFY_PATH = '/api/v1/payment/verify';
const plansPath = (apiId) => `/api/v1/payment/plans/${apiId}`;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const normalizeApi = (item) => ({
  ...item,
  apiId: item.apiId ?? item.id,
  link: item.link ?? item.apiLink ?? '',
});

const normalizeSubscription = (item) => ({
  ...item,
  subId: item.subId ?? item.subscriptionId ?? item.id,
  apiId: item.apiId ?? item.api?.apiId,
});

const getId = (sub) => sub?.subId ?? sub?.subscriptionId ?? sub?.id;
const getPlanId = (plan) => plan?.planId ?? plan?.id;

const emptyPlan = {
  planName: '',
  price: '0',
  rateLimitPerMinute: '10',
  description: '',
};

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('');

  const [myApis, setMyApis] = useState([]);
  const [allApis, setAllApis] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const [newApiName, setNewApiName] = useState('');
  const [newApiLink, setNewApiLink] = useState('');
  const [newApiDesc, setNewApiDesc] = useState('');

  const [selectedProviderApiId, setSelectedProviderApiId] = useState(null);
  const [selectedConsumerSubId, setSelectedConsumerSubId] = useState(null);

  const [plansForApi, setPlansForApi] = useState({});
  const [expandedApiId, setExpandedApiId] = useState(null);

  const [planFormApiId, setPlanFormApiId] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [planSaving, setPlanSaving] = useState(false);

  const [subscriptionKeys, setSubscriptionKeys] = useState({});
  const [revealedKeys, setRevealedKeys] = useState({});
  const [keyLoading, setKeyLoading] = useState({});
  const [copiedKeyId, setCopiedKeyId] = useState(null);

  const [playgroundSubId, setPlaygroundSubId] = useState(null);
  const [requestMethod, setRequestMethod] = useState('GET');
  const [requestPath, setRequestPath] = useState('/posts/1');
  const [requestBody, setRequestBody] = useState(
    JSON.stringify(
      { title: 'Test post', body: 'Hello from APIForge', userId: 1 },
      null,
      2
    )
  );
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestResponse, setRequestResponse] = useState(null);
  const [requestDuration, setRequestDuration] = useState(null);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const fetchMyApis = useCallback(async () => {
    const { data } = await api.get('/api/v1/apis/myapi');
    setMyApis(Array.isArray(data) ? data.map(normalizeApi) : []);
  }, []);

  const fetchAllApis = useCallback(async () => {
    const { data } = await api.get('/api/v1/subscription/all');
    setAllApis(Array.isArray(data) ? data.map(normalizeApi) : []);
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    const { data } = await api.get('/api/v1/subscription');
    setSubscriptions(Array.isArray(data) ? data.map(normalizeSubscription) : []);
  }, []);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');

      if (savedUser && savedToken) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setActiveTab(
          parsed.role === 'PROVIDER' ? 'my-apis' : 'marketplace'
        );
      }
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    if (user.role === 'PROVIDER') {
      fetchMyApis().catch((err) => {
        setError(err.response?.data?.message || 'Could not load your APIs.');
      });
    } else if (user.role === 'CONSUMER') {
      Promise.all([fetchSubscriptions(), fetchAllApis()]).catch((err) => {
        setError(
          err.response?.data?.message || 'Could not load marketplace data.'
        );
      });
    }
  }, [user, fetchMyApis, fetchAllApis, fetchSubscriptions]);

  const handleLogin = async (event) => {
    event.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const { data } = await api.post('/api/v1/auth/login', {
        userName,
        password,
      });

      if (!data?.jwtToken || !data?.role) {
        throw new Error('Login response did not contain jwtToken and role.');
      }

      localStorage.setItem('token', data.jwtToken);
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      setActiveTab(data.role === 'PROVIDER' ? 'my-apis' : 'marketplace');
      setSuccess('Logged in successfully.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event, role) => {
    event.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const endpoint =
        role === 'PROVIDER'
          ? '/api/v1/auth/provider/register'
          : '/api/v1/auth/consumer/register';

      await api.post(endpoint, { userName, userEmail, password });
      setSuccess('Registration successful. Please log in.');
      setAuthMode('login');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setMyApis([]);
    setAllApis([]);
    setSubscriptions([]);
    setSubscriptionKeys({});
    setRevealedKeys({});
    setPlansForApi({});
    setExpandedApiId(null);
    setPlanFormApiId(null);
    setEditingPlanId(null);
    setActiveTab('');
    setPassword('');
    clearMessages();
  };

  // API registration no longer submits a rate limit.
  const handleRegisterApi = async (event) => {
    event.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      await api.post('/api/v1/apis/register', {
        apiName: newApiName.trim(),
        link: newApiLink.trim(),
        apiDescription: newApiDesc.trim(),
      });

      setSuccess('API registered successfully. You can now add plans.');
      setNewApiName('');
      setNewApiLink('');
      setNewApiDesc('');
      await fetchMyApis();
      setActiveTab('my-apis');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register API.');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async (apiItem, force = false) => {
    const apiId = apiItem.apiId;

    if (apiId == null) {
      setError('The API response does not contain apiId.');
      return;
    }

    if (!force && expandedApiId === apiId) {
      setExpandedApiId(null);
      setPlanFormApiId(null);
      setEditingPlanId(null);
      return;
    }

    clearMessages();
    setExpandedApiId(apiId);
    setLoading(true);

    try {
      const { data } = await api.get(plansPath(apiId));
      const plans = Array.isArray(data)
        ? data
        : data?.plans ?? data?.content ?? [];

      setPlansForApi((previous) => ({ ...previous, [apiId]: plans }));
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not load plans for this API.'
      );
    } finally {
      setLoading(false);
    }
  };

  const openCreatePlanForm = (apiItem) => {
    clearMessages();
    setExpandedApiId(apiItem.apiId);
    setPlanFormApiId(apiItem.apiId);
    setEditingPlanId(null);
    setPlanForm({ ...emptyPlan });
  };

  const openEditPlanForm = (apiItem, plan) => {
    clearMessages();
    setExpandedApiId(apiItem.apiId);
    setPlanFormApiId(apiItem.apiId);
    setEditingPlanId(getPlanId(plan));
    setPlanForm({
      planName: plan.planName ?? plan.name ?? '',
      price: String(plan.price ?? 0),
      rateLimitPerMinute: String(plan.rateLimitPerMinute ?? 10),
      description: plan.description ?? '',
    });
  };

  const closePlanForm = () => {
    setPlanFormApiId(null);
    setEditingPlanId(null);
    setPlanForm({ ...emptyPlan });
  };

  const handlePlanFormChange = (event) => {
    const { name, value } = event.target;
    setPlanForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSavePlan = async (event) => {
    event.preventDefault();
    if (planFormApiId == null) return;

    clearMessages();

    const price = Number(planForm.price);
    const rateLimitPerMinute = Number(planForm.rateLimitPerMinute);

    if (!planForm.planName.trim()) {
      setError('Enter a plan name.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Price must be zero or greater.');
      return;
    }
    if (
      !Number.isInteger(rateLimitPerMinute) ||
      rateLimitPerMinute < 1
    ) {
      setError('Rate limit must be a whole number greater than zero.');
      return;
    }

    const payload = {
      planName: planForm.planName.trim(),
      price,
      rateLimitPerMinute,
      description: planForm.description.trim(),
    };

    setPlanSaving(true);

    try {
      if (editingPlanId != null) {
        await api.put(
          `/api/v1/payment/plans/${editingPlanId}`,
          payload
        );
        setSuccess('Plan updated successfully.');
      } else {
        await api.post(
          `/api/v1/payment/plans/${planFormApiId}`,
          payload
        );
        setSuccess('Plan created successfully.');
      }

      const apiItem = myApis.find(
        (item) => Number(item.apiId) === Number(planFormApiId)
      );

      closePlanForm();

      if (apiItem) {
        await loadPlans(apiItem, true);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Could not save the plan.'
      );
    } finally {
      setPlanSaving(false);
    }
  };

  const handleDeactivatePlan = async (apiItem, plan) => {
    const planId = getPlanId(plan);

    if (planId == null) {
      setError('The plan response does not contain planId.');
      return;
    }

    const confirmed = window.confirm(
      `Deactivate "${plan.planName || plan.name || 'this plan'}"? Existing subscriptions may be affected by your backend's plan rules.`
    );

    if (!confirmed) return;

    clearMessages();
    setLoading(true);

    try {
      await api.delete(`/api/v1/payment/plans/${planId}`);
      setSuccess('Plan deactivated.');
      await loadPlans(apiItem, true);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not deactivate this plan.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribeFree = async (apiItem) => {
    clearMessages();
    setLoading(true);

    try {
      await api.post('/api/v1/subscription', { apiId: apiItem.apiId });
      setSuccess(`Subscribed to ${apiItem.apiName}.`);
      await fetchSubscriptions();
    } catch (err) {
      setError(err.response?.data?.message || 'Subscription failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayForPlan = async (plan, apiItem) => {
    clearMessages();
    setPaymentBusy(true);

    try {
      const planId = getPlanId(plan);
      if (planId == null) {
        throw new Error('The plan response does not contain planId.');
      }

      const { data: order } = await api.post(
        PAYMENT_CREATE_ORDER_PATH,
        { planId }
      );

      if (
        !order?.keyId ||
        !order?.razorpayOrderId ||
        !Number.isFinite(Number(order?.amount))
      ) {
        throw new Error('Create-order response is missing payment details.');
      }

      const loadRazorpay = () =>
        new Promise((resolve) => {
          if (window.Razorpay) return resolve(true);

          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });

      if (!(await loadRazorpay())) {
        throw new Error('Could not load Razorpay Checkout.');
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: Number(order.amount),
        currency: order.currency || 'INR',
        name: 'APIForge',
        description: `${apiItem.apiName} — ${plan.planName || 'API plan'}`,
        order_id: order.razorpayOrderId,
        theme: { color: '#8b5cf6' },
        modal: { ondismiss: () => setPaymentBusy(false) },
        handler: async (paymentResult) => {
          try {
            const verification = await api.post(PAYMENT_VERIFY_PATH, {
              razorpayOrderId:
                paymentResult.razorpay_order_id || order.razorpayOrderId,
              razorpayPaymentId: paymentResult.razorpay_payment_id,
              razorpaySignature: paymentResult.razorpay_signature,
            });

            setSuccess(verification.data?.message || 'Payment verified.');
            await fetchSubscriptions();
            setExpandedApiId(null);
          } catch (err) {
            setError(
              err.response?.data?.message || 'Payment verification failed.'
            );
          } finally {
            setPaymentBusy(false);
          }
        },
      });

      checkout.on('payment.failed', (event) => {
        setError(event?.error?.description || 'Payment failed.');
        setPaymentBusy(false);
      });

      checkout.open();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to start payment.'
      );
      setPaymentBusy(false);
    }
  };

  const handleToggleApiKey = async (subscription) => {
    const subId = getId(subscription);

    if (subId == null) {
      setError('Subscription response is missing subId.');
      return;
    }

    if (revealedKeys[subId]) {
      setRevealedKeys((previous) => ({ ...previous, [subId]: false }));
      return;
    }

    if (subscriptionKeys[subId]) {
      setRevealedKeys((previous) => ({ ...previous, [subId]: true }));
      return;
    }

    setKeyLoading((previous) => ({ ...previous, [subId]: true }));
    clearMessages();

    try {
      const { data } = await api.get(`/api/v1/subscription/${subId}/key`);
      if (!data?.apiKey) {
        throw new Error('The key endpoint did not return apiKey.');
      }

      setSubscriptionKeys((previous) => ({
        ...previous,
        [subId]: data.apiKey,
      }));
      setRevealedKeys((previous) => ({ ...previous, [subId]: true }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to retrieve API key.'
      );
    } finally {
      setKeyLoading((previous) => ({ ...previous, [subId]: false }));
    }
  };

  const handleCopyApiKey = async (subscription) => {
    const subId = getId(subscription);
    const key = subscriptionKeys[subId];

    if (!key) {
      setError('Reveal the API key before copying it.');
      return;
    }

    try {
      await navigator.clipboard.writeText(key);
      setCopiedKeyId(subId);
      window.setTimeout(() => setCopiedKeyId(null), 1500);
    } catch {
      setError('Could not copy the API key. Check browser clipboard permissions.');
    }
  };

  const openPlayground = async (subscription) => {
    const subId = getId(subscription);
    setPlaygroundSubId(subId);
    setRequestResponse(null);
    setRequestMethod('GET');
    setRequestPath('/posts/1');

    if (!subscriptionKeys[subId]) {
      setKeyLoading((previous) => ({ ...previous, [subId]: true }));

      try {
        const { data } = await api.get(`/api/v1/subscription/${subId}/key`);
        if (!data?.apiKey) {
          throw new Error('The key endpoint did not return apiKey.');
        }

        setSubscriptionKeys((previous) => ({
          ...previous,
          [subId]: data.apiKey,
        }));
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Could not load API key.'
        );
      } finally {
        setKeyLoading((previous) => ({ ...previous, [subId]: false }));
      }
    }
  };

  const sendGatewayRequest = async (event) => {
    event.preventDefault();
    const subscription = subscriptions.find(
      (item) => getId(item) === playgroundSubId
    );

    if (!subscription || subscription.status !== 'ACTIVE') {
      setError('Select an active subscription before sending a request.');
      return;
    }

    const apiKey = subscriptionKeys[playgroundSubId];
    if (!apiKey) {
      setError('The API key is not available. Close and reopen the playground.');
      return;
    }

    const path = requestPath.trim();
    if (!path.startsWith('/')) {
      setError('Endpoint path must start with /.');
      return;
    }

    const config = {
      method: requestMethod,
      url: `/proxy${path}`,
      headers: { 'api-key': apiKey },
    };

    if (['POST', 'PUT', 'PATCH'].includes(requestMethod)) {
      try {
        config.data = requestBody.trim() ? JSON.parse(requestBody) : {};
        config.headers['Content-Type'] = 'application/json';
      } catch {
        setError('Request body is not valid JSON.');
        return;
      }
    }

    setRequestLoading(true);
    setRequestResponse(null);
    setRequestDuration(null);
    clearMessages();
    const started = performance.now();

    try {
      const response = await api.request(config);
      setRequestResponse({
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });
    } catch (err) {
      setRequestResponse({
        status: err.response?.status ?? 'NETWORK ERROR',
        statusText: err.response?.statusText || err.message,
        data: err.response?.data ?? { message: 'Could not reach the gateway.' },
      });
    } finally {
      setRequestDuration(Math.round(performance.now() - started));
      setRequestLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="app-container">
        <div className="auth-container glass-panel">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="logo-container" style={{ justifyContent: 'center' }}>
              <Activity size={36} color="#e879f9" />
              <span style={{ fontSize: '2rem' }}>APIForge</span>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>
              Centralized API Management Platform
            </p>
          </div>

          <div className="tabs" style={{ justifyContent: 'center' }}>
            <button
              className={`tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('login');
                clearMessages();
              }}
            >
              Login
            </button>
            <button
              className={`tab ${authMode === 'register-provider' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('register-provider');
                clearMessages();
              }}
            >
              Provider
            </button>
            <button
              className={`tab ${authMode === 'register-consumer' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('register-consumer');
                clearMessages();
              }}
            >
              Consumer
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Username</label>
                <input
                  className="form-input"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <LogIn size={18} /> {loading ? 'Logging in…' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form
              onSubmit={(event) =>
                handleRegister(
                  event,
                  authMode === 'register-provider' ? 'PROVIDER' : 'CONSUMER'
                )
              }
            >
              <div className="form-group">
                <label>Username</label>
                <input
                  className="form-input"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email address</label>
                <input
                  className="form-input"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  className="form-input"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <UserPlus size={18} /> {loading ? 'Registering…' : 'Create account'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo-container" style={{ marginBottom: '2rem' }}>
          <Activity size={30} color="#e879f9" />
          <span style={{ fontSize: '1.5rem' }}>APIForge</span>
        </div>

        <div
          style={{
            padding: '1rem',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            marginBottom: '1rem',
          }}
        >
          <strong>{user.userName}</strong>
          <div
            style={{
              color: 'var(--primary)',
              fontSize: '0.8rem',
              marginTop: '0.25rem',
            }}
          >
            {user.role}
          </div>
        </div>

        <div className="sidebar-menu">
          {user.role === 'PROVIDER' ? (
            <>
              <button
                className={`menu-item ${activeTab === 'my-apis' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-apis')}
              >
                <Layers size={18} /> My APIs
              </button>
              <button
                className={`menu-item ${activeTab === 'register-api' ? 'active' : ''}`}
                onClick={() => setActiveTab('register-api')}
              >
                <Server size={18} /> Register API
              </button>
            </>
          ) : (
            <>
              <button
                className={`menu-item ${activeTab === 'marketplace' ? 'active' : ''}`}
                onClick={() => setActiveTab('marketplace')}
              >
                <Server size={18} /> API Marketplace
              </button>
              <button
                className={`menu-item ${activeTab === 'my-subscriptions' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-subscriptions')}
              >
                <FileText size={18} /> My Subscriptions
              </button>
            </>
          )}
        </div>

        <button
          className="menu-item"
          onClick={logout}
          style={{ marginTop: 'auto', color: 'var(--danger)' }}
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <main className="main-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {user.role === 'PROVIDER' && activeTab === 'register-api' && (
          <div className="glass-panel animation-fade-in">
            <h2>Register New API</h2>
            <p>Register your API first, then configure its rate limits in plans.</p>

            <form
              onSubmit={handleRegisterApi}
              style={{ display: 'grid', gap: '1rem', maxWidth: 760 }}
            >
              <div className="form-group">
                <label>API name</label>
                <input
                  className="form-input"
                  value={newApiName}
                  onChange={(e) => setNewApiName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Base URL</label>
                <input
                  className="form-input"
                  type="url"
                  value={newApiLink}
                  onChange={(e) => setNewApiLink(e.target.value)}
                  placeholder="https://jsonplaceholder.typicode.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-input"
                  value={newApiDesc}
                  onChange={(e) => setNewApiDesc(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                <Code size={18} /> {loading ? 'Registering…' : 'Register API'}
              </button>
            </form>
          </div>
        )}

        {user.role === 'PROVIDER' && activeTab === 'my-apis' && (
          <section className="animation-fade-in">
            <h2>My APIs</h2>

            <div className="grid">
              {myApis.length === 0 ? (
                <div className="glass-panel">
                  No APIs registered yet. Use Register API to add your first API.
                </div>
              ) : (
                myApis.map((apiItem) => (
                  <article className="card" key={apiItem.apiId}>
                    <h3>
                      <Activity size={18} /> {apiItem.apiName}
                    </h3>
                    <p>{apiItem.apiDescription}</p>
                    <p
                      style={{
                        overflowWrap: 'anywhere',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {apiItem.link || 'No base URL returned'}
                    </p>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setSelectedProviderApiId(apiItem.apiId);
                          setActiveTab('provider-api-analytics');
                        }}
                      >
                        <BarChart2 size={16} /> Analytics
                      </button>

                      <button
                        className="btn"
                        disabled={loading}
                        onClick={() => loadPlans(apiItem)}
                      >
                        <CreditCard size={16} />
                        {expandedApiId === apiItem.apiId ? 'Hide plans' : 'Manage Plans'}
                      </button>

                      <button
                        className="btn"
                        onClick={() => openCreatePlanForm(apiItem)}
                      >
                        <Plus size={16} /> Add Plan
                      </button>
                    </div>

                    {expandedApiId === apiItem.apiId && (
                      <div className="plans-panel" style={{ marginTop: '1rem' }}>
                        <h4>Plans — {apiItem.apiName}</h4>

                        {(plansForApi[apiItem.apiId] || []).length === 0 ? (
                          <p>No plans found. Add a plan to let consumers subscribe.</p>
                        ) : (
                          (plansForApi[apiItem.apiId] || []).map((plan) => (
                            <div
                              key={getPlanId(plan)}
                              style={{
                                borderTop: '1px solid var(--border-color)',
                                padding: '0.85rem 0',
                              }}
                            >
                              <strong>{plan.planName || plan.name}</strong>
                              <p>{plan.description || 'No description provided.'}</p>
                              <p>
                                Price: ₹{Number(plan.price ?? 0).toFixed(2)}
                              </p>
                              <p>
                                Rate limit: {plan.rateLimitPerMinute} requests/minute
                              </p>
                              {plan.status && <p>Status: {plan.status}</p>}

                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.5rem',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <button
                                  className="btn"
                                  onClick={() => openEditPlanForm(apiItem, plan)}
                                >
                                  <Pencil size={16} /> Edit Plan
                                </button>
                                <button
                                  className="btn"
                                  disabled={loading}
                                  onClick={() => handleDeactivatePlan(apiItem, plan)}
                                >
                                  <Trash2 size={16} /> Deactivate
                                </button>
                              </div>
                            </div>
                          ))
                        )}

                        {planFormApiId === apiItem.apiId && (
                          <form
                            onSubmit={handleSavePlan}
                            className="glass-panel"
                            style={{
                              marginTop: '1rem',
                              display: 'grid',
                              gap: '0.85rem',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                              }}
                            >
                              <h4 style={{ margin: 0 }}>
                                {editingPlanId != null ? 'Edit Plan' : 'Add New Plan'}
                              </h4>
                              <button
                                type="button"
                                className="btn"
                                onClick={closePlanForm}
                              >
                                <X size={16} /> Close
                              </button>
                            </div>

                            <div className="form-group">
                              <label>Plan name</label>
                              <input
                                className="form-input"
                                name="planName"
                                value={planForm.planName}
                                onChange={handlePlanFormChange}
                                placeholder="Free, Pro, Enterprise"
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label>Price (₹)</label>
                              <input
                                className="form-input"
                                name="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={planForm.price}
                                onChange={handlePlanFormChange}
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label>Rate limit (requests per minute)</label>
                              <input
                                className="form-input"
                                name="rateLimitPerMinute"
                                type="number"
                                min="1"
                                step="1"
                                value={planForm.rateLimitPerMinute}
                                onChange={handlePlanFormChange}
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label>Description</label>
                              <textarea
                                className="form-input"
                                name="description"
                                value={planForm.description}
                                onChange={handlePlanFormChange}
                                rows={3}
                              />
                            </div>

                            <button
                              className="btn btn-primary"
                              type="submit"
                              disabled={planSaving}
                            >
                              <Check size={16} />
                              {planSaving
                                ? 'Saving…'
                                : editingPlanId != null
                                  ? 'Save Changes'
                                  : 'Create Plan'}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {user.role === 'CONSUMER' && activeTab === 'marketplace' && (
          <section className="animation-fade-in">
            <h2>API Marketplace</h2>
            <div className="grid">
              {allApis.length === 0 ? (
                <div className="glass-panel">No APIs are currently available.</div>
              ) : (
                allApis.map((apiItem) => (
                  <article className="card" key={apiItem.apiId}>
                    <h3>
                      <Server size={18} /> {apiItem.apiName}
                    </h3>
                    <p>{apiItem.apiDescription}</p>
                    <p
                      style={{
                        overflowWrap: 'anywhere',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {apiItem.link || 'No base URL returned'}
                    </p>

                    <button
                      className="btn"
                      disabled={loading}
                      onClick={() => loadPlans(apiItem)}
                    >
                      <CreditCard size={16} />
                      {expandedApiId === apiItem.apiId ? 'Hide plans' : 'View plans'}
                    </button>

                    {expandedApiId === apiItem.apiId && (
                      <div className="plans-panel" style={{ marginTop: '1rem' }}>
                        <h4>Plans — {apiItem.apiName}</h4>
                        {(plansForApi[apiItem.apiId] || []).length === 0 ? (
                          <p>No active plans are currently available.</p>
                        ) : (
                          (plansForApi[apiItem.apiId] || []).map((plan) => (
                            <div
                              key={getPlanId(plan)}
                              style={{
                                borderTop: '1px solid var(--border-color)',
                                padding: '0.75rem 0',
                              }}
                            >
                              <strong>{plan.planName || plan.name}</strong>
                              <p>{plan.description || ''}</p>
                              <p>₹{Number(plan.price ?? 0).toFixed(2)}</p>
                              <p>
                                {plan.rateLimitPerMinute} requests/minute
                              </p>

                              {Number(plan.price) === 0 ? (
                                <button
                                  className="btn btn-primary"
                                  disabled={loading}
                                  onClick={() => handleSubscribeFree(apiItem)}
                                >
                                  Subscribe to Free Plan
                                </button>
                              ) : (
                                <button
                                  className="btn btn-primary"
                                  disabled={paymentBusy}
                                  onClick={() => handlePayForPlan(plan, apiItem)}
                                >
                                  <CreditCard size={16} />
                                  {paymentBusy ? 'Processing…' : 'Pay & Subscribe'}
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {user.role === 'CONSUMER' && activeTab === 'my-subscriptions' && (
          <section className="animation-fade-in">
            <h2>My Subscriptions</h2>
            <div className="grid">
              {subscriptions.length === 0 ? (
                <div className="glass-panel">You have no subscriptions yet.</div>
              ) : (
                subscriptions.map((subscription) => {
                  const subId = getId(subscription);

                  return (
                    <article className="card" key={subId}>
                      <h3>
                        <Key size={18} /> {subscription.apiName || `API #${subscription.apiId}`}
                      </h3>
                      <p>
                        Status: <strong>{subscription.status || 'Unknown'}</strong>
                      </p>
                      <p>Plan: {subscription.planName || 'Not provided by backend'}</p>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setSelectedConsumerSubId(subId);
                            setActiveTab('consumer-sub-analytics');
                          }}
                        >
                          <Activity size={16} /> Analytics
                        </button>
                        <button
                          className="btn"
                          disabled={subscription.status !== 'ACTIVE' || keyLoading[subId]}
                          onClick={() => handleToggleApiKey(subscription)}
                        >
                          {revealedKeys[subId] ? <EyeOff size={16} /> : <Eye size={16} />}
                          {revealedKeys[subId] ? 'Hide key' : 'Reveal key'}
                        </button>
                        <button
                          className="btn"
                          disabled={!subscriptionKeys[subId] || subscription.status !== 'ACTIVE'}
                          onClick={() => handleCopyApiKey(subscription)}
                        >
                          {copiedKeyId === subId ? <Check size={16} /> : <Copy size={16} />}
                          Copy key
                        </button>
                        <button
                          className="btn"
                          disabled={subscription.status !== 'ACTIVE'}
                          onClick={() => openPlayground(subscription)}
                        >
                          <Send size={16} /> Try API
                        </button>
                      </div>

                      {revealedKeys[subId] && subscriptionKeys[subId] && (
                        <p style={{ overflowWrap: 'anywhere', marginTop: '1rem' }}>
                          <code>{subscriptionKeys[subId]}</code>
                        </p>
                      )}

                      {playgroundSubId === subId && (
                        <div className="plans-panel" style={{ marginTop: '1rem' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: '1rem',
                            }}
                          >
                            <h4>Request Playground</h4>
                            <button
                              className="btn"
                              onClick={() => {
                                setPlaygroundSubId(null);
                                setRequestResponse(null);
                              }}
                            >
                              <X size={16} /> Close
                            </button>
                          </div>

                          <form
                            onSubmit={sendGatewayRequest}
                            style={{ display: 'grid', gap: '0.75rem' }}
                          >
                            <div className="form-group">
                              <label>HTTP method</label>
                              <select
                                className="form-input"
                                value={requestMethod}
                                onChange={(e) => setRequestMethod(e.target.value)}
                              >
                                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                                  <option key={method}>{method}</option>
                                ))}
                              </select>
                            </div>

                            <div className="form-group">
                              <label>Endpoint path</label>
                              <input
                                className="form-input"
                                value={requestPath}
                                onChange={(e) => setRequestPath(e.target.value)}
                                placeholder="/posts/1"
                                required
                              />
                            </div>

                            {['POST', 'PUT', 'PATCH'].includes(requestMethod) && (
                              <div className="form-group">
                                <label>JSON body</label>
                                <textarea
                                  className="form-input"
                                  rows={5}
                                  value={requestBody}
                                  onChange={(e) => setRequestBody(e.target.value)}
                                />
                              </div>
                            )}

                            <button
                              className="btn btn-primary"
                              type="submit"
                              disabled={requestLoading || keyLoading[subId]}
                            >
                              <Send size={16} />
                              {requestLoading ? 'Sending…' : 'Send request'}
                            </button>
                          </form>

                          {requestResponse && (
                            <div style={{ marginTop: '1rem' }}>
                              <p>
                                HTTP {requestResponse.status} {requestResponse.statusText || ''}
                                {requestDuration != null ? ` · ${requestDuration} ms` : ''}
                              </p>
                              <pre
                                style={{
                                  whiteSpace: 'pre-wrap',
                                  overflowWrap: 'anywhere',
                                  overflowX: 'auto',
                                }}
                              >
                                {typeof requestResponse.data === 'string'
                                  ? requestResponse.data
                                  : JSON.stringify(requestResponse.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        )}

        {user.role === 'PROVIDER' && activeTab === 'provider-api-analytics' && (
          <ProviderAnalytics
            api={myApis.find(
              (item) => Number(item.apiId) === Number(selectedProviderApiId)
            )}
            apiId={selectedProviderApiId}
            providerId={user.providerId ?? user.userId ?? user.id}
            onBack={() => setActiveTab('my-apis')}
          />
        )}

        {user.role === 'CONSUMER' && activeTab === 'consumer-sub-analytics' && (
          <ConsumerAnalytics
            subscription={subscriptions.find(
              (item) => Number(getId(item)) === Number(selectedConsumerSubId)
            )}
            subscriptionId={selectedConsumerSubId}
            consumerId={user.consumerId ?? user.userId ?? user.id}
            onBack={() => setActiveTab('my-subscriptions')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
