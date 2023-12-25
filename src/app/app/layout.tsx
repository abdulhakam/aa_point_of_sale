"use client";

import { useQueries } from "@tanstack/react-query";
import HeaderSimple from "./HeaderSimple";
import NavbarMinimal from "./NavbarMinimal";
import { listAreas } from "../api/areas";
import { listCategories } from "../api/categories";
import { listAllInvoices } from "../api/invoices";
import { listItems } from "../api/items";
import { listOrderBookers } from "../api/order_bookers"
import { listOrderSheets } from "../api/order_sheets"
import { allOrders } from "../api/orders"
import { getParties } from "../api/parties"
import { allPayments } from "../api/payments"
import { getAllPermissions } from '../api/permissions'
import { allTransactions } from '../api/transactions'
import { listUsers } from '../api/users'
import {rowCounter} from '../api/row_counter'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useQueries({
    queries: [{ queryKey: ['areas'], queryFn: listAreas},
    { queryKey: ['categories'], queryFn: listCategories},
    { queryKey: ['invoices'], queryFn: listAllInvoices },
    { queryKey: ['items'], queryFn: listItems },
    { queryKey: ['order_bookers'], queryFn: listOrderBookers },
    { queryKey: ['order_sheets'], queryFn: listOrderSheets },
    { queryKey: ['orders'], queryFn: allOrders },
    { queryKey: ['parties'], queryFn: getParties },
    { queryKey: ['payments'], queryFn: allPayments },
    { queryKey: ['permissions'], queryFn: getAllPermissions },
    { queryKey: ['transactions'], queryFn: allTransactions },
    { queryKey: ['users'], queryFn: listUsers },
    { queryKey: ['row_counts'], queryFn:rowCounter}
  ]
  })
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <NavbarMinimal />
      <div style={{ width: "100%" }}>
        <HeaderSimple />
        {children}
      </div>
    </div>
  );
}
