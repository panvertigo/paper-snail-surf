// Course library. Built-in levels 1 to 5 are part of the game (index.html, read only). Everything people make is stored separately:
//   My courses : this browser's localStorage (key surf_courses), many named courses, each with an id.
//   Files      : a course is plain JSON ({ name, scenery, music, pieces, ... }); export it from the editor, import it back, or drop it into the levels/ folder.
//   Links      : a course can be packed into a link (#share-...) that anyone can open and play.
//   Shared     : levels/index.json lists the courses shipped as files in the levels/ folder.
// See docs/courses.md.
(function () {
  const KEY = 'surf_courses';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const write = m => { localStorage.setItem(KEY, JSON.stringify(m)); };
  const clone = o => JSON.parse(JSON.stringify(o));
  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = t => decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/'))));
  const Courses = globalThis.Courses = {
    uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); },
    valid(s) { return !!s && Array.isArray(s.pieces) && s.pieces.length > 0; },
    list() { const m = read(); return Object.keys(m).map(id => ({ id, name: m[id].stage.name || 'Untitled', updated: m[id].updated || 0, pieces: (m[id].stage.pieces || []).length })).sort((a, b) => b.updated - a.updated); },
    get(id) { const m = read(); return m[id] ? clone(m[id].stage) : null; },
    has(id) { return !!read()[id]; },
    json(id) { const m = read(); return m[id] ? JSON.stringify(m[id].stage) : null; },
    save(stage) { if (!stage.id) stage.id = Courses.uid(); const m = read(); m[stage.id] = { updated: Date.now(), stage: clone(stage) }; write(m); return stage.id; },
    remove(id) { const m = read(); delete m[id]; write(m); },
    encode(stage) { const s = clone(stage); delete s.id; return b64(JSON.stringify(s)); },
    decode(t) { const s = JSON.parse(unb64(t)); if (!Courses.valid(s)) throw new Error('not a course'); return s; },
    readFileSync(name) { const x = new XMLHttpRequest(); x.open('GET', 'levels/' + encodeURIComponent(name) + '.json?v=' + Date.now(), false); x.send(); if (x.status !== 200 && x.status !== 0) throw new Error('missing course file ' + name); const s = JSON.parse(x.responseText); if (!Courses.valid(s)) throw new Error('bad course file ' + name); return s; },
    // The shipped courses: levels/index.json, plus any other .json file the server lists in the levels/ folder (a local server such as python -m http.server shows new files at once;
    // a static host cannot list folders, so run tools/build-levels-index.js, which also runs on every commit here, to refresh index.json).
    index() {
      return fetch('levels/index.json').then(r => r.ok ? r.json() : []).catch(() => []).then(async list => {
        try {
          const r = await fetch('levels/'); if (!r.ok) return list; const html = await r.text(), have = new Set(list.map(c => c.file));
          const names = [...html.matchAll(/href="([^"?#]+)\.json"/g)].map(m => decodeURIComponent(m[1].split('/').pop())).filter(n => n !== 'index' && !have.has(n));
          for (const n of [...new Set(names)]) { try { const s = await (await fetch('levels/' + encodeURIComponent(n) + '.json')).json(); if (Courses.valid(s)) list.push({ file: n, name: s.name || n, author: s.author || '' }); } catch (e) {} }
        } catch (e) {}
        return list;
      });
    },
    songs() { return fetch('music/index.json').then(r => r.ok ? r.json() : []).catch(() => []); },
  };
})();
