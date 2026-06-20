import { useQuery } from "@tanstack/react-query";
import { getDepositsApi } from "#/api/onramp.api";
import { useUser } from "#/context/user-context";
import { queryKeys } from "#/lib/query-keys";

export function useDepositHistory() {
  const { isAuthenticated } = useUser();

  return useQuery({
    queryKey: queryKeys.deposits(),
    queryFn: getDepositsApi,
    enabled: isAuthenticated,
  });
}
