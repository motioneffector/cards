class K extends Error {
  constructor(r) {
    super(r), this.name = "CardsError";
  }
}
class v extends K {
  constructor(r, t, n) {
    super(r), this.position = t, this.input = n, this.name = "ParseError";
  }
}
class Ue extends K {
  constructor(r, t) {
    super(r), this.field = t, this.name = "ValidationError";
  }
}
const L = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), j = "ccv3", I = "chara", U = "naidata", re = "chara_card_v3", ne = "chara_card_v2";
let G = null;
function ae() {
  const e = new Uint32Array(256);
  for (let r = 0; r < 256; r++) {
    let t = r;
    for (let n = 0; n < 8; n++)
      t = t & 1 ? 3988292384 ^ t >>> 1 : t >>> 1;
    e[r] = t;
  }
  return e;
}
function R(...e) {
  G ?? (G = ae());
  let r = 4294967295;
  for (const t of e)
    for (let n = 0; n < t.length; n++) {
      const a = t[n];
      a !== void 0 && (r = r >>> 8 ^ (G[(r ^ a) & 255] ?? 0));
    }
  return (r ^ 4294967295) >>> 0;
}
const oe = 100 * 1024 * 1024;
function N(e) {
  if (!se(e))
    throw new Error("Invalid PNG signature");
  const r = [];
  let t = 8;
  for (; t < e.length; ) {
    if (t + 8 > e.length)
      throw new Error("Invalid PNG: truncated chunk header");
    const n = (e[t] ?? 0) << 24 | (e[t + 1] ?? 0) << 16 | (e[t + 2] ?? 0) << 8 | (e[t + 3] ?? 0);
    if (n < 0 || n > oe)
      throw new Error(`Invalid PNG: chunk length ${n} exceeds maximum allowed size`);
    t += 4;
    const a = e.slice(t, t + 4), o = String.fromCharCode(...a);
    if (t += 4, t + n + 4 > e.length)
      throw new Error("Invalid PNG: chunk data extends beyond file bounds");
    const s = e.slice(t, t + n);
    t += n;
    const i = (e[t] ?? 0) << 24 | (e[t + 1] ?? 0) << 16 | (e[t + 2] ?? 0) << 8 | (e[t + 3] ?? 0);
    if (t += 4, r.push({ length: n, type: o, data: s, crc: i }), o === "IEND") break;
  }
  return r;
}
function F(e) {
  let r = 8;
  for (const a of e)
    r += 12 + a.length;
  const t = new Uint8Array(r);
  let n = 0;
  t.set(L, n), n += 8;
  for (const a of e) {
    t[n++] = a.length >> 24 & 255, t[n++] = a.length >> 16 & 255, t[n++] = a.length >> 8 & 255, t[n++] = a.length & 255;
    const o = new Uint8Array(4);
    for (let s = 0; s < 4; s++)
      o[s] = a.type.charCodeAt(s);
    t.set(o, n), n += 4, t.set(a.data, n), n += a.length, t[n++] = a.crc >> 24 & 255, t[n++] = a.crc >> 16 & 255, t[n++] = a.crc >> 8 & 255, t[n++] = a.crc & 255;
  }
  return t;
}
function T(e, r) {
  const t = new Uint8Array(e.length + 1);
  for (let i = 0; i < e.length; i++)
    t[i] = e.charCodeAt(i);
  t[e.length] = 0;
  const n = new Uint8Array(r.length);
  for (let i = 0; i < r.length; i++)
    n[i] = r.charCodeAt(i);
  const a = new Uint8Array(t.length + n.length);
  a.set(t, 0), a.set(n, t.length);
  const o = new Uint8Array([116, 69, 88, 116]), s = R(o, a);
  return {
    length: a.length,
    type: "tEXt",
    data: a,
    crc: s
  };
}
function se(e) {
  if (e.length < 8) return !1;
  for (let r = 0; r < 8; r++)
    if (e[r] !== L[r])
      return !1;
  return !0;
}
function J(e) {
  if (typeof btoa < "u") {
    let r = "";
    for (let t = 0; t < e.length; t++)
      r += String.fromCharCode(e[t] ?? 0);
    return btoa(r);
  }
  return typeof Buffer < "u" ? Buffer.from(e).toString("base64") : ce(e);
}
function O(e) {
  if (typeof atob < "u") {
    const r = atob(e), t = new Uint8Array(r.length);
    for (let n = 0; n < r.length; n++)
      t[n] = r.charCodeAt(n);
    return t;
  }
  return typeof Buffer < "u" ? new Uint8Array(Buffer.from(e, "base64")) : ie(e);
}
function ce(e) {
  const r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let t = "", n = 0;
  for (; n < e.length; ) {
    const a = e[n++] ?? 0, o = e[n++] ?? 0, s = e[n++] ?? 0, i = a << 16 | o << 8 | s;
    t += r[i >> 18 & 63] ?? "", t += r[i >> 12 & 63] ?? "", t += n > e.length + 1 ? "=" : r[i >> 6 & 63] ?? "", t += n > e.length ? "=" : r[i & 63] ?? "";
  }
  return t;
}
function ie(e) {
  const r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", t = /* @__PURE__ */ new Map();
  for (let s = 0; s < r.length; s++) {
    const i = r[s];
    i !== void 0 && t.set(i, s);
  }
  const n = e.replace(/[=\s]/g, ""), a = [];
  let o = 0;
  for (; o < n.length; ) {
    const s = t.get(n[o++] ?? "") ?? 0, i = t.get(n[o++] ?? "") ?? 0, l = t.get(n[o++] ?? "") ?? 0, u = t.get(n[o++] ?? "") ?? 0, c = s << 18 | i << 12 | l << 6 | u;
    a.push(c >> 16 & 255), o <= n.length + 1 && a.push(c >> 8 & 255), o <= n.length && a.push(c & 255);
  }
  return new Uint8Array(a);
}
function D(e) {
  if (typeof TextEncoder < "u")
    return new TextEncoder().encode(e);
  const r = [];
  for (let t = 0; t < e.length; t++) {
    let n = e.charCodeAt(t);
    if (n < 128)
      r.push(n);
    else if (n < 2048)
      r.push(192 | n >> 6), r.push(128 | n & 63);
    else if (n < 55296 || n >= 57344)
      r.push(224 | n >> 12), r.push(128 | n >> 6 & 63), r.push(128 | n & 63);
    else {
      t++;
      const a = e.charCodeAt(t);
      n = 65536 + ((n & 1023) << 10 | a & 1023), r.push(240 | n >> 18), r.push(128 | n >> 12 & 63), r.push(128 | n >> 6 & 63), r.push(128 | n & 63);
    }
  }
  return new Uint8Array(r);
}
function P(e) {
  if (typeof TextDecoder < "u")
    return new TextDecoder("utf-8").decode(e);
  const r = [];
  let t = 0;
  for (; t < e.length; ) {
    const n = e[t++] ?? 0;
    if (n < 128)
      r.push(String.fromCharCode(n));
    else if ((n & 224) === 192) {
      const a = e[t++] ?? 0;
      r.push(String.fromCharCode((n & 31) << 6 | a & 63));
    } else if ((n & 240) === 224) {
      const a = e[t++] ?? 0, o = e[t++] ?? 0;
      r.push(
        String.fromCharCode((n & 15) << 12 | (a & 63) << 6 | o & 63)
      );
    } else if ((n & 248) === 240) {
      const a = e[t++] ?? 0, o = e[t++] ?? 0, s = e[t++] ?? 0;
      let i = (n & 7) << 18 | (a & 63) << 12 | (o & 63) << 6 | s & 63;
      i -= 65536, r.push(String.fromCharCode(55296 | i >> 10)), r.push(String.fromCharCode(56320 | i & 1023));
    }
  }
  return r.join("");
}
function le(e) {
  var o;
  const r = e.split(`
`), t = [];
  let n = 0;
  for (let s = 0; s < r.length; s++) {
    const i = ((o = r[s]) == null ? void 0 : o.trim()) ?? "";
    if (!i.startsWith("@@")) {
      n = s;
      break;
    }
    const l = ue(i);
    l && t.push(l);
  }
  const a = r.slice(n).join(`
`);
  return {
    decorators: t,
    content: a
  };
}
function de(e, r) {
  const t = [];
  for (const n of e) {
    const a = fe(n);
    a && t.push(a);
  }
  return t.length > 0 ? (t.push(r), t.join(`
`)) : r;
}
function ue(e) {
  const t = e.slice(2).trim().split(/\s+/), n = t[0], a = t.slice(1).join(" ");
  if (!n) return null;
  switch (n) {
    case "activate":
      return { type: "activate" };
    case "dont_activate":
      return { type: "dont_activate" };
    case "activate_only_after":
      return { type: "activate_only_after", value: parseInt(a, 10) };
    case "activate_only_every":
      return { type: "activate_only_every", value: parseInt(a, 10) };
    case "keep_activate_after_match":
      return { type: "keep_activate_after_match" };
    case "dont_activate_after_match":
      return { type: "dont_activate_after_match" };
    case "depth":
      return { type: "depth", value: parseInt(a, 10) };
    case "instruct_depth":
      return { type: "instruct_depth", value: parseInt(a, 10) };
    case "reverse_depth":
      return { type: "reverse_depth", value: parseInt(a, 10) };
    case "position":
      return { type: "position", value: a };
    case "role":
      return { type: "role", value: a };
    case "scan_depth":
      return { type: "scan_depth", value: parseInt(a, 10) };
    case "instruct_scan_depth":
      return { type: "instruct_scan_depth", value: parseInt(a, 10) };
    case "is_greeting":
      return { type: "is_greeting", value: parseInt(a, 10) };
    case "additional_keys":
      return { type: "additional_keys", value: a.split(",").map((o) => o.trim()) };
    case "exclude_keys":
      return { type: "exclude_keys", value: a.split(",").map((o) => o.trim()) };
    case "is_user_icon":
      return { type: "is_user_icon", value: a };
    case "ignore_on_max_context":
      return { type: "ignore_on_max_context" };
    case "disable_ui_prompt":
      return { type: "disable_ui_prompt", value: a };
    default:
      return { type: "unknown", name: n, value: a };
  }
}
function fe(e) {
  switch (e.type) {
    case "activate":
      return "@@activate";
    case "dont_activate":
      return "@@dont_activate";
    case "activate_only_after":
      return `@@activate_only_after ${String(e.value)}`;
    case "activate_only_every":
      return `@@activate_only_every ${String(e.value)}`;
    case "keep_activate_after_match":
      return "@@keep_activate_after_match";
    case "dont_activate_after_match":
      return "@@dont_activate_after_match";
    case "depth":
      return `@@depth ${String(e.value)}`;
    case "instruct_depth":
      return `@@instruct_depth ${String(e.value)}`;
    case "reverse_depth":
      return `@@reverse_depth ${String(e.value)}`;
    case "position":
      return `@@position ${e.value}`;
    case "role":
      return `@@role ${e.value}`;
    case "scan_depth":
      return `@@scan_depth ${String(e.value)}`;
    case "instruct_scan_depth":
      return `@@instruct_scan_depth ${String(e.value)}`;
    case "is_greeting":
      return `@@is_greeting ${String(e.value)}`;
    case "additional_keys":
      return `@@additional_keys ${e.value.join(",")}`;
    case "exclude_keys":
      return `@@exclude_keys ${e.value.join(",")}`;
    case "is_user_icon":
      return `@@is_user_icon ${e.value}`;
    case "ignore_on_max_context":
      return "@@ignore_on_max_context";
    case "disable_ui_prompt":
      return `@@disable_ui_prompt ${e.value}`;
    case "unknown":
      return e.value ? `@@${e.name} ${e.value}` : `@@${e.name}`;
    default:
      return null;
  }
}
const z = 0, he = 8, pe = 67324752, M = 33639248, Y = 101010256, H = 100 * 1024 * 1024, _e = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function ge(e) {
  if (e.includes("\0"))
    throw new Error("Path traversal detected: null byte in filename");
  if (e.startsWith("/") || /^[a-zA-Z]:/.test(e))
    throw new Error("Path traversal detected: absolute path");
  const r = e.replace(/\\/g, "/");
  if (r.includes("../") || r.includes("/.."))
    throw new Error("Path traversal detected: parent directory reference");
  const t = r.split("/");
  for (const n of t)
    if (_e.has(n))
      throw new Error(`Path traversal detected: forbidden component "${n}"`);
  return r;
}
function me(e) {
  const r = /* @__PURE__ */ new Map(), t = ve(e);
  if (t < 0)
    throw new Error("Invalid ZIP file: no end of central directory found");
  const n = b(e, t + 16), a = x(e, t + 10);
  let o = n;
  for (let s = 0; s < a && b(e, o) === M; s++) {
    const l = x(e, o + 10), u = b(e, o + 20), c = b(e, o + 24), h = x(e, o + 28), f = x(e, o + 30), g = x(e, o + 32), m = b(e, o + 42);
    if (c > H)
      throw new Error(`File size exceeds maximum allowed size of ${H} bytes`);
    const k = we(e.slice(o + 46, o + 46 + h));
    if (o += 46 + h + f + g, k.endsWith("/"))
      continue;
    const y = ge(k), d = x(e, m + 28), p = m + 30 + h + d;
    if (p + u > e.length)
      throw new Error("Invalid ZIP file: data extends beyond file bounds");
    const S = e.slice(p, p + u);
    let C;
    if (l === z)
      C = S;
    else if (l === he)
      C = be(S, c);
    else
      throw new Error(`Unsupported compression method: ${String(l)}`);
    if (C.length !== c)
      throw new Error(
        `Decompression size mismatch: expected ${c}, got ${C.length}`
      );
    r.set(y, C);
  }
  return r;
}
function ye(e) {
  const r = [], t = [], n = [];
  let a = 0;
  for (const [f, g] of e) {
    n.push(a);
    const m = ke(f), k = Ce(g), y = new Uint8Array(30 + m.length + g.length);
    let d = 0;
    w(y, d, pe), d += 4, _(y, d, 20), d += 2, _(y, d, 0), d += 2, _(y, d, z), d += 2, _(y, d, 0), d += 2, _(y, d, 0), d += 2, w(y, d, k), d += 4, w(y, d, g.length), d += 4, w(y, d, g.length), d += 4, _(y, d, m.length), d += 2, _(y, d, 0), d += 2, y.set(m, d), d += m.length, y.set(g, d), r.push(y), a += y.length;
    const p = new Uint8Array(46 + m.length);
    d = 0, w(p, d, M), d += 4, _(p, d, 20), d += 2, _(p, d, 20), d += 2, _(p, d, 0), d += 2, _(p, d, z), d += 2, _(p, d, 0), d += 2, _(p, d, 0), d += 2, w(p, d, k), d += 4, w(p, d, g.length), d += 4, w(p, d, g.length), d += 4, _(p, d, m.length), d += 2, _(p, d, 0), d += 2, _(p, d, 0), d += 2, _(p, d, 0), d += 2, _(p, d, 0), d += 2, w(p, d, 0), d += 4, w(p, d, n[n.length - 1] ?? 0), d += 4, p.set(m, d), t.push(p);
  }
  const o = a;
  let s = 0;
  for (const f of t)
    s += f.length;
  const i = new Uint8Array(22);
  let l = 0;
  w(i, l, Y), l += 4, _(i, l, 0), l += 2, _(i, l, 0), l += 2, _(i, l, e.size), l += 2, _(i, l, e.size), l += 2, w(i, l, s), l += 4, w(i, l, o), l += 4, _(i, l, 0);
  let u = 0;
  for (const f of r)
    u += f.length;
  for (const f of t)
    u += f.length;
  u += i.length;
  const c = new Uint8Array(u);
  let h = 0;
  for (const f of r)
    c.set(f, h), h += f.length;
  for (const f of t)
    c.set(f, h), h += f.length;
  return c.set(i, h), c;
}
function ve(e) {
  for (let r = e.length - 22; r >= 0; r--)
    if (b(e, r) === Y)
      return r;
  return -1;
}
function x(e, r) {
  return (e[r] ?? 0) | (e[r + 1] ?? 0) << 8;
}
function b(e, r) {
  return ((e[r] ?? 0) | (e[r + 1] ?? 0) << 8 | (e[r + 2] ?? 0) << 16 | (e[r + 3] ?? 0) << 24) >>> 0;
}
function _(e, r, t) {
  e[r] = t & 255, e[r + 1] = t >> 8 & 255;
}
function w(e, r, t) {
  e[r] = t & 255, e[r + 1] = t >> 8 & 255, e[r + 2] = t >> 16 & 255, e[r + 3] = t >> 24 & 255;
}
function we(e) {
  let r = "";
  for (let t = 0; t < e.length; t++)
    r += String.fromCharCode(e[t] ?? 0);
  return r;
}
function ke(e) {
  const r = new Uint8Array(e.length);
  for (let t = 0; t < e.length; t++)
    r[t] = e.charCodeAt(t);
  return r;
}
function Ce(e) {
  let r = 4294967295;
  const t = xe();
  for (let n = 0; n < e.length; n++) {
    const a = e[n] ?? 0;
    r = (r >>> 8 ^ (t[(r ^ a) & 255] ?? 0)) >>> 0;
  }
  return (r ^ 4294967295) >>> 0;
}
let A = null;
function xe() {
  if (A) return A;
  A = new Uint32Array(256);
  for (let e = 0; e < 256; e++) {
    let r = e;
    for (let t = 0; t < 8; t++)
      r = r & 1 ? 3988292384 ^ r >>> 1 : r >>> 1;
    A[e] = r;
  }
  return A;
}
function be(e, r) {
  const t = new Uint8Array(r);
  let n = 0, a = 0;
  for (; a < e.length && n < r; ) {
    const o = (e[a] ?? 0) & 1, s = (e[a] ?? 0) >> 1 & 3;
    if (a++, s === 0) {
      const i = x(e, a);
      a += 4;
      for (let l = 0; l < i && n < r; l++)
        t[n++] = e[a++] ?? 0;
    } else if (s === 1 || s === 2)
      for (; a < e.length && n < r; )
        t[n++] = e[a++] ?? 0;
    if (o) break;
  }
  return t.slice(0, n);
}
function Te(e, r) {
  if (typeof e == "string")
    return V(e, r);
  if (Q(e))
    return Se(e, r);
  if (Ne(e))
    return Ae(e, r);
  throw new v("Unrecognized format: not PNG, JSON, or CHARX");
}
function Se(e, r) {
  const t = (r == null ? void 0 : r.strict) ?? !1, n = (r == null ? void 0 : r.parseDecorators) ?? !0;
  let a;
  try {
    a = N(e);
  } catch {
    throw new v("Invalid PNG file");
  }
  let o = null, s = null, i = !0, l = !0;
  for (const f of a)
    if (f.type === "tEXt") {
      const { keyword: g, text: m, crcValid: k } = q(f.data, f.crc);
      g === j ? (o = m, i = k) : g === I && (s = m, l = k);
    }
  let u = null, c = !0;
  if (o ? (u = o, c = i) : s && (u = s, c = l), !u)
    throw new v("No character card data found in PNG");
  if (t && !c)
    throw new v("CRC mismatch in card chunk");
  let h;
  try {
    const f = O(u);
    h = P(f);
  } catch {
    throw new v("Failed to decode base64 card data");
  }
  return V(h, { ...r, parseDecorators: n });
}
function V(e, r) {
  const t = (r == null ? void 0 : r.strict) ?? !1, n = (r == null ? void 0 : r.parseDecorators) ?? !0;
  let a;
  try {
    a = JSON.parse(e);
  } catch {
    throw new v("Invalid JSON");
  }
  if (!a || typeof a != "object")
    throw new v("JSON must be an object");
  const o = a;
  if (o.spec === re) {
    const s = a;
    return n && s.data.character_book && (s.data.character_book = E(s.data.character_book)), s;
  } else {
    if (o.spec === ne)
      return Ie(a, n);
    if ("name" in o && "description" in o)
      return Ee(a);
  }
  throw t ? new v("Unrecognized card format") : new v("Unrecognized card format");
}
function Ae(e, r) {
  let t;
  try {
    t = me(e);
  } catch {
    throw new v("Invalid CHARX/ZIP file");
  }
  const n = t.get("card.json");
  if (!n)
    throw new v("Missing card.json in CHARX file");
  const a = P(n), o = V(a, r);
  if (o.data.assets) {
    for (const s of o.data.assets)
      if (s.uri.startsWith("embeded://")) {
        const i = s.uri.slice(10), l = t.get(i);
        l && (s.uri = `data:application/octet-stream;base64,${Buffer.from(l).toString("base64")}`);
      }
  }
  return o;
}
function Je(e, r) {
  const t = (r == null ? void 0 : r.parseDecorators) ?? !0;
  if (typeof e == "string")
    return W(e, t);
  if (!Q(e))
    throw new v("Lorebook data must be PNG or JSON");
  let n;
  try {
    n = N(e);
  } catch {
    throw new v("Invalid PNG file");
  }
  let a = null, o = null;
  for (const l of n)
    if (l.type === "tEXt") {
      const { keyword: u, text: c } = q(l.data, l.crc);
      u === U ? a = c : u === I && (o = c);
    }
  const s = a ?? o;
  if (!s)
    throw new v("No lorebook data found in PNG");
  let i;
  try {
    const l = O(s);
    i = P(l);
  } catch {
    throw new v("Failed to decode base64 lorebook data");
  }
  return W(i, t);
}
function W(e, r) {
  let t;
  try {
    t = JSON.parse(e);
  } catch {
    throw new v("Invalid JSON");
  }
  if (!t || typeof t != "object")
    throw new v("JSON must be an object");
  const n = t;
  if (n.spec === "lorebook_v3" && n.data) {
    const s = t.data;
    return r ? E(s) : s;
  }
  if (Array.isArray(t)) {
    const o = {
      entries: t,
      extensions: {}
    };
    return r ? E(o) : o;
  }
  const a = t;
  return r ? E(a) : a;
}
function q(e, r) {
  let t = -1;
  for (let c = 0; c < e.length; c++)
    if (e[c] === 0) {
      t = c;
      break;
    }
  if (t === -1)
    return { keyword: "", text: "", crcValid: !1 };
  const n = e.slice(0, t);
  let a = "";
  for (let c = 0; c < n.length; c++)
    a += String.fromCharCode(n[c] ?? 0);
  const o = e.slice(t + 1);
  let s = "";
  for (let c = 0; c < o.length; c++)
    s += String.fromCharCode(o[c] ?? 0);
  const i = new Uint8Array([116, 69, 88, 116]), u = R(i, e) === r;
  return { keyword: a, text: s, crcValid: u };
}
function Ee(e, r) {
  return {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      // V1 fields
      name: e.name,
      description: e.description,
      personality: e.personality,
      scenario: e.scenario,
      first_mes: e.first_mes,
      mes_example: e.mes_example,
      // V2 defaults
      creator_notes: "",
      system_prompt: "",
      post_history_instructions: "",
      alternate_greetings: [],
      tags: [],
      creator: "",
      character_version: "",
      extensions: {},
      // V3 defaults
      group_only_greetings: []
    }
  };
}
function Ie(e, r) {
  const t = {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      // V1/V2 fields
      name: e.data.name,
      description: e.data.description,
      personality: e.data.personality,
      scenario: e.data.scenario,
      first_mes: e.data.first_mes,
      mes_example: e.data.mes_example,
      // V2 fields
      creator_notes: e.data.creator_notes,
      system_prompt: e.data.system_prompt,
      post_history_instructions: e.data.post_history_instructions,
      alternate_greetings: e.data.alternate_greetings,
      tags: e.data.tags,
      creator: e.data.creator,
      character_version: e.data.character_version,
      extensions: e.data.extensions,
      // V3 defaults
      group_only_greetings: [],
      ...e.data.character_book !== void 0 && { character_book: e.data.character_book }
    }
  };
  return r && t.data.character_book && (t.data.character_book = E(t.data.character_book)), t;
}
function E(e) {
  return {
    ...e,
    entries: e.entries.map((r) => {
      const { decorators: t, content: n } = le(r.content);
      return {
        ...r,
        content: n,
        decorators: t
      };
    })
  };
}
function Q(e) {
  return e.length < 8 ? !1 : e[0] === 137 && e[1] === 80 && e[2] === 78 && e[3] === 71 && e[4] === 13 && e[5] === 10 && e[6] === 26 && e[7] === 10;
}
function Ne(e) {
  return e.length < 4 ? !1 : e[0] === 80 && e[1] === 75 && e[2] === 3 && e[3] === 4 || e[0] === 80 && e[1] === 75 && e[2] === 5 && e[3] === 6;
}
function ze(e, r, t) {
  const n = (t == null ? void 0 : t.includeV2Chunk) ?? !0, a = (t == null ? void 0 : t.serializeDecorators) ?? !0, s = N(r).filter(
    (m) => !(m.type === "tEXt" && ($(m.data) === j || $(m.data) === I))
  ), i = a ? Oe(e) : e, l = JSON.stringify(i), u = D(l), c = J(u), h = T(j, c), f = s.findIndex((m) => m.type === "IEND"), g = [...s];
  if (f >= 0 ? g.splice(f, 0, h) : g.push(h), n) {
    const m = De(i), k = JSON.stringify(m), y = D(k), d = J(y), p = T(I, d), S = g.findIndex((C) => C.type === "IEND");
    S >= 0 ? g.splice(S, 0, p) : g.push(p);
  }
  return F(g);
}
function Be(e) {
  return JSON.stringify(e, null, 2);
}
function Le(e, r) {
  const t = /* @__PURE__ */ new Map(), n = JSON.parse(JSON.stringify(e));
  if (r != null && r.assets) {
    n.data.assets = [];
    for (const o of r.assets) {
      const s = `assets/${o.type}/${o.name}.${o.ext}`;
      t.set(s, o.data), n.data.assets.push({
        type: o.type,
        name: o.name,
        uri: `embeded://${s}`,
        ext: o.ext
      });
    }
  }
  const a = JSON.stringify(n, null, 2);
  return t.set("card.json", D(a)), ye(t);
}
function Re(e, r) {
  const n = N(r).filter(
    (f) => !(f.type === "tEXt" && ($(f.data) === U || $(f.data) === I))
  ), o = {
    spec: "lorebook_v3",
    data: ee(e)
  }, s = JSON.stringify(o), i = D(s), l = J(i), u = T(U, l), c = n.findIndex((f) => f.type === "IEND"), h = [...n];
  return c >= 0 ? h.splice(c, 0, u) : h.push(u), F(h);
}
function Fe(e) {
  return JSON.stringify(
    {
      spec: "lorebook_v3",
      data: e
    },
    null,
    2
  );
}
function $(e) {
  let r = "";
  for (let t = 0; t < e.length && e[t] !== 0; t++)
    r += String.fromCharCode(e[t] ?? 0);
  return r;
}
function Oe(e) {
  return e.data.character_book ? {
    ...e,
    data: {
      ...e.data,
      character_book: ee(e.data.character_book)
    }
  } : e;
}
function ee(e) {
  return {
    ...e,
    entries: e.entries.map((r) => {
      if (!r.decorators || r.decorators.length === 0)
        return r;
      const t = de(r.decorators, r.content), { decorators: n, ...a } = r;
      return {
        ...a,
        content: t
      };
    })
  };
}
function De(e) {
  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: e.data.name,
      description: e.data.description,
      personality: e.data.personality,
      scenario: e.data.scenario,
      first_mes: e.data.first_mes,
      mes_example: e.data.mes_example,
      creator_notes: e.data.creator_notes,
      system_prompt: e.data.system_prompt,
      post_history_instructions: e.data.post_history_instructions,
      alternate_greetings: e.data.alternate_greetings,
      tags: e.data.tags,
      creator: e.data.creator,
      character_version: e.data.character_version,
      extensions: {
        ...e.data.extensions,
        // Store V3 fields in extensions for preservation
        ...e.data.nickname ? { v3_nickname: e.data.nickname } : {},
        ...e.data.group_only_greetings.length > 0 ? { v3_group_only_greetings: e.data.group_only_greetings } : {},
        ...e.data.assets && e.data.assets.length > 0 ? { v3_assets: e.data.assets } : {}
      },
      ...e.data.character_book !== void 0 && { character_book: e.data.character_book }
    }
  };
}
function Ve(e) {
  const r = [], t = [];
  let n = {}, a = [], o = e;
  try {
    a = N(e);
  } catch {
    r.push("Failed to parse PNG structure");
    const c = Pe(e);
    c.data && (n = c.data, t.push(...c.recovered), r.push(...c.warnings));
  }
  let s = null, i = null;
  for (const c of a)
    if (c.type === "tEXt") {
      const { keyword: h, text: f, crcValid: g } = te(c.data, c.crc);
      g || r.push(`Invalid CRC in ${h} chunk`), h === "ccv3" ? s = f : h === "chara" && (i = f);
    }
  const l = s ?? i;
  if (l) {
    const c = B(l);
    c.data && (n = Z(n, c.data), t.push(...c.recovered)), r.push(...c.warnings);
  }
  if (s && i) {
    const c = B(i);
    c.data && (n = Z(n, c.data), c.recovered.length > 0 && r.push("Merged data from multiple chunks"));
  }
  const u = {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: n.name ?? "",
      description: n.description ?? "",
      personality: n.personality ?? "",
      scenario: n.scenario ?? "",
      first_mes: n.first_mes ?? "",
      mes_example: n.mes_example ?? "",
      creator_notes: n.creator_notes ?? "",
      system_prompt: n.system_prompt ?? "",
      post_history_instructions: n.post_history_instructions ?? "",
      alternate_greetings: n.alternate_greetings ?? [],
      tags: n.tags ?? [],
      creator: n.creator ?? "",
      character_version: n.character_version ?? "",
      extensions: n.extensions ?? {},
      group_only_greetings: n.group_only_greetings ?? [],
      ...n.character_book !== void 0 && { character_book: n.character_book }
    }
  };
  return n.name && t.push("name"), n.description && t.push("description"), n.personality && t.push("personality"), n.scenario && t.push("scenario"), n.first_mes && t.push("first_mes"), n.character_book && t.push("character_book"), o = je(a), {
    card: u,
    image: o,
    warnings: [...new Set(r)],
    recovered: [...new Set(t)]
  };
}
function te(e, r) {
  let t = -1;
  for (let c = 0; c < e.length; c++)
    if (e[c] === 0) {
      t = c;
      break;
    }
  if (t === -1)
    return { keyword: "", text: "", crcValid: !1 };
  const n = e.slice(0, t);
  let a = "";
  for (let c = 0; c < n.length; c++)
    a += String.fromCharCode(n[c] ?? 0);
  const o = e.slice(t + 1);
  let s = "";
  for (let c = 0; c < o.length; c++)
    s += String.fromCharCode(o[c] ?? 0);
  const i = new Uint8Array([116, 69, 88, 116]), u = R(i, e) === r;
  return { keyword: a, text: s, crcValid: u };
}
function B(e) {
  const r = [];
  let t;
  try {
    t = O(e);
  } catch {
    const s = e.replace(/[^A-Za-z0-9+/=]/g, ""), i = s + "=".repeat((4 - s.length % 4) % 4);
    try {
      t = O(i), r.push("Truncated base64 recovered");
    } catch {
      return { data: null, warnings: ["Failed to decode base64"], recovered: [] };
    }
  }
  let n;
  try {
    n = P(t);
  } catch {
    n = "";
    for (let s = 0; s < t.length; s++) {
      const i = t[s] ?? 0;
      i < 128 ? n += String.fromCharCode(i) : n += "?";
    }
    r.push("Malformed UTF-8 recovered");
  }
  let a;
  try {
    a = JSON.parse(n);
  } catch {
    const s = $e(n);
    return s ? (r.push("Partial JSON recovered"), { data: s, warnings: r, recovered: Object.keys(s) }) : { data: null, warnings: [...r, "Failed to parse JSON"], recovered: [] };
  }
  if (!a || typeof a != "object")
    return { data: null, warnings: [...r, "Invalid JSON structure"], recovered: [] };
  const o = a;
  return o.spec === "chara_card_v3" && o.data ? { data: o.data, warnings: r, recovered: ["full_card"] } : o.spec === "chara_card_v2" && o.data ? { data: o.data, warnings: r, recovered: ["full_card"] } : "name" in o ? { data: o, warnings: r, recovered: ["v1_card"] } : { data: null, warnings: [...r, "Unknown card format"], recovered: [] };
}
function $e(e) {
  const r = {}, t = e.match(/"name"\s*:\s*"([^"]*)"/);
  t != null && t[1] && (r.name = t[1]);
  const n = e.match(/"description"\s*:\s*"([^"]*)"/);
  n != null && n[1] && (r.description = n[1]);
  const a = e.match(/"personality"\s*:\s*"([^"]*)"/);
  a != null && a[1] && (r.personality = a[1]);
  const o = e.match(/"first_mes"\s*:\s*"([^"]*)"/);
  return o != null && o[1] && (r.first_mes = o[1]), Object.keys(r).length > 0 ? r : null;
}
function Pe(e) {
  const r = Array.from(e).map((a) => String.fromCharCode(a)).join(""), t = /[A-Za-z0-9+/]{50,}={0,2}/g, n = r.match(t);
  if (n)
    for (const a of n) {
      const o = B(a);
      if (o.data)
        return {
          data: o.data,
          warnings: ["Extracted card data from raw bytes", ...o.warnings],
          recovered: o.recovered
        };
    }
  return { data: null, warnings: ["Could not extract card data"], recovered: [] };
}
const X = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function Z(e, r) {
  const t = {};
  for (const n of Object.keys(e))
    X.has(n) || Object.hasOwn(e, n) && (t[n] = e[n]);
  for (const n of Object.keys(r))
    X.has(n) || Object.hasOwn(r, n) && (t[n] = r[n]);
  return r.name !== void 0 ? t.name = r.name : e.name !== void 0 && (t.name = e.name), r.description !== void 0 ? t.description = r.description : e.description !== void 0 && (t.description = e.description), r.personality !== void 0 ? t.personality = r.personality : e.personality !== void 0 && (t.personality = e.personality), r.scenario !== void 0 ? t.scenario = r.scenario : e.scenario !== void 0 && (t.scenario = e.scenario), r.first_mes !== void 0 ? t.first_mes = r.first_mes : e.first_mes !== void 0 && (t.first_mes = e.first_mes), r.mes_example !== void 0 ? t.mes_example = r.mes_example : e.mes_example !== void 0 && (t.mes_example = e.mes_example), t;
}
function je(e) {
  const r = e.filter((t) => {
    if (t.type !== "tEXt") return !0;
    const { keyword: n } = te(t.data, t.crc);
    return n !== "ccv3" && n !== "chara" && n !== "naidata";
  });
  return r.length === 0 ? new Uint8Array([...L]) : F(r);
}
function Ge(e, r) {
  const t = [], n = (r == null ? void 0 : r.strict) ?? !1;
  if (!e || typeof e != "object")
    return { valid: !1, errors: ["Card must be an object"] };
  const a = e;
  if (a.spec !== "chara_card_v3" && t.push('Invalid spec: expected "chara_card_v3"'), !a.data || typeof a.data != "object")
    return { valid: !1, errors: [...t, "Missing or invalid data object"] };
  const o = a.data, s = [
    "name",
    "description",
    "personality",
    "scenario",
    "first_mes",
    "mes_example"
  ];
  for (const l of s) {
    const u = o[l];
    typeof u != "string" ? t.push(`data.${l}: expected string, got ${typeof u}`) : n && l === "name" && u.trim() === "" && t.push("data.name: required string is empty");
  }
  const i = [
    "creator_notes",
    "system_prompt",
    "post_history_instructions",
    "creator",
    "character_version"
  ];
  for (const l of i)
    o[l] !== void 0 && typeof o[l] != "string" && t.push(`data.${l}: expected string, got ${typeof o[l]}`);
  if (o.alternate_greetings !== void 0 && !Array.isArray(o.alternate_greetings) && t.push("data.alternate_greetings: expected array"), o.tags !== void 0 && !Array.isArray(o.tags) && t.push("data.tags: expected array"), o.group_only_greetings !== void 0 && !Array.isArray(o.group_only_greetings) && t.push("data.group_only_greetings: expected array"), o.extensions !== void 0 && typeof o.extensions != "object" && t.push("data.extensions: expected object"), n) {
    if (o.extensions && typeof o.extensions == "object") {
      const l = /* @__PURE__ */ new Set(["depth", "talkativeness", "fav"]), u = o.extensions;
      for (const c of Object.keys(u))
        !l.has(c) && !c.startsWith("v3_") && t.push(`data.extensions.${c}: unknown extension key`);
    }
    if (o.assets && Array.isArray(o.assets))
      for (let l = 0; l < o.assets.length; l++) {
        const u = o.assets[l];
        if (!u || typeof u != "object") continue;
        const c = u;
        if (c.uri && typeof c.uri == "string") {
          const h = c.uri;
          !h.startsWith("http://") && !h.startsWith("https://") && !h.startsWith("data:") && !h.startsWith("embeded://") && !h.startsWith("ccdefault:") && t.push(`data.assets[${String(l)}].uri: invalid URI format`);
        }
      }
    if (o.character_book && typeof o.character_book == "object") {
      const l = o.character_book;
      if (Array.isArray(l.entries))
        for (let u = 0; u < l.entries.length; u++) {
          const c = l.entries[u];
          if (c && c.decorators && Array.isArray(c.decorators))
            for (const h of c.decorators)
              typeof h != "object" && t.push(`data.character_book.entries[${String(u)}].decorators: invalid decorator`);
        }
    }
  }
  return t.length === 0 ? { valid: !0 } : { valid: !1, errors: t };
}
function He(e, r) {
  const t = [];
  if (!e || typeof e != "object")
    return { valid: !1, errors: ["Lorebook must be an object"] };
  const n = e;
  if (!Array.isArray(n.entries))
    return { valid: !1, errors: ["Lorebook must have entries array"] };
  for (let a = 0; a < n.entries.length; a++) {
    const o = n.entries[a];
    if (!o || typeof o != "object") {
      t.push(`entries[${String(a)}]: must be an object`);
      continue;
    }
    const s = o;
    Array.isArray(s.keys) || t.push(`entries[${String(a)}].keys: expected array`), typeof s.content != "string" && t.push(`entries[${String(a)}].content: expected string, got ${typeof s.content}`), typeof s.enabled != "boolean" && t.push(`entries[${String(a)}].enabled: expected boolean, got ${typeof s.enabled}`), typeof s.insertion_order != "number" && t.push(
      `entries[${String(a)}].insertion_order: expected number, got ${typeof s.insertion_order}`
    ), typeof s.use_regex != "boolean" && t.push(`entries[${String(a)}].use_regex: expected boolean, got ${typeof s.use_regex}`);
  }
  return n.name !== void 0 && typeof n.name != "string" && t.push("name: expected string"), n.description !== void 0 && typeof n.description != "string" && t.push("description: expected string"), n.scan_depth !== void 0 && typeof n.scan_depth != "number" && t.push("scan_depth: expected number"), n.token_budget !== void 0 && typeof n.token_budget != "number" && t.push("token_budget: expected number"), n.recursive_scanning !== void 0 && typeof n.recursive_scanning != "boolean" && t.push("recursive_scanning: expected boolean"), n.extensions !== void 0 && typeof n.extensions != "object" && t.push("extensions: expected object"), t.length === 0 ? { valid: !0 } : { valid: !1, errors: t };
}
export {
  K as CardsError,
  v as ParseError,
  Ue as ValidationError,
  R as computeCRC32,
  O as decodeBase64,
  J as encodeBase64,
  le as parseDecorators,
  Te as readCard,
  Ae as readCardFromCharx,
  V as readCardFromJson,
  Se as readCardFromPng,
  Je as readLorebook,
  Ve as repairCard,
  de as serializeDecorators,
  Ge as validateCard,
  He as validateLorebook,
  Le as writeCardToCharx,
  Be as writeCardToJson,
  ze as writeCardToPng,
  Fe as writeLorebookToJson,
  Re as writeLorebookToPng
};
