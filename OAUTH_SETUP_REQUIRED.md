# 🚨 CRITICAL: Edge Functions para OAuth

El botón "Conectar Gmail/Outlook" **no funcionará** hasta que configures los Edge Functions.

---

## ❌ Problema Actual

Cuando haces click en "Conectar Gmail/Outlook":
1. La app llama a: `connect-email-init`
2. Este Edge Function debe retornar una `auth_url` para abrir el popup OAuth
3. **Si no existe → error → sin redirección**

---

## ✅ Solución: Crear Edge Functions

### En Supabase Dashboard → Edge Functions

Necesitas crear **estos 3 Edge Functions**:

---

## 1️⃣ `connect-email-init`

**Ubicación**: `supabase/functions/connect-email-init/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Google OAuth
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const GOOGLE_REDIRECT_URI = 'https://bqkycxykyzrggwsafamh.supabase.co/functions/v1/connect-email-callback'

// Microsoft OAuth
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID')!
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET')!
const MICROSOFT_REDIRECT_URI = 'https://bqkycxykyzrggwsafamh.supabase.co/functions/v1/connect-email-callback'

serve(async (req) => {
  const { provider, redirect_uri } = await req.json()

  if (provider === 'gmail') {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state: btoa(JSON.stringify({ redirect_uri })),
    })
    return new Response(JSON.stringify({
      auth_url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (provider === 'outlook') {
    const params = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      redirect_uri: MICROSOFT_REDIRECT_URI,
      response_type: 'code',
      scope: 'Mail.Read offline_access',
      state: btoa(JSON.stringify({ redirect_uri })),
    })
    return new Response(JSON.stringify({
      auth_url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
    }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid provider' }), { status: 400 })
})
```

---

## 2️⃣ `connect-email-callback`

**Ubicación**: `supabase/functions/connect-email-callback/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 })
  }

  // Aquí iría:
  // 1. Intercambiar code por tokens
  // 2. Guardar tokens encriptados en BD
  // 3. Redirigir a /correos

  const stateData = JSON.parse(atob(state))
  const redirectUri = stateData.redirect_uri

  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${redirectUri}?connected=true`
    }
  })
})
```

---

## 3️⃣ `sync-gmail` y `sync-outlook`

**Estas son más complejas** porque integran Gemini IA. Por ahora:

```typescript
serve(async (req) => {
  // TODO: Implementar sincronización real
  return new Response(JSON.stringify({ success: true, receipts_found: 0 }))
})
```

---

## 🔧 Variables de Entorno Requeridas

En **Supabase Dashboard → Edge Functions → connect-email-init**:

Agregar secrets:
```
GOOGLE_CLIENT_ID = [tu Google OAuth ID]
GOOGLE_CLIENT_SECRET = [tu Google OAuth Secret]
MICROSOFT_CLIENT_ID = [tu Microsoft OAuth ID]
MICROSOFT_CLIENT_SECRET = [tu Microsoft OAuth Secret]
GEMINI_API_KEY = [tu Gemini API key]
```

---

## 📋 Pasos para Configurar Google OAuth

1. **Ve a**: https://console.cloud.google.com/
2. **Crea proyecto** o usa existente
3. **APIs → Enable Gmail API**
4. **Credentials → Create OAuth 2.0 Client ID**
5. **Authorized redirect URIs**:
   ```
   https://bqkycxykyzrggwsafamh.supabase.co/functions/v1/connect-email-callback
   https://finanzas-coral.vercel.app/correos
   ```
6. **Copia**: Client ID y Client Secret

---

## 📋 Pasos para Configurar Microsoft OAuth

1. **Ve a**: https://portal.azure.com/
2. **App registrations → New registration**
3. **Redirect URI**:
   ```
   https://bqkycxykyzrggwsafamh.supabase.co/functions/v1/connect-email-callback
   ```
4. **Certificates & secrets → New client secret**
5. **Copia**: Application (client) ID y Client Secret

---

## ✅ Checklist

- [ ] Edge Function `connect-email-init` creado
- [ ] Edge Function `connect-email-callback` creado
- [ ] Google OAuth Client ID + Secret agregados como secrets
- [ ] Microsoft OAuth Client ID + Secret agregados como secrets
- [ ] Deploy Edge Functions desde Supabase
- [ ] Hacer click en "Conectar Gmail" → abre popup ✅
- [ ] Hacer click en "Conectar Outlook" → abre popup ✅

---

## ⚡ Quick Test

1. **Login** con credenciales de prueba
2. **Onboarding → Step 2: Conectar Correos**
3. **Click en Gmail** → debe abrir popup
4. **Autorizar** → debe volver a /correos
5. **El botón debe cambiar a "✓ Conectado"**

Si todo funciona → **Sigue a Step 3: Sincronización**

---

## 🚨 Si Aún No Funciona

**Abre la consola del navegador (F12 → Console)** y revisa el error exacto. Será algo como:

```
Error invoking connect-email-init: [error message]
```

Cópialo y comparte para diagnosticar exactamente qué falta.
