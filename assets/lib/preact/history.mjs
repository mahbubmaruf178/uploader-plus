/* esm.sh - history@5.3.0 */
function O() {
  return (
    (O = Object.assign
      ? Object.assign.bind()
      : function (t) {
          for (var f = 1; f < arguments.length; f++) {
            var l = arguments[f];
            for (var i in l) ({}).hasOwnProperty.call(l, i) && (t[i] = l[i]);
          }
          return t;
        }),
    O.apply(null, arguments)
  );
}
var m;
(function (t) {
  (t.Pop = "POP"), (t.Push = "PUSH"), (t.Replace = "REPLACE");
})(m || (m = {}));
var R = function (t) {
  return t;
};
var J = "beforeunload",
  q = "hashchange",
  Y = "popstate";
function U(t) {
  t === void 0 && (t = {});
  var f = t,
    l = f.window,
    i = l === void 0 ? document.defaultView : l,
    h = i.history;
  function p() {
    var r = i.location,
      n = r.pathname,
      e = r.search,
      c = r.hash,
      s = h.state || {};
    return [
      s.idx,
      R({
        pathname: n,
        search: e,
        hash: c,
        state: s.usr || null,
        key: s.key || "default",
      }),
    ];
  }
  var u = null;
  function L() {
    if (u) d.call(u), (u = null);
    else {
      var r = m.Pop,
        n = p(),
        e = n[0],
        c = n[1];
      if (d.length) {
        if (e != null) {
          var s = v - e;
          s &&
            ((u = {
              action: r,
              location: c,
              retry: function () {
                y(s * -1);
              },
            }),
            y(s));
        }
      } else V(r);
    }
  }
  i.addEventListener(Y, L);
  var x = m.Pop,
    _ = p(),
    v = _[0],
    k = _[1],
    A = $(),
    d = $();
  v == null && ((v = 0), h.replaceState(O({}, h.state, { idx: v }), ""));
  function S(r) {
    return typeof r == "string" ? r : D(r);
  }
  function H(r, n) {
    return (
      n === void 0 && (n = null),
      R(
        O(
          { pathname: k.pathname, hash: "", search: "" },
          typeof r == "string" ? j(r) : r,
          { state: n, key: B() }
        )
      )
    );
  }
  function T(r, n) {
    return [{ usr: r.state, key: r.key, idx: n }, S(r)];
  }
  function E(r, n, e) {
    return !d.length || (d.call({ action: r, location: n, retry: e }), !1);
  }
  function V(r) {
    x = r;
    var n = p();
    (v = n[0]), (k = n[1]), A.call({ action: x, location: k });
  }
  function a(r, n) {
    var e = m.Push,
      c = H(r, n);
    function s() {
      a(r, n);
    }
    if (E(e, c, s)) {
      var b = T(c, v + 1),
        w = b[0],
        P = b[1];
      try {
        h.pushState(w, "", P);
      } catch {
        i.location.assign(P);
      }
      V(e);
    }
  }
  function o(r, n) {
    var e = m.Replace,
      c = H(r, n);
    function s() {
      o(r, n);
    }
    if (E(e, c, s)) {
      var b = T(c, v),
        w = b[0],
        P = b[1];
      h.replaceState(w, "", P), V(e);
    }
  }
  function y(r) {
    h.go(r);
  }
  var g = {
    get action() {
      return x;
    },
    get location() {
      return k;
    },
    createHref: S,
    push: a,
    replace: o,
    go: y,
    back: function () {
      y(-1);
    },
    forward: function () {
      y(1);
    },
    listen: function (n) {
      return A.push(n);
    },
    block: function (n) {
      var e = d.push(n);
      return (
        d.length === 1 && i.addEventListener(J, M),
        function () {
          e(), d.length || i.removeEventListener(J, M);
        }
      );
    },
  };
  return g;
}
function F(t) {
  t === void 0 && (t = {});
  var f = t,
    l = f.window,
    i = l === void 0 ? document.defaultView : l,
    h = i.history;
  function p() {
    var n = j(i.location.hash.substr(1)),
      e = n.pathname,
      c = e === void 0 ? "/" : e,
      s = n.search,
      b = s === void 0 ? "" : s,
      w = n.hash,
      P = w === void 0 ? "" : w,
      N = h.state || {};
    return [
      N.idx,
      R({
        pathname: c,
        search: b,
        hash: P,
        state: N.usr || null,
        key: N.key || "default",
      }),
    ];
  }
  var u = null;
  function L() {
    if (u) d.call(u), (u = null);
    else {
      var n = m.Pop,
        e = p(),
        c = e[0],
        s = e[1];
      if (d.length) {
        if (c != null) {
          var b = v - c;
          b &&
            ((u = {
              action: n,
              location: s,
              retry: function () {
                g(b * -1);
              },
            }),
            g(b));
        }
      } else a(n);
    }
  }
  i.addEventListener(Y, L),
    i.addEventListener(q, function () {
      var n = p(),
        e = n[1];
      D(e) !== D(k) && L();
    });
  var x = m.Pop,
    _ = p(),
    v = _[0],
    k = _[1],
    A = $(),
    d = $();
  v == null && ((v = 0), h.replaceState(O({}, h.state, { idx: v }), ""));
  function S() {
    var n = document.querySelector("base"),
      e = "";
    if (n && n.getAttribute("href")) {
      var c = i.location.href,
        s = c.indexOf("#");
      e = s === -1 ? c : c.slice(0, s);
    }
    return e;
  }
  function H(n) {
    return S() + "#" + (typeof n == "string" ? n : D(n));
  }
  function T(n, e) {
    return (
      e === void 0 && (e = null),
      R(
        O(
          { pathname: k.pathname, hash: "", search: "" },
          typeof n == "string" ? j(n) : n,
          { state: e, key: B() }
        )
      )
    );
  }
  function E(n, e) {
    return [{ usr: n.state, key: n.key, idx: e }, H(n)];
  }
  function V(n, e, c) {
    return !d.length || (d.call({ action: n, location: e, retry: c }), !1);
  }
  function a(n) {
    x = n;
    var e = p();
    (v = e[0]), (k = e[1]), A.call({ action: x, location: k });
  }
  function o(n, e) {
    var c = m.Push,
      s = T(n, e);
    function b() {
      o(n, e);
    }
    if (V(c, s, b)) {
      var w = E(s, v + 1),
        P = w[0],
        N = w[1];
      try {
        h.pushState(P, "", N);
      } catch {
        i.location.assign(N);
      }
      a(c);
    }
  }
  function y(n, e) {
    var c = m.Replace,
      s = T(n, e);
    function b() {
      y(n, e);
    }
    if (V(c, s, b)) {
      var w = E(s, v),
        P = w[0],
        N = w[1];
      h.replaceState(P, "", N), a(c);
    }
  }
  function g(n) {
    h.go(n);
  }
  var r = {
    get action() {
      return x;
    },
    get location() {
      return k;
    },
    createHref: H,
    push: o,
    replace: y,
    go: g,
    back: function () {
      g(-1);
    },
    forward: function () {
      g(1);
    },
    listen: function (e) {
      return A.push(e);
    },
    block: function (e) {
      var c = d.push(e);
      return (
        d.length === 1 && i.addEventListener(J, M),
        function () {
          c(), d.length || i.removeEventListener(J, M);
        }
      );
    },
  };
  return r;
}
function G(t) {
  t === void 0 && (t = {});
  var f = t,
    l = f.initialEntries,
    i = l === void 0 ? ["/"] : l,
    h = f.initialIndex,
    p = i.map(function (a) {
      var o = R(
        O(
          { pathname: "/", search: "", hash: "", state: null, key: B() },
          typeof a == "string" ? j(a) : a
        )
      );
      return o;
    }),
    u = C(h ?? p.length - 1, 0, p.length - 1),
    L = m.Pop,
    x = p[u],
    _ = $(),
    v = $();
  function k(a) {
    return typeof a == "string" ? a : D(a);
  }
  function A(a, o) {
    return (
      o === void 0 && (o = null),
      R(
        O(
          { pathname: x.pathname, search: "", hash: "" },
          typeof a == "string" ? j(a) : a,
          { state: o, key: B() }
        )
      )
    );
  }
  function d(a, o, y) {
    return !v.length || (v.call({ action: a, location: o, retry: y }), !1);
  }
  function S(a, o) {
    (L = a), (x = o), _.call({ action: L, location: x });
  }
  function H(a, o) {
    var y = m.Push,
      g = A(a, o);
    function r() {
      H(a, o);
    }
    d(y, g, r) && ((u += 1), p.splice(u, p.length, g), S(y, g));
  }
  function T(a, o) {
    var y = m.Replace,
      g = A(a, o);
    function r() {
      T(a, o);
    }
    d(y, g, r) && ((p[u] = g), S(y, g));
  }
  function E(a) {
    var o = C(u + a, 0, p.length - 1),
      y = m.Pop,
      g = p[o];
    function r() {
      E(a);
    }
    d(y, g, r) && ((u = o), S(y, g));
  }
  var V = {
    get index() {
      return u;
    },
    get action() {
      return L;
    },
    get location() {
      return x;
    },
    createHref: k,
    push: H,
    replace: T,
    go: E,
    back: function () {
      E(-1);
    },
    forward: function () {
      E(1);
    },
    listen: function (o) {
      return _.push(o);
    },
    block: function (o) {
      return v.push(o);
    },
  };
  return V;
}
function C(t, f, l) {
  return Math.min(Math.max(t, f), l);
}
function M(t) {
  t.preventDefault(), (t.returnValue = "");
}
function $() {
  var t = [];
  return {
    get length() {
      return t.length;
    },
    push: function (l) {
      return (
        t.push(l),
        function () {
          t = t.filter(function (i) {
            return i !== l;
          });
        }
      );
    },
    call: function (l) {
      t.forEach(function (i) {
        return i && i(l);
      });
    },
  };
}
function B() {
  return Math.random().toString(36).substr(2, 8);
}
function D(t) {
  var f = t.pathname,
    l = f === void 0 ? "/" : f,
    i = t.search,
    h = i === void 0 ? "" : i,
    p = t.hash,
    u = p === void 0 ? "" : p;
  return (
    h && h !== "?" && (l += h.charAt(0) === "?" ? h : "?" + h),
    u && u !== "#" && (l += u.charAt(0) === "#" ? u : "#" + u),
    l
  );
}
function j(t) {
  var f = {};
  if (t) {
    var l = t.indexOf("#");
    l >= 0 && ((f.hash = t.substr(l)), (t = t.substr(0, l)));
    var i = t.indexOf("?");
    i >= 0 && ((f.search = t.substr(i)), (t = t.substr(0, i))),
      t && (f.pathname = t);
  }
  return f;
}
export {
  m as Action,
  U as createBrowserHistory,
  F as createHashHistory,
  G as createMemoryHistory,
  D as createPath,
  j as parsePath,
};
//# sourceMappingURL=history.mjs.map
