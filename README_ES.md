# BSV Simple -- Desafios de Programacion

## Descripcion General

Estos desafios evaluan si un desarrollador **sin conocimiento previo del BSV SDK** puede construir soluciones de negocio completas y de calidad profesional utilizando unicamente la libreria `@bsv/simple` y una BSV Desktop Wallet.

Cada desafio plantea un escenario empresarial realista. Debes disenar, desarrollar y entregar una aplicacion Next.js funcional que resuelva el problema de principio a fin. La unica herramienta blockchain a tu disposicion es `@bsv/simple` -- sin llamadas directas al SDK, sin construccion manual de scripts, sin armado de transacciones a bajo nivel.

## Requisitos Previos

- **Node.js 18+** (se recomienda la version LTS)
- **BSV Desktop Wallet** -- descargala desde [desktop.babbage.systems](https://desktop.babbage.systems)
- **Conocimientos basicos de Next.js / React** -- estado de componentes, rutas de API, Tailwind CSS
- Una BSV Desktop Wallet con fondos (testnet o mainnet)

## Los Desafios

| # | Desafio | Dificultad | Tiempo Estimado | Modulos Utilizados |
|---|---------|------------|-----------------|-------------------|
| 1 | [Comprobante de Compra](./01-proof-of-receipt/) | Facil | 2--4 horas | Tokens, Inscripciones |
| 2 | [Tarro de Propinas P2P](./02-peer-tip-jar/) | Intermedio | 4--8 horas | MessageBox, DID, Pagos |
| 3 | [Marketplace de Freelancers Verificados](./03-verified-freelancer-marketplace/) | Dificil | 8--16 horas | Todos los modulos |

### Desafio 1: Comprobante de Compra (Facil)

Una tienda quiere entregar recibos digitales a prueba de manipulacion almacenados en la blockchain. Construye una app Next.js con un catalogo de productos donde cada compra crea un token que el cliente posee, con los datos del recibo inscritos como JSON. Solo navegador -- no se necesita codigo de servidor.

### Desafio 2: Tarro de Propinas P2P (Intermedio)

Construye un sistema de propinas peer-to-peer donde los usuarios registran un nombre de usuario, descubren a otros por nombre y envian propinas en satoshis a traves de MessageBox. Requiere un cliente de navegador mas dos rutas de API (registro de identidad y resolucion de DID).

### Desafio 3: Marketplace de Freelancers Verificados (Dificil)

Un marketplace full-stack donde los freelancers adquieren credenciales verificables, publican listados de servicios via overlay, y los clientes pagan por servicios con tokens en custodia. Utiliza todos los modulos de la libreria: tokens, inscripciones, MessageBox, DID, credenciales, certificacion, overlay y server wallet.

## Reglas

1. **Usa unicamente la documentacion de `@bsv/simple`** -- no utilices la API del `@bsv/sdk` directamente. El objetivo es validar que la API simplificada es suficiente para aplicaciones del mundo real.
2. **BSV Desktop Wallet para firmar** -- toda firma de transacciones debe pasar por la desktop wallet mediante `createWallet()`.
3. **Las soluciones deben ser apps Next.js** -- usa el App Router, Tailwind CSS para estilos y TypeScript en todo el proyecto.
4. **No copies de las soluciones de referencia** -- puedes leerlas despues de completar el desafio para comparar enfoques, pero no durante el desarrollo.
5. **Puedes consultar la documentacion de la libreria** en cualquier momento.

## Puntuacion

| Criterio | Peso | Descripcion |
|----------|------|-------------|
| **Funcionalidad** | 60% | Todos los criterios de aceptacion cumplidos, las funciones operan correctamente, las transacciones se confirman on-chain |
| **Calidad de Codigo** | 20% | TypeScript limpio, manejo adecuado de errores, buena estructura de componentes, sin advertencias del linter |
| **Experiencia de Usuario** | 20% | Estados de carga, mensajes de error, diseno responsivo, flujo intuitivo |

## Documentacion

La documentacion completa de la libreria esta disponible en el directorio de guias:

- `simplifier-v2/docs/guides/browser-wallet.md` -- Conexion de wallet y metodos principales
- `simplifier-v2/docs/guides/tokens.md` -- Creacion, listado, transferencia y redencion de tokens
- `simplifier-v2/docs/guides/inscriptions.md` -- Inscripciones on-chain de texto, JSON y hashes
- `simplifier-v2/docs/guides/messagebox.md` -- Mensajeria P2P y pagos via MessageBox
- `simplifier-v2/docs/guides/did.md` -- Identificadores Descentralizados (DID)
- `simplifier-v2/docs/guides/credentials.md` -- Credenciales Verificables (W3C VC/VP)
- `simplifier-v2/docs/guides/certification.md` -- Emision y gestion de certificados
- `simplifier-v2/docs/guides/overlay.md` -- Red overlay SHIP/SLAP
- `simplifier-v2/docs/guides/payments.md` -- Flujos de pago y recuperacion de cambio
- `simplifier-v2/docs/guides/server-wallet.md` -- Operaciones de wallet del lado del servidor
- `simplifier-v2/docs/guides/nextjs-integration.md` -- Configuracion y patrones para Next.js

## Estructura

Cada carpeta de desafio contiene:

```
challenges/
  01-proof-of-receipt/
    README_EN.md          # Especificacion del desafio (ingles)
    README_ES.md          # Especificacion del desafio (espanol)
    solution/             # Implementacion de referencia
      app/
        page.tsx          # Codigo principal de la solucion
        layout.tsx
        globals.css
      package.json
      next.config.ts
      tsconfig.json
      postcss.config.mjs

  02-peer-tip-jar/
    README_EN.md
    README_ES.md
    solution/
      ...

  03-verified-freelancer-marketplace/
    README_EN.md
    README_ES.md
    solution/
      ...
```

## Como Empezar

1. Elige un desafio acorde a tu nivel de experiencia.
2. Lee la especificacion del desafio (`README_EN.md` o `README_ES.md` en la carpeta correspondiente).
3. Crea un nuevo proyecto Next.js en tu espacio de trabajo (o copia el esqueleto de `solution/` y limpia `page.tsx`).
4. Construye tu solucion usando unicamente la documentacion de `@bsv/simple`.
5. Al terminar, compara tu enfoque con la implementacion de referencia en `solution/`.

Buena suerte!
