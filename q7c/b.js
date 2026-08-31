(function (w) {
  "use strict";
  var api = {};

  function lex(topic) {
    var L = w._n || {};
    return L[topic] || L.markets || {};
  }
  function seedn() { return api.seedn.apply(null, arguments); }
  function pickN(a, n, rng) { return api.pickN(a, n, rng); }
  function TOPICS() { return api.TOPICS; }
  function topicName(k) {
    var t = (api.TOPICS || []).filter(function (x) { return x.key === k; })[0];
    return t ? t.name : k;
  }
  function weekdayOf(d) { return api.weekdayOf(d); }
  function prettyDay(d) { return api.prettyDay(d); }
  function doy(d) { return api.doy(d); }
  function stripNames(s) { return api.stripNames(s); }
  function toEnglish(s) { return api.toEnglish(s); }
  function chartSpecs(a, b, c) { return api.chartSpecs(a, b, c); }

  function normSent(x) { return String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function gramsOf(s) {
    var w = normSent(s).split(" ").filter(Boolean);
    var g = [];
    for (var n = 5; n <= 8; n++) for (var i = 0; i <= w.length - n; i++) g.push(w.slice(i, i + n).join(" "));
    return g;
  }
  function usedSet() {
    if (!uniqueLine._used) uniqueLine._used = new Set();
    return uniqueLine._used;
  }
  function taken(s) {
    var used = usedSet();
    var n = normSent(s);
    if (n.length > 20 && used.has(n)) return true;
    return gramsOf(s).some(function (g) { return used.has("g:" + g); });
  }
  function markTaken(s) {
    var used = usedSet();
    used.add(normSent(s));
    gramsOf(s).forEach(function (g) { used.add("g:" + g); });
  }
  function splitSents(t) {
    return (String(t || "").match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 12; });
  }
  function takeFresh(arr, rng) {
    var list = (arr || []).filter(Boolean);
    var order = pickN(list, list.length, rng);
    for (var i = 0; i < order.length; i++) {
      var s = order[i];
      var bits = splitSents(s);
      if (bits.length ? bits.every(function (x) { return !taken(x); }) : !taken(s)) return s;
    }
    return "";
  }
  function uniqueFallback(ctx, i, j) {
    var name = topicName(ctx.topic);
    var wd = weekdayOf(ctx.dayKey);
    var when = ctx.ed === "am" ? "open" : ctx.ed === "sun" ? "week" : "close";
    var salt = Math.abs((doy(ctx.dayKey) * 131 + i * 17 + j * 41 + (ctx.topic || "").length * 9 + (ctx.id || "").length));
    var bank = lex(ctx.topic);
    var notes = (bank.note || []).concat(bank.keep || []);
    var a = notes.length ? notes[salt % notes.length] : "Patience still clears.";
    a = String(a).replace(/\s+/g, " ").trim();
    if (!/[.!?]$/.test(a)) a += ".";
    var tail = name + " keeps that as the " + when + " note for " + wd + " and does not lend it.";
    var out = a + " " + tail;
    if (taken(out)) out = name + " on " + prettyDay(ctx.dayKey) + " files a " + ctx.ed + " line no other desk may recycle: " + a;
    return out;
  }
  function uniqueLine(raw, ctx, i) {
    var chunks = splitSents(raw);
    var parts = (chunks.length ? chunks : [String(raw)]).map(function (s, j) {
      var out = stripNames(toEnglish(String(s))).replace(/\s+/g, " ").trim();
      if (!/[.!?]$/.test(out)) out += ".";
      var k = 0;
      while (taken(out) && k < 14) {
        out = uniqueFallback(ctx, i + k, j + k);
        k++;
      }
      if (taken(out)) {
        out = topicName(ctx.topic) + " on " + prettyDay(ctx.dayKey) + " " + ctx.ed + " slot " + i + "." + j + " stays unrepeated: the constraint still clears in cash.";
      }
      if (!/[.!?]$/.test(out)) out += ".";
      markTaken(out);
      return out;
    });
    return parts.join(" ");
  }
  function resetUsed() {
    uniqueLine._used = new Set();
    uniqueHeadline._used = new Set();
  }
  function uniqueHeadline(topic, ctx, rng) {
    var used = uniqueHeadline._used || (uniqueHeadline._used = new Set());
    var heads = (lex(topic).heads || []).slice();
    var order = pickN(heads, heads.length, rng);
    for (var i = 0; i < order.length; i++) {
      var h = order[i];
      var k = normSent(h);
      if (k && !used.has(k) && !taken(h)) {
        used.add(k);
        markTaken(h);
        return h.replace(/\.$/, "");
      }
    }
    var tag = topicName(topic);
    var wd = weekdayOf(ctx.dayKey);
    var made = tag + ": " + (ctx.ed === "pm" ? "close" : ctx.ed === "sun" ? "week" : "open") + " they will not put in the presser — " + wd;
    var n = 0;
    while (used.has(normSent(made)) && n < 9) {
      made = tag + " · " + wd + " " + ctx.ed + " · " + (lex(topic).heads || ["The constraint still clears"])[n % Math.max(1, (lex(topic).heads || []).length)];
      n++;
    }
    used.add(normSent(made));
    markTaken(made);
    return made.replace(/\.$/, "");
  }
  function sweepPack(pack) {
    resetUsed();
    (pack.articles || []).forEach(function (a) {
      var ctx = { id: a.id, topic: a.topic, dayKey: a.dayKey, ed: a.ed };
      var rng = seedn("sw", a.id);
      var t = (a.title || "").trim();
      if (t && !taken(t) && !(uniqueHeadline._used || new Set()).has(normSent(t))) {
        uniqueHeadline._used = uniqueHeadline._used || new Set();
        uniqueHeadline._used.add(normSent(t));
        markTaken(t);
      } else {
        a.title = uniqueHeadline(a.topic, ctx, rng);
      }
      a.dek = uniqueLine(a.dek, ctx, 0);
      a.paras = (a.paras || []).map(function (p, i) { return uniquePara(p, ctx, i + 1); });
      a.watch = (a.watch || []).map(function (w, i) { return uniqueLine(w, ctx, 80 + i); });
      if (a.comment) a.comment = uniqueLine(a.comment, ctx, 99);
    });
    return pack;
  }
  function unstop(s) {
    return String(s || "").replace(/\s+/g, " ").trim().replace(/[.!?]+$/g, "").replace(/[,;:—–-]+$/g, "").trim();
  }
  function cap(s) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function asFollow(s) {
    s = unstop(s);
    if (!s) return "";
    if (/^[A-Z]{2,}\b/.test(s)) return s;
    if (/^(I|I'll|I'm|I've|I'd|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(s)) return s;
    return s.charAt(0).toLowerCase() + s.slice(1);
  }
  function tidyPara(s) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    s = s.replace(/\s+([,;:])/g, "$1");
    s = s.replace(/\s+([.!?])/g, "$1");
    s = s.replace(/([.!?]){2,}/g, "$1");
    s = s.replace(/\s+—\s+/g, " — ");
    s = s.replace(/([.!?])([A-Za-z])/g, "$1 $2");
    s = s.replace(/\band and\b/g, "and");
    s = s.replace(/\bso so\b/g, "so");
    s = s.replace(/\bbecause because\b/g, "because");
    if (s && !/[.!?]$/.test(s)) s += ".";
    return s;
  }
  function grabBits(arr, n, rng, ctx, slot) {
    var bits = [];
    var i;
    for (i = 0; i < n; i++) {
      var s = takeFresh(arr, rng);
      if (s) bits.push(s);
    }
    if (!bits.length) bits.push(uniqueFallback(ctx, slot, 0));
    return bits;
  }
  function toClauses(chunks) {
    var out = [];
    (chunks || []).forEach(function (ch) {
      splitSents(ch).forEach(function (s) {
        var c = unstop(s).replace(/^(and|but|so|because|then|which is why|even as|while)\s+/i, "");
        if (c && c.length > 10) out.push(c);
      });
    });
    return out;
  }
  function fuse2(a, b, rng) {
    a = unstop(a);
    b = asFollow(b);
    var mids = [", and ", " — ", ", which is why ", "; ", ". That is why ", ", even as ", ", so ", ". Meanwhile, "];
    var m = mids[Math.floor(rng() * mids.length)];
    if (m.charAt(0) === ".") return cap(a) + m + cap(b) + ".";
    return cap(a) + m + b + ".";
  }
  function fuse3(a, b, c, rng) {
    a = unstop(a);
    b = asFollow(b);
    c = asFollow(c);
    var k = Math.floor(rng() * 5);
    if (k === 0) return cap(a) + ", and " + b + ", which is why " + c + ".";
    if (k === 1) return cap(a) + " — " + b + ", so " + c + ".";
    if (k === 2) return cap(a) + "; " + b + ". " + cap(c) + ".";
    if (k === 3) return cap(a) + ", because " + b + ", and " + c + ".";
    return cap(a) + ". " + cap(b) + ", and " + c + ".";
  }
  function isPunch(s) {
    return /^(Here is|Keep this|Keep the|Watch |One more|The extra|Sit with|If you have been|If you already|If this )/i.test(s);
  }
  function stitch(clauses, rng) {
    clauses = (clauses || []).filter(Boolean);
    if (!clauses.length) return "";
    var out = [];
    var i = 0;
    while (i < clauses.length) {
      var left = clauses.length - i;
      var a = clauses[i];
      var n = 1;
      if (!isPunch(a) && left >= 3 && rng() > 0.28) n = 3;
      else if (!isPunch(a) && left >= 2 && rng() > 0.12) n = 2;
      if (n === 1) out.push(cap(unstop(a)) + ".");
      else if (n === 2) out.push(fuse2(a, clauses[i + 1], rng));
      else out.push(fuse3(a, clauses[i + 1], clauses[i + 2], rng));
      i += n;
    }
    return tidyPara(out.join(" "));
  }
  function uniquePara(raw, ctx, i) {
    var out = tidyPara(stripNames(toEnglish(String(raw || ""))));
    var used = usedSet();
    var n = normSent(out);
    var k = 0;
    while (n.length > 24 && used.has(n) && k < 6) {
      out = tidyPara(uniqueFallback(ctx, i, k) + " " + out);
      n = normSent(out);
      k++;
    }
    markTaken(out);
    splitSents(out).forEach(function (s) { if (s) markTaken(s); });
    return out;
  }
  function writeArticle(topic, dayKey, ed, idx, lead) {
    var id = dayKey + "-" + ed + "-" + topic + "-" + idx;
    var rng = seedn("art", id);
    var A = lex(topic);
    var ctx = { id: id, topic: topic, dayKey: dayKey, ed: ed };
    var head = uniqueHeadline(topic, ctx, rng);
    var dek = takeFresh(A.dek, rng) || uniqueFallback(ctx, 0, 1);
    var ms = grabBits(A.mainstream, 3, rng, ctx, 1);
    var cut = grabBits(A.cut, 2, rng, ctx, 2);
    var ins = grabBits(A.insight, 3, rng, ctx, 3);
    var more = grabBits(A.more, 1, rng, ctx, 4);
    var turn = grabBits(A.turn, 1, rng, ctx, 5);
    var heard = grabBits(A.heard, 1, rng, ctx, 6);
    var keep = grabBits(A.keep, 2, rng, ctx, 7);
    var pOpen = stitch(toClauses(ms), rng);
    var pCut = stitch(toClauses(cut.concat(ins.slice(0, 2))), rng);
    var pMore = stitch(toClauses(more.concat(turn, ins.slice(2))), rng);
    var pClose = stitch(toClauses(heard.concat(keep)), rng);
    var raw = [pOpen, pCut, pMore, pClose].filter(function (p) { return p && p.length > 40; });
    var paras = raw.map(function (p, i) { return uniquePara(p, ctx, i + 1); });
    var charts = chartSpecs(topic, dayKey, ed).slice(0, 1);
    var words = paras.join(" ").split(/\s+/).filter(Boolean).length;
    var watch = [];
    var i;
    for (i = 0; i < 3; i++) {
      var wline = takeFresh(A.watch, rng) || uniqueFallback(ctx, 8, i);
      watch.push(uniqueLine(wline, ctx, 200 + i));
    }
    return {
      id: id, topic: topic, dayKey: dayKey, ed: ed, lead: !!lead,
      title: head,
      dek: uniqueLine(dek, ctx, 0),
      paras: paras,
      watch: watch,
      comment: uniqueLine(takeFresh(A.note, rng) || uniqueFallback(ctx, 9, 9), ctx, 300),
      charts: charts,
      minutes: Math.max(3, Math.round(words / 170)),
      published: prettyDay(dayKey) + " · " + (ed === "am" ? "08:40" : ed === "sun" ? "10:10" : "17:40") + " CET"
    };
  }

  w._k = {
    b: function (deps) { api = deps || api; },
    a: writeArticle,
    u: uniqueLine,
    h: uniqueHeadline,
    s: sweepPack,
    r: resetUsed,
    t: takeFresh
  };
})(window);
