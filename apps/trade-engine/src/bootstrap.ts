import type { Position } from "@repo/sharedtypes";
import { initializeAppState } from "./appState";
import { OrderEntity } from "./entity/order.entity";
import { GLOBAL_PERPETUAL_MARKETS } from "./entity/perpetualMarket.entity";
import { GLOBAL_ORDERBOOK } from "./inMemoryStates";
import { snapShotService } from "./services/snapshotting.service";
import { User } from "./utils/User.class";
import { UserManager } from "./utils/UserManager.class";

await snapShotService.loadSnapshotIfExists();

const snapshot = snapShotService.getLatestSnapshot();
const orders = snapshot.orders.map((order) => OrderEntity.fromSnapshot(order));
const ordersByUserId = new Map<number, OrderEntity[]>();

for (const order of orders) {
  const userOrders = ordersByUserId.get(order.userId) ?? [];
  userOrders.push(order);
  ordersByUserId.set(order.userId, userOrders);
}

const userManager = new UserManager(
  new Map(
    snapshot.users.map(([userId, userData]) => {
      const user = new User(userId);
      user.balance = userData.balance;
      user.lockedBalance = userData.lockedBalance;
      for (const order of ordersByUserId.get(userId) ?? []) {
        user.addOpenOrder(order);
      }
      return [userId, user] as const;
    }),
  ),
);

for (const bookData of snapshot.orderbooks) {
  const orderbook = GLOBAL_ORDERBOOK.ensureOrderbook(bookData.market);
  orderbook.indexPrice = bookData.indexPrice;
  orderbook.lastTradedPrice = bookData.lastTradedPrice;
  GLOBAL_PERPETUAL_MARKETS.ensureMarket(bookData.market, orderbook);

  for (const order of orders) {
    if (order.market !== bookData.market) continue;
    orderbook.addOrder(order);
  }
}

const positions = new Map<string, Position>(
  snapshot.positions.map(([key, position]) => [
    key,
    {
      ...position,
      createdAt:
        position.createdAt instanceof Date
          ? position.createdAt
          : new Date(position.createdAt),
    },
  ]),
);

initializeAppState(positions, userManager);
