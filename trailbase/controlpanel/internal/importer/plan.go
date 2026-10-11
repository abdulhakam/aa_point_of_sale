package importer

import (
	"encoding/json"
	"math"
	"regexp"
	"strconv"
	"time"
)

// ---------------------------------------------------------------------------
// Value translation, matched to the real PocketBase source and the TrailBase
// destination schemas (verified against legacyforparity/backend/pb_data/data.db
// and the migrations under trailbase/migrations/main/).
// ---------------------------------------------------------------------------

var enumCodes = map[string]map[string]int{
	"party_types":   {"customer": 0, "supplier": 1},
	"invoice_types": {"purchase": 0, "sale": 1, "return": 2, "difference": 3},
	"payment_types": {"sending": 0, "recieving": 1, "return": 2},
}

func asText(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case []byte:
		return string(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	case bool:
		if t {
			return "true"
		}
		return "false"
	default:
		return ""
	}
}

func asFloat(v any) float64 {
	switch t := v.(type) {
	case nil:
		return 0
	case float64:
		return t
	case int64:
		return float64(t)
	case bool:
		if t {
			return 1
		}
		return 0
	case string:
		f, _ := strconv.ParseFloat(t, 64)
		return f
	case []byte:
		f, _ := strconv.ParseFloat(string(t), 64)
		return f
	default:
		return 0
	}
}

func asFlag(v any) int {
	switch t := v.(type) {
	case bool:
		if t {
			return 1
		}
		return 0
	case int64:
		if t != 0 {
			return 1
		}
		return 0
	case float64:
		if t != 0 {
			return 1
		}
		return 0
	case string:
		if t == "1" || t == "true" {
			return 1
		}
		return 0
	case []byte:
		s := string(t)
		if s == "1" || s == "true" {
			return 1
		}
		return 0
	default:
		return 0
	}
}

func enumCode(group string, v any) any {
	if v == nil {
		return nil
	}
	s := asText(v)
	if s == "" {
		return nil
	}
	if c, ok := enumCodes[group][s]; ok {
		return int64(c)
	}
	return nil
}

// money rounds an AMOUNT to whole paisas. Unit prices, costs, quantities and
// percentages are rates and are written verbatim; only amount-like columns go
// through here (expenses.amount, *.discount_rs, payments.amount). Matches
// money-is-2dp-everywhere and the Node tool's money().
func money(v any) float64 {
	const eps = 2.220446049250313e-16
	return math.Round((asFloat(v)+eps)*100) / 100
}

var tsRe = regexp.MustCompile(`^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?Z$`)

// nowStamp is PocketBase's timestamp format, which TrailBase keeps verbatim.
func nowStamp() string {
	return time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
}

// ts keeps a usable source timestamp verbatim; only an unusable one is replaced.
func ts(v any) string {
	s := asText(v)
	if tsRe.MatchString(s) {
		return s
	}
	return nowStamp()
}

var msRe = regexp.MustCompile(`^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z?$`)

// msOf turns a timestamp into unix milliseconds for UUIDv7 seeding.
func msOf(stamp string) int64 {
	m := msRe.FindStringSubmatch(stamp)
	if m == nil {
		return time.Now().UnixMilli()
	}
	atoi := func(s string) int { n, _ := strconv.Atoi(s); return n }
	var nsec int
	if m[7] != "" {
		frac := m[7]
		if len(frac) > 9 {
			frac = frac[:9]
		}
		for len(frac) < 9 {
			frac += "0"
		}
		nsec = atoi(frac)
	}
	t := time.Date(atoi(m[1]), time.Month(atoi(m[2])), atoi(m[3]),
		atoi(m[4]), atoi(m[5]), atoi(m[6]), nsec, time.UTC)
	return t.UnixMilli()
}

// parseJSONIDs reads PocketBase's multi-valued relation column (a JSON array of
// source ids) into a string slice. Anything unparseable reads as empty.
func parseJSONIDs(v any) []string {
	s := asText(v)
	if s == "" {
		return nil
	}
	var a []string
	if err := json.Unmarshal([]byte(s), &a); err != nil {
		// Some PocketBase builds store ids as an array of one-element arrays.
		var raw []any
		if err2 := json.Unmarshal([]byte(s), &raw); err2 != nil {
			return nil
		}
		for _, e := range raw {
			a = append(a, asText(e))
		}
	}
	out := a[:0]
	for _, id := range a {
		if id != "" {
			out = append(out, id)
		}
	}
	return out
}

// ---------------------------------------------------------------------------
// The import plan: source collection -> destination table, in dependency order.
// ---------------------------------------------------------------------------

type linkSpec struct {
	Table  string // destination link table, e.g. party_companies
	Self   string // column naming the owning row, e.g. party
	Other  string // column naming the target, e.g. company
	Field  string // source JSON-array column, e.g. company
	Target string // destination table the ids resolve into, e.g. companies
}

type step struct {
	Source     string
	Table      string
	Columns    []string
	Row        func(s map[string]any, c *ctx) []any
	Links      []linkSpec
	Attributed func(s map[string]any) bool
}

type ctx struct {
	maker []byte
	ids   map[string]map[string][]byte
	idc   map[string][]byte
}

func (c *ctx) id(s map[string]any) []byte {
	key := asText(s["id"])
	if b, ok := c.idc[key]; ok {
		return b
	}
	b := gen.next(msOf(asText(s["created"])))
	c.idc[key] = b
	return b
}

func (c *ctx) rel(table string, srcID string) any {
	if srcID == "" {
		return nil
	}
	m := c.ids[table]
	if m == nil {
		return nil
	}
	// Return the raw []byte so database/sql stores it as a BLOB. A missing
	// target is a nil (NULL) reference rather than a dangling one.
	if b, ok := m[srcID]; ok {
		return b
	}
	return nil
}

// plan mirrors tools/import-v1-tui.mjs exactly, adapted to the columns the
// live destination schema actually has (categories is gone; items.category
// points at companies; payments.deleted defaults to 0 and is not written).
var plan = []step{
	{
		Source:  "sections",
		Table:   "sections",
		Columns: []string{"id", "name", "created", "updated"},
		Row: func(s map[string]any, c *ctx) []any {
			return []any{c.id(s), asText(s["name"]), ts(s["created"]), ts(s["updated"])}
		},
	},
	{
		// Legacy `categories` IS the company list; written into `companies`.
		Source:  "categories",
		Table:   "companies",
		Columns: []string{"id", "name", "deleted", "created", "updated"},
		Row: func(s map[string]any, c *ctx) []any {
			return []any{c.id(s), asText(s["name"]), asFlag(s["deleted"]), ts(s["created"]), ts(s["updated"])}
		},
	},
	{
		Source:  "areas",
		Table:   "areas",
		Columns: []string{"id", "name", "section", "deleted", "created", "updated"},
		Row: func(s map[string]any, c *ctx) []any {
			return []any{c.id(s), asText(s["name"]), c.rel("sections", asText(s["section"])), asFlag(s["deleted"]), ts(s["created"]), ts(s["updated"])}
		},
	},
	{
		Source:  "parties",
		Table:   "parties",
		Columns: []string{"id", "name", "type", "phone", "address", "area", "deleted", "created", "updated"},
		Row: func(s map[string]any, c *ctx) []any {
			return []any{
				c.id(s), asText(s["name"]), enumCode("party_types", s["type"]), asText(s["phone"]),
				asText(s["address"]), c.rel("areas", asText(s["area"])), asFlag(s["deleted"]),
				ts(s["created"]), ts(s["updated"]),
			}
		},
		Links: []linkSpec{{Table: "party_companies", Self: "party", Other: "company", Field: "company", Target: "companies"}},
	},
	{
		Source:  "order_bookers",
		Table:   "order_bookers",
		Columns: []string{"id", "name", "phone", "deleted", "created", "updated"},
		Row: func(s map[string]any, c *ctx) []any {
			return []any{c.id(s), asText(s["name"]), asText(s["phone"]), asFlag(s["deleted"]), ts(s["created"]), ts(s["updated"])}
		},
		Links: []linkSpec{{Table: "order_booker_companies", Self: "order_booker", Other: "company", Field: "company", Target: "companies"}},
	},
	{
		Source:  "items",
		Table:   "items",
		Columns: []string{"id", "name", "category", "barcode", "display_id", "cost_price", "sale_price", "box_size_qty", "created", "updated"},
		Row: func(s map[string]any, c *ctx) []any {
			// The live PocketBase `items` has no barcode/display_id columns; the
			// destination does, so they land empty, exactly as the Node tool does.
			return []any{
				c.id(s), asText(s["name"]), c.rel("companies", asText(s["category"])),
				asText(s["barcode"]), asText(s["display_id"]),
				asFloat(s["cost_price"]), asFloat(s["sale_price"]), asFloat(s["box_size_qty"]),
				ts(s["created"]), ts(s["updated"]),
			}
		},
	},
	{
		Source:  "expenses",
		Table:   "expenses",
		Columns: []string{"id", "name", "description", "amount", "date", "created", "updated"},
		Row: func(s map[string]any, c *ctx) []any {
			return []any{c.id(s), asText(s["name"]), asText(s["description"]), money(s["amount"]), asText(s["date"]), ts(s["created"]), ts(s["updated"])}
		},
	},
	{
		Source:  "invoices",
		Table:   "invoices",
		Columns: []string{"id", "type", "invoiceNo", "party", "booker", "invoice_maker", "dated", "duedate", "description", "discount_1", "discount_2", "discount_rs", "completed", "deleted", "created", "updated"},
		Row: func(s map[string]any, c *ctx) []any {
			var maker any
			if asText(s["invoice_maker"]) != "" {
				maker = c.maker
			}
			return []any{
				c.id(s), enumCode("invoice_types", s["type"]), asFloat(s["invoiceNo"]),
				c.rel("parties", asText(s["party"])), c.rel("order_bookers", asText(s["booker"])),
				maker, asText(s["dated"]), asText(s["duedate"]), asText(s["description"]),
				asFloat(s["discount_1"]), asFloat(s["discount_2"]), money(s["discount_rs"]),
				asFlag(s["completed"]), asFlag(s["deleted"]), ts(s["created"]), ts(s["updated"]),
			}
		},
		Attributed: func(s map[string]any) bool { return asText(s["invoice_maker"]) != "" },
	},
	{
		Source:  "invoices_return_reference",
		Table:   "invoices_return_reference",
		Columns: []string{"id", "original_invoices", "created", "updated"},
		Row: func(s map[string]any, c *ctx) []any {
			return []any{c.id(s), c.rel("invoices", asText(s["original_invoices"])), ts(s["created"]), ts(s["updated"])}
		},
	},
	{
		Source:  "transactions",
		Table:   "transactions",
		Columns: []string{"id", "invoice", "item", "cost_price", "price", "qty", "scheme", "discount_1", "discount_2", "discount_rs", "deleted", "created", "updated"},
		Row: func(s map[string]any, c *ctx) []any {
			return []any{
				c.id(s), c.rel("invoices", asText(s["invoice"])), c.rel("items", asText(s["item"])),
				asFloat(s["cost_price"]), asFloat(s["price"]), asFloat(s["qty"]), asFloat(s["scheme"]),
				asFloat(s["discount_1"]), asFloat(s["discount_2"]), money(s["discount_rs"]),
				asFlag(s["deleted"]), ts(s["created"]), ts(s["updated"]),
			}
		},
	},
	{
		Source:  "payments",
		Table:   "payments",
		Columns: []string{"id", "invoice", "party", "paid_to", "type", "amount", "paid", "payment_date", "description", "created", "updated"},
		Row: func(s map[string]any, c *ctx) []any {
			return []any{
				c.id(s), c.rel("invoices", asText(s["invoice"])), c.rel("parties", asText(s["party"])),
				c.rel("order_bookers", asText(s["paid_to"])), enumCode("payment_types", s["type"]),
				money(s["amount"]), asFlag(s["paid"]), asText(s["payment_date"]), asText(s["description"]),
				ts(s["created"]), ts(s["updated"]),
			}
		},
	},
}

// wipeOrder clears business tables in dependency order; WIPE_EXTRA also clears
// transient tables. `invoices` cascades `inv_doc`.
var wipeOrder = []string{
	"payments", "transactions", "invoices_return_reference", "invoices",
	"party_companies", "order_booker_companies", "items", "order_bookers",
	"parties", "expenses", "areas", "companies", "sections",
}

var wipeExtra = []string{"invoice_line_op", "invoice_create_key", "invoice_lock", "pagecache"}
