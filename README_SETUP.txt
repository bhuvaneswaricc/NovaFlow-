# NovaFlow – AWS backend package

This package provides one Lambda API for tasks, calendar events, daily routines and reminder records.

## 1. DynamoDB tables

In AWS Console → DynamoDB → Tables → Create table, create these four tables in **us-east-1**:

| Table name | Partition key | Key type |
|---|---|---|
| NovaFlowTasks | id | String |
| NovaFlowEvents | id | String |
| NovaFlowRoutine | id | String |
| NovaFlowReminders | id | String |

No sort key is required. Use on-demand capacity for a small personal planner.

If you already created `NovaFlowReminders`, keep it and create the other three.

## 2. Prepare the Lambda ZIP

Use Node.js 20.x for the Lambda runtime.

On your computer, open a terminal inside the `lambda` folder and run:

```bash
npm install
```

Then create the deployment ZIP **from inside the lambda folder**, including:
- `index.mjs`
- `package.json`
- `package-lock.json` (created by npm install)
- `node_modules/`

Do not zip the parent folder. Upload that ZIP in Lambda → Code → Upload from → .zip file.

Set the Lambda handler to:

```text
index.handler
```

Set timeout to 15 seconds.

## 3. Lambda environment variables

Lambda → Configuration → Environment variables:

| Key | Value |
|---|---|
| TASKS_TABLE | NovaFlowTasks |
| EVENTS_TABLE | NovaFlowEvents |
| ROUTINES_TABLE | NovaFlowRoutine |
| REMINDERS_TABLE | NovaFlowReminders |
| ALLOWED_ORIGIN | * |

For production, replace `*` with your website domain (including scheme), for example `https://your-domain.example`. If you use an EC2 IP or DuckDNS hostname, use that exact origin.

## 4. Lambda permissions

Open the Lambda execution role in IAM and add the policy in `setup/lambda-dynamodb-policy.json`.

Replace `YOUR_ACCOUNT_ID` with your 12-digit AWS account ID. Confirm the region is `us-east-1`.

The Lambda role needs `dynamodb:Scan`, `dynamodb:GetItem`, `dynamodb:PutItem`, and `dynamodb:DeleteItem` on all four tables.

## 5. API Gateway (HTTP API)

Create or use an **HTTP API** and integrate all routes below with this same Lambda:

```text
GET     /
GET     /health

GET     /tasks
POST    /tasks
PUT     /tasks
DELETE  /tasks

GET     /events
POST    /events
PUT     /events
DELETE  /events

GET     /routines
POST    /routines
PUT     /routines
DELETE  /routines

GET     /reminders
POST    /reminders
PUT     /reminders
DELETE  /reminders
```

For DELETE, pass the item id as a query string, e.g. `/tasks?id=abc123`.

Enable CORS in API Gateway:
- Allowed origins: your frontend origin (or `*` while testing)
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Allowed headers: content-type

Deploy the API to the stage you use. If your API invoke URL has a stage suffix such as `/prod`, include it in the frontend API base URL. If it does not, do not add `/prod`.

## 6. Frontend API URL

Your current API URL is:

```js
const NOVAFLOW_API_URL = "https://i0odif6t7e.execute-api.us-east-1.amazonaws.com";
```

Keep this only if it is the current Invoke URL shown by your API Gateway. If API Gateway displays a stage suffix, use it, for example:

```js
const NOVAFLOW_API_URL = "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod";
```

Do not add a trailing slash.

## 7. API test

Open this in a browser:

```text
https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/health
```

Expected response:

```json
{
  "success": true,
  "message": "NovaFlow API is running",
  "resources": ["tasks", "events", "routines", "reminders"]
}
```

Test POST `/tasks` in API Gateway or a REST client with:

```json
{
  "id": "test-task-001",
  "name": "Test NovaFlow task",
  "date": "2026-11-02",
  "time": "18:00",
  "priority": "High",
  "category": "Personal",
  "notes": "Check DynamoDB save",
  "done": false
}
```

Then call GET `/tasks` and confirm the item appears. Also verify it in DynamoDB → Explore items.

## 8. Important frontend fixes

Your pasted HTML contains a broken function declaration. Find this:

```js
function 


openTask(id = null) {
```

Replace it with:

```js
function openTask(id = null) {
```

Your current frontend sends tasks to AWS, but calendar events and routines are still saved only in `localStorage`. To persist those too, the frontend must call:
- `/events` on event load/save/delete
- `/routines` on routine load/save/delete/toggle

The backend ZIP already supports these endpoints; the browser code must call them. Do not assume that creating the backend alone automatically moves existing browser-local records into DynamoDB.

## 9. Email reminder note

This API stores reminder records in `NovaFlowReminders`. It does **not** send email by itself. Actual scheduled email delivery needs an additional scheduler (EventBridge Scheduler) and an email service such as Amazon SES, including verified sender/recipient identities and the required permissions. The frontend checkbox alone cannot send an email.

## Troubleshooting

- `404 Unknown endpoint`: API Gateway route is missing or the frontend URL/stage is wrong.
- `500` with DynamoDB access error: attach the IAM policy to the Lambda execution role.
- Browser CORS error: configure CORS in API Gateway and redeploy; check that the frontend URL is correct.
- `Failed to fetch`: check API invoke URL, route, CORS and Lambda logs.
- `GET /tasks` works but saves fail: verify POST and PUT routes are integrated with this Lambda.
