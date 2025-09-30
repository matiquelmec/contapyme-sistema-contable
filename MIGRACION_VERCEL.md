# 🚀 MIGRACIÓN A VERCEL - GUÍA COMPLETA

## 📋 RESUMEN
Esta guía te ayuda a migrar ContaPyme de Netlify a Vercel manteniendo todas las funcionalidades.

## 🎯 PASOS PARA DEPLOYMENT EN VERCEL

### 1. **Instalar Vercel CLI** (Opcional)
```bash
npm i -g vercel
```

### 2. **Deployment Directo desde GitHub**

#### Opción A: Dashboard de Vercel (Recomendado)
1. Ve a [vercel.com](https://vercel.com)
2. Conecta tu cuenta de GitHub
3. Importa tu repositorio `contapyme-sistema-contable`
4. Vercel detectará automáticamente que es Next.js
5. Configura las variables de entorno (ver sección Variables)

#### Opción B: Vercel CLI
```bash
# En el directorio del proyecto
vercel

# Seguir las instrucciones:
# - Vincular a tu cuenta
# - Configurar proyecto
# - Seleccionar settings
```

### 3. **Variables de Entorno CRÍTICAS**

Configura estas variables en Vercel Dashboard → Settings → Environment Variables:

```bash
# Supabase (OBLIGATORIAS)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-key

# IA para F29 (OBLIGATORIA)
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_ANTHROPIC_API_KEY_HERE

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

### 4. **Configuración Automática**

El archivo `vercel.json` ya está configurado con:
- ✅ Timeouts de 30s para APIs pesadas
- ✅ Headers de seguridad
- ✅ CORS para APIs
- ✅ Optimizaciones de Next.js

### 5. **Verificación Post-Deployment**

Una vez deployado, verifica estas funcionalidades:

#### APIs Críticas:
- ✅ `/api/parse-f29` - Análisis F29 con Claude
- ✅ `/api/payroll/calculate` - Cálculo de remuneraciones
- ✅ `/api/indicators` - Indicadores económicos
- ✅ `/api/accounting/*` - Módulos contables

#### Páginas Principales:
- ✅ `/accounting/f29-analysis` - Análisis F29
- ✅ `/payroll` - Sistema de remuneraciones
- ✅ `/accounting/fixed-assets` - Activos fijos
- ✅ `/accounting/balance-8-columns` - Balance 8 columnas

## 🔧 DIFERENCIAS VERCEL vs NETLIFY

### Ventajas de Vercel:
- **🚀 Mejor performance**: Edge Functions más rápidas
- **🔄 Auto-scaling**: Escalamiento automático de APIs
- **📊 Analytics**: Métricas detalladas incluidas
- **🛠️ DX mejorada**: Developer Experience superior

### Configuraciones Específicas:
- **Runtime**: APIs configuradas con `runtime = 'nodejs'`
- **Timeouts**: 30 segundos para análisis pesados (F29)
- **Regions**: `iad1` (Virginia) para baja latencia en Chile

## 🚨 CHECKLIST ANTES DE MIGRAR

### Pre-deployment:
- [ ] **Variables de entorno** configuradas en Vercel
- [ ] **Supabase** funcionando correctamente
- [ ] **API Key Anthropic** válida y con créditos
- [ ] **Dominio personalizado** (opcional) configurado

### Post-deployment:
- [ ] **F29 Analysis** funcionando
- [ ] **Payroll** calculando correctamente
- [ ] **Indicadores económicos** actualizándose
- [ ] **Balance 8 columnas** generándose
- [ ] **RCV import** procesando archivos
- [ ] **Firma electrónica** validando

## 🎯 DOMINIO PERSONALIZADO (Opcional)

```bash
# En Vercel Dashboard
Settings → Domains → Add Domain
```

Para usar `contapyme.cl` o tu dominio:
1. Agregar dominio en Vercel
2. Configurar DNS records según Vercel
3. Actualizar `NEXT_PUBLIC_APP_URL`

## 📊 MONITORING POST-MIGRACIÓN

### Métricas Importantes:
- **📈 Function Duration**: Debe ser < 30s
- **🚨 Error Rate**: Mantener < 1%
- **📊 Response Time**: APIs < 2s
- **💾 Memory Usage**: Monitorear picos

### Debugging:
```bash
# Ver logs en tiempo real
vercel logs your-app.vercel.app

# Ver logs de función específica
vercel logs your-app.vercel.app --since=1h
```

## 🔄 ROLLBACK PLAN

Si hay problemas:
1. **Mantén Netlify activo** temporalmente
2. **Configura DNS** para apuntar al que funcione
3. **Verifica bases de datos** (Supabase es independiente)

## 📞 SOPORTE

### Issues Comunes:
- **500 en F29**: Verificar `ANTHROPIC_API_KEY`
- **DB errors**: Verificar keys de Supabase
- **Timeout**: Aumentar límites en `vercel.json`
- **CORS**: Verificar headers en APIs

### Links Útiles:
- [Vercel Docs](https://vercel.com/docs)
- [Next.js on Vercel](https://nextjs.org/docs/deployment)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🎉 ¡LISTO PARA MIGRAR!

Con esta configuración, ContaPyme funcionará perfectamente en Vercel con todas sus funcionalidades avanzadas:
- **F29 Analysis con Claude Vision** ✅
- **Sistema completo de Payroll** ✅
- **Indicadores económicos en tiempo real** ✅
- **Balance 8 columnas automático** ✅
- **Integración RCV revolucionaria** ✅

**¡Vercel proporcionará mejor performance y escalabilidad para ContaPyme!**