/**
 * Tiny dependency-free Supabase client.
 *
 * Talks to PostgREST (`/rest/v1`) over plain `fetch` so it works in both Node
 * and edge/Workers runtimes without pulling in `@supabase/supabase-js` or a TCP
 * Postgres driver. Server code uses the service-role key, which bypasses RLS.
 */

import type { AppEnv } from "./env";

export class DbError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "DbError";
    this.status = status;
    this.details = details;
  }
}

type Filter = { column: string; op: string; value: string };

const RESERVED = new Set(["select", "order", "limit", "offset"]);

export class TableQuery<T = Record<string, unknown>> {
  private filters: Filter[] = [];
  private orderClause = "";
  private limitValue: number | null = null;
  private selectClause = "*";
  private singleMode: "none" | "one" | "maybe" = "none";
  private onConflict = "";

  constructor(
    private readonly base: string,
    private readonly key: string,
    private readonly table: string,
  ) {}

  select(columns = "*"): this {
    this.selectClause = columns;
    return this;
  }

  eq(column: string, value: unknown): this {
    return this.filter(column, "eq", value);
  }

  neq(column: string, value: unknown): this {
    return this.filter(column, "neq", value);
  }

  gt(column: string, value: unknown): this {
    return this.filter(column, "gt", value);
  }

  gte(column: string, value: unknown): this {
    return this.filter(column, "gte", value);
  }

  lt(column: string, value: unknown): this {
    return this.filter(column, "lt", value);
  }

  lte(column: string, value: unknown): this {
    return this.filter(column, "lte", value);
  }

  isNull(column: string): this {
    return this.filter(column, "is", "null");
  }

  ilike(column: string, pattern: string): this {
    this.filters.push({ column, op: "ilike", value: pattern });
    return this;
  }

  notIsNull(column: string): this {
    return this.filter(column, "not.is", "null");
  }

  inList(column: string, values: unknown[]): this {
    const list = values.map((v) => encodeValue(v)).join(",");
    this.filters.push({ column, op: "in", value: `(${list})` });
    return this;
  }

  private filter(column: string, op: string, value: unknown): this {
    this.filters.push({ column, op, value: encodeValue(value) });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}): this {
    const dir = options.ascending === false ? "desc" : "asc";
    this.orderClause = `${column}.${dir}`;
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  single(): this {
    this.singleMode = "one";
    return this;
  }

  maybeSingle(): this {
    this.singleMode = "maybe";
    return this;
  }

  private buildQueryString(): string {
    const params = new URLSearchParams();
    if (this.selectClause) params.set("select", this.selectClause);
    for (const f of this.filters) params.set(f.column, `${f.op}.${f.value}`);
    if (this.orderClause) params.set("order", this.orderClause);
    if (this.limitValue !== null) params.set("limit", String(this.limitValue));
    if (this.onConflict) params.set("on_conflict", this.onConflict);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  private headers(prefer?: string): HeadersInit {
    const h: Record<string, string> = {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (prefer) h.Prefer = prefer;
    return h;
  }

  private async run(method: string, body?: unknown, prefer?: string): Promise<unknown> {
    const res = await fetch(`${this.base}/${this.table}${this.buildQueryString()}`, {
      method,
      headers: this.headers(prefer),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new DbError(`PostgREST ${method} ${this.table} failed (${res.status})`, res.status, safeJson(text));
    }
    const data = text ? safeJson(text) : null;
    if (this.singleMode !== "none") {
      const rows = Array.isArray(data) ? data : data ? [data] : [];
      if (rows.length === 0) {
        if (this.singleMode === "maybe") return null;
        throw new DbError(`No rows found in ${this.table}`, 404);
      }
      return rows[0];
    }
    return data as T[];
  }

  async get(): Promise<T[]> {
    const data = (await this.run("GET")) as T[];
    return Array.isArray(data) ? data : [];
  }

  async insert(rows: Partial<T> | Partial<T>[]): Promise<T[]> {
    const data = (await this.run("POST", rows, "return=representation")) as T[];
    return Array.isArray(data) ? data : data ? [data] : [];
  }

  async insertOne(row: Partial<T>): Promise<T | null> {
    const rows = await this.insert(row);
    return rows[0] ?? null;
  }

  async upsert(rows: Partial<T> | Partial<T>[], onConflict: string): Promise<T[]> {
    this.onConflict = onConflict;
    const data = (await this.run(
      "POST",
      rows,
      "resolution=merge-duplicates,return=representation",
    )) as T[];
    return Array.isArray(data) ? data : data ? [data] : [];
  }

  async update(patch: Partial<T>): Promise<T[]> {
    const data = (await this.run("PATCH", patch, "return=representation")) as T[];
    return Array.isArray(data) ? data : data ? [data] : [];
  }

  async updateOne(patch: Partial<T>): Promise<T | null> {
    const rows = await this.update(patch);
    return rows[0] ?? null;
  }

  async delete(): Promise<T[]> {
    const data = (await this.run("DELETE", undefined, "return=representation")) as T[];
    return Array.isArray(data) ? data : data ? [data] : [];
  }
}

export class Db {
  private readonly base: string;
  private readonly key: string;

  constructor(env: AppEnv) {
    const url = env.supabaseUrl.replace(/\/+$/, "");
    const key = env.supabaseServiceRoleKey || env.supabaseAnonKey;
    this.base = `${url}/rest/v1`;
    this.key = key;
  }

  from<T = Record<string, unknown>>(table: string): TableQuery<T> {
    return new TableQuery<T>(this.base, this.key, table);
  }

  /** Run a Postgres RPC function. */
  async rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(`${this.base}/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    const text = await res.text();
    if (!res.ok) throw new DbError(`RPC ${fn} failed (${res.status})`, res.status, safeJson(text));
    return (text ? safeJson(text) : null) as T;
  }
}

function encodeValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  const s = String(value);
  // PostgREST reserved words/characters need quoting inside filter values.
  if (s === "" || /[",().]/.test(s) || RESERVED.has(s)) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return s;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
