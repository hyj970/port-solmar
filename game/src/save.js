// Local save for Solmar Bay: money, completed jobs, best escape and play
// stats, kept in localStorage under one key. Never throws: a private window
// or a blocked store simply means no save.

const KEY = 'solmar-bay-save-v1';

export function loadSave() {
  const fresh = { money: 250, missionsDone: [], bestWantedEscape: 0, carsStolen: 0, taxiTrips: 0, playSeconds: 0 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh;
    const data = JSON.parse(raw);
    return { ...fresh, ...data, missionsDone: Array.isArray(data.missionsDone) ? data.missionsDone : [] };
  } catch (err) {
    return fresh;
  }
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch (err) {
    // Saving is a nicety, never a crash.
  }
}
