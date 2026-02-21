# Desafio 2: Tarro de Propinas P2P

**Dificultad:** Intermedio | **Tiempo estimado:** 4--8 horas | **Modulos:** MessageBox, DID, Pagos

---

## Escenario de Negocio

Los creadores de contenido quieren recibir propinas directas de sus fans de forma peer-to-peer. Los creadores registran un identificador legible (handle) para que los fans puedan encontrarlos y enviar propinas directamente -- sin intermediarios, sin comisiones de plataforma. Las propinas se envian a traves del sistema P2P MessageBox. Cada creador tambien tiene un DID (Identificador Descentralizado) para identidad verificable.

## Lo que Construiras

Una aplicacion Next.js con las siguientes funcionalidades:

1. **Conectar Wallet** + registrar un handle (`certifyForMessageBox`)
2. **Buscar creadores** por handle (`lookupIdentityByTag`)
3. **Enviar propina** via MessageBox (`sendMessageBoxPayment`)
4. **Revisar bandeja de entrada** para propinas recibidas (`listIncomingPayments`)
5. **Aceptar propinas entrantes** (`acceptIncomingPayment`)
6. **Crear y resolver DIDs** (`createDID`, `resolveDID`)
7. **2 rutas API**: registro de identidad + proxy de resolucion DID

## Flujo de Pruebas

Necesitaras **dos perfiles de navegador** (o dos BSV Desktop Wallets separados) para probar el flujo completo:

1. **Wallet A**: Conectar, certificarse como `@alice`
2. **Wallet B**: Conectar, certificarse como `@bob`
3. **Wallet B**: Buscar `@alice`, enviar propina de 1000 sats
4. **Wallet A**: Revisar bandeja de entrada, aceptar el pago
5. **Ambos**: Crear DIDs, resolver el DID del otro

## Requisitos

### 1. Conectar Wallet

```typescript
const wallet = await createWallet({ didProxyUrl: '/api/resolve-did' })
```

### 2. Registrar Handle

```typescript
const result = await wallet.certifyForMessageBox(handle, '/api/identity-registry')
```

Esto realiza una certificacion unica de MessageBox: crea un certificado con el BSV Desktop Wallet, registra el handle en el registro de identidad y habilita el host de MessageBox para que puedas recibir mensajes.

### 3. Buscar por Handle

```typescript
const results = await wallet.lookupIdentityByTag(query, '/api/identity-registry')
// Retorna: [{ tag: string, identityKey: string }, ...]
```

### 4. Enviar Propina

```typescript
const result = await wallet.sendMessageBoxPayment(recipientKey, satoshis, 'recovered-change')
```

Envia un pago P2P a traves del sistema MessageBox. El parametro `'recovered-change'` asegura que las salidas de cambio se reinternalicen en un basket.

### 5. Listar Bandeja de Entrada

```typescript
const payments = await wallet.listIncomingPayments()
```

### 6. Aceptar Propina

```typescript
const result = await wallet.acceptIncomingPayment(payment, 'tips-received')
```

### 7. Crear DID

```typescript
const result = await wallet.createDID()
// Retorna: { did: 'did:bsv:<txid>', txid, identityCode, document }
```

### 8. Resolver DID

```typescript
const result = await wallet.resolveDID(didString)
// Retorna: { didDocument, didDocumentMetadata, didResolutionMetadata }
```

## Rutas API

Debes crear dos rutas API del lado del servidor:

| Ruta | Proposito |
|------|-----------|
| `/api/identity-registry` | Registro de tags/handles -- registrar, buscar, listar, revocar handles |
| `/api/resolve-did` | Proxy de resolucion DID -- resuelve identificadores `did:bsv:*` del lado del servidor |

## Criterios de Aceptacion

- [ ] El wallet se conecta exitosamente
- [ ] El registro de handle funciona (certifyForMessageBox)
- [ ] La busqueda encuentra creadores registrados por handle
- [ ] Las propinas se pueden enviar P2P via MessageBox
- [ ] La bandeja de entrada muestra las propinas entrantes
- [ ] Las propinas se pueden aceptar e internalizar
- [ ] Se puede crear un DID
- [ ] Se puede resolver un DID

## Puntos Extra

- Mostrar el nombre/handle del remitente en las propinas entrantes
- Permitir revocar un handle
- Listar todos los DIDs del wallet
- Mostrar historial de propinas / registro de actividad

## Pistas

- Lee las guias de la biblioteca: `messagebox.md`, `did.md`, `payments.md`
- Se necesitan dos rutas API -- el registro de identidad es un almacen simple de archivos JSON, el proxy DID resuelve contra el Universal Resolver de nChain con respaldo de WoC
- `certifyForMessageBox` hace tres cosas en una llamada: crea un certificado, registra el handle y habilita el host de MessageBox
- Las salidas de cambio de `sendMessageBoxPayment` deben usar el basket `'recovered-change'`
- `acceptIncomingPayment` recibe un nombre de basket donde almacenar los fondos aceptados

## Para Comenzar

```bash
cd challenges/02-peer-tip-jar/solution
npm install
npx next dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador. Asegurate de que el BSV Desktop Wallet este ejecutandose.

## Referencias de Documentacion

- `simplifier-v2/docs/guides/browser-wallet.md` -- Conexion del wallet
- `simplifier-v2/docs/guides/messagebox.md` -- Mensajeria y pagos P2P
- `simplifier-v2/docs/guides/did.md` -- Identificadores Descentralizados
- `simplifier-v2/docs/guides/payments.md` -- Flujos de pago
- `simplifier-v2/docs/guides/nextjs-integration.md` -- Configuracion de Next.js
