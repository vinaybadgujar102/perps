import type { OrderSide, OrderType } from "@/lib/api";
import { create } from "zustand";

type TradeUiState = {
  orderSide: OrderSide;
  orderType: OrderType;
  setOrderSide: (side: OrderSide) => void;
  setOrderType: (type: OrderType) => void;
};

export const useTradeUiStore = create<TradeUiState>((set) => ({
  orderSide: "LONG",
  orderType: "LIMIT_ORDER",
  setOrderSide: (orderSide) => set({ orderSide }),
  setOrderType: (orderType) => set({ orderType }),
}));
