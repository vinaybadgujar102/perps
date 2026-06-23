# Architecture

Mermaid diagrams for **perps-platform** — accurate to the current codebase. Paste any block into GitHub, Notion, or any Mermaid renderer.

---

## 1. High-level architecture

```mermaid
flowchart LR
    Frontend["TanStack Frontend :3000"]
    API["API :3003"]
    SendQueue["Redis send_queue"]
    Engine["trade-engine"]
    ResponseQueue["Redis response_queue"]
    DBPoller["db-poller"]
    WSServer["wsserver :8081"]
    PricePoller["price-poller optional"]
    Timescale["timescale-db optional"]
    Postgres["PostgreSQL"]
    Clients["WebSocket Clients"]

    Frontend -->|REST /api/v1| API
    Frontend -->|WS ws://8081| WSServer
    API -->|xAdd| SendQueue
    PricePoller -->|mark_price ticks| SendQueue
    SendQueue --> Engine
    Engine -->|xAdd| ResponseQueue
    ResponseQueue --> API
    ResponseQueue --> DBPoller
    ResponseQueue --> WSServer
    ResponseQueue --> Timescale
    DBPoller --> Postgres
    API --> Postgres
    WSServer --> Clients
```

---

## 2. Order creation flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend as TanStack Frontend
    participant API as API :3003
    participant Redis as Redis send_queue
    participant Engine as trade-engine
    participant RQ as Redis response_queue
    participant DBPoller as db-poller
    participant Postgres as PostgreSQL
    participant WS as wsserver

    User->>Frontend: Submit order
    Frontend->>API: POST /api/v1/order (Bearer JWT)
    API->>API: isUser middleware + validate schema
    API->>Redis: xAdd { kind: create_order, requestId, userId, payload }
    API->>API: Await requestMap[requestId] (10s timeout)
    Redis->>Engine: xRead send_queue
    Engine->>Engine: CreateOrderHandler → OrderService
    Engine->>Engine: Validate collateral, match orderbook
    Engine->>Engine: Apply fills, update positions
    Engine->>RQ: xAdd create_order_response
    Engine->>RQ: xAdd depth_update + trade_update
    RQ->>API: xRead → resolve requestId
    API-->>Frontend: 200 + order + fills
    RQ->>DBPoller: xRead → persist Order + Fill
    DBPoller->>Postgres: Upsert orders and fills
    RQ->>WS: xRead → broadcast depth/trade rooms
    WS->>Frontend: Push realtime updates
```

---

## 3. Engine internal flow

```mermaid
flowchart TD
    Request["Redis send_queue Event"]
    Dispatch["EventDispatcher"]
    Handler["Kind-specific Handler"]
    Risk["RiskService.validateCollateral"]
    Match["MatchingEngineService.matchOrder"]
    Fills["Apply Fills"]
    Orders["Update Orders + Open Orders"]
    Balances["Update Balances + Locked Margin"]
    Positions["Update Positions"]
    Rest["Rest Limit Order on Book?"]
    PubSub["In-process PubSub"]
    Response["xAdd response_queue"]
    Request --> Dispatch
    Dispatch --> Handler
    Handler --> Risk
    Risk --> Match
    Match --> Fills
    Fills --> Orders
    Orders --> Balances
    Balances --> Positions
    Positions --> Rest
    Rest --> PubSub
    PubSub --> Response
```

**Supported event kinds:** `create_order`, `cancel_order`, `close_position`, `create_user`, `credit_balance`, `get_open_positions`, `get_open_orders`, `get_account_state`, `get_orderbook`, `mark_price`.

---

## 4. Orderbook matching flow

```mermaid
flowchart TD
    Incoming["Incoming Order"]
    Side{"Order Side?"}
    Incoming --> Side
    Side -->|LONG| BestAsk["Walk Asks Ascending"]
    Side -->|SHORT| BestBid["Walk Bids Descending"]
    BestAsk --> BuyMatch{"Price Crosses Limit?"}
    BestBid --> SellMatch{"Price Crosses Limit?"}
    BuyMatch -->|Yes| ExecuteBuy["Fill vs Maker FIFO"]
    BuyMatch -->|No| RestBuy{"Limit Order Remaining?"}
    SellMatch -->|Yes| ExecuteSell["Fill vs Maker FIFO"]
    SellMatch -->|No| RestSell{"Limit Order Remaining?"}
    ExecuteBuy --> BuyFilled{"Fully Filled?"}
    ExecuteSell --> SellFilled{"Fully Filled?"}
    BuyFilled -->|No| BestAsk
    SellFilled -->|No| BestBid
    BuyFilled -->|Yes| Done["Finish"]
    SellFilled -->|Yes| Done
    RestBuy -->|Yes| AddBid["Add To Bids"]
    RestBuy -->|No| Done
    RestSell -->|Yes| AddAsk["Add To Asks"]
    RestSell -->|No| Done
    AddBid --> Done
    AddAsk --> Done
```

Self-trades are skipped (`makerOrder.userId === takerOrder.userId`). Each fill emits a `trade_update`; book changes emit `depth_update`.

---

## 5. Position lifecycle

```mermaid
flowchart TD
    Trade["Trade Executed"]
    Existing{"Existing Position?"}
    Open["Open New Position"]
    Direction{"Same Side?"}
    Increase["Increase Position + Weighted Avg Entry"]
    Compare{"Close Qty vs Position Size?"}
    Reduce["Reduce Position + Realized PnL"]
    Close["Close Position + Delete from Map"]
    Flip["Flip Position Side"]
    Recalc["Recalculate Liq Price + Collateral"]
    Publish["Publish depth/trade/user Events"]
    Trade --> Existing
    Existing -->|No| Open
    Existing -->|Yes| Direction
    Direction -->|Yes| Increase
    Direction -->|No| Compare
    Compare -->|Less| Reduce
    Compare -->|Equal| Close
    Compare -->|Greater| Flip
    Open --> Recalc
    Increase --> Recalc
    Reduce --> Recalc
    Close --> Recalc
    Flip --> Recalc
    Recalc --> Publish
```

One position per user per market (`{userId}_{market}`). User-initiated close: `POST /api/v1/positions/:market/close` → market order opposite side.

---

## 6. Liquidation flow

```mermaid
flowchart TD
    PriceUpdate["price-poller: mark_price tick"]
    Engine["MarkPriceHandler"]
    IndexPrice["Set Index Price on Orderbook"]
    Scan["Scan Open Positions"]
    Check{"Index Crosses Liq Price?"}
    Safe["Position Safe"]
    Liquidate["OrderService.liquidatePosition"]
    Match["Market Close via Matching Engine"]
    Events["Publish USER_EVENT + DEPTH_UPDATE + TRADE_UPDATE"]
    PriceUpdate --> Engine
    Engine --> IndexPrice
    IndexPrice --> Scan
    Scan --> Check
    Check -->|No| Safe
    Check -->|Yes| Liquidate
    Liquidate --> Match
    Match --> Events
```

**Trigger:** LONG liquidates when `indexPrice <= estimatedLiquidationPrice`; SHORT when `indexPrice >= estimatedLiquidationPrice`. Maintenance margin rate: 0.5%.

---

## 7. Redis streams architecture

```mermaid
flowchart LR
    API["API :3003"]
    PricePoller["price-poller"]
    SendQueue["send_queue"]
    Engine["trade-engine"]
    ResponseQueue["response_queue"]
    APIWorker["API worker"]
    DBPoller["db-poller"]
    WSServer["wsserver"]
    Timescale["timescale-db optional"]
    Postgres["PostgreSQL"]

    API --> SendQueue
    PricePoller --> SendQueue
    SendQueue --> Engine
    Engine --> ResponseQueue
    ResponseQueue --> APIWorker
    ResponseQueue --> DBPoller
    ResponseQueue --> WSServer
    ResponseQueue --> Timescale
    DBPoller --> Postgres
```

| Stream | Producers | Consumers |
| --- | --- | --- |
| `send_queue` | API, price-poller, simulate script | trade-engine |
| `response_queue` | trade-engine (via in-process PubSub) | API worker, db-poller, wsserver, timescale-db |

Message shape: `{ data: "<JSON string>" }` with `kind`, `requestId`, and `payload`.

---

## 8. WebSocket event architecture

```mermaid
flowchart LR
    Engine["trade-engine"]
    ResponseQueue["Redis response_queue"]
    WSServer["wsserver :8081"]
    Rooms["Room Registry"]
    TraderA["Trader A"]
    TraderB["Trader B"]
    TraderC["Trader C"]

    Engine --> ResponseQueue
    ResponseQueue --> WSServer
    WSServer --> Rooms
    Rooms -->|depth.BTC| TraderA
    Rooms -->|indexPrice.SOL| TraderB
    Rooms -->|user.42| TraderC
```

**Room naming:** `depth.{market}`, `indexPrice.{market}`, `trade.{market}`, `user.{userId}`.

**Client protocol:**
```json
{ "method": "SUBSCRIBE", "params": ["depth.BTC", "trade.BTC"] }
```

**Push shape:**
```json
{ "stream": "depth.BTC", "data": { ... } }
```

Push kinds: `depth_update`, `index_price_update`, `trade_update`, `user_event` (e.g. `LIQUIDATION`).

---

## 9. Authentication architecture

```mermaid
sequenceDiagram
    participant User
    participant Frontend as TanStack Frontend
    participant API as API :3003
    participant Postgres as PostgreSQL
    participant Engine as trade-engine

    User->>Frontend: Enter email and password
    Frontend->>API: POST /api/v1/auth/login
    API->>Postgres: Find user by email
    API->>API: bcrypt.compare password
    API->>API: jwt.sign({ userId }, 7d)
    API-->>Frontend: { token, user }
    Frontend->>Frontend: Store token + user in localStorage
    Frontend-->>User: Authenticated session

    Note over User,Engine: Signup also dispatches create_user to trade-engine ($100k margin)
```

Auth is **JWT + bcrypt** — there is no NextAuth. Session lives in `localStorage` via `auth-storage.ts` and `UserProvider` context.

---

## 10. API authentication flow

```mermaid
flowchart LR
    Component["React Components"]
    Hook["TanStack Query Hooks"]
    Service["API Service Modules"]
    AuthHeaders["authHeaders helper"]
    Storage["localStorage auth-token"]
    Axios["Axios Client"]
    API["API :3003"]
    Middleware["isUser Middleware"]

    Component --> Hook
    Hook --> Service
    Service --> AuthHeaders
    AuthHeaders --> Storage
    Service --> Axios
    Axios -->|Authorization Bearer token| API
    API --> Middleware
```

`axiosClient` has a **response** interceptor only (maps `response.data.message` to `Error`). Each protected API module calls `authHeaders()` to attach the Bearer token per request.

---

## 11. WebSocket connection flow

```mermaid
sequenceDiagram
    participant Frontend
    participant WS as wsserver :8081
    participant Redis as response_queue
    participant Engine as trade-engine

    Frontend->>WS: Connect ws://localhost:8081
    WS-->>Frontend: Connection accepted
    Frontend->>WS: SUBSCRIBE depth.BTC, indexPrice.BTC, trade.BTC
    Frontend->>WS: SUBSCRIBE user.{userId}
    Engine->>Redis: xAdd depth_update / trade_update
    Redis->>WS: xRead response_queue
    WS->>WS: Map kind → room → broadcast
    WS->>Frontend: { stream, data }
```

**Note:** WebSocket connections are currently **unauthenticated** — any client can subscribe to any room if they know the room name.

---

## 12. Frontend data flow

```mermaid
flowchart TD
    UI["React Components"]
    Hooks["Custom Hooks"]
    Query["TanStack Query"]
    Services["API Services"]
    Axios["Axios Client"]
    API["API :3003"]
    Context["UserProvider Context"]
    WSMarket["useMarketSubscriptions"]
    WSUser["useUserEvents"]
    WSServer["wsserver :8081"]
    Cache["Query Cache"]

    UI --> Hooks
    Hooks --> Query
    Query --> Services
    Services --> Axios
    Axios --> API
    Context --> UI
    WSServer --> WSMarket
    WSServer --> WSUser
    WSMarket --> Cache
    WSUser --> Cache
    Cache --> UI
    Query --> UI
```

| Hook | Source | Real-time |
| --- | --- | --- |
| `usePlaceOrder`, `useCancelOrder`, `useClosePosition` | REST mutations | Invalidates query cache |
| `usePositions`, `useOpenOrders`, `useOrderHistory` | REST queries | — |
| `useMarketSubscriptions` | WS + initial REST orderbook | Patches depth, ticker, lastTrade cache |
| `useUserEvents` | WS `user.{userId}` | Toast on liquidation, invalidates positions/account |

`useMarketSubscriptions` and `useUserEvents` each open their own WebSocket connection to `:8081`.
