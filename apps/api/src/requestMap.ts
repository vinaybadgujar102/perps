export type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

export const requestMap = new Map<string, PendingRequest>();
