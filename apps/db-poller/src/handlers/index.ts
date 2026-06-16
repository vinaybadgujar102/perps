import { RESPONSE_KINDS, type ResponseQueueMessage } from "@repo/sharedtypes";
import { ClosePositionEventHandler } from "./closedPosition.handler";
import { CreateOrderEventHandler } from "./createOrder.handler";

const createOrderHandler = new CreateOrderEventHandler();
const closePositionHandler = new ClosePositionEventHandler();

export async function handleIncomingEvents(
  data: ResponseQueueMessage,
): Promise<void> {
  switch (data.kind) {
    case RESPONSE_KINDS.CREATE_ORDER_RESPONSE:
      await createOrderHandler.handle(data);
      break;
    case RESPONSE_KINDS.CLOSE_POSITION_RESPONSE:
      await closePositionHandler.handle(data);
      break;
    default:
      break;
  }
}
