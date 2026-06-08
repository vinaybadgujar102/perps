// Legacy handler — replaced by CreateUserHandler + UserManager.
// import {
//   RESPONSE_KINDS,
//   type createUserPayloadSchema,
//   type TradeEngineResponse,
// } from "@repo/sharedtypes";
// import type z from "zod";
// import { USERMANAGER } from "../inMemoryStates";
//
// export const handleCreateUserEvent = (
//   data: z.infer<typeof createUserPayloadSchema>,
// ): TradeEngineResponse => {
//   const { userId } = data.payload;
//
//   if (USERMANAGER.getUser(userId)) {
//     return {
//       requestId: data.requestId,
//       kind: RESPONSE_KINDS.CREATE_USER_RESPONSE,
//       data: {
//         success: false,
//         message: "USER_ALREADY_EXISTS",
//         data: null,
//       },
//     };
//   }
//
//   USERMANAGER.createUser(userId);
//
//   return {
//     requestId: data.requestId,
//     kind: RESPONSE_KINDS.CREATE_USER_RESPONSE,
//     data: {
//       success: true,
//       message: null,
//       data: { userId },
//     },
//   };
// };
