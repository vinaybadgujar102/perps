import { Pool } from "pg";
import { dbUrl } from "../constants";

export const pgPool = new Pool({
  connectionString: dbUrl,
});
