import { Pool } from "pg";
import { requireDbUrl } from "../constants";

export const pgPool = new Pool({
  connectionString: requireDbUrl(),
});
