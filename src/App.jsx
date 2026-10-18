import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogIn, UserPlus, Server, Key, Activity, Layers, LogOut, Code, FileText, CreditCard, X, Eye, EyeOff, Copy, Check, Send, Clock, Braces } from 'lucide-react';
import './index.css';

// Configure axios base
const api = axios.create({
  baseURL: 'http://localhost:8080',
});

// Payment and plan routes: verify these match your Spring Boot controllers.
const PAYMENT_CREATE_ORDER_PATH = '/api/v1/payment/create-order';
const PAYMENT_VERIFY_PATH = '/api/v1/payment/verify';
const API_PLANS_PATH = (apiId) => `/api/v1/payment/plans/${apiId}`;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null); // { userName, role, jwtToken }
  const [authMode, setAuthMode] = useState('login'); // login | register-provider | register-consumer
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Auth Form State
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');

  // Provider State
  const [myApis, setMyApis] = useState([]);
  const [newApiName, setNewApiName] = useState('');
  const [newApiLink, setNewApiLink] = useState('');
  const [newApiDesc, setNewApiDesc] = useState('');

  // Provider plan-management state
  const [expandedProviderApiId, setExpandedProviderApiId] = useState(null);
  const [providerPlans, setProviderPlans] = useState({});
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planForm, setPlanForm] = useState({ planName: '', price: '', rateLimitPerMinute: 60, description: '' });
  const [savingPlan, setSavingPlan] = useState(false);

  // Consumer State
  const [subscriptions, setSubscriptions] = useState([]);
  const [allApis, setAllApis] = useState([]);
  const [plansForApi, setPlansForApi] = useState({});
  const [expandedApiId, setExpandedApiId] = useState(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState({});
  const [subscriptionKeys, setSubscriptionKeys] = useState({});
  const [keyLoading, setKeyLoading] = useState({});
  const [copiedKeyId, setCopiedKeyId] = useState(null);

  // Consumer request-playground state
  const [playgroundSubId, setPlaygroundSubId] = useState(null);
  const [requestMethod, setRequestMethod] = useState('GET');
  const [requestPath, setRequestPath] = useState('/');
  const [requestBody, setRequestBody] = useState(`{
  "title": "My test post",
  "body": "Hello from APIForge",
  "userId": 1
}`);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestResponse, setRequestResponse] = useState(null);
  const [requestDuration, setRequestDuration] = useState(null);


  // Dashboard UI State
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed);
      setActiveTab(parsed.role === 'PROVIDER' ? 'my-apis' : 'marketplace');
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'PROVIDER') {
        fetchMyApis();
      } else if (user.role === 'CONSUMER') {
        fetchSubscriptions();
        fetchAllApis();
      }
    }
  }, [user]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const res = await api.post('/api/v1/auth/login', { userName, password });
      setUser(res.data);
      setActiveTab(res.data.role === 'PROVIDER' ? 'my-apis' : 'marketplace');
      localStorage.setItem('user', JSON.stringify(res.data));
      localStorage.setItem('token', res.data.jwtToken);
      console.log(res.data.jwtToken)
      setSuccess('Logged in successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e, type) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const endpoint = type === 'PROVIDER' ? '/api/v1/auth/provider/register' : '/api/v1/auth/consumer/register';
      await api.post(endpoint, { userName, userEmail, password });
      setSuccess('Registration successful! Please login.');
      setAuthMode('login');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUserName('');
    setPassword('');
    setMyApis([]);
    setSubscriptions([]);
    setAllApis([]);
  };

  const fetchMyApis = async () => {
    try {
      const res = await api.get('/api/v1/apis/myapi');
      setMyApis(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  
const fetchAllApis = async () => {
  try {
    const res = await api.get('/api/v1/subscription/all');

    console.log('Status:', res.status);
    console.log('All APIs:', res.data);

    setAllApis(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error('Failed to fetch APIs:', {
      url: err.config?.url,
      baseURL: err.config?.baseURL,
      status: err.response?.status,
      response: err.response?.data,
      message: err.message,
    });
  }
};


  const fetchSubscriptions = async () => {
    try {
      const res = await api.get('/api/v1/subscription');

      console.log('Subscriptions response:', res.data);
      setSubscriptions(res.data);
      console.log(res.data)
    } catch (err) {
      console.error(err);
    }
  };

  const getSubscriptionId = (sub) => sub.subId ?? sub.subscriptionId ?? sub.id;

  const handleToggleApiKey = async (sub) => {
    const subscriptionId = getSubscriptionId(sub);
    if (subscriptionId == null) {
      setError('This subscription response does not include a subscription ID.');
      return;
    }

    if (revealedKeys[subscriptionId]) {
      setRevealedKeys((current) => ({ ...current, [subscriptionId]: false }));
      return;
    }

    if (subscriptionKeys[subscriptionId]) {
      setRevealedKeys((current) => ({ ...current, [subscriptionId]: true }));
      return;
    }

    setKeyLoading((current) => ({ ...current, [subscriptionId]: true }));
    clearMessages();
    try {
      const res = await api.get(`/api/v1/subscription/${subscriptionId}/key`);
      const apiKey = res.data?.apiKey;
      if (!apiKey) throw new Error('The key endpoint did not return an apiKey.');
      setSubscriptionKeys((current) => ({ ...current, [subscriptionId]: apiKey }));
      setRevealedKeys((current) => ({ ...current, [subscriptionId]: true }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to retrieve API key.');
    } finally {
      setKeyLoading((current) => ({ ...current, [subscriptionId]: false }));
    }
  };

  const handleOpenPlayground = async (sub) => {
    const subscriptionId = getSubscriptionId(sub);
    if (subscriptionId == null) {
      setError('This subscription response does not include a subscription ID.');
      return;
    }
    setPlaygroundSubId(subscriptionId);
    setRequestResponse(null);
    setRequestMethod('GET');
    setRequestPath('/');
    clearMessages();
    if (!subscriptionKeys[subscriptionId]) {
      setKeyLoading((current) => ({ ...current, [subscriptionId]: true }));
      try {
        const res = await api.get(`/api/v1/subscription/${subscriptionId}/key`);
        if (!res.data?.apiKey) throw new Error('The key endpoint did not return an apiKey.');
        setSubscriptionKeys((current) => ({ ...current, [subscriptionId]: res.data.apiKey }));
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to retrieve API key for the playground.');
      } finally {
        setKeyLoading((current) => ({ ...current, [subscriptionId]: false }));
      }
    }
  };

  const handleSendGatewayRequest = async (e) => {
    e.preventDefault();
    const sub = subscriptions.find((item) => getSubscriptionId(item) === playgroundSubId);
    if (!sub) {
      setError('Select an active subscription before sending a request.');
      return;
    }
    if (sub.status !== 'ACTIVE') {
      setError('This subscription is not active.');
      return;
    }
    const apiKey = subscriptionKeys[playgroundSubId];
    if (!apiKey) {
      setError('The API key is not available yet. Close and reopen Try API, then try again.');
      return;
    }
    const path = requestPath.trim();
    if (!path.startsWith('/')) {
      setError('Endpoint path must start with /.');
      return;
    }
    const config = { method: requestMethod, url: `/proxy${path}`, headers: { 'api-key': apiKey } };
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
    const startedAt = performance.now();
    try {
      const response = await api.request(config);
      setRequestResponse({ status: response.status, statusText: response.statusText, data: response.data, headers: response.headers });
    } catch (err) {
      if (err.response) {
        setRequestResponse({ status: err.response.status, statusText: err.response.statusText, data: err.response.data, headers: err.response.headers });
      } else {
        setRequestResponse({ status: 'NETWORK ERROR', statusText: err.message, data: { message: 'Could not reach the API Gateway. Check that the backend is running and CORS permits this request.' }, headers: {} });
      }
    } finally {
      setRequestDuration(Math.round(performance.now() - startedAt));
      setRequestLoading(false);
    }
  };

  const handleCopyApiKey = async (sub) => {
    const subscriptionId = getSubscriptionId(sub);
    let apiKey = subscriptionKeys[subscriptionId];
    if (!apiKey) {
      setError('Reveal the API key before copying it.');
      return;
    }
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKeyId(subscriptionId);
      window.setTimeout(() => setCopiedKeyId((current) => current === subscriptionId ? null : current), 1800);
    } catch {
      setError('Clipboard access failed. Use a secure context (HTTPS or localhost) and try again.');
    }
  };

  const handleRegisterApi = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      await api.post('/api/v1/apis/register', {
        apiName: newApiName,
        link: newApiLink,
        apiDescription: newApiDesc
      });
      setSuccess('API Registered Successfully!');
      setNewApiName('');
      setNewApiLink('');
      setNewApiDesc('');
      fetchMyApis();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register API');
    } finally {
      setLoading(false);
    }
  };

  const handleManagePlans = async (apiItem) => {
    clearMessages();
    const apiId = apiItem.apiId ?? apiItem.id;
    if (apiId == null) {
      setError('API ID is missing from the API response.');
      return;
    }
    if (expandedProviderApiId === apiId) {
      setExpandedProviderApiId(null);
      setEditingPlanId(null);
      return;
    }
    setExpandedProviderApiId(apiId);
    setEditingPlanId(null);
    try {
      const res = await api.get(API_PLANS_PATH(apiId));
      const plans = Array.isArray(res.data) ? res.data : (res.data?.content || res.data?.plans || []);
      setProviderPlans(previous => ({ ...previous, [apiId]: plans }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load plans.');
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlanId(plan.planId ?? plan.id);
    setPlanForm({
      planName: plan.planName ?? '',
      price: String(plan.price ?? 0),
      rateLimitPerMinute: String(plan.rateLimitPerMinute ?? 60),
      description: plan.description ?? ''
    });
    clearMessages();
  };

  const handleSavePlan = async (e, apiItem) => {
    e.preventDefault();
    clearMessages();
    const apiId = apiItem.apiId ?? apiItem.id;
    const payload = {
      planName: planForm.planName.trim(),
      price: Number(planForm.price),
      rateLimitPerMinute: Number(planForm.rateLimitPerMinute),
      description: planForm.description.trim()
    };
    if (!payload.planName || !Number.isFinite(payload.price) || payload.price < 0 ||
        !Number.isInteger(payload.rateLimitPerMinute) || payload.rateLimitPerMinute < 1) {
      setError('Enter a valid plan name, non-negative price, and rate limit of at least 1.');
      return;
    }
    setSavingPlan(true);
    try {
      if (editingPlanId != null) {
        await api.put(`/api/v1/payment/plans/${editingPlanId}`, payload);
        setSuccess('Plan updated successfully.');
      } else {
        await api.post(`/api/v1/payment/plans/${apiId}`, payload);
        setSuccess('Plan created successfully.');
      }
      const res = await api.get(API_PLANS_PATH(apiId));
      const plans = Array.isArray(res.data) ? res.data : (res.data?.content || res.data?.plans || []);
      setProviderPlans(previous => ({ ...previous, [apiId]: plans }));
      setPlansForApi(previous => ({ ...previous, [apiId]: plans }));
      setEditingPlanId(null);
      setPlanForm({ planName: '', price: '', rateLimitPerMinute: 60, description: '' });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleSubscribeApi = async (apiName) => {
    setLoading(true);
    clearMessages();
    try {
      await api.post('/api/v1/subscription', {
        userName: user.userName,
        apiName: apiName
      });
      setSuccess(`Subscribed to ${apiName} successfully!`);
      fetchSubscriptions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };


  const handleViewPlans = async (apiItem) => {
    clearMessages();
    const apiId = apiItem.apiId ?? apiItem.id;
    if (apiId == null) {
      setError('This API response does not include apiId. The plan list cannot be loaded until the backend returns the API ID.');
      return;
    }
    if (expandedApiId === apiId) {
      setExpandedApiId(null);
      return;
    }
    setExpandedApiId(apiId);
    if (plansForApi[apiId]) return;

    setLoading(true);
    try {
      const res = await api.get(API_PLANS_PATH(apiId));
      const plans = Array.isArray(res.data) ? res.data : (res.data?.content || res.data?.plans || []);
      setPlansForApi(previous => ({ ...previous, [apiId]: plans }));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load plans. Check API_PLANS_PATH against your backend controller.');
      setPlansForApi(previous => ({ ...previous, [apiId]: [] }));
    } finally {
      setLoading(false);
    }
  };

  const handlePayForPlan = async (plan, apiItem) => {
    clearMessages();
    const planId = plan.planId ?? plan.id;
    if (planId == null) {
      setError('The plan response does not contain planId.');
      return;
    }

    setPaymentBusy(true);
    try {
      const orderRes = await api.post(PAYMENT_CREATE_ORDER_PATH, { planId });
      const order = orderRes.data;
      if (!order?.keyId || !order?.razorpayOrderId || !Number.isFinite(Number(order?.amount))) {
        throw new Error('Create-order response is missing keyId, razorpayOrderId or amount.');
      }

      const loadRazorpay = () => new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
      if (!(await loadRazorpay())) throw new Error('Could not load Razorpay Checkout. Check your internet connection.');

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: Number(order.amount),
        currency: order.currency || 'INR',
        name: 'APIForge',
        description: `${order.apiName || apiItem.apiName} — ${order.planName || plan.planName || plan.name || 'API plan'}`,
        order_id: order.razorpayOrderId,
        theme: { color: '#8b5cf6' },
        modal: {
          ondismiss: () => setPaymentBusy(false),
        },
        handler: async (paymentResult) => {
          try {
            const verification = await api.post(PAYMENT_VERIFY_PATH, {
              razorpayOrderId: paymentResult.razorpay_order_id || order.razorpayOrderId,
              razorpayPaymentId: paymentResult.razorpay_payment_id,
              razorpaySignature: paymentResult.razorpay_signature,
            });
            setSuccess(verification.data?.message || 'Payment verified. Refreshing subscriptions…');
            await fetchSubscriptions();
            setExpandedApiId(null);
          } catch (err) {
            setError(`Checkout completed, but backend verification failed: ${err.response?.data?.message || err.message}. Check subscription status before retrying.`);
          } finally {
            setPaymentBusy(false);
          }
        },
      });
      checkout.on('payment.failed', (event) => {
        setError(event?.error?.description || 'Payment failed. Please try again.');
        setPaymentBusy(false);
      });
      checkout.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to start payment.');
      setPaymentBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="app-container">
        <div className="auth-container glass-panel">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="logo-container" style={{ justifyContent: 'center' }}>
              <Activity size={36} color="#e879f9" />
              <span style={{ fontSize: '2rem' }}>ApiGateway</span>
            </div>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Centralized API Management Platform</p>
          </div>

          <div className="tabs" style={{ justifyContent: 'center' }}>
            <button className={`tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => { setAuthMode('login'); clearMessages(); }}>Login</button>
            <button className={`tab ${authMode === 'register-provider' ? 'active' : ''}`} onClick={() => { setAuthMode('register-provider'); clearMessages(); }}>Provider</button>
            <button className={`tab ${authMode === 'register-consumer' ? 'active' : ''}`} onClick={() => { setAuthMode('register-consumer'); clearMessages(); }}>Consumer</button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Username</label>
                <input type="text" className="form-input" value={userName} onChange={e => setUserName(e.target.value)} required placeholder="Enter username" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }} disabled={loading}>
                <LogIn size={20} /> {loading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={e => handleRegister(e, authMode === 'register-provider' ? 'PROVIDER' : 'CONSUMER')}>
              <div className="form-group">
                <label>Username</label>
                <input type="text" className="form-input" value={userName} onChange={e => setUserName(e.target.value)} required placeholder="Choose a username" />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="form-input" value={userEmail} onChange={e => setUserEmail(e.target.value)} required placeholder="name@company.com" />
              </div>
              <div className="form-group">
                <label>Password (min 8 chars)</label>
                <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required placeholder="Create a strong password" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }} disabled={loading}>
                <UserPlus size={20} /> {loading ? 'Registering...' : `Register as ${authMode === 'register-provider' ? 'Provider' : 'Consumer'}`}
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
          <Activity size={32} color="#e879f9" />
          <span style={{ fontSize: '1.5rem' }}>ApiGateway</span>
        </div>

        <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa, #e879f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
              {user.userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{user.userName}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user.role}</span>
            </div>
          </div>
        </div>

        <div className="sidebar-menu">
          {user.role === 'PROVIDER' ? (
            <>
              <button className={`menu-item ${activeTab === 'my-apis' ? 'active' : ''}`} onClick={() => { setActiveTab('my-apis'); clearMessages(); }}>
                <Layers size={20} /> My APIs
              </button>
              <button className={`menu-item ${activeTab === 'register-api' ? 'active' : ''}`} onClick={() => { setActiveTab('register-api'); clearMessages(); }}>
                <Server size={20} /> Register New API
              </button>
            </>
          ) : (
            <>
              <button className={`menu-item ${activeTab === 'marketplace' ? 'active' : ''}`} onClick={() => { setActiveTab('marketplace'); clearMessages(); }}>
                <Server size={20} /> API Marketplace
              </button>
              <button className={`menu-item ${activeTab === 'my-subscriptions' ? 'active' : ''}`} onClick={() => { setActiveTab('my-subscriptions'); clearMessages(); }}>
                <FileText size={20} /> My Subscriptions
              </button>
            </>
          )}
        </div>

        <button className="menu-item" onClick={logout} style={{ marginTop: 'auto', color: 'var(--danger)' }}>
          <LogOut size={20} /> Logout
        </button>
      </aside>

      <main className="main-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {user.role === 'PROVIDER' && activeTab === 'register-api' && (
          <div className="glass-panel animation-fade-in">
            <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Server size={28} color="var(--primary)" /> Register New API</h2>
            <form onSubmit={handleRegisterApi} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>API Name</label>
                <input type="text" className="form-input" value={newApiName} onChange={e => setNewApiName(e.target.value)} required placeholder="e.g. WeatherService" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Upstream URL</label>
                <input type="url" className="form-input" value={newApiLink} onChange={e => setNewApiLink(e.target.value)} required placeholder="https://api.weather.com" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label>Description</label>
                <textarea className="form-input" value={newApiDesc} onChange={e => setNewApiDesc(e.target.value)} rows={3} required placeholder="What does this API do?"></textarea>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 1.5rem' }}>
                  <Code size={20} /> Deploy API to Gateway
                </button>
              </div>
            </form>
          </div>
        )}

        {user.role === 'PROVIDER' && activeTab === 'my-apis' && (
          <div className="animation-fade-in">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Layers size={28} color="var(--primary)" /> My APIs</h2>
            <div className="grid">
              {myApis.length === 0 ? (
                <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
                  <Server size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ color: 'var(--text-secondary)' }}>No APIs registered yet.</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Register your first API to get started.</p>
                </div>
              ) : myApis.map((api, idx) => {
                const providerApiId = api.apiId ?? api.id;
                const currentPlans = providerPlans[providerApiId] || [];
                return (
                  <React.Fragment key={providerApiId ?? idx}>
                    <div className="card">
                      <h3><Activity size={20} color="var(--primary)" /> {api.apiName}</h3>
                      <p>{api.apiDescription}</p>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>UPSTREAM ENDPOINT</div>
                        <div style={{ wordBreak: 'break-all', fontSize: '0.9rem', fontFamily: 'var(--mono)' }}>{api.link}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${api.status === 'ACTIVE' ? 'badge-success' : 'badge-primary'}`}>{api.status}</span>
                        <button type="button" className="btn btn-primary" onClick={() => handleManagePlans(api)}>
                          <CreditCard size={16} /> {expandedProviderApiId === providerApiId ? 'Hide Plans' : 'Manage Plans'}
                        </button>
                      </div>
                    </div>
                    {expandedProviderApiId === providerApiId && (
                      <div className="plans-panel" style={{ gridColumn: '1 / -1' }}>
                        <div className="plans-panel-heading">
                          <strong>Manage Plans — {api.apiName}</strong>
                          <button type="button" className="plans-close" onClick={() => { setExpandedProviderApiId(null); setEditingPlanId(null); }} aria-label="Close plan management"><X size={16} /></button>
                        </div>
                        <form onSubmit={(e) => handleSavePlan(e, api)} style={{ display: 'grid', gap: '1rem', margin: '1rem 0' }}>
                          <h4>{editingPlanId != null ? 'Edit Plan' : 'Create New Plan'}</h4>
                          <div className="form-group">
                            <label>Plan Name</label>
                            <input className="form-input" value={planForm.planName} onChange={(e) => setPlanForm({ ...planForm, planName: e.target.value })} required placeholder="e.g. Basic" />
                          </div>
                          <div className="form-group">
                            <label>Price (INR)</label>
                            <input className="form-input" type="number" min="0" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} required />
                          </div>
                          <div className="form-group">
                            <label>Rate Limit Per Minute</label>
                            <input className="form-input" type="number" min="1" step="1" value={planForm.rateLimitPerMinute} onChange={(e) => setPlanForm({ ...planForm, rateLimitPerMinute: e.target.value })} required />
                          </div>
                          <div className="form-group">
                            <label>Description</label>
                            <textarea className="form-input" rows={2} value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="Describe the plan" />
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button type="submit" className="btn btn-primary" disabled={savingPlan}>{savingPlan ? 'Saving...' : editingPlanId != null ? 'Save Changes' : 'Create Plan'}</button>
                            {editingPlanId != null && <button type="button" className="btn" onClick={() => { setEditingPlanId(null); setPlanForm({ planName: '', price: '', rateLimitPerMinute: 60, description: '' }); }}>Cancel Edit</button>}
                          </div>
                        </form>
                        <div className="plans-panel-heading"><strong>Existing Plans</strong></div>
                        {currentPlans.length === 0 ? (
                          <p className="plans-empty">No plans found for this API yet.</p>
                        ) : currentPlans.map((plan) => (
                          <div className="plan-row" key={plan.planId ?? plan.id}>
                            <div>
                              <strong>{plan.planName || plan.name || 'Plan'}</strong>
                              <div className="plan-description">{plan.description || plan.planDescription || 'No description'}</div>
                              <div className="plan-price">₹{Number(plan.price ?? 0).toFixed(2)}</div>
                              <div className="plan-description">{plan.rateLimitPerMinute ?? '—'} requests/minute</div>
                            </div>
                            <button type="button" className="btn" onClick={() => handleEditPlan(plan)}>Edit Plan</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {user.role === 'CONSUMER' && activeTab === 'marketplace' && (
          <div className="animation-fade-in">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Server size={28} color="var(--primary)" /> Explore APIs</h2>
            <div className="grid">
              {allApis.length === 0 ? (
                <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
                  <Activity size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ color: 'var(--text-secondary)' }}>No APIs available yet.</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Check back later when providers deploy new APIs.</p>
                </div>
              ) : allApis.map((apiItem, idx) => {
                const isSubscribed = subscriptions.some(s => s.apiName === apiItem.apiName);
                return (
                  <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3><Activity size={20} color="var(--primary)" /> {apiItem.apiName}</h3>
                    <p style={{ flex: 1 }}>{apiItem.apiDescription}</p>
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {isSubscribed ? (
                        <span className="badge badge-success">Subscribed</span>
                      ) : (
                        <>
                          <button onClick={() => handleSubscribeApi(apiItem.apiName)} className="btn" disabled={loading || paymentBusy} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                            <Key size={16} /> Free Subscribe
                          </button>
                          <button onClick={() => handleViewPlans(apiItem)} className="btn btn-primary" disabled={loading || paymentBusy} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                            <CreditCard size={16} /> View Paid Plans
                          </button>
                        </>
                      )}
                    </div>
                    {expandedApiId === (apiItem.apiId ?? apiItem.id) && (
                      <div className="plans-panel">
                        <div className="plans-panel-heading">
                          <strong>Available plans</strong>
                          <button className="plans-close" onClick={() => setExpandedApiId(null)} aria-label="Close plans"><X size={16} /></button>
                        </div>
                        {(plansForApi[apiItem.apiId ?? apiItem.id] || []).length === 0 ? (
                          <p className="plans-empty">No plans returned, or the plan endpoint could not be loaded.</p>
                        ) : (plansForApi[apiItem.apiId ?? apiItem.id] || []).map((plan) => (
                          <div className="plan-row" key={plan.planId ?? plan.id}>
                            <div>
                              <strong>{plan.planName || plan.name || 'Plan'}</strong>
                              <div className="plan-description">{plan.description || plan.planDescription || 'API access plan'}</div>
                              <div className="plan-price">₹{Number(plan.price ?? 0).toFixed(2)}</div>
                            </div>
                            <button className="btn btn-primary" disabled={paymentBusy || loading} onClick={() => handlePayForPlan(plan, apiItem)}>
                              <CreditCard size={16} /> {paymentBusy ? 'Processing…' : 'Pay & Subscribe'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {user.role === 'CONSUMER' && activeTab === 'my-subscriptions' && (
          <div className="animation-fade-in">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><FileText size={28} color="var(--primary)" /> My Subscriptions</h2>
            <div className="grid">
              {subscriptions.length === 0 ? (
                <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
                  <Key size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ color: 'var(--text-secondary)' }}>No subscriptions yet.</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Subscribe to an API to start consuming.</p>
                </div>
              ) : subscriptions.map((sub, idx) => (
                <div key={idx} className="card">
                  <h3><Activity size={20} color="var(--primary)" /> {sub.apiName}</h3>
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 'bold' }}>AUTHENTICATION (API-KEY)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.4)', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                      <code style={{ flex: 1, minWidth: 0, fontFamily: 'var(--mono)', fontSize: '0.9rem', wordBreak: 'break-all', color: '#e879f9' }}>
                        {revealedKeys[getSubscriptionId(sub)] && subscriptionKeys[getSubscriptionId(sub)]
                          ? subscriptionKeys[getSubscriptionId(sub)]
                          : '••••••••••••••••••••••••'}
                      </code>
                      <button type="button" className="key-action-btn" title={revealedKeys[getSubscriptionId(sub)] ? 'Hide API key' : 'Reveal API key'} aria-label={revealedKeys[getSubscriptionId(sub)] ? 'Hide API key' : 'Reveal API key'} disabled={keyLoading[getSubscriptionId(sub)] || sub.status !== 'ACTIVE'} onClick={() => handleToggleApiKey(sub)}>
                        {keyLoading[getSubscriptionId(sub)] ? '…' : revealedKeys[getSubscriptionId(sub)] ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                      <button type="button" className="key-action-btn" title="Copy API key" aria-label="Copy API key" disabled={!subscriptionKeys[getSubscriptionId(sub)] || sub.status !== 'ACTIVE'} onClick={() => handleCopyApiKey(sub)}>
                        {copiedKeyId === getSubscriptionId(sub) ? <Check size={17} /> : <Copy size={17} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 'bold' }}>GATEWAY URL</div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', fontFamily: 'var(--mono)', fontSize: '0.9rem', wordBreak: 'break-all', border: '1px solid var(--border-color)' }}>
                      /proxy/{sub.apiName}
                    </div>
                  </div>
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span className={`badge ${sub.status === 'ACTIVE' ? 'badge-success' : 'badge-primary'}`}>{sub.status}</span>
                    <button type="button" className="btn btn-primary" disabled={sub.status !== 'ACTIVE' || keyLoading[getSubscriptionId(sub)]} onClick={() => handleOpenPlayground(sub)}>
                      <Send size={16} /> {playgroundSubId === getSubscriptionId(sub) ? 'Try API Selected' : 'Try API'}
                    </button>
                  </div>
                  {playgroundSubId === getSubscriptionId(sub) && (
                    <div className="plans-panel" style={{ marginTop: '1rem' }}>
                      <div className="plans-panel-heading">
                        <strong><Braces size={17} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} /> Request Playground — {sub.apiName}</strong>
                        <button type="button" className="plans-close" onClick={() => { setPlaygroundSubId(null); setRequestResponse(null); }} aria-label="Close request playground"><X size={16} /></button>
                      </div>
                      <form onSubmit={handleSendGatewayRequest} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 0.35fr) minmax(0, 1fr)', gap: '0.75rem' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Method</label>
                            <select className="form-input" value={requestMethod} onChange={(e) => setRequestMethod(e.target.value)}>
                              <option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="PATCH">PATCH</option><option value="DELETE">DELETE</option>
                            </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Endpoint path</label>
                            <input className="form-input" value={requestPath} onChange={(e) => setRequestPath(e.target.value)} placeholder="/posts/1" required />
                          </div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '8px', overflowWrap: 'anywhere' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>GATEWAY REQUEST URL</div>
                          <code style={{ fontSize: '0.85rem' }}>http://localhost:8080/proxy{requestPath.startsWith('/') ? requestPath : `/${requestPath}`}</code>
                        </div>
                        {['POST', 'PUT', 'PATCH'].includes(requestMethod) && (
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>JSON request body</label>
                            <textarea className="form-input" rows={6} value={requestBody} onChange={(e) => setRequestBody(e.target.value)} spellCheck={false} />
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button type="submit" className="btn btn-primary" disabled={requestLoading || keyLoading[playgroundSubId]}><Send size={16} /> {requestLoading ? 'Sending…' : 'Send Request'}</button>
                        </div>
                      </form>
                      {requestResponse && (
                        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            <strong>Response</strong>
                            <span className={`badge ${typeof requestResponse.status === 'number' && requestResponse.status < 400 ? 'badge-success' : 'badge-primary'}`}>{requestResponse.status} {requestResponse.statusText || ''}</span>
                            {requestDuration != null && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}><Clock size={14} style={{ verticalAlign: 'middle' }} /> {requestDuration} ms</span>}
                          </div>
                          <pre style={{ maxHeight: '420px', overflow: 'auto', padding: '1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.82rem' }}>{typeof requestResponse.data === 'string' ? requestResponse.data : JSON.stringify(requestResponse.data, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
