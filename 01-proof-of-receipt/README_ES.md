# Desafio 1: Comprobante de Compra

**Dificultad:** Facil | **Tiempo Estimado:** 2--4 horas | **Modulos:** Tokens, Inscripciones

## Escenario de Negocio

Una tienda quiere entregar a sus clientes **recibos digitales a prueba de manipulacion** almacenados en la blockchain. Cada recibo es un token que el cliente posee, con los datos del recibo inscritos como JSON. Los recibos no pueden ser alterados ni falsificados despues de su creacion, y el cliente puede consultar todo su historial de compras en cualquier momento.

## Que Vas a Construir

Una aplicacion Next.js que funciona **solo en el navegador**, con:

1. **Conectar Wallet** -- Un boton que conecta a la BSV Desktop Wallet usando `createWallet()`.
2. **Catalogo de Productos** -- Una lista fija de 3 a 5 productos, cada uno con nombre, precio (en satoshis) y una representacion visual.
3. **Boton de Compra** -- Cuando el usuario hace clic en "Comprar", la app crea un token con los datos del recibo Y ademas inscribe el recibo completo como JSON on-chain, todo en un solo flujo.
4. **Mis Recibos** -- Una seccion que lista todos los tokens de recibo que posee el usuario, con los datos decodificados (nombre del producto, precio, marca de tiempo, ID de transaccion).

## Requisitos

1. **Conectar a la BSV Desktop Wallet** usando `createWallet()` de `@bsv/simple/browser`.
2. **Mostrar un catalogo de productos** con al menos 3 productos, indicando nombre, precio en satoshis y un indicador visual.
3. **Cuando el usuario haga clic en "Comprar":**
   - Crear un objeto de recibo que contenga: nombre del producto, precio, marca de tiempo (`ISO 8601`) e identificador del comprador (los primeros 20 caracteres de la clave de identidad).
   - Crear un token con `wallet.createToken()` usando el objeto de recibo como `data` y `'receipts'` como nombre del basket.
   - Inscribir el recibo completo como JSON usando `wallet.inscribeJSON()` para un registro on-chain permanente y publicamente verificable.
   - Mostrar un mensaje de exito con el ID de la transaccion.
4. **Listar todos los tokens de recibo** usando `wallet.listTokenDetails('receipts')`, mostrando los datos decodificados de cada token.
5. **Manejar errores adecuadamente** -- mostrar mensajes de error significativos si la conexion falla o las transacciones son rechazadas.

## Criterios de Aceptacion

- [ ] La wallet se conecta exitosamente via `createWallet()`
- [ ] El catalogo de productos muestra al menos 3 productos
- [ ] Comprar un producto crea un token on-chain en el basket `'receipts'`
- [ ] El JSON del recibo se inscribe on-chain via `inscribeJSON()`
- [ ] La lista de recibos muestra todos los articulos comprados con datos decodificados (producto, precio, marca de tiempo, outpoint)

## Puntos Extra

- Interfaz pulida con indicadores de carga y botones deshabilitados durante las transacciones
- Vista de detalle del recibo mostrando el outpoint completo y datos de la transaccion
- Sistema de notificaciones o manejo de errores con limites de error
- Diseno responsivo que funcione en dispositivos moviles
- Animacion de confirmacion visual tras una compra exitosa

## Pistas

- Lee `simplifier-v2/docs/guides/tokens.md` para `createToken()` y `listTokenDetails()`.
- Lee `simplifier-v2/docs/guides/inscriptions.md` para `inscribeJSON()`.
- Lee `simplifier-v2/docs/guides/browser-wallet.md` para `createWallet()` y `getIdentityKey()`.
- No se necesita codigo de servidor para este desafio. Todo se ejecuta en el navegador.
- El metodo `createToken()` devuelve un `TokenResult` con un campo `txid`.
- El metodo `listTokenDetails()` devuelve un arreglo de objetos `TokenDetail`, cada uno con un campo `data` que contiene el payload descifrado.

## Como Empezar

```bash
cd challenges/01-proof-of-receipt/solution
npm install
npx next dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador. Asegurate de que la BSV Desktop Wallet este en ejecucion.

## Referencia Rapida de la API

```typescript
// Conectar wallet
import { createWallet } from '@bsv/simple/browser'
const wallet = await createWallet()

// Obtener clave de identidad
const key = wallet.getIdentityKey() // '02abc...' (66 caracteres hex)

// Crear un token
const result = await wallet.createToken({
  data: { product: 'Cafe', price: 500, timestamp: '2026-02-21T...' },
  basket: 'receipts'
})
// result.txid -> ID de la transaccion

// Inscribir JSON
const inscription = await wallet.inscribeJSON({
  product: 'Cafe',
  price: 500,
  timestamp: '2026-02-21T...'
})
// inscription.txid -> ID de la transaccion

// Listar tokens con datos descifrados
const receipts = await wallet.listTokenDetails('receipts')
// [{ outpoint, satoshis, data: { product, price, timestamp } }, ...]
```
