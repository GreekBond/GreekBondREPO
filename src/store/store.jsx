// store.jsx: lightweight runtime store for the warm-intro / mentorship loop. Exports to window.
// Holds intro requests, dynamically-created message threads, and recipient alerts, with subscribe.
import React from 'react';
const { useState: useStateStore, useEffect: useEffectStore } = React;
const { P } = window;

const GB_STORE = {
  introRequests: [],   // {id, fromId|'__recruiter', fromRole, toId, ask, note, status, brokered, time, threadId, decisionNote}
  extraThreads: [],    // dynamically created threads (same shape as GB.THREADS)
  extraAlerts: [],     // dynamically created member alerts (same shape as GB.ALERTS)
  extraGovAlerts: [],  // dynamically created admin governance alerts
  vouches: {},         // subjectId -> [ {from, text, time} ]  (runtime-added vouches; merged ahead of GB.VOUCHES)
  timelines: {},       // chapterId -> [ milestone ]  (lazily seeded from GB.TIMELINES, then admin-editable)
  _seq: 1,
  _listeners: new Set(),
};
function gbEmit() { GB_STORE._listeners.forEach(l => l()); }

/* hook: re-render on any store change */
function useGBStore() {
  const [, force] = useStateStore(0);
  useEffectStore(() => {
    const l = () => force(n => n + 1);
    GB_STORE._listeners.add(l);
    return () => GB_STORE._listeners.delete(l);
  }, []);
  return GB_STORE;
}

/* ─── actions ─── */
function requestIntro({ fromId, fromRole, toId, ask, note, brokered }) {
  const id = 'ir' + (GB_STORE._seq++);
  const req = { id, fromId, fromRole, toId, ask: ask || 'an introduction', note: note || '', status: 'pending', brokered: !!brokered, time: 'just now', threadId: null };
  GB_STORE.introRequests.unshift(req);

  if (brokered) {
    // recruiter path → admin governance queue
    GB_STORE.extraGovAlerts.unshift({
      id: 'ga-' + id, type: 'access', audience: 'admin', who: '__recruiter', time: 'just now', unread: true, introId: id,
      text: `requests an intro to ${P(toId) ? P(toId).name : 'a member'}`,
      sub: `${window.GB.RECRUITER.company} · ${ask || 'recruiting'}, approve to relay`,
    });
  } else {
    // member path → recipient's alerts
    GB_STORE.extraAlerts.unshift({
      id: 'al-' + id, type: 'intro', audience: 'member', who: fromId, time: 'just now', unread: true, introId: id, toId,
      text: ask && /mentor/i.test(ask) ? 'asked you to be a mentor' : 'asked you for a warm intro',
      sub: note ? `“${note.slice(0, 64)}${note.length > 64 ? '…' : ''}”` : (ask || 'Warm intro request'),
    });
  }
  gbEmit();
  return id;
}

function resolveIntro(id, status, decisionNote) {
  const req = GB_STORE.introRequests.find(r => r.id === id);
  if (!req) return null;
  req.status = status; req.decisionNote = decisionNote || '';
  // mark the originating alert resolved
  [...GB_STORE.extraAlerts, ...GB_STORE.extraGovAlerts].forEach(a => { if (a.introId === id) a.unread = false; });

  let threadId = null;
  if (status === 'approved') {
    threadId = 'th-' + id;
    req.threadId = threadId;
    const recruiter = req.brokered;
    const opener = recruiter
      ? { from: 'them', text: `Hi ${P(req.toId) ? P(req.toId).name.split(' ')[0] : 'there'}, thanks for letting your chapter connect us. Would love to tell you about the role.`, time: 'now', broker: true }
      : { from: 'them', text: req.note ? `Got your note, happy to help. ${req.decisionNote || ''}`.trim() : `Glad to connect. ${req.decisionNote || 'Let’s talk.'}`.trim(), time: 'now' };
    GB_STORE.extraThreads.unshift({
      id: threadId, kind: recruiter ? 'recruiter' : 'member',
      withId: recruiter ? '__recruiter' : req.fromId, unread: 0, time: 'now',
      fromIntro: true, brokeredVia: recruiter ? 'tds' : null,
      preview: opener.text, msgs: [opener],
    });
  }
  gbEmit();
  return threadId;
}

/* ─── selectors ─── */
function introBetween(fromId, toId) {
  return GB_STORE.introRequests.find(r => r.fromId === fromId && r.toId === toId);
}
function allThreads() { return [...GB_STORE.extraThreads, ...window.GB.THREADS]; }
function memberAlerts() { return [...GB_STORE.extraAlerts, ...window.GB.ALERTS]; }
function govAlerts() { return [...GB_STORE.extraGovAlerts, ...window.GB.ADMIN_ALERTS]; }

/* ─── vouches (member-only endorsements) ─── */
function addVouch(toId, fromId, text) {
  (GB_STORE.vouches[toId] = GB_STORE.vouches[toId] || []).unshift({ from: fromId, text: text.trim(), time: 'just now' });
  gbEmit();
}
function vouchesFor(id) {
  return [...(GB_STORE.vouches[id] || []), ...(((window.GB.VOUCHES) || {})[id] || [])];
}
function hasVouched(toId, fromId) { return vouchesFor(toId).some(v => v.from === fromId); }

/* ─── chapter timeline (admin-editable heritage) ─── */
function chapterTimeline(chapterId) {
  if (!GB_STORE.timelines[chapterId]) {
    const seed = (window.GB.buildTimeline ? window.GB.buildTimeline(window.GB.CHAPTERS[chapterId]) : (window.GB.TIMELINES[chapterId] || []));
    GB_STORE.timelines[chapterId] = seed.map((m, i) => ({ ...m, _id: 'ms-' + chapterId + '-' + i }));
  }
  return GB_STORE.timelines[chapterId];
}
function sortTimeline(chapterId) {
  GB_STORE.timelines[chapterId].sort((a, b) => a.year - b.year);
}
function addMilestone(chapterId, m) {
  chapterTimeline(chapterId);
  GB_STORE.timelines[chapterId].push({ ...m, tag: m.tag || 'milestone', _id: 'ms-' + chapterId + '-' + (GB_STORE._seq++) });
  sortTimeline(chapterId); gbEmit();
}
function updateMilestone(chapterId, _id, patch) {
  const list = chapterTimeline(chapterId);
  const i = list.findIndex(m => m._id === _id);
  if (i >= 0) { list[i] = { ...list[i], ...patch }; sortTimeline(chapterId); gbEmit(); }
}
function removeMilestone(chapterId, _id) {
  const list = chapterTimeline(chapterId);
  GB_STORE.timelines[chapterId] = list.filter(m => m._id !== _id);
  gbEmit();
}

Object.assign(window, { GB_STORE, useGBStore, requestIntro, resolveIntro, introBetween, allThreads, memberAlerts, govAlerts,
  addVouch, vouchesFor, hasVouched, chapterTimeline, addMilestone, updateMilestone, removeMilestone });
