# 📋 Guía de Setup — Finanzas Personales + Supabase

## 🔐 1. Credenciales de Prueba en Supabase

### Crear usuario de prueba
1. **Ve a Supabase Dashboard**: https://app.supabase.com/
2. **Proyecto**: `bqkycxykyzrggwsafamh`
3. **Authentication → Users**
4. **Crear nuevo usuario**:
   ```
   Email: prueba@finanzas.local (o tu correo)
   Password: TemporalPass123!
   ```
5. **Confirmar email** (marcar como verified si lo permite)

### Verificar en la app
- **URL**: https://finanzas-coral.vercel.app
- **Login**: usa el email y contraseña creada
- Si funciona → Dashboard carga ✅

---

## 🔑 2. OAuth: Gmail & Outlook

### ✅ Qué verificar en Supabase

**Ir a: Authentication → Providers**

#### Gmail
```
✓ Habilitado (ON)
✓ Client ID: [completado]
✓ Client Secret: [completado]
✓ Redirect URI: https://bqkycxykyzrggwsafamh.supabase.co/auth/v1/callback
```

**Nota**: Los usuários NO usan Gmail para LOGIN. Solo para conectar correos.

#### Outlook
```
✓ Habilitado (ON)
✓ Client ID: [completado]
✓ Client Secret: [completado]
✓ Redirect URI: https://bqkycxykyzrggwsafamh.supabase.co/auth/v1/callback
```

---

## 🔄 3. OAuth para Conexión de Correos (¡DIFERENTE a Login!)

### En la app (después de login):
**Ir a: Correos → Conectar Gmail/Outlook**

Esto abre un popup OAuth que redirige a:
```
https://bqkycxykyzrggwsafamh.supabase.co/functions/v1/connect-email-callback
```

Si ves un error 404 o 500 → **el Edge Function no está activo**

### Verificar Edge Functions
1. **Supabase Dashboard → Edge Functions**
2. **Debe existir**:
   - ✅ `connect-email-init`
   - ✅ `connect-email-callback`
   - ✅ `disconnect-email`
   - ✅ `sync-gmail`
   - ✅ `sync-outlook`

**Si no existen** → Contacta a soporte de Supabase o redeploy desde GitHub

---

## 📧 4. Sincronización de Correos (Gemini IA)

### Tabla: `email_accounts`
Después de conectar Gmail/Outlook, debería haber una fila con:
```
user_id: [tu ID]
email_account_type: "gmail" | "outlook"
token_encrypted: [encriptado]
```

### Sincronización
En la app → **Correos → Sincronizar**

Esto ejecuta:
- ✅ `sync-gmail` o `sync-outlook`
- ✅ Ejecuta Gemini IA para detectar recibos
- ✅ Llena tabla: `email_receipts`

**Tabla: `email_receipts`** (después de sincronizar)
```
user_id, subject, body, detected_amount, detected_category, date_detected
```

---

## 💡 5. Flujo Completo de Testing

### Paso 1: Login
```bash
Email: prueba@finanzas.local
Password: TemporalPass123!
→ Debe ir a Dashboard
```

### Paso 2: Onboarding (si es primera vez)
```
Paso 1: Ingresa salario quincenal (ej: ₡500,000)
Paso 2: Conecta Gmail o Outlook
Paso 3: Sincroniza correos
```

### Paso 3: Dashboard
```
✅ "Lista de super" por quincena con checkboxes
✅ Banner de sugerencias IA (si hay gastos detectados)
✅ Botones a Sobres, Suscripciones, etc.
```

### Paso 4: Gastos Detectados (IA)
```
Ir a: Gastos Detectados
↓
Mostrar gastos extraídos de correos
↓
Botón: "Crear sobre automático"
```

### Paso 5: Sobres
```
CRUD: crear, editar, eliminar sobres
Transacciones: agregar gastos a sobres
Barra de progreso: mostrar % gastado
```

---

## 🔍 6. Verificación de Tablas en Supabase

### Tabla `profiles` (después del primer login)
```
id: [user_id]
display_name: null (editar en Perfil)
currency_default: 'CRC'
onboarding_completed: false (true después onboarding)
salary_biweekly: [de onboarding paso 1]
```

### Tabla `envelopes` (después de crear sobre)
```
id, user_id, name, color, icon, budget_limit, current_spent, due_day, is_paid_this_period
```

### Tabla `transactions` (después de agregar gasto)
```
id, user_id, envelope_id, type, amount, currency, description, date
```

---

## 🚀 7. Troubleshooting

| Problema | Solución |
|----------|----------|
| "Email not confirmed" en login | Ir a Supabase → Users → marcar email como verified |
| OAuth popup no se abre | Verificar que Edge Function `connect-email-init` existe |
| OAuth abre pero da error 404 | Edge Function `connect-email-callback` no existe |
| No se sincronizan correos | Verificar `sync-gmail` / `sync-outlook` existen y están activos |
| Gemini IA no detecta gastos | Verificar variable de entorno `GEMINI_API_KEY` en Edge Functions |
| Bundle muy grande | Vercel optimiza automático, no requiere acción |

---

## ✅ Checklist Final

- [ ] Usuario creado en Supabase Auth
- [ ] Puedes hacer login
- [ ] OAuth Gmail/Outlook está habilitado
- [ ] Edge Functions existen y están activas
- [ ] Puedes conectar Gmail en la app
- [ ] Correos se sincronizan correctamente
- [ ] Gemini detecta gastos en correos
- [ ] Dashboard muestra lista de super
- [ ] Puedes crear sobres y transacciones

---

## 📞 Siguiente Paso

Si todo funciona → **NEXT**: Agregar más datos de prueba y pulir UX.

Si algo falla → Mira la fila de **Troubleshooting** arriba.

¡Listo para producción! 🚀
