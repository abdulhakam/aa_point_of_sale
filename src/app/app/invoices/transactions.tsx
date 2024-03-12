"use client";
import { DataTableColumn } from "mantine-datatable";
import DataViewTable from "@/app/components/DataViewTable";
import { transactionFormStructure } from "@/app/api/transactions";
import useCRUD, { crud } from "@/app/api/useAPI";
import StatusCheck, { checkSuccess } from "@/app/api/StatusCheck";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getQtyFromString, qtyDisplay } from "@/app/components/functions/qtyParser";
import { ActionIcon, Group, Modal } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { TransactionEditForm } from "./transactionsEditForm";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";

export default function Transactions({ invoice }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [formData, setFormData] = useState({});
  const qc = useQueryClient();
  useEffect(() => {
    qc.invalidateQueries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const remove = useMutation({
    mutationFn: crud.remove,
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
  const items = useCRUD().fullList({ collection: "items", expand: "category" });
  const transactions = useCRUD().fullList({
    collection: "transaction_view",
    expand: "item,invoice",
    sort: "+created",
    filter: `invoice="${invoice}"`,
  });
  const tableStructure: DataTableColumn[] = [
    { accessor: "id", hidden: true },
    { accessor: "invoice", hidden: true },
    { accessor: "count", width: "4%", title: "#", sortable: true },
    { accessor: "item", width: "40%", sortable: false },
    {
      accessor: "ctns",
      width: "5%",
      textAlign: "right",
      sortable: false,
      render: (record) => getQtyFromString(String(record.qty)).ctns,
    },
    {
      accessor: "units",
      width: "5%",
      textAlign: "right",
      sortable: false,
      render: (record) => getQtyFromString(String(record.qty)).units,
    },
    { accessor: "scheme", width: "8%", textAlign: "right", sortable: false },
    {
      accessor: "price",
      width: "8%",
      textAlign: "right",
      sortable: false,
      render: (r) => Number(r.price).toFixed(2),
    },
    {
      accessor: "discount_1",
      width: "8%",
      textAlign: "right",
      sortable: false,
      render: (r) => `${Number(r.discount_1).toFixed(2)}%`,
    },
    {
      accessor: "discount_2",
      width: "8%",
      textAlign: "right",
      sortable: false,
      render: (r) => `${Number(r.discount_2).toFixed(2)}%`,
    },
    {
      accessor: "discount_rs",
      width: "8%",
      textAlign: "right",
      sortable: false,
      render: (r) => `${Number(r.discount_rs).toFixed(2)}`,
    },
    {
      accessor: "total",
      width: "10%",
      textAlign: "right",
      sortable: false,
      render: (r) => `${Number(r.total).toFixed(2)}`,
    },
    {
      accessor: "actions",
      width: "4.5rem",
      sortable: false,
      render: (record) => (
        <Group gap={"0.1em"}>
          <ActionIcon m={0} size='sm' variant='outline' color='blue' onClick={() => showModal(record)}>
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            m={0}
            size='sm'
            variant='outline'
            color='red'
            onClick={() => remove.mutate({ collection: "transactions", recordID: record.id })}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ),
    },
  ];
  function showModal(data) {
    open();
    setFormData(data);
  }
  const dataWithCount = transactions.data?.map((tr, index) => ({
    ...tr,
    count: index + 1,
    qty: qtyDisplay(items.data?.find((itm) => itm.id === tr.item) || {}, tr.qty),
  }));
  const formStructure = { ...transactionFormStructure };
  formStructure.fields.item.baseProps.data = items.data?.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));
  const queries = [transactions, items];
  if (checkSuccess(queries)) {
    return (
      <>
        <Modal centered opened={opened} onClose={close} title='edit Transaction'>
          <TransactionEditForm type={transactions.data[0]?.expand?.invoice?.type} close={close} items={items.data} data={formData} />
        </Modal>
        <DataViewTable
          report
          verticalSpacing={"0.1rem"}
          horizontalSpacing={"0.1rem"}
          height={300}
          columns={tableStructure}
          formstructure={transactionFormStructure}
          data={dataWithCount}
          emptyState={<></>}
        />
      </>
    );
  } else return <StatusCheck check={queries} />;
}
