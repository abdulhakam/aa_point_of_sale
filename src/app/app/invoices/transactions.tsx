"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { transactionFormStructure } from "@/app/api/transactions";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import { useQueryClient } from "@tanstack/react-query";
import { qtyDisplay } from "@/app/components/functions/qtyParser";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "invoice", hidden: true },
  { accessor: "count", width: "4%", title: "#", sortable: true },
  { accessor: "item", width: "50%", sortable: false },
  { accessor: "qty", width: "8%", sortable: false },
  { accessor: "scheme", width: "8%", sortable: false },
  { accessor: "price", width: "10%", sortable: false },
  { accessor: "discount_1", width: "8%", sortable: false },
  { accessor: "discount_2", width: "8%", sortable: false },
  { accessor: "total", width: "10%", sortable: false },
];

export default function Transactions({ invoice }) {
  const queryClient = useQueryClient();
  queryClient.invalidateQueries();
  const items = useCRUD().fullList({ collection: "items", expand: "category" });
  const transactions = useCRUD().fullList({
    collection: "transaction_view",
    expand: "item",
    sort: "+created",
    filter: `invoice="${invoice}"`,
  });
  const dataWithCount = transactions.data?.map((tr, index) => ({
    ...tr,
    count: index + 1,
    qty: qtyDisplay(
      items.data.find((itm) => itm.id === tr.item),
      tr.qty
    ),
  }));
  const queries = [transactions];
  const formStructure = { ...transactionFormStructure };
  formStructure.fields.item.baseProps.data = items.data?.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));
  if (checkSuccess(queries)) {
    return (
      <>
        <DataViewTable
          height={300}
          filter={[{ key: "invoice", value: invoice }]}
          columns={tableStructure}
          formstructure={transactionFormStructure}
          data={dataWithCount}
          emptyState={<>new transaction form goes here</>}
        />
      </>
    );
  } else return <StatusCheck check={queries} />;
}
