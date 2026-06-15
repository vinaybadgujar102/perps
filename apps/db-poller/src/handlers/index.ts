import { RESPONSE_KINDS, type ResponseQueueMessage } from "@repo/sharedtypes";
import { CreateOrderEventHandler } from "./createOrder.handler";

const createOrderHandler = new CreateOrderEventHandler();

export async function handleIncomingEvents(
  data: ResponseQueueMessage,
): Promise<void> {
  switch (data.kind) {
    case RESPONSE_KINDS.CREATE_ORDER_RESPONSE:
      await createOrderHandler.handle(data);
      break;
    default:
      break;
  }
}
