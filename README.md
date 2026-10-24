# APIForge — Frontend

APIForge is a React-based frontend for an API marketplace and gateway. It provides separate dashboards for API providers and consumers, plan management, Razorpay checkout, API-key management, and a request playground that sends requests through the Spring Boot API Gateway.

## Features

### Authentication
- User login and registration as an API provider or consumer.
- Stores the authenticated user and JWT in browser `localStorage`.
- Adds the JWT as a Bearer token to API requests when available.

### Provider dashboard
- Register an API with its name, upstream base URL, and description.
- View APIs registered by the current provider.
- Create and edit plans for a registered API.
- Configure plan price, description, and rate limit per minute.

### Consumer dashboard
- Browse APIs available in the marketplace.
- Subscribe to APIs and view existing subscriptions.
- View available paid plans and purchase a plan through Razorpay Checkout.
- Verify the payment through the backend before refreshing subscriptions.
- Reveal, hide, and copy an active subscription's API key.

### Request Playground
- Open **Try API** from an active subscription.
- Select `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`.
- Enter an endpoint path, such as `/posts/1`.
- Enter a JSON body for `POST`, `PUT`, and `PATCH` requests.
- Send the request through the gateway using the subscription's `api-key` header.
- View the response status, response body, and request duration, including HTTP error responses returned by the gateway or upstream API.

## Tech stack

- React
- Vite
- Axios
- Lucide React icons
- Razorpay Checkout (loaded when the user starts a payment)
- CSS for application styling

## Requirements

- Node.js and npm compatible with the versions in `package.json`.
- The APIForge Spring Boot backend running locally on port `8080` by default.
- PostgreSQL and Redis configured for the backend features that require them.
- A Razorpay test configuration on the backend to test paid subscriptions.

## Getting started

1. Open a terminal in the frontend project directory (the directory containing `package.json`).
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the Vite development server:

   ```bash
   npm run dev
   ```

4. Open the local URL printed by Vite. It is commonly `http://localhost:5173`.
5. Start the Spring Boot backend on `http://localhost:8080` and ensure its CORS configuration allows the frontend origin.

Build the production frontend:

```bash
npm run build
```

Preview a production build locally:

```bash
npm run preview
```

Run the configured linter:

```bash
npm run lint
```

## Backend configuration and API routes

The Axios clients use `VITE_API_BASE_URL`, with `http://localhost:8080` as the local default. Copy `.env.example` to `.env` and change the URL if your backend runs elsewhere. Do not put secrets in frontend environment variables; Vite variables are exposed to the browser.

The frontend currently uses these backend routes:

| Purpose | Method | Route |
|---|---|---|
| Login | `POST` | `/api/v1/auth/login` |
| Register provider | `POST` | `/api/v1/auth/provider/register` |
| Register consumer | `POST` | `/api/v1/auth/consumer/register` |
| List provider's APIs | `GET` | `/api/v1/apis/myapi` |
| Register an API | `POST` | `/api/v1/apis/register` |
| Browse available APIs | `GET` | `/api/v1/subscription/all` |
| List consumer subscriptions | `GET` | `/api/v1/subscription` |
| Subscribe to an API | `POST` | `/api/v1/subscription` |
| Retrieve a subscription API key | `GET` | `/api/v1/subscription/{subscriptionId}/key` |
| List plans for an API | `GET` | `/api/v1/payment/plans/{apiId}` |
| Create a plan | `POST` | `/api/v1/payment/plans/{apiId}` |
| Update a plan | `PUT` | `/api/v1/payment/plans/{planId}` |
| Create a Razorpay order | `POST` | `/api/v1/payment/create-order` |
| Verify a Razorpay payment | `POST` | `/api/v1/payment/verify` |
| Send a request through the gateway | Selected method | `/proxy/{endpointPath}` |

Confirm these routes against the controllers in your backend if you change the API mappings.

## Analytics data integration

The analytics UI calls the authenticated backend routes:

| Purpose | Method | Route |
|---|---|---|
| Provider request metrics | `GET` | `/api/analytics/provider/metrics` |
| Provider anomalies | `GET` | `/api/analytics/provider/anomalies` |
| Recent Kafka-persisted request logs | `GET` | `/api/analytics/provider/stream` |
| Provider traffic projection | `GET` | `/api/analytics/provider/chart-data` |
| Provider consumer leaderboard | `GET` | `/api/analytics/provider/leaderboard` |
| Provider slowest endpoints | `GET` | `/api/analytics/provider/slowest-endpoints` |
| Consumer subscription usage | `GET` | `/api/analytics/subscriber/usage?subId={subscriptionId}` |

The Kafka-backed stream UI polls the backend stream endpoint every five seconds. It does not connect directly to Kafka from the browser. The backend must have Kafka running and its consumer persisting request events for the stream to populate. Live request counts and anomalies use backend data; revenue, detailed breakdowns, quota projections, and some charts remain explicitly marked demo estimates because the current backend does not expose matching endpoints.

## Using the Request Playground

1. Log in as a consumer.
2. Open **My Subscriptions**.
3. Reveal the key if needed, then click **Try API** on an active subscription.
4. Choose the HTTP method and enter a path relative to the API's registered upstream base URL.
5. For `POST`, `PUT`, or `PATCH`, provide a valid JSON request body.
6. Click **Send Request** and inspect the response.

For example, if the provider registered this upstream base URL:

```text
https://jsonplaceholder.typicode.com
```

Try the following request:

```text
Method: GET
Endpoint path: /posts/1
Gateway URL: http://localhost:8080/proxy/posts/1
```

The browser calls the APIForge gateway, and the backend forwards the request to the registered upstream API. The frontend does not call the upstream URL directly for Playground requests.

## Important implementation notes

- The gateway request uses the `api-key` header. The frontend retrieves the key from `GET /api/v1/subscription/{subscriptionId}/key` when opening the playground.
- The subscription must have `ACTIVE` status before the frontend enables the playground request.
- The frontend expects the key endpoint to return an object shaped like `{ "apiKey": "..." }` and subscription records to include an ID and status.
- The frontend expects the plan endpoint to return an array of plans (or an object containing `content` or `plans`) with fields such as `planId`, `planName`, `price`, `rateLimitPerMinute`, and `description`.
- Razorpay's secret key must remain on the backend. The frontend uses the public `keyId` returned by the create-order endpoint and sends the checkout result to the backend for verification.
- The Playground currently displays the response body, HTTP status, and elapsed request time. It is not a complete replacement for a dedicated API client such as Postman.
- The gateway URL shown in the UI assumes the backend runs at `http://localhost:8080`. Change this when deploying to another environment.

## Troubleshooting

### Network error or failed request
- Confirm the Spring Boot backend is running on port `8080`.
- Confirm the browser's request URL matches the backend host and port.
- Check the backend CORS configuration for the Vite origin.
- Check the browser Network tab and Spring Boot logs for the actual error.

### `401 Unauthorized` from the gateway
- Confirm the subscription's API key exists and belongs to the selected subscription.
- Confirm the request is sent with the `api-key` header.

### `403 Forbidden` or inactive subscription
- Check that the subscription is active and the provider's API has not been suspended.

### `429 Too Many Requests`
- The subscription has reached its configured rate limit. Wait for the rate-limit window to pass or use a plan with a higher limit.

### Paid plan or Razorpay errors
- Confirm the backend payment routes match the paths listed above.
- Use Razorpay test credentials in development.
- Inspect the create-order and payment-verification responses in the browser Network tab and backend logs.

## Project layout

The main application files in the Vite project are typically:

```text
src/
  App.jsx       # Authentication, dashboards, plans, subscriptions and Request Playground
  App.css       # Application component styles (if used by this project)
  index.css     # Global styles and shared UI classes
  main.jsx      # React entry point
public/         # Static public assets
index.html      # Vite HTML entry point
package.json    # Dependencies and npm scripts
```

Keep the backend API routes and frontend route constants synchronized when changing the application.
