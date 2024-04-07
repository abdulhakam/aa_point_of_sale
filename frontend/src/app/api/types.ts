// Define a generic type for the field object
export type Field<T> = {
  type: "autocomplete" | "datetime" | "text" | "number" | "checkbox" | "switch" | "select";
  default?: T;
  hidden?: boolean;
  baseProps: {
    label: string;
    data?: any[];
    searchable?: boolean;
    readOnly?: boolean;
    variant?: string;
    disabled?: boolean;
  };
};

// Define a generic type for the form structure object
export type FormStructure<T> = {
  fields: {
    [K in keyof T]: Field<T[K]>;
  };
  collectionName: string;
  collectionView?: string;
  onCreate: (data: T) => void;
  onUpdate: (data: T) => Promise<any> | void;
  onDelete: (data: T) => void;
};

export interface Users {
	avatar: string;
	created: string;
	email: string;
	emailVisibility: boolean;
	id: string;
	lastResetSentAt: string;
	lastVerificationSentAt: string;
	name: string;
	passwordHash: string;
	tokenKey: string;
	updated: string;
	username: string;
	verified: boolean;
}

export interface Sections {
	created: string;
	id: string;
	name: string;
	updated: string;
}

export interface Areas {
	created: string;
	id: string;
	name: string;
	section: string;
	updated: string;
	deleted: boolean;
}

export interface Categories {
	created: string;
	id: string;
	name: string;
	updated: string;
	deleted: boolean;
}

export interface Expenses {
	amount: number;
	created: string;
	description: string;
	id: string;
	name: string;
	updated: string;
	date: string;
}

export interface Parties {
	address: string;
	area: string;
	created: string;
	id: string;
	name: string;
	phone: string;
	type: string;
	updated: string;
	deleted: boolean;
	company: any[];
}

export interface OrderBookers {
	company: any[];
	created: string;
	id: string;
	name: string;
	phone: string;
	updated: string;
	deleted: boolean;
}

export interface Invoices {
	booker: string;
	completed: boolean;
	created: string;
	description: string;
	discount_1: number;
	discount_2: number;
	duedate: string;
	id: string;
	invoiceNo: number;
	invoice_maker: string;
	party: string;
	type: string;
	updated: string;
	deleted: boolean;
	dated: string;
	discount_rs: number;
}

export interface Items {
	category: string;
	cost_price: number;
	created: string;
	id: string;
	name: string;
	sale_price: number;
	updated: string;
	box_size_qty: number;
}

export interface Payments {
	amount: number;
	created: string;
	description: string;
	id: string;
	invoice: string;
	paid: boolean;
	party: string;
	type: string;
	updated: string;
	payment_date: string;
}

export interface Transactions {
	discount_1: number;
	discount_2: number;
	id: string;
	invoice: string;
	item: string;
	price: number;
	qty: number;
	scheme: number;
	updated: string;
	deleted: boolean;
	created: string;
	cost_price: number;
	discount_rs: number;
}

export interface InvoicesReturnReference {
	created: string;
	id: string;
	updated: string;
	original_invoices: string;
}
