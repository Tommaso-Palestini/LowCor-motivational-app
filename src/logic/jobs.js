import { toDateString } from "./dates";

// Cose da fare una volta sola (one time job): rinnovare la carta d'identità, chiamare l'idraulico.
// Non sono attività con un obiettivo che si ripete: si fanno, si spuntano e finiscono.
// Data, ora e durata sono facoltative: senza data restano in lista finché non le chiudi.
export const JOB_TITLE_MAX = 120;
export const JOB_NOTES_MAX = 1000;
export const JOB_MINUTES_MAX = 12 * 60;

const ENERGIES = ["high", "medium", "low"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Ripulisce i campi che arrivano dal modulo (o da un backup): mai salvare valori a metà
function cleanFields({ title, notes, date, time, minutes, energy }) {
  const fields = {};
  if (title !== undefined) {
    fields.title = String(title).trim().slice(0, JOB_TITLE_MAX);
  }
  if (notes !== undefined) {
    fields.notes = String(notes).trim().slice(0, JOB_NOTES_MAX);
  }
  if (date !== undefined) {
    fields.date = DATE_PATTERN.test(date || "") ? date : null;
  }
  if (time !== undefined) {
    fields.time = TIME_PATTERN.test(time || "") ? time : null;
  }
  if (minutes !== undefined) {
    const value = Math.round(Number(minutes));
    fields.minutes = Number.isFinite(value) && value > 0 ? Math.min(value, JOB_MINUTES_MAX) : null;
  }
  if (energy !== undefined) {
    fields.energy = ENERGIES.includes(energy) ? energy : "medium";
  }
  return fields;
}

export function addJob(jobs, draft, now = new Date()) {
  const fields = cleanFields({ notes: "", date: null, time: null, minutes: null, energy: "medium", ...draft });
  if (!fields.title) {
    return jobs;
  }
  // Un'ora senza giorno non vuol dire niente
  if (!fields.date) {
    fields.time = null;
  }
  return [
    ...jobs,
    { id: crypto.randomUUID(), ...fields, done: false, doneAt: null, createdAt: now.toISOString() },
  ];
}

export function updateJob(jobs, jobId, changes) {
  const fields = cleanFields(changes);
  if (fields.title === "") {
    delete fields.title;
  }
  return jobs.map((job) => {
    if (job.id !== jobId) {
      return job;
    }
    const next = { ...job, ...fields };
    if (!next.date) {
      next.time = null;
    }
    return next;
  });
}

export function toggleJob(jobs, jobId, now = new Date()) {
  return jobs.map((job) =>
    job.id === jobId ? { ...job, done: !job.done, doneAt: job.done ? null : now.toISOString() } : job
  );
}

export function deleteJob(jobs, jobId) {
  return jobs.filter((job) => job.id !== jobId);
}

export function clearDoneJobs(jobs) {
  return jobs.filter((job) => !job.done);
}

function byWhen(a, b) {
  return (a.date || "9999").localeCompare(b.date || "9999")
    || (a.time || "99").localeCompare(b.time || "99")
    || a.createdAt.localeCompare(b.createdAt);
}

// Come le mostra la home: quelle scadute prima (senza sensi di colpa, solo in cima),
// poi quelle di oggi, poi quelle senza data; le prossime sono a parte, per non affollare.
// Le fatte oggi restano visibili fino a mezzanotte, così si vede cosa si è chiuso.
export function groupJobs(jobs, today) {
  const groups = { overdue: [], today: [], someday: [], upcoming: [], done: [] };
  for (const job of jobs) {
    if (job.done) {
      if (job.doneAt && toDateString(new Date(job.doneAt)) >= today) {
        groups.done.push(job);
      }
    } else if (!job.date) {
      groups.someday.push(job);
    } else if (job.date < today) {
      groups.overdue.push(job);
    } else if (job.date === today) {
      groups.today.push(job);
    } else {
      groups.upcoming.push(job);
    }
  }
  for (const list of Object.values(groups)) {
    list.sort(byWhen);
  }
  return groups;
}

// Spostare a domani una cosa scaduta, con un tocco
export function postponeJob(jobs, jobId, date) {
  return updateJob(jobs, jobId, { date });
}

// Le cose con giorno e ora occupano un pezzo di giornata: servono per gli impegni condivisi
export function jobEnd(job) {
  if (!job.time) {
    return null;
  }
  const [hours, minutes] = job.time.split(":").map(Number);
  const end = Math.min(hours * 60 + minutes + (job.minutes || 30), 24 * 60 - 1);
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}
