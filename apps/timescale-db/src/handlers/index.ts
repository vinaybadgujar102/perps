import { RESPONSE_KINDS, type ResponseQueueMessage } from "@repo/sharedtypes";
import { insertTrade } from "../db.utils";
import { persistFills } from "./fills.handler";
import { unscalePrice } from "../utils/price";

export async function handleIncomingEvents(
  data: ResponseQueueMessage,
) {
  switch (data.kind) {
    case RESPONSE_KINDS.CREATE_ORDER_RESPONSE:
      if (data.data.success && data.data.data?.length) {
        await persistFills(data.data.data);
      }
      break;
    case RESPONSE_KINDS.CLOSE_POSITION_RESPONSE:
      if (data.data.success && data.data.data?.length) {
        await persistFills(data.data.data);
      }
      break;
    case RESPONSE_KINDS.TRADE_UPDATE:
      await insertTrade(
        data.payload.fillId,
        data.payload.market,
        unscalePrice(data.payload.market, data.payload.price),
        new Date(data.payload.timestamp),
      );
      break;
    default:
      break;
  }
}
