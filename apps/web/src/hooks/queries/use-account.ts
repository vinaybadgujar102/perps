import { fetchAccountState } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export const useAccount = (userId: number | undefined, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.account(userId ?? 0),
    queryFn: () => fetchAccountState(userId!),
    enabled: enabled && Boolean(userId),
  });
