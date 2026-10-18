# APIForge Frontend — Razorpay integration

This ZIP is based on your uploaded `ApiGateway-Frontend` project. Existing login/register, provider dashboard, API marketplace, subscriptions, styling and axios JWT interceptor have been preserved. The marketplace now has a **View Paid Plans** flow and Razorpay Checkout handling.

## Existing app conventions preserved
- React + Vite
- JWT stored as `localStorage.token`
- Axios base URL `http://localhost:8080`
- Existing auth routes and subscription listing routes remain unchanged.

## Payment/plan routes used by the integration
The backend source was not included in the uploaded frontend ZIP, so these three paths are assumptions and should be checked against your Spring controllers near `PaymentService` / `ApiPlan`:
- `GET /api/v1/plans/api/{apiId}` — list active plans for an API
- `POST /api/v1/payment/create-order` with `{ "planId": <id> }`
- `POST /api/v1/payment/verify` with `{ "razorpayOrderId", "razorpayPaymentId", "razorpaySignature" }`

They are declared near the top of `src/App.jsx` as:
```js
const PAYMENT_CREATE_ORDER_PATH = '/api/v1/payment/create-order';
const PAYMENT_VERIFY_PATH = '/api/v1/payment/verify';
const API_PLANS_PATH = (apiId) => `/api/v1/plans/api/${apiId}`;
```
If your controller mappings differ, change these constants. Also compare the request fields with your actual request DTOs (for example, your backend may call the ID `apiPlanId`).

## Plan response assumptions
The plan endpoint is expected to return an array with fields like `planId`, `planName`, `price`, and optional `description`. API records need an `apiId` (or `id`). If the backend returns different field names, adapt the property reads in `handleViewPlans` / marketplace plan rendering.

## Run
```powershell
npm install
npm run dev
```
Ensure the Spring Boot app is running on port 8080 and CORS allows the Vite origin (usually `http://localhost:5173`).

## Payment safety
The frontend only calls the verification endpoint after Razorpay Checkout returns its payment identifiers and signature. It displays success only if the backend verification request succeeds. The backend must verify the signature, order, amount and successful/captured status before activating the subscription. Do not expose the Razorpay secret in frontend code.
