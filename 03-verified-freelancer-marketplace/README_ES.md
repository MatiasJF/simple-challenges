# Desafio 3: Marketplace de Freelancers Verificados

**Dificultad:** Dificil | **Tiempo Estimado:** 8--16 horas | **Modulos:** Todos (Credenciales, DID, MessageBox, Server Wallet, Pagos, Tokens)

---

## Escenario de Negocio

Una organizacion emite **credenciales verificables** a freelancers verificados. Los clientes pueden buscar en el directorio de freelancers por handle, ver sus credenciales y pagarles directamente via MessageBox. La organizacion opera un **server wallet** que financia la emision de credenciales. Los freelancers crean **DIDs** para identidad descentralizada.

## Que Vas a Construir

Una **aplicacion full-stack con Next.js** que incluye:

1. **Panel de Administracion** -- Crear un server wallet, financiarlo desde el wallet de escritorio y emitir credenciales a freelancers.
2. **Flujo del Freelancer** -- Conectar wallet, registrar un handle, adquirir una credencial del emisor, crear un DID.
3. **Flujo del Cliente** -- Buscar freelancers por handle, ver sus credenciales y enviar pagos via MessageBox.
4. **Bandeja de Entrada del Freelancer** -- Listar y aceptar pagos entrantes.
5. **4 Rutas de API**: `credential-issuer`, `server-wallet`, `identity-registry`, `resolve-did`.

## Flujo de Pruebas

Necesitaras **tres perfiles de navegador** (o tres BSV Desktop Wallets separados) para probar el flujo completo:

1. **Admin**: Crear y financiar el server wallet.
2. **Freelancer**: Conectar, registrarse como `@alice-dev`, adquirir credencial (nombre, habilidad, tarifa).
3. **Admin**: Verificar que la credencial fue emitida (endpoint de info del emisor).
4. **Cliente**: Buscar `@alice-dev`, ver credencial, enviar pago de 5000 sats.
5. **Freelancer**: Revisar bandeja de entrada, aceptar pago.
6. **Freelancer**: Crear DID, resolverlo.
7. **Admin**: Revocar credencial si es necesario.

## Requisitos

### 1. Creacion y Financiamiento del Server Wallet

```typescript
// Lado del servidor
const { ServerWallet } = await import('@bsv/simple/server')
const wallet = await ServerWallet.create({ privateKey, network: 'main', storageUrl: 'https://storage.babbage.systems' })

// Lado del cliente: financiar el server wallet
const result = await wallet.fundServerWallet(paymentRequest, 'marketplace-funding', 'recovered-change')
```

### 2. Definicion del Esquema de Credencial

```typescript
import { CredentialSchema } from '@bsv/simple/browser'

const schema = new CredentialSchema({
  id: 'freelancer-verified',
  name: 'VerifiedFreelancer',
  description: 'Credencial de freelancer verificado para el marketplace',
  fields: [
    { key: 'name', label: 'Nombre Completo', type: 'text', required: true },
    { key: 'skill', label: 'Habilidad Principal', type: 'select', required: true, options: [
      { value: 'web-dev', label: 'Desarrollo Web' },
      { value: 'mobile-dev', label: 'Desarrollo Movil' },
      { value: 'design', label: 'Diseno UI/UX' },
      { value: 'backend', label: 'Ingenieria Backend' },
      { value: 'devops', label: 'DevOps' },
      { value: 'data', label: 'Ciencia de Datos' },
    ]},
    { key: 'rate', label: 'Tarifa por Hora (sats)', type: 'number', required: true },
    { key: 'bio', label: 'Biografia', type: 'textarea' },
  ]
})
```

### 3. Configuracion del Emisor de Credenciales

```typescript
import { CredentialIssuer } from '@bsv/simple/browser'
import { FileRevocationStore, ServerWallet } from '@bsv/simple/server'

const issuer = await CredentialIssuer.create({
  privateKey,
  schemas: [schema.getConfig()],
  revocation: {
    enabled: true,
    wallet: serverWallet.getClient(),
    store: new FileRevocationStore('.revocation-secrets.json'),
  }
})
```

### 4. Endpoint de API para Emision de Credenciales

```
POST /api/credential-issuer?action=issue
Body: { subjectKey, schemaId, fields: { name, skill, rate, bio } }
```

### 5. El Wallet Adquiere la Credencial

```typescript
const vc = await wallet.acquireCredential({
  serverUrl: '/api/credential-issuer',
  schemaId: 'freelancer-verified',
  fields: { name: 'Alice', skill: 'web-dev', rate: '50000', bio: 'Desarrolladora full-stack' },
  replaceExisting: true
})
```

### 6. Listar Credenciales

```typescript
const vcs = await wallet.listCredentials({
  certifiers: [issuerPublicKey],
  types: [certificateTypeBase64]
})
```

### 7. Crear Presentacion

```typescript
const vp = wallet.createPresentation(credentials)
```

### 8. Registro de Handle

```typescript
await wallet.certifyForMessageBox('@alice-dev', '/api/identity-registry')
```

### 9. Busqueda de Handle

```typescript
const results = await wallet.lookupIdentityByTag('alice', '/api/identity-registry')
```

### 10. Enviar Pago via MessageBox

```typescript
await wallet.sendMessageBoxPayment(recipientKey, 5000, 'recovered-change')
```

### 11. Listar y Aceptar Pagos Entrantes

```typescript
const payments = await wallet.listIncomingPayments()
await wallet.acceptIncomingPayment(payments[0], 'freelancer-earnings')
```

### 12. Crear y Resolver DIDs

```typescript
const { did } = await wallet.createDID()
const result = await wallet.resolveDID(did)
```

## Rutas de API

| Ruta | Proposito |
|------|-----------|
| `/api/server-wallet` | Server wallet -- crear, financiar, balance, outputs, resetear |
| `/api/credential-issuer` | Emisor de credenciales -- info, esquema, emitir, verificar, revocar, estado |
| `/api/identity-registry` | Registro de tags/handles -- registrar, buscar, listar, revocar handles |
| `/api/resolve-did` | Proxy de resolucion DID -- resuelve identificadores `did:bsv:*` del lado del servidor |

## Criterios de Aceptacion

- [ ] Server wallet creado y financiado
- [ ] El esquema de credencial valida la entrada
- [ ] Se pueden emitir credenciales a freelancers
- [ ] Los freelancers pueden adquirir credenciales
- [ ] Las credenciales se pueden listar y mostrar
- [ ] Se pueden crear presentaciones
- [ ] El registro y busqueda de handles funcionan
- [ ] Los pagos P2P funcionan via MessageBox
- [ ] La bandeja de entrada muestra y acepta pagos
- [ ] Los DIDs se pueden crear y resolver

## Puntos Extra

- Revocacion de credenciales desde el panel de administracion
- Visualizacion del balance del server wallet
- Verificacion de credenciales (verificar la validez de un VC)
- Interfaz multi-pestana agradable separando roles de admin, freelancer y cliente
- Registro de actividad / panel de resultados

## Pistas

- Lee **todas** las guias de la libreria: `credentials.md`, `server-wallet.md`, `messagebox.md`, `did.md`, `payments.md`, `browser-wallet.md`, `nextjs-integration.md`.
- Este es un desafio **full-stack**. La ruta de API del emisor de credenciales es la pieza mas compleja.
- El metodo `acquireCredential()` del wallet se comunica con el endpoint del servidor del emisor de credenciales automaticamente.
- Para `listCredentials()`, necesitas la `publicKey` del emisor y el `certificateTypeBase64` del esquema -- obtenlos primero desde `/api/credential-issuer?action=info`.
- El server wallet financia los UTXOs de revocacion del emisor. Financia el server wallet antes de emitir credenciales con revocacion habilitada.
- Usa `FileRevocationStore` en el servidor para secretos de revocacion persistentes.
- `certifyForMessageBox` hace tres cosas en una sola llamada: crea un certificado, registra el handle y designa el host de MessageBox.

## Como Empezar

```bash
cd challenges/03-verified-freelancer-marketplace/solution
npm install
npx next dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador. Asegurate de que la BSV Desktop Wallet este en ejecucion.

## Referencias de Documentacion

- `simplifier-v2/docs/guides/credentials.md` -- Credenciales Verificables
- `simplifier-v2/docs/guides/server-wallet.md` -- Server Wallet
- `simplifier-v2/docs/guides/messagebox.md` -- Mensajeria P2P y Pagos
- `simplifier-v2/docs/guides/did.md` -- Identificadores Descentralizados
- `simplifier-v2/docs/guides/payments.md` -- Flujos de Pago
- `simplifier-v2/docs/guides/browser-wallet.md` -- Conexion del Wallet
- `simplifier-v2/docs/guides/nextjs-integration.md` -- Configuracion de Next.js
