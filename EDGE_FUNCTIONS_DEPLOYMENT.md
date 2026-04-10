# 🚀 Deploy Edge Functions — Quick Start

## Option 1: Via Supabase Dashboard (Fastest)

### Step 1: Open Supabase Edge Functions Editor

1. **Go to**: https://app.supabase.com → Your Project
2. **Left sidebar**: Functions
3. **Button**: "Create a new function"

---

## Step 2: Create `connect-email-init`

**Name**: `connect-email-init`

**Code**: Copy from `OAUTH_SETUP_REQUIRED.md` section "1️⃣ `connect-email-init`"

After pasting code:
- Click **"Deploy"**
- Wait for deployment to complete (usually 30 seconds)

---

## Step 3: Add Environment Secrets

After `connect-email-init` is deployed:

1. Click on the function name in the Functions list
2. Go to **"Configuration"** tab
3. Under **"Secrets"**, add:

```
GOOGLE_CLIENT_ID = [get from Google Cloud Console]
GOOGLE_CLIENT_SECRET = [get from Google Cloud Console]
MICROSOFT_CLIENT_ID = [get from Azure Portal]
MICROSOFT_CLIENT_SECRET = [get from Azure Portal]
GEMINI_API_KEY = [get from Google AI Studio]
```

---

## Step 4: Create `connect-email-callback`

**Name**: `connect-email-callback`

**Code**: Copy from `OAUTH_SETUP_REQUIRED.md` section "2️⃣ `connect-email-callback`"

Click **"Deploy"**

---

## Step 5: Create `sync-gmail` and `sync-outlook`

**For `sync-gmail`:**
- **Name**: `sync-gmail`
- **Code**: Copy stub from `OAUTH_SETUP_REQUIRED.md` section "3️⃣"
- **Deploy**

**For `sync-outlook`:**
- **Name**: `sync-outlook`
- **Code**: Copy stub from `OAUTH_SETUP_REQUIRED.md` section "3️⃣"
- **Deploy**

---

## Step 6: Get OAuth Credentials

### Google OAuth

1. Go to: https://console.cloud.google.com/
2. **Create Project** or select existing
3. **Enable APIs**:
   - Search "Gmail API" → Enable
   - Search "Google+ API" → Enable
4. **Credentials** → Create OAuth 2.0 Client ID
5. **Application type**: Web application
6. **Authorized redirect URIs**:
   ```
   https://bqkycxykyzrggwsafamh.supabase.co/functions/v1/connect-email-callback
   https://finanzas-coral.vercel.app/correos
   ```
7. **Copy**: Client ID and Client Secret
8. **Paste into Supabase Secrets** (Step 3)

### Microsoft OAuth

1. Go to: https://portal.azure.com/
2. **App registrations** → New registration
3. **Name**: Finanzas Personales
4. **Redirect URI**:
   ```
   https://bqkycxykyzrggwsafamh.supabase.co/functions/v1/connect-email-callback
   ```
5. **Certificates & secrets** → New client secret
6. **Copy**: Application (client) ID and Client Secret Value
7. **Paste into Supabase Secrets** (Step 3)

---

## Step 7: Test in the App

1. **Login** with test credentials
2. **Onboarding → Step 2: Conectar Correos**
3. **Click "Conectar Gmail"**
   - Should open a popup window ✅
   - Google login screen appears
   - User authorizes
   - Returns to app with "✓ Conectado"

4. **If popup doesn't open**:
   - Open browser console: **F12 → Console**
   - Look for error message
   - Usually shows: "Error invoking connect-email-init: [reason]"
   - Share error message for troubleshooting

---

## Option 2: Via Supabase CLI (Advanced)

If you prefer command line:

```bash
# Create function directory
mkdir -p supabase/functions/connect-email-init

# Create function file
nano supabase/functions/connect-email-init/index.ts
# Paste code, save (Ctrl+X, Y, Enter)

# Deploy
supabase functions deploy --project-id bqkycxykyzrggwsafamh connect-email-init

# Add secrets
supabase secrets set --project-id bqkycxykyzrggwsafamh \
  GOOGLE_CLIENT_ID="..." \
  GOOGLE_CLIENT_SECRET="..." \
  MICROSOFT_CLIENT_ID="..." \
  MICROSOFT_CLIENT_SECRET="..." \
  GEMINI_API_KEY="..."
```

---

## Verification Checklist

- [ ] `connect-email-init` is deployed and shows "Active"
- [ ] `connect-email-callback` is deployed
- [ ] `sync-gmail` is deployed
- [ ] `sync-outlook` is deployed
- [ ] All 4 secrets added to `connect-email-init` configuration
- [ ] Google OAuth credentials obtained and added
- [ ] Microsoft OAuth credentials obtained and added
- [ ] Click "Conectar Gmail" opens popup ✅
- [ ] Click "Conectar Outlook" opens popup ✅
- [ ] Authorization completes and returns to app ✅

---

## Common Issues

| Issue | Solution |
|-------|----------|
| "Error invoking connect-email-init" | Check if secrets are added correctly (typos in key names?) |
| "Invalid client ID" | Check Google/Microsoft credentials are copied correctly |
| Popup doesn't open | Press F12, check console for exact error message |
| 404 error on callback | Make sure `connect-email-callback` function exists and is active |
| "Redirect URI mismatch" | Verify redirect URIs match exactly in Google/Microsoft AND in Edge Function code |

---

## Next Steps After OAuth Works

Once email connection is working:
1. Implement `sync-gmail` and `sync-outlook` with real Gemini IA logic
2. Test complete onboarding flow
3. Verify email receipts appear in "Gastos Detectados"
4. Build remaining features: Sobres, Suscripciones, etc.
