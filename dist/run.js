const m = /* @__PURE__ */ new Map();
function F(t) {
  const e = /* @__PURE__ */ new Date();
  e.setFullYear(e.getFullYear() - t);
  const r = String(e.getDate()).padStart(2, "0"), n = String(e.getMonth() + 1).padStart(2, "0"), o = e.getFullYear();
  return `${r}/${n}/${o}`;
}
class d {
  constructor() {
    this.enabled = !0;
  }
  static getInstance() {
    return d.instance || (d.instance = new d()), d.instance;
  }
  log(e, r) {
    this.enabled && console.log(`[EconomicIndices] ${e}`, r || "");
  }
  error(e, r) {
    this.enabled && ((/* @__PURE__ */ new Date()).toISOString(), console.error(
      `[EconomicIndices] ERROR: ${e}`,
      r || ""
    ));
  }
  enable() {
    this.enabled = !0;
  }
  disable() {
    this.enabled = !1;
  }
}
async function b(t, e, r = {
  retries: 3,
  retryDelay: 1e3,
  timeout: 8e3
}) {
  const n = m.get(t);
  if (n && Date.now() - n.timestamp < T)
    return console.log(`[Cache hit] ${t}`), n.data;
  let o;
  for (let s = 1; s <= r.retries; s++)
    try {
      const a = new AbortController(), i = setTimeout(
        () => a.abort(),
        r.timeout
      ), l = await fetch(t, {
        signal: a.signal
      });
      if (clearTimeout(i), !l.ok)
        throw new Error(`HTTP error! status: ${l.status}`);
      const c = await e(l);
      return m.set(t, {
        data: c,
        timestamp: Date.now()
      }), c;
    } catch (a) {
      o = a, s < r.retries && await new Promise(
        (i) => setTimeout(i, r.retryDelay)
      );
    }
  throw o || new Error(`Failed after ${r.retries} retries`);
}
function y(t) {
  return u(
    (Math.pow(1 + t / 100, 252) - 1) * 100 + ""
  );
}
function u(t) {
  return parseFloat(
    parseFloat(`${t}`.replace(",", ".")).toFixed(2)
  );
}
function p(t) {
  const e = /* @__PURE__ */ new Date();
  return e.setFullYear(e.getFullYear() - t), `${e.getFullYear()}${String(e.getMonth() + 1).padStart(2, "0")}`;
}
const w = d.getInstance();
async function g(t) {
  const {
    url: e,
    p: r,
    fb: n,
    iname: o,
    fOpt: s = $,
    hCfg: a
  } = t;
  try {
    w.log(`> '${o}'`, e);
    const i = await b(
      e,
      async (c) => {
        if (!c.ok)
          throw new Error(`HTTP error! status: ${c.status}`);
        const f = await c.json(), h = r(f);
        if (h == null)
          throw new Error(`Invalid ${o} data structure`);
        return h;
      },
      s
    );
    let l = [];
    if (a)
      try {
        const c = a.urlBuilder(e);
        l = await b(
          c,
          async (f) => {
            const h = await f.json();
            return a.p(h);
          },
          { ...s, timeout: 15e3 }
          // Timeout maior para históricos
        );
      } catch (c) {
        w.error(
          `Failed to fetch historical ${o} data`,
          c
        );
      }
    return Y(i, l);
  } catch (i) {
    return w.error(`Failed to fetch ${o} data:`, i), n ?? j();
  }
}
function Y(t, e = []) {
  const r = typeof t == "number" ? { current: t } : t, n = e.length > 0 ? A(e) : "avg" in r ? r.avg : void 0;
  return {
    ...r,
    avg: n,
    updated: /* @__PURE__ */ new Date()
  };
}
function A(t) {
  return parseFloat(
    (t.reduce((e, r) => e + r, 0) / t.length).toFixed(2)
  );
}
function j() {
  return {
    current: 0,
    updated: /* @__PURE__ */ new Date()
  };
}
async function E(t) {
  return g({
    url: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json",
    p: (e) => {
      if (!Array.isArray(e) || e.length === 0) return null;
      const r = u(e[0].valor);
      return y(r);
    },
    fb: t ? {
      ...t,
      current: t.current ? y(t.current) : 0
    } : void 0,
    iname: "CDI",
    hCfg: {
      urlBuilder: (e) => e.replace("/ultimos/1", "") + "&dataInicial=" + F(5),
      p: (e) => Array.isArray(e) ? e.map((r) => {
        const n = u(r.valor);
        return y(n);
      }) : []
    }
  });
}
function v(t) {
  return t.length === 0 ? 0 : (t.reduce((r, n) => r * (1 + n / 100), 1) - 1) * 100;
}
async function O(t) {
  const e = p(5), r = p(1);
  return g({
    // URL para obter os últimos 12 meses do INPC
    url: `https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/63/p/${e}-${r}?formato=json`,
    p: (n) => {
      if (!Array.isArray(n) || n.length < 13) return null;
      const s = n.slice(-12).map(
        (a) => u(a.V)
      );
      return parseFloat(
        v(s).toFixed(2)
      );
    },
    fb: t,
    iname: "INPC",
    hCfg: {
      // URL para obter os dados mensais dos últimos 5 anos
      urlBuilder: () => `https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/63/p/${e}-${r}?formato=json`,
      p: (n) => {
        if (!Array.isArray(n) || n.length < 2) return [];
        const o = n.slice(1), s = [], a = {};
        return o.forEach((i) => {
          const c = i.D4N.split(" ")[1], f = u(i.V);
          a[c] || (a[c] = []), a[c].push(f);
        }), Object.keys(a).forEach((i) => {
          const l = a[i];
          l.length === 12 && s.push(
            v(l)
          );
        }), s;
      }
    }
  });
}
function I(t, e) {
  return (t - e) / e * 100;
}
async function W(t) {
  const e = p(5), r = p(1);
  return g({
    url: "https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/-12/variaveis/2266?localidades=N1[all]",
    p: (n) => {
      const o = n?.[0]?.resultados?.[0]?.series?.[0]?.serie;
      if (!o || Object.keys(o).length < 12) return null;
      const s = Object.keys(o).sort(), a = s[0], i = s[s.length - 1], l = u(o[a]), c = u(o[i]);
      return u(I(c, l));
    },
    fb: t,
    iname: "IPCA",
    hCfg: {
      urlBuilder: () => `https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/${e}-${r}/variaveis/2266?localidades=N1[all]`,
      p: (n) => {
        const o = n?.[0]?.resultados?.[0]?.series?.[0]?.serie;
        if (!o) return [];
        const s = Object.keys(o).sort(), a = [];
        for (let i = 12; i < s.length; i += 12) {
          const l = u(o[s[i]]), c = u(o[s[i - 12]]);
          a.push(
            I(l, c)
          );
        }
        return a;
      }
    }
  });
}
async function V(t) {
  const r = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial=${F(5)}`;
  return g({
    url: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json",
    p: (n) => n?.length ? u(n[0].valor) : null,
    fb: t,
    iname: "SELIC",
    hCfg: {
      urlBuilder: () => r,
      p: (n) => Array.isArray(n) ? n.map((o) => u(o.valor)) : []
    }
  });
}
const T = 30 * 60 * 1e3, $ = {
  retries: 7,
  retryDelay: 1500,
  timeout: 1e3
}, P = {
  Selic: V,
  CDI: E,
  ipca: W,
  inpc: O
}, S = "economic_indices_data";
function D() {
  return typeof process < "u" && process.versions?.node !== void 0;
}
async function C() {
  const { default: t } = await import("fs/promises"), { default: e } = await import("path");
  return { fs: t, path: e };
}
function k(t) {
  let e = /* @__PURE__ */ new Date(0);
  return Object.values(t).forEach((r) => {
    r?.updated instanceof Date && r.updated > e && (e = r.updated);
  }), e;
}
async function R() {
  try {
    if (typeof window < "u" && window.localStorage) {
      const t = localStorage.getItem(S);
      return t ? JSON.parse(t) : null;
    } else if (D()) {
      const { fs: t, path: e } = await C(), r = e.join(process.cwd(), "indices.json");
      try {
        const n = await t.readFile(r, "utf-8");
        return JSON.parse(n);
      } catch (n) {
        if (n.code === "ENOENT")
          return null;
        throw n;
      }
    }
    return null;
  } catch (t) {
    return console.error("Failed to load from storage:", t), null;
  }
}
async function N(t) {
  try {
    const e = k(t), r = {
      indices: t,
      updated: e.toISOString()
    };
    if (typeof window < "u" && window.localStorage)
      localStorage.setItem(S, JSON.stringify(r));
    else if (D()) {
      const { fs: n, path: o } = await C(), s = o.join(process.cwd(), "indices.json");
      await n.writeFile(
        s,
        JSON.stringify(r, null, 2)
      );
    }
  } catch (e) {
    console.error("Failed to save to storage:", e);
  }
}
function B(t) {
  if (!t) return !0;
  const e = new Date(t.updated), r = /* @__PURE__ */ new Date();
  return e.getDate() !== r.getDate() || e.getMonth() !== r.getMonth() || e.getFullYear() !== r.getFullYear();
}
const X = "data:text/javascript;base64,aW1wb3J0e0VDT05JRFggYXMgb31mcm9tIi4vRWNvbm9taWNJbmRpY2VzQ2xpZW50LmpzIjtpbXBvcnR7bG9hZEZyb21TdG9yYWdlIGFzIHMsZGV2ZXJpYUF0dWFsaXphciBhcyBhfWZyb20iLi9zdG9yYWdlLmpzIjtzZWxmLmE9YXN5bmMgcj0+e2lmKHIudC5lPT09InVwZGF0ZSIpdHJ5e2NvbnN0IGU9YXdhaXQgby5vKCk7c2VsZi5yKHtlOiJpbmRpY2VzIixzOmV9KX1jYXRjaChlKXtzZWxmLnIoe2U6ImVycm9yIixpOmUgaW5zdGFuY2VvZiBFcnJvcj9lLm46IlVua25vd24gZXJyb3IifSl9fTsoYXN5bmMoKT0+e2NvbnN0IHI9YXdhaXQgcygpO2lmKCFyfHxhKHIpKXtjb25zdCBlPWF3YWl0IG8ubygpO2UmJnNlbGYucih7ZToiaW5kaWNlcyIsczplfSl9fSkoKTsK";
class z {
  constructor() {
    this.worker = null, this.currentIndices = null, this.pendingResolvers = [], this.isNode = typeof process < "u" && process.versions?.node !== void 0, this.initialize().catch(console.error);
  }
  async initialize() {
    this.isNode || await this.initWebWorker();
  }
  async initWebWorker() {
    if (!(typeof Worker > "u"))
      try {
        const e = new Blob([X], {
          type: "application/javascript"
        });
        this.worker = new Worker(URL.createObjectURL(e)), this.worker.onmessage = (r) => {
          r.data.type === "indices" && this.handleNewIndices(r.data.indices);
        }, this.worker.onerror = (r) => {
          console.error("Worker error:", r), this.handleWorkerError();
        };
      } catch (e) {
        console.error("Worker initialization failed:", e);
      }
  }
  handleNewIndices(e) {
    this.currentIndices = e, e && N(e).catch(console.error), this.resolvePendingPromises(e);
  }
  handleWorkerError() {
    this.resolvePendingPromises(null);
  }
  resolvePendingPromises(e) {
    this.pendingResolvers.forEach((r) => r(e)), this.pendingResolvers = [];
  }
  async getIndices() {
    const e = await R();
    return e && !B(e) ? e.indices : this.isNode ? this.fetchIndicesNode() : this.fetchIndicesBrowser();
  }
  async fetchIndicesNode() {
    try {
      const e = await this.fetchAll(this.currentIndices);
      return e && (await N(e), this.currentIndices = e), e;
    } catch (e) {
      return console.error("Node fetch failed:", e), null;
    }
  }
  async fetchIndicesBrowser() {
    return this.worker ? new Promise((e) => {
      this.pendingResolvers.push(e), this.worker?.postMessage({ type: "update" });
    }) : this.fetchIndicesNode();
  }
  async fetchAll(e) {
    const r = {};
    return await Promise.all(
      Object.entries(P).map(async ([n, o]) => {
        const s = n;
        r[s] = await o(e?.[s]);
      })
    ), r;
  }
}
const U = new z();
typeof window < "u" && (window.ECONIDX = U);
