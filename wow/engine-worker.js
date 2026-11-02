/* Dorvan — страница /wow: отдельный поток для движка кадров (engine.js). Страница присылает холст (OffscreenCanvas), сжатые кадры и «куда доехать»;
   поток сам расшифровывает, догоняет и рисует. Ответы — готов, слишком медленно, сбой, состояние. */
importScripts('engine.js');
let eng = null;
onmessage = (e) => {
  const m = e.data;
  if (m.op === 'init') eng = new WowEngine(m.canvas, { ready: () => postMessage({ op: 'ready' }), slow: () => postMessage({ op: 'slow' }), failed: () => postMessage({ op: 'failed' }), state: (s) => postMessage({ op: 'state', s }) });
  else if (m.op === 'reset') eng.reset(m.set);
  else if (m.op === 'put') eng.put(m.j, m.buf);
  else if (m.op === 'to') eng.to(m.pos);
  else if (m.op === 'size') eng.size(m.w, m.h, m.band);
  else if (m.op === 'sig') eng.sig().then((r) => postMessage({ op: 'ret', id: m.id, r }));
  else if (m.op === 'diag') postMessage({ op: 'ret', id: m.id, r: eng.diag(m.on) });
};
