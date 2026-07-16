// Lightweight replacement for @supabase/supabase-js.
// Talks to our own Express + Postgres API (server/index.js) instead of Supabase.
// Implements only the subset of the supabase-js surface this app actually uses.

const API = "/api";

type Row = Record<string, any>;

function qs(params: Record<string, string>) {
  const parts = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

async function req(method: string, url: string, body?: any) {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { json = null; }
  if (!res.ok) {
    return { data: null, error: { message: json?.error || res.statusText } };
  }
  return { data: json, error: null };
}

class QueryBuilder {
  private table: string;
  private params: Record<string, string> = {};
  private _mode: "select" | "insert" | "update" | "delete" = "select";
  private _payload: any;
  private _single: "one" | "maybe" | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(cols = "*") {
    this.params.select = cols;
    return this;
  }
  eq(col: string, val: any) {
    this.params[col] = `eq.${val}`;
    return this;
  }
  in(col: string, vals: any[]) {
    this.params[col] = `in.(${vals.join(",")})`;
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.params.order = `${col}.${opts?.ascending === false ? "desc" : "asc"}`;
    return this;
  }
  limit(n: number) {
    this.params.limit = String(n);
    return this;
  }
  insert(payload: Row | Row[]) {
    this._mode = "insert";
    this._payload = payload;
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this._mode = "insert";
    this._payload = payload;
    if (opts?.onConflict) this.params.on_conflict = opts.onConflict;
    return this;
  }
  update(payload: Row) {
    this._mode = "update";
    this._payload = payload;
    return this;
  }
  delete() {
    this._mode = "delete";
    return this;
  }
  maybeSingle() {
    this._single = "maybe";
    return this;
  }
  single() {
    this._single = "one";
    return this;
  }

  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    return this.exec().then(resolve, reject);
  }

  private async exec(): Promise<{ data: any; error: any }> {
    const url = `${API}/rest/${this.table}${qs(this.params)}`;
    let result: { data: any; error: any };
    if (this._mode === "select") {
      result = await req("GET", url);
    } else if (this._mode === "insert") {
      result = await req("POST", url, this._payload);
    } else if (this._mode === "update") {
      result = await req("PATCH", url, this._payload);
    } else {
      result = await req("DELETE", url);
    }
    if (result.error) return result;
    if (this._single && Array.isArray(result.data)) {
      const row = result.data[0] ?? null;
      if (this._single === "one" && !row) return { data: null, error: { message: "no rows" } };
      return { data: row, error: null };
    }
    return result;
  }
}

type AuthUser = { id: string; username: string } | null;
type AuthListener = (event: string, session: { user: AuthUser } | null) => void;
const listeners: Set<AuthListener> = new Set();
let currentUser: AuthUser = null;
let meLoaded = false;

async function fetchMe() {
  const { data } = await req("GET", `${API}/auth/me`);
  currentUser = data?.user ?? null;
  meLoaded = true;
  return data;
}

function notify(event: string) {
  const session = currentUser ? { user: currentUser } : null;
  listeners.forEach((l) => l(event, session));
}

// simple polling-based realtime shim (replaces supabase.channel/.removeChannel)
class Channel {
  private timer: any = null;
  private handler: ((payload: any) => void) | null = null;
  private table: string | null = null;
  private filterCol: string | null = null;
  private filterVal: string | null = null;
  private lastIds = new Set<string>();
  private firstRun = true;

  on(_type: string, opts: { table: string; filter?: string }, handler: (payload: any) => void) {
    this.table = opts.table;
    this.handler = handler;
    if (opts.filter) {
      const [col, val] = opts.filter.split("=eq.");
      this.filterCol = col;
      this.filterVal = val;
    }
    return this;
  }

  subscribe() {
    const poll = async () => {
      if (!this.table) return;
      const params: Record<string, string> = { select: "*", order: "created_at.asc" };
      if (this.filterCol && this.filterVal) params[this.filterCol] = `eq.${this.filterVal}`;
      const { data } = await req("GET", `${API}/rest/${this.table}${qs(params)}`);
      if (Array.isArray(data)) {
        if (this.firstRun) {
          data.forEach((r: any) => this.lastIds.add(r.id));
          this.firstRun = false;
        } else {
          for (const row of data) {
            if (!this.lastIds.has(row.id)) {
              this.lastIds.add(row.id);
              this.handler?.({ new: row });
            }
          }
        }
      }
    };
    poll();
    this.timer = setInterval(poll, 2500);
    return this;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}

export const supabase = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  channel(_name: string) {
    return new Channel();
  },
  removeChannel(ch: Channel) {
    ch.stop();
  },
  auth: {
    async getUser() {
      if (!meLoaded) await fetchMe();
      return { data: { user: currentUser }, error: null };
    },
    async getSession() {
      if (!meLoaded) await fetchMe();
      return { data: { session: currentUser ? { user: currentUser } : null }, error: null };
    },
    onAuthStateChange(cb: AuthListener) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const username = email.split("@")[0];
      const { data, error } = await req("POST", `${API}/auth/login`, { username, password });
      if (error) return { data: null, error };
      currentUser = data.user;
      meLoaded = true;
      notify("SIGNED_IN");
      return { data: { user: data.user, session: { user: data.user } }, error: null };
    },
    async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
      const username = options?.data?.username || email.split("@")[0];
      const { data, error } = await req("POST", `${API}/auth/signup`, { username, password });
      if (error) return { data: null, error };
      currentUser = data.user;
      meLoaded = true;
      notify("SIGNED_IN");
      return { data: { user: data.user, session: { user: data.user } }, error: null };
    },
    async signOut() {
      await req("POST", `${API}/auth/logout`);
      currentUser = null;
      notify("SIGNED_OUT");
      return { error: null };
    },
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(_path: string, file: File) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch(`${API}/storage/${bucket}`, { method: "POST", credentials: "include", body: fd });
          const json = await res.json();
          if (!res.ok) return { data: null, error: { message: json?.error || res.statusText } };
          return { data: { path: json.path }, error: null };
        },
        async createSignedUrl(path: string) {
          return { data: { signedUrl: `/uploads/${bucket}/${path}` }, error: null };
        },
      };
    },
  },
};

// Kept for compatibility with existing imports (unused now, no real emails involved)
export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")}@north.store`;
}
