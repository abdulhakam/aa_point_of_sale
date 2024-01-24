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

export interface CollectionItem {
  id: string;
  created: Date;
  updated: Date;
  // collectionID: string;
  // collectionName:string;
}
// Define interfaces for the specific objects
export interface Party extends CollectionItem {
  id: string;
  created: Date;
  updated: Date;
  name: string;
  type: "customer" | "supplier" | "both";
  area: string;
  phone: string;
  address: string;
  deleted: boolean;
}

export interface Item extends CollectionItem {
  created: Date;
  updated: Date;
  id: string;
  name: string;
  cost_price: number;
  sale_price: number;
  box_size_qty: number;
  qty: number;
  category: string;
}

export interface Area extends CollectionItem {
  created: Date;
  updated: Date;
  id: string;
  name: string;
  section:string;
  deleted: boolean;
}

export interface Category extends CollectionItem {
  created: Date;
  updated: Date;
  id: string;
  name: string;
  deleted: boolean;
}

export interface OrderBooker extends CollectionItem {
  created: Date;
  updated: Date;
  id: string;
  name: string;
  phone: string;
  deleted: boolean;
}

export interface Invoice extends CollectionItem {
  created: Date;
  updated: Date;
  id: string;
  invoice_maker: string;
  party: string;
  type: "purchase" | "sale";
  transactions: string[];
  total: number;
  discount_1: number;
  discount_2: number;
  total_after_discount: number;
  description: string;
  deleted: boolean;
}

export interface Transaction extends CollectionItem {
  created: Date;
  updated: Date;
  id: string;
  invoice: string;
  item: string;
  qty: number;
  scheme: number;
  price: number;
  discount_1: number;
  discount_2: number;
  total: number;
  deleted: boolean;
}

export interface Payment extends CollectionItem {
  id: string;
  created: Date;
  updated: Date;
  invoice: string;
  party: string;
  type: "recieving" | "sending";
  amount: number;
  paid:Boolean;
  description:string;
  deleted: boolean;
}
