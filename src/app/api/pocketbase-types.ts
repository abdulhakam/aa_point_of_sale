/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Areas = "areas",
	Categories = "categories",
	CountsForRowNumbers = "counts_for_row_numbers",
	Expenses = "expenses",
	InvoiceView = "invoice_view",
	Invoices = "invoices",
	InvoicesReturnReference = "invoices_return_reference",
	Items = "items",
	ItemsReport = "items_report",
	LedgerArea = "ledger_area",
	LedgerJournal = "ledger_journal",
	LedgerParty = "ledger_party",
	NetPrice = "net_price",
	OrderBookers = "order_bookers",
	Parties = "parties",
	Payments = "payments",
	PaymentsInvoicesReport = "payments_invoices_report",
	PaymentsView = "payments_view",
	Sections = "sections",
	TransactionView = "transaction_view",
	Transactions = "transactions",
	TransactionsReport = "transactions_report",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	created: IsoDateString
	updated: IsoDateString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AreasRecord = {
	deleted?: boolean
	name?: string
	section?: RecordIdString
}

export type CategoriesRecord = {
	deleted?: boolean
	name?: string
}

export type CountsForRowNumbersRecord<Tareas = unknown, Tcategories = unknown, Titems = unknown, Torder_bookers = unknown, Tparties = unknown, Tpurchase_invoices = unknown, Trecieving_payments = unknown, Treturn_invoices = unknown, Tsale_invoices = unknown, Tsections = unknown, Tsending_payments = unknown> = {
	areas?: null | Tareas
	categories?: null | Tcategories
	items?: null | Titems
	order_bookers?: null | Torder_bookers
	parties?: null | Tparties
	purchase_invoices?: null | Tpurchase_invoices
	recieving_payments?: null | Trecieving_payments
	return_invoices?: null | Treturn_invoices
	sale_invoices?: null | Tsale_invoices
	sections?: null | Tsections
	sending_payments?: null | Tsending_payments
}

export type ExpensesRecord = {
	amount?: number
	date?: IsoDateString
	description?: string
	name?: string
}

export enum InvoiceViewTypeOptions {
	"purchase" = "purchase",
	"sale" = "sale",
	"return" = "return",
}
export type InvoiceViewRecord<Tdated = unknown, Tfinal_total = unknown, Ttotal = unknown, Tunrounded_total = unknown> = {
	booker?: RecordIdString
	completed?: boolean
	dated?: null | Tdated
	deleted?: boolean
	description?: string
	discount_1?: number
	discount_2?: number
	discount_rs?: number
	duedate?: IsoDateString
	final_total?: null | Tfinal_total
	invoiceNo?: number
	invoice_maker?: RecordIdString
	party?: RecordIdString
	total?: null | Ttotal
	type?: InvoiceViewTypeOptions
	unrounded_total?: null | Tunrounded_total
}

export enum InvoicesTypeOptions {
	"purchase" = "purchase",
	"sale" = "sale",
	"return" = "return",
}
export type InvoicesRecord = {
	booker?: RecordIdString
	completed?: boolean
	dated?: IsoDateString
	deleted?: boolean
	description?: string
	discount_1?: number
	discount_2?: number
	discount_rs?: number
	duedate?: IsoDateString
	invoiceNo?: number
	invoice_maker?: RecordIdString
	party?: RecordIdString
	type?: InvoicesTypeOptions
}

export type InvoicesReturnReferenceRecord = {
	original_invoices?: RecordIdString
}

export type ItemsRecord = {
	box_size_qty?: number
	category?: RecordIdString
	cost_price?: number
	name?: string
	sale_price?: number
}

export type ItemsReportRecord<Tqty = unknown> = {
	box_size_qty?: number
	category?: RecordIdString
	cost_price?: number
	name?: string
	qty?: null | Tqty
	sale_price?: number
}

export enum LedgerAreaTypeOptions {
	"sending" = "sending",
	"recieving" = "recieving",
	"return" = "return",
}
export type LedgerAreaRecord<Tbalance = unknown, Tcredit = unknown, Tdated = unknown, Tdebit = unknown> = {
	balance?: null | Tbalance
	credit?: null | Tcredit
	dated?: null | Tdated
	debit?: null | Tdebit
	description?: string
	invoice?: RecordIdString
	paid?: boolean
	party?: RecordIdString
	type?: LedgerAreaTypeOptions
}

export type LedgerJournalRecord<Taccount_type = unknown, Taccounts_payable = unknown, Taccounts_recievable = unknown, Tcash = unknown, Tdescription = unknown, TinvoiceNo = unknown, Tparty_type = unknown, Tstock = unknown, Ttransaction_type = unknown> = {
	account_type?: null | Taccount_type
	accounts_payable?: null | Taccounts_payable
	accounts_recievable?: null | Taccounts_recievable
	cash?: null | Tcash
	description?: null | Tdescription
	invoiceNo?: null | TinvoiceNo
	party_type?: null | Tparty_type
	stock?: null | Tstock
	transaction_type?: null | Ttransaction_type
}

export enum LedgerPartyTypeOptions {
	"sending" = "sending",
	"recieving" = "recieving",
	"return" = "return",
}
export type LedgerPartyRecord<Tbalance = unknown, Tcredit = unknown, Tdated = unknown, Tdebit = unknown> = {
	balance?: null | Tbalance
	credit?: null | Tcredit
	dated?: null | Tdated
	debit?: null | Tdebit
	description?: string
	invoice?: RecordIdString
	paid?: boolean
	party?: RecordIdString
	type?: LedgerPartyTypeOptions
}

export type NetPriceRecord<Tnet_price = unknown, Tqty = unknown> = {
	box_size_qty?: number
	company?: RecordIdString
	cost_price?: number
	name?: string
	net_price?: null | Tnet_price
	qty?: null | Tqty
	sale_price?: number
}

export type OrderBookersRecord = {
	company?: RecordIdString[]
	deleted?: boolean
	name?: string
	phone?: string
}

export enum PartiesTypeOptions {
	"supplier" = "supplier",
	"customer" = "customer",
}
export type PartiesRecord = {
	address?: string
	area?: RecordIdString
	company?: RecordIdString[]
	deleted?: boolean
	name?: string
	phone?: string
	type?: PartiesTypeOptions
}

export enum PaymentsTypeOptions {
	"sending" = "sending",
	"recieving" = "recieving",
	"return" = "return",
}
export type PaymentsRecord = {
	amount?: number
	description?: string
	invoice?: RecordIdString
	paid?: boolean
	party?: RecordIdString
	payment_date?: IsoDateString
	type?: PaymentsTypeOptions
}

export enum PaymentsInvoicesReportPartyTypeOptions {
	"supplier" = "supplier",
	"customer" = "customer",
}
export type PaymentsInvoicesReportRecord<Tamount = unknown, Tcompany = unknown, Tdated = unknown, Ttype = unknown> = {
	amount?: null | Tamount
	area?: RecordIdString
	booker?: RecordIdString
	company?: null | Tcompany
	dated?: null | Tdated
	description?: string
	invoice?: RecordIdString
	invoiceNo?: number
	invoice_maker?: RecordIdString
	original_invoice?: RecordIdString
	paid?: boolean
	party?: RecordIdString
	party_type?: PaymentsInvoicesReportPartyTypeOptions
	section?: RecordIdString
	type?: null | Ttype
}

export enum PaymentsViewPartyTypeOptions {
	"supplier" = "supplier",
	"customer" = "customer",
}

export enum PaymentsViewTypeOptions {
	"sending" = "sending",
	"recieving" = "recieving",
	"return" = "return",
}
export type PaymentsViewRecord<Tamount = unknown, Tpayment_date = unknown> = {
	amount?: null | Tamount
	area?: RecordIdString
	booker?: RecordIdString
	company?: RecordIdString[]
	description?: string
	invoice?: RecordIdString
	invoiceNo?: number
	invoice_maker?: RecordIdString
	original_invoices?: RecordIdString
	paid?: boolean
	party?: RecordIdString
	party_type?: PaymentsViewPartyTypeOptions
	payment_date?: null | Tpayment_date
	section?: RecordIdString
	type?: PaymentsViewTypeOptions
}

export type SectionsRecord = {
	name?: string
}

export enum TransactionViewTypeOptions {
	"purchase" = "purchase",
	"sale" = "sale",
	"return" = "return",
}

export enum TransactionViewPartyTypeOptions {
	"supplier" = "supplier",
	"customer" = "customer",
}
export type TransactionViewRecord<Tnet_amount = unknown, Tprofit = unknown, Ttotal = unknown> = {
	area?: RecordIdString
	cost_price?: number
	deleted?: boolean
	discount_1?: number
	discount_2?: number
	discount_rs?: number
	inv_d1?: number
	inv_d2?: number
	inv_drs?: number
	invoice: RecordIdString
	invoiceNo?: number
	item: RecordIdString
	net_amount?: null | Tnet_amount
	party?: RecordIdString
	party_type?: TransactionViewPartyTypeOptions
	price?: number
	profit?: null | Tprofit
	qty?: number
	scheme?: number
	section?: RecordIdString
	total?: null | Ttotal
	type?: TransactionViewTypeOptions
}

export type TransactionsRecord = {
	cost_price?: number
	deleted?: boolean
	discount_1?: number
	discount_2?: number
	discount_rs?: number
	invoice: RecordIdString
	item: RecordIdString
	price?: number
	qty?: number
	scheme?: number
}

export enum TransactionsReportTypeOptions {
	"purchase" = "purchase",
	"sale" = "sale",
	"return" = "return",
}

export enum TransactionsReportPartyTypeOptions {
	"supplier" = "supplier",
	"customer" = "customer",
}
export type TransactionsReportRecord<Tfinal_amount = unknown, Tnet_amount = unknown, Tprofit = unknown, Ttotal = unknown> = {
	area?: RecordIdString
	booker?: RecordIdString
	company?: RecordIdString
	cost_price?: number
	deleted?: boolean
	discount_1?: number
	discount_2?: number
	discount_rs?: number
	final_amount?: null | Tfinal_amount
	inv_d1?: number
	inv_d2?: number
	inv_drs?: number
	invoice: RecordIdString
	invoiceNo?: number
	item: RecordIdString
	net_amount?: null | Tnet_amount
	party?: RecordIdString
	party_type?: TransactionsReportPartyTypeOptions
	price?: number
	profit?: null | Tprofit
	qty?: number
	scheme?: number
	section?: RecordIdString
	total?: null | Ttotal
	type?: TransactionsReportTypeOptions
}

export type UsersRecord = {
	avatar?: string
	name?: string
}

// Response types include system fields and match responses from the PocketBase API
export type AreasResponse<Texpand = unknown> = Required<AreasRecord> & BaseSystemFields<Texpand>
export type CategoriesResponse<Texpand = unknown> = Required<CategoriesRecord> & BaseSystemFields<Texpand>
export type CountsForRowNumbersResponse<Tareas = unknown, Tcategories = unknown, Titems = unknown, Torder_bookers = unknown, Tparties = unknown, Tpurchase_invoices = unknown, Trecieving_payments = unknown, Treturn_invoices = unknown, Tsale_invoices = unknown, Tsections = unknown, Tsending_payments = unknown, Texpand = unknown> = Required<CountsForRowNumbersRecord<Tareas, Tcategories, Titems, Torder_bookers, Tparties, Tpurchase_invoices, Trecieving_payments, Treturn_invoices, Tsale_invoices, Tsections, Tsending_payments>> & BaseSystemFields<Texpand>
export type ExpensesResponse<Texpand = unknown> = Required<ExpensesRecord> & BaseSystemFields<Texpand>
export type InvoiceViewResponse<Tdated = unknown, Tfinal_total = unknown, Ttotal = unknown, Tunrounded_total = unknown, Texpand = unknown> = Required<InvoiceViewRecord<Tdated, Tfinal_total, Ttotal, Tunrounded_total>> & BaseSystemFields<Texpand>
export type InvoicesResponse<Texpand = unknown> = Required<InvoicesRecord> & BaseSystemFields<Texpand>
export type InvoicesReturnReferenceResponse<Texpand = unknown> = Required<InvoicesReturnReferenceRecord> & BaseSystemFields<Texpand>
export type ItemsResponse<Texpand = unknown> = Required<ItemsRecord> & BaseSystemFields<Texpand>
export type ItemsReportResponse<Tqty = unknown, Texpand = unknown> = Required<ItemsReportRecord<Tqty>> & BaseSystemFields<Texpand>
export type LedgerAreaResponse<Tbalance = unknown, Tcredit = unknown, Tdated = unknown, Tdebit = unknown, Texpand = unknown> = Required<LedgerAreaRecord<Tbalance, Tcredit, Tdated, Tdebit>> & BaseSystemFields<Texpand>
export type LedgerJournalResponse<Taccount_type = unknown, Taccounts_payable = unknown, Taccounts_recievable = unknown, Tcash = unknown, Tdescription = unknown, TinvoiceNo = unknown, Tparty_type = unknown, Tstock = unknown, Ttransaction_type = unknown, Texpand = unknown> = Required<LedgerJournalRecord<Taccount_type, Taccounts_payable, Taccounts_recievable, Tcash, Tdescription, TinvoiceNo, Tparty_type, Tstock, Ttransaction_type>> & BaseSystemFields<Texpand>
export type LedgerPartyResponse<Tbalance = unknown, Tcredit = unknown, Tdated = unknown, Tdebit = unknown, Texpand = unknown> = Required<LedgerPartyRecord<Tbalance, Tcredit, Tdated, Tdebit>> & BaseSystemFields<Texpand>
export type NetPriceResponse<Tnet_price = unknown, Tqty = unknown, Texpand = unknown> = Required<NetPriceRecord<Tnet_price, Tqty>> & BaseSystemFields<Texpand>
export type OrderBookersResponse<Texpand = unknown> = Required<OrderBookersRecord> & BaseSystemFields<Texpand>
export type PartiesResponse<Texpand = unknown> = Required<PartiesRecord> & BaseSystemFields<Texpand>
export type PaymentsResponse<Texpand = unknown> = Required<PaymentsRecord> & BaseSystemFields<Texpand>
export type PaymentsInvoicesReportResponse<Tamount = unknown, Tcompany = unknown, Tdated = unknown, Ttype = unknown, Texpand = unknown> = Required<PaymentsInvoicesReportRecord<Tamount, Tcompany, Tdated, Ttype>> & BaseSystemFields<Texpand>
export type PaymentsViewResponse<Tamount = unknown, Tpayment_date = unknown, Texpand = unknown> = Required<PaymentsViewRecord<Tamount, Tpayment_date>> & BaseSystemFields<Texpand>
export type SectionsResponse<Texpand = unknown> = Required<SectionsRecord> & BaseSystemFields<Texpand>
export type TransactionViewResponse<Tnet_amount = unknown, Tprofit = unknown, Ttotal = unknown, Texpand = unknown> = Required<TransactionViewRecord<Tnet_amount, Tprofit, Ttotal>> & BaseSystemFields<Texpand>
export type TransactionsResponse<Texpand = unknown> = Required<TransactionsRecord> & BaseSystemFields<Texpand>
export type TransactionsReportResponse<Tfinal_amount = unknown, Tnet_amount = unknown, Tprofit = unknown, Ttotal = unknown, Texpand = unknown> = Required<TransactionsReportRecord<Tfinal_amount, Tnet_amount, Tprofit, Ttotal>> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	areas: AreasRecord
	categories: CategoriesRecord
	counts_for_row_numbers: CountsForRowNumbersRecord
	expenses: ExpensesRecord
	invoice_view: InvoiceViewRecord
	invoices: InvoicesRecord
	invoices_return_reference: InvoicesReturnReferenceRecord
	items: ItemsRecord
	items_report: ItemsReportRecord
	ledger_area: LedgerAreaRecord
	ledger_journal: LedgerJournalRecord
	ledger_party: LedgerPartyRecord
	net_price: NetPriceRecord
	order_bookers: OrderBookersRecord
	parties: PartiesRecord
	payments: PaymentsRecord
	payments_invoices_report: PaymentsInvoicesReportRecord
	payments_view: PaymentsViewRecord
	sections: SectionsRecord
	transaction_view: TransactionViewRecord
	transactions: TransactionsRecord
	transactions_report: TransactionsReportRecord
	users: UsersRecord
}

export type CollectionResponses = {
	areas: AreasResponse
	categories: CategoriesResponse
	counts_for_row_numbers: CountsForRowNumbersResponse
	expenses: ExpensesResponse
	invoice_view: InvoiceViewResponse
	invoices: InvoicesResponse
	invoices_return_reference: InvoicesReturnReferenceResponse
	items: ItemsResponse
	items_report: ItemsReportResponse
	ledger_area: LedgerAreaResponse
	ledger_journal: LedgerJournalResponse
	ledger_party: LedgerPartyResponse
	net_price: NetPriceResponse
	order_bookers: OrderBookersResponse
	parties: PartiesResponse
	payments: PaymentsResponse
	payments_invoices_report: PaymentsInvoicesReportResponse
	payments_view: PaymentsViewResponse
	sections: SectionsResponse
	transaction_view: TransactionViewResponse
	transactions: TransactionsResponse
	transactions_report: TransactionsReportResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: 'areas'): RecordService<AreasResponse>
	collection(idOrName: 'categories'): RecordService<CategoriesResponse>
	collection(idOrName: 'counts_for_row_numbers'): RecordService<CountsForRowNumbersResponse>
	collection(idOrName: 'expenses'): RecordService<ExpensesResponse>
	collection(idOrName: 'invoice_view'): RecordService<InvoiceViewResponse>
	collection(idOrName: 'invoices'): RecordService<InvoicesResponse>
	collection(idOrName: 'invoices_return_reference'): RecordService<InvoicesReturnReferenceResponse>
	collection(idOrName: 'items'): RecordService<ItemsResponse>
	collection(idOrName: 'items_report'): RecordService<ItemsReportResponse>
	collection(idOrName: 'ledger_area'): RecordService<LedgerAreaResponse>
	collection(idOrName: 'ledger_journal'): RecordService<LedgerJournalResponse>
	collection(idOrName: 'ledger_party'): RecordService<LedgerPartyResponse>
	collection(idOrName: 'net_price'): RecordService<NetPriceResponse>
	collection(idOrName: 'order_bookers'): RecordService<OrderBookersResponse>
	collection(idOrName: 'parties'): RecordService<PartiesResponse>
	collection(idOrName: 'payments'): RecordService<PaymentsResponse>
	collection(idOrName: 'payments_invoices_report'): RecordService<PaymentsInvoicesReportResponse>
	collection(idOrName: 'payments_view'): RecordService<PaymentsViewResponse>
	collection(idOrName: 'sections'): RecordService<SectionsResponse>
	collection(idOrName: 'transaction_view'): RecordService<TransactionViewResponse>
	collection(idOrName: 'transactions'): RecordService<TransactionsResponse>
	collection(idOrName: 'transactions_report'): RecordService<TransactionsReportResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}
