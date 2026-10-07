import { describe, expect, it } from 'vitest';
import { Log } from '../src/log/log';
import { migrate } from '../src/log/schema';
import { Memory } from '../src/memory/memory';
import { openTestDb } from './util/testDb';

function setup() {
  const db = openTestDb();
  migrate(db);
  const log = new Log({ db, buildSha: 'test-sha' });
  const memory = new Memory(db, log);
  return { db, log, memory };
}

describe('Memory (§13.3 /src/memory, §21)', () => {
  it('marks a candidate and logs candidate_marked — no text stored', () => {
    const { db, memory } = setup();
    memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1000);

    const candidates = memory.candidates('john');
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ book: 'john', chapter: 3, verse_start: 16, verse_end: 16 });
    expect((candidates[0] as unknown as Record<string, unknown>).text).toBeUndefined();

    const event = db.get<{ type: string }>("SELECT * FROM events WHERE type = 'candidate_marked'");
    expect(event?.type).toBe('candidate_marked');
  });

  it('unmarkCandidate retracts a tap — the candidate is gone, not just hidden', () => {
    const { db, memory } = setup();
    const ref = { book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 };
    memory.markCandidate(ref, () => 1);
    expect(memory.candidates('john')).toHaveLength(1);

    memory.unmarkCandidate(ref);

    expect(memory.candidates('john')).toHaveLength(0);
    expect(db.all('SELECT * FROM passages')).toHaveLength(0);
  });

  it('re-marking the same verse after unmarking does not leave duplicates', () => {
    const { memory } = setup();
    const ref = { book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 };
    memory.markCandidate(ref, () => 1);
    memory.unmarkCandidate(ref);
    memory.markCandidate(ref, () => 2);

    expect(memory.candidates('john')).toHaveLength(1);
  });

  it('markCandidate is idempotent for an identical active range', () => {
    const { db, memory } = setup();
    const ref = { book:'philippians', chapter:1, verseStart:3, verseEnd:7 };
    memory.markCandidate(ref, () => 1);
    memory.markCandidate(ref, () => 2);
    expect(memory.candidatesForChapter('philippians', 1)).toHaveLength(1);
    expect(db.all("SELECT * FROM events WHERE type = 'candidate_marked'")).toHaveLength(1);
  });

  it('keeps overlapping ranges separate and retracts only an exact range', () => {
    const { memory } = setup();
    memory.markCandidate({ book:'philippians', chapter:1, verseStart:3, verseEnd:7 }, () => 1);
    memory.markCandidate({ book:'philippians', chapter:1, verseStart:5, verseEnd:9 }, () => 2);
    memory.unmarkCandidate({ book:'philippians', chapter:1, verseStart:3, verseEnd:7 });
    expect(memory.candidatesForChapter('philippians', 1)).toMatchObject([{ verse_start:5, verse_end:9 }]);
  });

  it('removes only the selected row when a legacy database contains duplicate ranges', () => {
    const {db,memory}=setup();
    const values=['john',3,16,16,1,1];
    db.run('INSERT INTO passages (book, chapter, verse_start, verse_end, marked_at, box) VALUES (?, ?, ?, ?, ?, ?)',values);
    db.run('INSERT INTO passages (book, chapter, verse_start, verse_end, marked_at, box) VALUES (?, ?, ?, ?, ?, ?)',[...values.slice(0,4),2,1]);
    const rows=memory.candidatesForChapter('john',3);
    memory.unmarkCandidateById(rows[0].id);
    expect(memory.candidatesForChapter('john',3).map((row)=>row.id)).toEqual([rows[1].id]);
  });

  it('unmarkCandidate never touches a promoted passage, even for the same reference', () => {
    const { memory } = setup();
    const ref = { book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 };
    memory.markCandidate(ref, () => 1);
    const [{ id }] = memory.candidates('john');
    memory.promote(id, '2026-07-14');

    memory.unmarkCandidate(ref);

    // Promoted passages aren't returned by candidates(); confirm via due().
    expect(memory.due('2026-07-14')).toHaveLength(1);
  });

  it('candidates() only returns unpromoted marks for that book', () => {
    const { db, memory } = setup();
    memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1);
    memory.markCandidate({ book: 'john', chapter: 1, verseStart: 1, verseEnd: 1 }, () => 2);
    memory.markCandidate({ book: 'romans', chapter: 8, verseStart: 28, verseEnd: 28 }, () => 3);

    expect(memory.candidates('john')).toHaveLength(2);
    expect(memory.candidates('romans')).toHaveLength(1);

    const [{ id }] = memory.candidates('romans');
    memory.promote(id, '2026-07-14');
    expect(memory.candidates('romans')).toHaveLength(0); // promoted, no longer a candidate
    void db;
  });

  it('promote() allows several passages from one book (recall-settings drops one-per-book)', () => {
    const { memory } = setup();
    memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1);
    memory.markCandidate({ book: 'john', chapter: 1, verseStart: 1, verseEnd: 1 }, () => 2);
    const [first, second] = memory.candidates('john');

    expect(memory.promote(second.id, '2026-07-14')).toEqual({ ok: true, id: second.id });
    expect(memory.promote(first.id, '2026-07-14')).toEqual({ ok: true, id: first.id });
    expect(memory.learned()).toHaveLength(2);
  });

  it('promote() refuses an unknown id and a range already being learned', () => {
    const { db, memory } = setup();
    expect(memory.promote(999, '2026-07-14')).toEqual({ ok: false, reason: 'missing' });
    expect(memory.add({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 17 }, '2026-07-14').ok).toBe(true);
    // A mark of the same range left over from before markCandidate refused it.
    db.run("INSERT INTO passages (book, chapter, verse_start, verse_end, marked_at, box) VALUES ('john', 3, 16, 17, 5, 1)");
    const [mark] = memory.candidates('john');
    expect(memory.promote(mark.id, '2026-07-14')).toEqual({ ok: false, reason: 'duplicate' });
    expect(memory.learned()).toHaveLength(1);
  });

  it('due() returns promoted passages at or before the date, caller caps at 2', () => {
    const { memory } = setup();
    memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1);
    const [{ id }] = memory.candidates('john');
    memory.promote(id, '2026-07-01');

    expect(memory.due('2026-07-01')).toHaveLength(1); // due immediately on promotion day
    expect(memory.due('2026-06-30')).toHaveLength(0);
  });

  it('grade() reschedules via the Leitner boxes and logs recall_graded', () => {
    const { db, memory } = setup();
    memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1);
    const [{ id }] = memory.candidates('john');
    memory.promote(id, '2026-07-01');

    memory.grade(id, 'held', '2026-07-01');
    const due = memory.due('2026-07-04'); // box 2 → +3 days
    expect(due).toHaveLength(1);
    expect(due[0].box).toBe(2);
    expect(due[0].last_grade).toBe('held');

    const graded = db.all("SELECT * FROM events WHERE type = 'recall_graded'");
    expect(graded).toHaveLength(1);
  });

  it('grade() walks the cloze ladder without changing Leitner scheduling', () => {
    const { db, memory } = setup();
    memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1);
    const [{ id }] = memory.candidates('john');
    memory.promote(id, '2026-07-01');
    const row = () => db.get<{ rung: number | null; box: number; due_date: string }>('SELECT rung, box, due_date FROM passages WHERE id = ?', [id])!;
    expect(row().rung).toBeNull();

    memory.grade(id, 'held', '2026-07-01');
    expect([row().rung, row().box, row().due_date]).toEqual([2, 2, '2026-07-04']);
    memory.grade(id, 'partial', '2026-07-04');
    expect([row().rung, row().box, row().due_date]).toEqual([2, 2, '2026-07-07']);
    memory.grade(id, 'lost', '2026-07-07');
    expect([row().rung, row().box, row().due_date]).toEqual([1, 1, '2026-07-08']);
    memory.grade(id, 'lost', '2026-07-08');
    expect(row().rung).toBe(1);
  });

  it('grade() on a legacy passage derives its rung from the box', () => {
    const { db, memory } = setup();
    memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1);
    const [{ id }] = memory.candidates('john');
    memory.promote(id, '2026-07-01');
    db.run('UPDATE passages SET box = 3 WHERE id = ?', [id]); // pre-ladder passage, rung NULL
    memory.grade(id, 'held', '2026-07-01');
    expect(db.get<{ rung: number }>('SELECT rung FROM passages WHERE id = ?', [id])?.rung).toBe(6);
  });

  it('grade() is a dead end for lost — back to box 1, due tomorrow', () => {
    const { memory } = setup();
    memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1);
    const [{ id }] = memory.candidates('john');
    memory.promote(id, '2026-07-01');
    memory.grade(id, 'held', '2026-07-01'); // box 2
    memory.grade(id, 'lost', '2026-07-04'); // box 1

    expect(memory.due('2026-07-05')[0].box).toBe(1);
  });

  it('retention() counts passages held (box 5) for at least 60 days', () => {
    const { memory } = setup();
    memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1);
    const [{ id }] = memory.candidates('john');
    memory.promote(id, '2026-01-01');
    // Fast-forward through boxes 2..5 with 'held' grades.
    memory.grade(id, 'held', '2026-01-01'); // box 2
    memory.grade(id, 'held', '2026-01-05'); // box 3
    memory.grade(id, 'held', '2026-01-15'); // box 4
    memory.grade(id, 'held', '2026-02-01'); // box 5, held_since = 2026-02-01

    expect(memory.retention('2026-02-15')).toEqual({ promoted: 1, held60: 0 }); // only 14 days
    expect(memory.retention('2026-04-05')).toEqual({ promoted: 1, held60: 1 }); // 63 days
  });

  it('marksPerChapter — the E4 secondary metric — divides marks by sealed chapters in range', () => {
    const { db, log, memory } = setup();
    // Two sealed chapters in range, three marks in range, one mark outside.
    db.run(
      `INSERT INTO days (local_date, sealed, book, chapter, dose) VALUES
       ('2026-07-01', 1, 'john', 1, 'full_chapter'),
       ('2026-07-02', 1, 'john', 2, 'full_chapter')`,
    );
    const ts = (dateUtcNoon: string) => Date.parse(dateUtcNoon);
    memory.markCandidate({ book: 'john', chapter: 1, verseStart: 1, verseEnd: 1 }, () => ts('2026-07-01T12:00:00Z'));
    memory.markCandidate({ book: 'john', chapter: 1, verseStart: 3, verseEnd: 3 }, () => ts('2026-07-01T13:00:00Z'));
    memory.markCandidate({ book: 'john', chapter: 2, verseStart: 5, verseEnd: 5 }, () => ts('2026-07-02T12:00:00Z'));
    memory.markCandidate({ book: 'john', chapter: 3, verseStart: 1, verseEnd: 1 }, () => ts('2026-06-01T12:00:00Z')); // outside range

    expect(memory.marksPerChapter('2026-07-01', '2026-07-02')).toBe(1.5); // 3 marks / 2 chapters
    void log;
  });

  it('a failed recall provably touches nothing: seal/streak/weave/dose are byte-identical for held vs lost (§13.5 W6a)', () => {
    const OTHER_TABLES = ['days', 'cue', 'bandit', 'decisions', 'exp_phases', 'srbai', 'reports', 'meta', 'partner'];

    function run(grade: 'held' | 'lost') {
      const db = openTestDb();
      migrate(db);
      const log = new Log({ db, buildSha: 'test-sha' });
      const memory = new Memory(db, log);

      db.run(
        `INSERT INTO days (local_date, sealed, sealed_before_nudge, book, chapter, dose)
         VALUES ('2026-07-14', 1, 1, 'john', 3, 'full_chapter')`,
      );
      db.run(`INSERT INTO cue (anchor, place, nudge_hour, set_at, active) VALUES ('coffee', 'chair', 21, 0, 1)`);

      memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1);
      const [{ id }] = memory.candidates('john');
      memory.promote(id, '2026-07-01');
      memory.grade(id, grade, '2026-07-14');

      return OTHER_TABLES.map((t) => db.all(`SELECT * FROM ${t}`));
    }

    expect(JSON.stringify(run('held'))).toBe(JSON.stringify(run('lost')));
  });

  describe('marked list repair (fix/marked-list)', () => {
    const insertMark = (db: ReturnType<typeof setup>['db'], book: string, ch: number, a: number, b: number, at: number) =>
      db.run('INSERT INTO passages (book, chapter, verse_start, verse_end, marked_at, box) VALUES (?, ?, ?, ?, ?, 1)', [book, ch, a, b, at]);

    it('tidyMarks() keeps the earliest of identical marks and drops marks of a learned range', () => {
      const { db, memory } = setup();
      insertMark(db, 'john', 3, 16, 16, 1); // the kept copy
      insertMark(db, 'john', 3, 16, 16, 2); // July re-tap copies
      insertMark(db, 'john', 3, 16, 16, 3);
      insertMark(db, 'john', 3, 16, 17, 4); // overlapping, not identical — kept
      insertMark(db, 'psalms', 23, 1, 1, 5);
      memory.add({ book: 'psalms', chapter: 23, verseStart: 1, verseEnd: 1 }, '2026-07-14'); // now learned
      expect(memory.tidyMarks()).toBe(3);
      expect(memory.marked().map((p) => `${p.book} ${p.chapter}:${p.verse_start}-${p.verse_end}@${p.marked_at}`).sort()).toEqual([
        'john 3:16-16@1',
        'john 3:16-17@4',
      ]);
      expect(memory.learned()).toHaveLength(1);
      expect(memory.tidyMarks()).toBe(0); // idempotent
    });

    it('markCandidate() does not mark a range that is already being learned', () => {
      const { db, memory } = setup();
      memory.add({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 17 }, '2026-07-14');
      memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 17 }, () => 9);
      expect(memory.marked()).toHaveLength(0);
      expect(db.all("SELECT * FROM events WHERE type = 'candidate_marked'")).toHaveLength(0);
    });
  });

  describe('memory library (recall-settings)', () => {
    const ref = (verseStart: number, verseEnd: number) => ({ book: 'psalms', chapter: 23, verseStart, verseEnd });
    const row = (db: ReturnType<typeof setup>['db'], id: number) =>
      db.get<{ box: number; rung: number | null; due_date: string; held_since: string | null; verse_start: number; verse_end: number; source: string | null; last_grade: string | null }>(
        'SELECT box, rung, due_date, held_since, verse_start, verse_end, source, last_grade FROM passages WHERE id = ?',
        [id],
      );

    it('add() learns any passage, due today, marked as a picker add, and logs', () => {
      const { db, memory } = setup();
      const r = memory.add(ref(1, 3), '2026-07-14', () => 9);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(row(db, r.id)).toMatchObject({ box: 1, due_date: '2026-07-14', source: 'added', verse_start: 1, verse_end: 3 });
      expect(memory.due('2026-07-14').map((p) => p.id)).toEqual([r.id]);
      expect(db.all("SELECT * FROM events WHERE type = 'passage_added'")).toHaveLength(1);
    });

    it('add() refuses a duplicate and an invalid range, writing nothing', () => {
      const { db, memory } = setup();
      memory.add(ref(1, 3), '2026-07-14');
      expect(memory.add(ref(1, 3), '2026-07-14')).toEqual({ ok: false, reason: 'duplicate' });
      expect(memory.add(ref(4, 2), '2026-07-14')).toEqual({ ok: false, reason: 'invalid' });
      expect(memory.add(ref(0, 2), '2026-07-14')).toEqual({ ok: false, reason: 'invalid' });
      expect(db.all('SELECT * FROM passages')).toHaveLength(1);
      expect(db.all("SELECT * FROM events WHERE type = 'passage_added'")).toHaveLength(1);
    });

    it('editRange() keeps the schedule and steps the ladder back one', () => {
      const { db, memory } = setup();
      const r = memory.add(ref(1, 1), '2026-07-14');
      if (!r.ok) throw new Error('add failed');
      db.run("UPDATE passages SET box = 3, rung = 5, due_date = '2026-08-01', held_since = NULL WHERE id = ?", [r.id]);
      expect(memory.editRange(r.id, 1, 3)).toEqual({ ok: true, id: r.id });
      expect(row(db, r.id)).toMatchObject({ verse_start: 1, verse_end: 3, box: 3, due_date: '2026-08-01', rung: 4 });
      expect(db.all("SELECT * FROM events WHERE type = 'passage_edited'")).toHaveLength(1);
    });

    it('editRange() on a legacy passage derives its rung from the box first', () => {
      const { db, memory } = setup();
      memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1);
      const [{ id }] = memory.candidates('john');
      memory.promote(id, '2026-07-14');
      db.run('UPDATE passages SET box = 4, rung = NULL WHERE id = ?', [id]); // derived rung 7
      memory.editRange(id, 16, 17);
      expect(row(db, id)?.rung).toBe(6);
    });

    it('editRange() on a mark changes only the range; refuses duplicates and bad ranges', () => {
      const { db, memory } = setup();
      memory.markCandidate({ book: 'psalms', chapter: 23, verseStart: 4, verseEnd: 4 }, () => 1);
      const [mark] = memory.marked();
      expect(memory.editRange(mark.id, 4, 6).ok).toBe(true);
      expect(row(db, mark.id)).toMatchObject({ verse_start: 4, verse_end: 6, rung: null });
      const a = memory.add(ref(1, 1), '2026-07-14');
      const b = memory.add(ref(2, 2), '2026-07-14');
      if (!a.ok || !b.ok) throw new Error('add failed');
      expect(memory.editRange(b.id, 1, 1)).toEqual({ ok: false, reason: 'duplicate' });
      expect(memory.editRange(b.id, 3, 1)).toEqual({ ok: false, reason: 'invalid' });
      expect(memory.editRange(999, 1, 1)).toEqual({ ok: false, reason: 'missing' });
    });

    it('learnRange() refuses a duplicate before touching the mark', () => {
      const { db, memory } = setup();
      memory.add(ref(1, 2), '2026-07-14');
      memory.markCandidate({ book: 'psalms', chapter: 23, verseStart: 1, verseEnd: 1 }, () => 1);
      const [mark] = memory.marked();
      expect(memory.learnRange(mark.id, 1, 2, '2026-07-14')).toEqual({ ok: false, reason: 'duplicate' });
      expect(row(db, mark.id)).toMatchObject({ verse_start: 1, verse_end: 1 });
      expect(db.all("SELECT * FROM events WHERE type = 'passage_edited'")).toHaveLength(0);
      expect(memory.learnRange(mark.id, 1, 3, '2026-07-14')).toEqual({ ok: true, id: mark.id });
      expect(row(db, mark.id)).toMatchObject({ verse_start: 1, verse_end: 3, due_date: '2026-07-14' });
      expect(memory.marked()).toHaveLength(0);
    });

    it('reset() starts over: box 1, rung 1, due today, held_since cleared', () => {
      const { db, memory } = setup();
      const r = memory.add(ref(1, 1), '2026-07-14');
      if (!r.ok) throw new Error('add failed');
      db.run("UPDATE passages SET box = 5, rung = 7, due_date = '2026-09-01', held_since = '2026-07-20', last_grade = 'held' WHERE id = ?", [r.id]);
      memory.reset(r.id, '2026-08-01');
      expect(row(db, r.id)).toMatchObject({ box: 1, rung: 1, due_date: '2026-08-01', held_since: null, last_grade: null });
      expect(db.all("SELECT * FROM events WHERE type = 'passage_reset'")).toHaveLength(1);
    });

    it('remove() deletes a learned passage or a mark, and logs', () => {
      const { db, memory } = setup();
      const r = memory.add(ref(1, 1), '2026-07-14');
      memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => 1);
      if (!r.ok) throw new Error('add failed');
      memory.remove(r.id);
      memory.remove(memory.marked()[0].id);
      memory.remove(12345); // no-op
      expect(db.all('SELECT * FROM passages')).toHaveLength(0);
      expect(db.all("SELECT * FROM events WHERE type = 'passage_deleted'")).toHaveLength(2);
    });

    it('marked() lists only reading marks; picker adds never count as E4 marks', () => {
      const { db, log, memory } = setup();
      memory.markCandidate({ book: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }, () => Date.parse('2026-07-14T12:00:00Z'));
      memory.add(ref(1, 3), '2026-07-14', () => Date.parse('2026-07-14T12:00:00Z'));
      memory.markCandidate({ book: 'psalms', chapter: 23, verseStart: 1, verseEnd: 1 }, () => Date.parse('2026-07-14T12:00:00Z'));
      memory.remove(memory.learned()[0].id); // drop the picker add, then add it again
      memory.add(ref(1, 3), '2026-07-14', () => Date.parse('2026-07-14T12:00:00Z'));
      expect(memory.marked()).toHaveLength(2);
      db.run("INSERT INTO days (local_date, sealed, dose, book, chapter) VALUES ('2026-07-14', 1, 'full_chapter', 'john', 3)");
      void log;
      expect(memory.marksPerChapter('2026-07-14', '2026-07-14')).toBe(2); // 2 reading marks, the add excluded
    });

    it('recallCap() defaults to 2, clamps 1..10, persists, and logs a change', () => {
      const { db, log, memory } = setup();
      expect(memory.recallCap()).toBe(2);
      expect(memory.setRecallCap(0)).toBe(1);
      expect(memory.setRecallCap(99)).toBe(10);
      expect(new Memory(db, log).recallCap()).toBe(10);
      memory.setRecallCap(10); // unchanged — no event
      expect(db.all("SELECT * FROM events WHERE type = 'recall_cap_changed'")).toHaveLength(2);
    });

    it('no library action touches days or probes', () => {
      const { db, memory } = setup();
      db.run("INSERT INTO days (local_date, sealed, dose) VALUES ('2026-07-13', 1, 'full_chapter')");
      db.run("INSERT INTO probes (local_date, fired) VALUES ('2026-07-14', 0)");
      const before = JSON.stringify([db.all('SELECT * FROM days'), db.all('SELECT * FROM probes')]);
      const r = memory.add(ref(1, 1), '2026-07-14');
      if (!r.ok) throw new Error('add failed');
      memory.editRange(r.id, 1, 2);
      memory.reset(r.id, '2026-07-14');
      memory.setRecallCap(5);
      memory.remove(r.id);
      expect(JSON.stringify([db.all('SELECT * FROM days'), db.all('SELECT * FROM probes')])).toBe(before);
    });
  });
});
