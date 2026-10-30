import { describe, expect, it } from "vitest";
import {
  addJob,
  clearDoneJobs,
  deleteJob,
  groupJobs,
  jobEnd,
  postponeJob,
  toggleJob,
  updateJob,
  JOB_TITLE_MAX,
} from "../jobs";

const NOW = new Date("2026-10-30T09:00:00Z");

describe("cose da fare una volta", () => {
  it("aggiunge con valori puliti e ignora i titoli vuoti", () => {
    let jobs = addJob([], { title: "  Rinnovare la carta d'identità  " }, NOW);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: "Rinnovare la carta d'identità",
      notes: "",
      date: null,
      time: null,
      minutes: null,
      energy: "medium",
      done: false,
      doneAt: null,
      createdAt: "2026-10-30T09:00:00.000Z",
    });
    expect(addJob(jobs, { title: "   " })).toBe(jobs);
  });

  it("scarta date, ore, durate ed energie non valide", () => {
    const [job] = addJob(
      [],
      { title: "x".repeat(500), date: "30/10/2026", time: "25:00", minutes: -5, energy: "extreme" },
      NOW
    );
    expect(job.title).toHaveLength(JOB_TITLE_MAX);
    expect(job).toMatchObject({ date: null, time: null, minutes: null, energy: "medium" });
    const [timed] = addJob([], { title: "Dentista", date: "2026-11-02", time: "17:30", minutes: "45" }, NOW);
    expect(timed).toMatchObject({ date: "2026-11-02", time: "17:30", minutes: 45 });
  });

  it("un'ora senza giorno non resta salvata", () => {
    const [job] = addJob([], { title: "Chiamare", time: "10:00" }, NOW);
    expect(job.time).toBeNull();
    const [dated] = addJob([], { title: "Chiamare", date: "2026-11-01", time: "10:00" }, NOW);
    expect(updateJob([dated], dated.id, { date: "" })[0]).toMatchObject({ date: null, time: null });
  });

  it("modifica senza perdere il titolo, spunta, toglie e svuota le fatte", () => {
    let jobs = addJob([], { title: "Idraulico" }, NOW);
    jobs = addJob(jobs, { title: "Banca" }, NOW);
    const [first, second] = jobs;
    jobs = updateJob(jobs, first.id, { title: "  ", notes: "perdita in bagno" });
    expect(jobs[0]).toMatchObject({ title: "Idraulico", notes: "perdita in bagno" });

    jobs = toggleJob(jobs, first.id, NOW);
    expect(jobs[0]).toMatchObject({ done: true, doneAt: "2026-10-30T09:00:00.000Z" });
    expect(toggleJob(jobs, first.id)[0]).toMatchObject({ done: false, doneAt: null });

    expect(clearDoneJobs(jobs).map((job) => job.id)).toEqual([second.id]);
    expect(deleteJob(jobs, second.id).map((job) => job.id)).toEqual([first.id]);
  });

  it("raggruppa per scadute, oggi, senza data, prossime e fatte oggi", () => {
    let jobs = [];
    jobs = addJob(jobs, { title: "Ieri", date: "2026-10-29" }, NOW);
    jobs = addJob(jobs, { title: "Oggi tardi", date: "2026-10-30", time: "18:00" }, NOW);
    jobs = addJob(jobs, { title: "Oggi presto", date: "2026-10-30", time: "08:00" }, NOW);
    jobs = addJob(jobs, { title: "Quando capita" }, NOW);
    jobs = addJob(jobs, { title: "Domani", date: "2026-10-31" }, NOW);
    jobs = addJob(jobs, { title: "Fatta ieri" }, NOW);
    jobs = addJob(jobs, { title: "Fatta oggi" }, NOW);
    jobs = toggleJob(jobs, jobs[5].id, new Date("2026-10-29T10:00:00Z"));
    jobs = toggleJob(jobs, jobs[6].id, NOW);

    const groups = groupJobs(jobs, "2026-10-30");
    const titles = (list) => list.map((job) => job.title);
    expect(titles(groups.overdue)).toEqual(["Ieri"]);
    expect(titles(groups.today)).toEqual(["Oggi presto", "Oggi tardi"]);
    expect(titles(groups.someday)).toEqual(["Quando capita"]);
    expect(titles(groups.upcoming)).toEqual(["Domani"]);
    expect(titles(groups.done)).toEqual(["Fatta oggi"]);
  });

  it("rimanda a un altro giorno e calcola quando finisce", () => {
    const jobs = addJob([], { title: "Posta", date: "2026-10-28", time: "23:50", minutes: 30 }, NOW);
    expect(postponeJob(jobs, jobs[0].id, "2026-10-31")[0].date).toBe("2026-10-31");
    expect(jobEnd(jobs[0])).toBe("23:59");
    expect(jobEnd({ time: "09:15", minutes: null })).toBe("09:45");
    expect(jobEnd({ time: null })).toBeNull();
  });
});
