package importer

import (
	"crypto/rand"
	"sync"
	"time"
)

// uuidGen produces UUIDv7 values that are unique and monotonically increasing
// within a run. The 48-bit millisecond prefix is seeded from the source row's
// `created`, so destination id ordering follows source chronology, as the
// direct import tool has always done.
type uuidGen struct {
	mu     sync.Mutex
	lastMs int64
	seq    int
}

// global generator shared by the importer and the uuid_v7() SQL function.
var gen = &uuidGen{}

func (g *uuidGen) next(msHint int64) []byte {
	g.mu.Lock()
	defer g.mu.Unlock()

	ms := msHint
	if ms <= 0 {
		ms = time.Now().UnixMilli()
	}
	if ms > g.lastMs {
		g.lastMs = ms
		g.seq = 0
	} else {
		g.seq++
		if g.seq > 0xfff {
			g.lastMs++
			g.seq = 0
		}
	}
	ms = g.lastMs

	b := make([]byte, 16)
	b[0] = byte(ms >> 40)
	b[1] = byte(ms >> 32)
	b[2] = byte(ms >> 24)
	b[3] = byte(ms >> 16)
	b[4] = byte(ms >> 8)
	b[5] = byte(ms)
	b[6] = 0x70 | byte((g.seq>>8)&0x0f)
	b[7] = byte(g.seq & 0xff)

	var rnd [8]byte
	_, _ = rand.Read(rnd[:])
	b[8] = 0x80 | (rnd[0] & 0x3f)
	copy(b[9:], rnd[1:])
	return b
}
