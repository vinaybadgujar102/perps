const CONSTANTS = {
  PORT: process.env.PORT as string,
  /** Max time to wait for a trade-engine response before rejecting the request. */
  ENGINE_DISPATCH_TIMEOUT_MS: 10_000,
};

export default CONSTANTS;
