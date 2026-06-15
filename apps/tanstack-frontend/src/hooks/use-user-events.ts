import { userEventPushSchema, userEventRoom } from "@repo/sharedtypes";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { terminalToast } from "#/components/ui/terminal-toast";
import { useUser } from "#/context/user-context";
import { useWebSocket } from "#/hooks/useWebSocket";
import { formatApiPrice } from "#/lib/market";
import { queryKeys } from "#/lib/query-keys";
import { WS_URL } from "#/lib/ws-config";

export function useUserEvents() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useUser();
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const { send } = useWebSocket(WS_URL, {
    onOpen: () => {
      const userId = userIdRef.current;
      if (!userId) return;
      send({
        method: "SUBSCRIBE",
        params: [userEventRoom(userId)],
      });
    },
    onMessage: (data) => {
      if (!data) return;

      const push = userEventPushSchema.safeParse(data);
      if (!push.success) return;

      const event = push.data.data;
      const activeUserId = userIdRef.current;
      if (!activeUserId || event.userId !== activeUserId) return;

      if (event.type === "LIQUIDATION") {
        terminalToast.error(
          "LIQUIDATED",
          `${event.market} position liquidated at ${formatApiPrice(event.liquidationPrice)}`,
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.positions() });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.account(activeUserId),
        });
      }
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    send({
      method: "SUBSCRIBE",
      params: [userEventRoom(user.id)],
    });

    return () => {
      send({
        method: "UNSUBSCRIBE",
        params: [userEventRoom(user.id)],
      });
    };
  }, [isAuthenticated, user?.id, send]);
}
