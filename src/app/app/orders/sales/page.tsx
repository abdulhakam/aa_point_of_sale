"use client";

import { DataTableColumn } from "mantine-datatable";
import OrderSheetForm from "../OrderSheetForm";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "name", sortable: true },
  { accessor: "price", sortable: true },
  { accessor: "qty", sortable: true },
  { accessor: "box_size_qty", sortable: true },
  { accessor: "category", sortable: true },
];

export default function Orders() {

    return (
      <>
        <OrderSheetForm type={"sale"} />
      </>
    );
}
