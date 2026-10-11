package importer

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type pendingLink struct {
	link    linkSpec
	selfID  []byte
	targets []string
	created string
	updated string
}

// Stop asks a running import to stop at the next batch boundary.
func (im *Importer) Stop() {
	im.requestStop()
	im.log("warn", "Stop requested; finishing the current batch …")
}

// Run performs the whole import. It is safe to call from a goroutine; progress
// is observable through State().
func (im *Importer) Run() {
	st := im.state
	st.mu.Lock()
	st.Status = "running"
	st.Phase = "starting"
	st.StartedAt = time.Now()
	st.mu.Unlock()

	im.countSource()
	snap := st.Snapshot()
	if im.opts.DryRun {
		im.log("info", fmt.Sprintf("Dry run: %d source record(s); nothing will be written.", snap.Total))
	}

	if im.opts.Wipe && !im.opts.DryRun {
		im.backupDest()
		im.wipe()
		if im.stopped() {
			im.finish()
			return
		}
	}

	ids := map[string]map[string][]byte{}
	var pending []pendingLink

	for i := range plan {
		step := &plan[i]
		if im.stopped() {
			break
		}
		if im.absent[step.Source] {
			continue
		}

		st.mu.Lock()
		st.Phase = "migrate"
		st.Current = step.Source
		st.Message = ""
		st.mu.Unlock()

		if ids[step.Table] == nil {
			ids[step.Table] = map[string][]byte{}
		}
		c := &ctx{maker: im.maker, ids: ids, idc: map[string][]byte{}}

		rows, err := im.readSource(step.Source)
		if err != nil {
			im.log("warn", fmt.Sprintf("could not read %s: %v", step.Source, err))
			continue
		}
		if im.opts.Limit > 0 && len(rows) > im.opts.Limit {
			rows = rows[:im.opts.Limit]
		}

		if im.opts.DryRun {
			for _, s := range rows {
				im.bump(i, 1, 0, 0, false)
				if step.Attributed != nil && step.Attributed(s) {
					st.mu.Lock()
					st.Attributed++
					st.mu.Unlock()
				}
			}
			if step.Links != nil {
				for _, s := range rows {
					for _, l := range step.Links {
						im.bump(i, 0, 0, len(parseJSONIDs(s[l.Field])), false)
					}
				}
			}
			im.sampleRate()
			im.log("info", fmt.Sprintf("%s: read %d (dry run).", step.Source, len(rows)))
			continue
		}

		colList := quoteCols(step.Columns)
		placeholders := strings.TrimSuffix(strings.Repeat("?,", len(step.Columns)), ",")
		insertSQL := fmt.Sprintf("INSERT INTO %q (%s) VALUES (%s)", step.Table, colList, placeholders)

		const chunk = 1000
		for start := 0; start < len(rows); start += chunk {
			if im.stopped() {
				break
			}
			end := start + chunk
			if end > len(rows) {
				end = len(rows)
			}
			batch := rows[start:end]
			im.insertBatch(step, i, insertSQL, batch, c, ids, &pending)
			im.sampleRate()
			st.mu.Lock()
			st.Current = fmt.Sprintf("%s (%d/%d)", step.Source, end, len(rows))
			st.mu.Unlock()
		}

		im.rateLog(i, step)
	}

	if !im.opts.DryRun && len(pending) > 0 && !im.stopped() {
		im.insertLinks(pending, ids)
	}

	im.finish()
	if !im.opts.DryRun && st.Snapshot().Status == "done" {
		im.verify()
	}
}

func quoteCols(cols []string) string {
	q := make([]string, len(cols))
	for i, c := range cols {
		q[i] = fmt.Sprintf("%q", c)
	}
	return strings.Join(q, ", ")
}

func (im *Importer) readSource(table string) ([]map[string]any, error) {
	rows, err := im.source.Query(fmt.Sprintf("SELECT * FROM %q ORDER BY created", table))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	var out []map[string]any
	for rows.Next() {
		vals := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		m := make(map[string]any, len(cols))
		for i, cname := range cols {
			m[cname] = vals[i]
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (im *Importer) insertBatch(step *step, idx int, insertSQL string, batch []map[string]any, c *ctx, ids map[string]map[string][]byte, pending *[]pendingLink) {
	tx, err := im.dest.Begin()
	if err != nil {
		im.errf(step.Source, "", fmt.Sprintf("begin: %v", err))
		return
	}
	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		tx.Rollback()
		im.errf(step.Source, "", fmt.Sprintf("prepare: %v", err))
		return
	}
	created := 0
	for _, s := range batch {
		args := step.Row(s, c)
		_, err := stmt.Exec(args...)
		if err != nil {
			im.fail(idx)
			im.errf(step.Source, asText(s["id"]), err.Error())
			continue
		}
		created++
		ids[step.Table][asText(s["id"])] = c.id(s)
		if step.Attributed != nil && step.Attributed(s) {
			im.state.mu.Lock()
			im.state.Attributed++
			im.state.mu.Unlock()
		}
		if step.Links != nil {
			for _, l := range step.Links {
				targets := parseJSONIDs(s[l.Field])
				if len(targets) > 0 {
					*pending = append(*pending, pendingLink{
						link: l, selfID: c.id(s), targets: targets,
						created: asText(s["created"]), updated: asText(s["updated"]),
					})
				}
			}
		}
	}
	if err := stmt.Close(); err != nil {
		im.errf(step.Source, "", fmt.Sprintf("close stmt: %v", err))
	}
	if err := tx.Commit(); err != nil {
		tx.Rollback()
		im.errf(step.Source, "", fmt.Sprintf("commit: %v", err))
		return
	}
	im.bump(idx, len(batch), created, 0, false)
}

func (im *Importer) bump(idx, read, created, links int, absent bool) {
	im.state.mu.Lock()
	defer im.state.mu.Unlock()
	s := &im.state.Summary[idx]
	s.Read += read
	s.Created += created
	s.Links += links
	if absent {
		s.Absent = true
	}
	im.state.Done += read
}

func (im *Importer) fail(idx int) {
	im.state.mu.Lock()
	im.state.Summary[idx].Failed++
	im.state.mu.Unlock()
}

func (im *Importer) rateLog(idx int, step *step) {
	im.state.mu.Lock()
	s := im.state.Summary[idx]
	im.state.mu.Unlock()
	extra := ""
	if step.Links != nil {
		extra = fmt.Sprintf(", links %d", s.Links)
	}
	im.log("info", fmt.Sprintf("%s: read %d, created %d, failed %d%s.", step.Source, s.Read, s.Created, s.Failed, extra))
}

func (im *Importer) insertLinks(pending []pendingLink, ids map[string]map[string][]byte) {
	im.state.mu.Lock()
	im.state.Phase = "links"
	im.state.Current = "links"
	im.state.mu.Unlock()

	byTable := map[string][]pendingLink{}
	order := []string{}
	for _, pl := range pending {
		if _, ok := byTable[pl.link.Table]; !ok {
			order = append(order, pl.link.Table)
		}
		byTable[pl.link.Table] = append(byTable[pl.link.Table], pl)
	}

	for _, table := range order {
		exists, _ := tableExists(im.dest, table)
		if !exists {
			continue
		}
		list := byTable[table]
		self := list[0].link.Self
		other := list[0].link.Other
		ins := fmt.Sprintf("INSERT OR IGNORE INTO %q (id, %q, %q, created, updated) VALUES (?,?,?,?,?)", table, self, other)

		tx, err := im.dest.Begin()
		if err != nil {
			im.errf(table, "", err.Error())
			continue
		}
		stmt, err := tx.Prepare(ins)
		if err != nil {
			tx.Rollback()
			im.errf(table, "", err.Error())
			continue
		}
		made := 0
		for _, pl := range list {
			targetMap := ids[pl.link.Target]
			for _, t := range pl.targets {
				otherID, ok := targetMap[t]
				if !ok || pl.selfID == nil {
					continue
				}
				if _, err := stmt.Exec(gen.next(msOf(pl.created)), pl.selfID, otherID, ts(pl.created), ts(pl.updated)); err != nil {
					im.errf(table, "", err.Error())
					continue
				}
				made++
			}
		}
		stmt.Close()
		if err := tx.Commit(); err != nil {
			tx.Rollback()
			im.errf(table, "", err.Error())
			continue
		}
		im.log("info", fmt.Sprintf("%s: created %d link row(s).", table, made))
	}
}

func (im *Importer) countSource() {
	total := 0
	for i := range plan {
		step := &plan[i]
		if im.absent[step.Source] {
			continue
		}
		var c int
		if err := im.source.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %q", step.Source)).Scan(&c); err != nil {
			im.absent[step.Source] = true
			im.state.mu.Lock()
			im.state.Summary[i].Absent = true
			im.state.mu.Unlock()
			im.log("warn", fmt.Sprintf("%s: not present in the source database, skipped.", step.Source))
			continue
		}
		im.srcCounts[step.Source] = c
		if im.opts.Limit > 0 && c > im.opts.Limit {
			c = im.opts.Limit
		}
		total += c
	}
	im.state.mu.Lock()
	im.state.Total = total
	im.state.mu.Unlock()
}

func (im *Importer) wipe() {
	im.state.mu.Lock()
	im.state.Phase = "wipe"
	im.state.mu.Unlock()

	clear := func(name string) int {
		exists, _ := tableExists(im.dest, name)
		if !exists {
			return 0
		}
		var before int
		im.dest.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %q", name)).Scan(&before)
		im.state.mu.Lock()
		im.state.Current = name
		im.state.Message = "Clearing " + name + " …"
		im.state.mu.Unlock()
		if _, err := im.dest.Exec(fmt.Sprintf("DELETE FROM %q", name)); err != nil {
			im.errf(name, "", err.Error())
			return 0
		}
		return before
	}
	for _, t := range wipeOrder {
		if n := clear(t); n > 0 {
			im.log("info", fmt.Sprintf("Wiped %d row(s) from %s.", n, t))
		}
	}
	for _, t := range wipeExtra {
		if n := clear(t); n > 0 {
			im.log("info", fmt.Sprintf("Wiped %d row(s) from %s (transient).", n, t))
		}
	}
	im.reseed()
	im.state.mu.Lock()
	im.state.Current = ""
	im.state.Message = ""
	im.state.mu.Unlock()
}

// reseed restores rows the schema seeds, which --wipe deletes with the data:
// today the single `Difference` counterparty (U1790400000), without which a
// difference cannot be entered.
func (im *Importer) reseed() {
	exists, _ := tableExists(im.dest, "parties")
	if !exists {
		return
	}
	var n int
	im.dest.QueryRow("SELECT COUNT(*) FROM parties WHERE name = 'Difference'").Scan(&n)
	if n > 0 {
		return
	}
	if _, err := im.dest.Exec("INSERT INTO parties (name, type, deleted, created, updated) VALUES ('Difference', 0, 0, '2026-09-29 00:00:00.000Z', '2026-09-29 00:00:00.000Z')"); err != nil {
		im.errf("parties", "", "reseed Difference: "+err.Error())
		return
	}
	im.log("info", "Re-seeded the `Difference` counterparty party (U1790400000).")
}

func (im *Importer) finish() {
	st := im.state
	st.mu.Lock()
	if st.stopping {
		st.Status = "stopped"
	} else if st.ErrorTotal > 0 {
		st.Status = "done-with-errors"
	} else {
		st.Status = "done"
	}
	st.Phase = "finished"
	st.Current = ""
	st.Rate = 0
	st.FinishedAt = time.Now()
	attributed := st.Attributed
	elapsed := st.FinishedAt.Sub(st.StartedAt)
	errs := st.ErrorTotal
	st.mu.Unlock()

	if attributed > 0 {
		im.log("info", fmt.Sprintf("%d invoice(s) had a source invoice_maker; each was attributed to %s. The column means \"imported by\" for these rows, not \"created by\".", attributed, im.makerLbl))
	}
	if errs > 0 {
		im.log("error", fmt.Sprintf("Finished in %s with %d error(s).", fmtDur(elapsed), errs))
	} else {
		im.log("info", fmt.Sprintf("Finished in %s. No errors.", fmtDur(elapsed)))
	}
}

func (im *Importer) verify() {
	im.state.mu.Lock()
	im.state.Phase = "verify"
	im.state.mu.Unlock()

	var out []VerifyRow
	for _, step := range plan {
		if im.absent[step.Source] {
			continue
		}
		exists, _ := tableExists(im.dest, step.Table)
		if !exists {
			continue
		}
		srcN := im.srcCounts[step.Source]
		if im.opts.Limit > 0 && srcN > im.opts.Limit {
			srcN = im.opts.Limit
		}
		seeded := 0
		if step.Table == "parties" {
			im.dest.QueryRow("SELECT COUNT(*) FROM parties WHERE name = 'Difference'").Scan(&seeded)
		}
		var dstN int
		im.dest.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %q", step.Table)).Scan(&dstN)
		imported := dstN - seeded

		var srcMin, dstMin sql.NullString
		im.source.QueryRow(fmt.Sprintf("SELECT MIN(created) FROM %q", step.Source)).Scan(&srcMin)
		im.dest.QueryRow(fmt.Sprintf("SELECT MIN(created) FROM %q", step.Table)).Scan(&dstMin)

		row := VerifyRow{
			Table: step.Source, Source: srcN, Dest: imported, OK: srcN == imported,
			SrcMin: srcMin.String, DstMin: dstMin.String, DateOK: srcMin.String == dstMin.String, Seeded: seeded,
		}
		out = append(out, row)
	}
	im.state.mu.Lock()
	im.state.Verify = out
	im.state.mu.Unlock()

	bad := 0
	for _, r := range out {
		if !r.OK || !r.DateOK {
			bad++
			im.log("warn", fmt.Sprintf("verify: %s source %d vs dest %d%s", r.Table, r.Source, r.Dest, map[bool]string{true: "", false: " (min created differs)"}[r.DateOK]))
		}
	}
	if bad == 0 && len(out) > 0 {
		im.log("info", "verify: every collection's row count and earliest created match the source.")
	}
}

func (im *Importer) sampleRate() {
	now := time.Now()
	st := im.state
	st.mu.Lock()
	defer st.mu.Unlock()
	done := st.Done
	n := len(im.rateBuf)
	if n == 0 || now.Sub(im.rateBuf[n-1].t) >= 250*time.Millisecond {
		im.rateBuf = append(im.rateBuf, rateSample{t: now, done: done})
	}
	for len(im.rateBuf) > 1 && now.Sub(im.rateBuf[0].t) > 5*time.Second {
		im.rateBuf = im.rateBuf[1:]
	}
	if len(im.rateBuf) > 0 {
		first := im.rateBuf[0]
		dt := now.Sub(first.t).Seconds()
		if dt > 0 && done > first.done {
			st.Rate = float64(done-first.done) / dt
		}
	}
}

func fmtDur(d time.Duration) string {
	if d < 0 {
		return "—"
	}
	s := d.Seconds()
	if s < 60 {
		return fmt.Sprintf("%.1fs", s)
	}
	m := int(s) / 60
	return fmt.Sprintf("%dm %02ds", m, int(s)%60)
}
