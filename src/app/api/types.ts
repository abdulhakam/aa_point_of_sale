// Define a generic type for the field object
export type Field<T> = {
  type: string;
  default?: T;
  baseProps: {
    label: string;
    data?: T[];
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
  onCreate: (data: T) => void;
  onUpdate: (data: T) => void;
  onDelete: (data: T) => void;
};

// Define interfaces for the specific objects
export interface Party {
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

export interface Item {
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

export interface Area {
  created: Date;
  updated: Date;
  id: string;
  name: string;
  deleted: boolean;
}

export interface Category {
  created: Date;
  updated: Date;
  id: string;
  name: string;
  deleted: boolean;
}