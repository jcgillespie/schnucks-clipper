# Testing Weekly Summary Locally

This guide explains how to test the weekly summary functionality without deploying to Azure.

## Prerequisites

1. **Node.js dependencies installed**:

   ```bash
   npm install
   ```

2. **Azure CLI** (for testing with real Log Analytics):

   ```bash
   az login
   az account set --subscription "your-subscription-id"
   ```

3. **Mailtrap account** (optional, for email testing):
   - Sign up at https://mailtrap.io (free)
   - Get your SMTP credentials from the inbox

## Testing Options

### 1. Unit Tests

Run unit tests for configuration and email formatting:

```bash
npm test
```

This will run:

- `weekly-summary-config.test.ts` - Configuration validation
- `weekly-summary.test.ts` - Email formatting logic

### 2. Test with Mock Data (No Azure Connection)

Test the email formatting and structure without connecting to Azure:

```bash
npm run test:weekly-summary -- --mock
```

This will:

- Generate mock execution data
- Format HTML and text emails
- Display previews in the console
- **Not** send any emails

### 3. Test with Real Azure Log Analytics

Test with actual data from your Log Analytics workspace:

```bash
# First, get your workspace customer ID
az monitor log-analytics workspace show \
  --resource-group <your-rg> \
  --workspace-name <your-workspace> \
  --query customerId -o tsv

# Then run the test
npm run test:weekly-summary -- --workspace-id <your-workspace-customer-id>
```

**Requirements:**

- Azure CLI authenticated (`az login`)
- Workspace customer ID (not resource ID)
- Your Azure account has "Log Analytics Reader" role on the workspace

### 4. Test Email Sending with Mailtrap

Test email sending without actually sending emails (Mailtrap captures them):

```bash
# Set Mailtrap credentials (get from https://mailtrap.io)
export MAILTRAP_USER="your-mailtrap-user"
export MAILTRAP_PASS="your-mailtrap-pass"

# Run test with mock data and Mailtrap
npm run test:weekly-summary -- --mock --mailtrap
```

Then check your Mailtrap inbox to see the formatted email.

### 5. Test Email Sending with Real SMTP (Mailgun)

Test with your actual Mailgun SMTP:

```bash
export SMTP_HOST="smtp.mailgun.org"
export SMTP_PORT="587"
export SMTP_USER="your-mailgun-email@yourdomain.com"
export SMTP_PASS="your-mailgun-api-key"
export EMAIL_FROM="your-mailgun-email@yourdomain.com"
export EMAIL_TO="your-email@example.com"

npm run test:weekly-summary -- --mock --send-email
```

**Warning:** This will send a real email!

## Test Script Options

The `test-weekly-summary-local.ts` script supports:

- `--mock` - Use mock execution data (no Azure connection needed)
- `--workspace-id <id>` - Use real Azure Log Analytics workspace
- `--mailtrap` - Use Mailtrap test SMTP (captures emails)
- `--send-email` - Send email using configured SMTP (requires SMTP env vars)

## Verification Checklist

Before deploying, verify:

- [ ] Unit tests pass: `npm test`
- [ ] Email formatting looks correct: `npm run test:weekly-summary -- --mock`
- [ ] Configuration validation works: Check error messages in unit tests
- [ ] HTML email renders correctly: Use Mailtrap to view formatted email
- [ ] Text email is readable: Check plain text version
- [ ] Azure authentication works: `npm run test:weekly-summary -- --workspace-id <id>`
- [ ] SMTP connection works: Test with Mailtrap or real SMTP

## Troubleshooting

### "Could not resolve @azure/identity"

Run `npm install` to install dependencies.

### "Authentication failed" when testing with Azure

1. Ensure you're logged in: `az login`
2. Check your subscription: `az account show`
3. Verify you have "Log Analytics Reader" role on the workspace

### "SMTP connection failed"

- Check your SMTP credentials
- Verify SMTP host and port are correct
- For Mailgun: Ensure your domain is verified
- Check firewall/network restrictions

### "Workspace ID not found"

Use the **customer ID** (workspace ID), not the Azure resource ID. Get it with:

```bash
az monitor log-analytics workspace show \
  --resource-group <rg> \
  --workspace-name <name> \
  --query customerId -o tsv
```

## Next Steps

After local testing passes:

1. Build the Docker image: `docker build -t schnucks-clipper .`
2. Verify both bundles are included: Check `dist/index.cjs` and `dist/weekly-summary.cjs`
3. Deploy infrastructure with SMTP variables
4. Monitor the first weekly summary job execution
