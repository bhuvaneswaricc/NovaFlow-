NOVAFLOW COMPLETE FRONTEND + BACKEND PACKAGE

Contents:
- frontend/index.html: your supplied NovaFlow planner HTML (the broken openTask declaration was repaired)
- lambda/: Node.js 20 AWS Lambda backend
- setup/: IAM policy template and sample API test event
- README_SETUP.txt: AWS setup and deployment instructions

IMPORTANT:
The supplied frontend currently keeps tasks, calendar events and routines in browser localStorage. Its reminder helper can POST reminder records to /reminders, but the frontend is not yet fully connected to load/save/delete tasks, events and routines through the API. The Lambda backend provides those API routes. Do not assume all planner data is in DynamoDB until those frontend API calls are wired and tested.

The reminder endpoint stores reminder records only. It does not send email. Email delivery requires EventBridge Scheduler + Amazon SES configuration.

Before deploying, check the API Gateway Invoke URL and update NOVAFLOW_API_URL in frontend/index.html if it differs. The current value in the supplied HTML is:
https://i0odif6t7e.execute-api.us-east-1.amazonaws.com
