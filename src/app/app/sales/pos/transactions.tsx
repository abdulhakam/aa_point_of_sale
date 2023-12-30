"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import FormGenerator from "@/app/components/FormGenerator";
import { useDisclosure } from "@mantine/hooks";
import { transactionFormStructure, useTransactions } from "@/app/api/transactions";
import useCRUD from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import { useQueryClient } from "@tanstack/react-query";

const tableStructure: DataTableColumn[] = [
  { accessor: "id", hidden: true },
  { accessor: "invoice", hidden: true },
  { accessor: "count",width: "4%", title: "#", sortable: true },
  { accessor: "item", width: "50%", sortable: false },
  { accessor: "qty", width: "8%", sortable: false },
  { accessor: "price", width: "10%", sortable: false },
  { accessor: "discount_1", width: "8%", sortable: false },
  { accessor: "discount_2", width: "8%", sortable: false },
  { accessor: "total", width: "10%", sortable: false },
];

export default function Transactions({ invoice }) {
  const queryClient = useQueryClient()
  queryClient.invalidateQueries()
  const transactions = useCRUD().fullList({
    collection: "transaction_view",
    expand: "item",
    filter: `invoice="${invoice}"`,
  });
  const dataWithCount = transactions.data?.map(((tr,index)=>({...tr,count:index+1})))
  const queries = [transactions];
  if (checkSuccess(queries)) {
    return (
      <>
        <DataViewTable
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
