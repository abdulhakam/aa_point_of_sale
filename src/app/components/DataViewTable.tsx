"use client";

import { DataTable, DataTableColumn, DataTableProps, type DataTableSortStatus } from "mantine-datatable";
import sortBy from "lodash.sortBy";
import { useEffect, useState } from "react";
import dataFilter from "./functions/dataFilter";
import { ActionIcon, Group, Modal } from "@mantine/core";
import { IconEdit, IconEye, IconTrash } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import FormGenerator from "./FormGenerator";
import { crud } from "../api/useAPI";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function DataViewTable(
 props: {
  data?: any[];
  filter?: any;
  formstructure?: any;
  report?: boolean;
 } & DataTableProps
) {
 const qc = useQueryClient();
 const [opened, { open, close }] = useDisclosure(false);
 const [formData, setFormData] = useState();
 const [editable, setEditable] = useState(false);
 const remove = useMutation({
  mutationFn: crud.remove,
  onSuccess: () => {
   qc.invalidateQueries();
  },
 });
 const [sortStatus, setSortStatus] = useState({
  columnAccessor: "name",
  direction: "asc",
 } as DataTableSortStatus);
 const [records, setRecords] = useState(sortBy(props.data, "name"));
 useEffect(() => {
  const data = sortBy(dataFilter(props.filter ? props.filter : [], props.data), sortStatus.columnAccessor);
  setRecords(sortStatus.direction === "desc" ? data.reverse() : data);
 }, [sortStatus, props.filter, props.data]);
 const rowActions: DataTableColumn = {
  accessor: "actions",
  width: "6rem",
  title: "Row actions",
  render: (data) => (
   <Group gap={2} justify='right' wrap='nowrap'>
    <ActionIcon
     size='sm'
     variant='subtle'
     color='green'
     onClick={() => showModal({ data, action: "view" })}
    >
     <IconEye size={16} />
    </ActionIcon>
    <ActionIcon
     size='sm'
     variant='subtle'
     color='blue'
     onClick={() => showModal({ data, action: "edit" })}
    >
     <IconEdit size={16} />
    </ActionIcon>
    <ActionIcon
     size='sm'
     variant='subtle'
     color='red'
     onClick={() => showModal({ data, action: "delete" })}
    >
     <IconTrash size={16} />
    </ActionIcon>
   </Group>
  ),
 };
 const showModal = ({ data, action = "view" }) => {
  switch (action) {
   case "view":
    open();
    setFormData(data);
    setEditable(false);
    break;
   case "edit":
    open();
    setFormData(data);
    setEditable(true);
    break;
   case "delete":
    remove.mutate({ collection: props.formstructure.collectionName, recordID: data.id });
    break;
   default:
    open();
    setFormData(data);
    setEditable(false);
    break;
  }
 };
 const columns = props.report ? [...props.columns] : [...props.columns, rowActions];
 return (
  <>
   <DataTable
   {...props}
    style={{ border: "1px solid gray", borderRadius: "3px" }}
    withTableBorder
    withColumnBorders
    records={records}
    columns={columns}
    emptyState={<></>}
    defaultColumnRender={(row, _, accessor) => {
     return row.hasOwnProperty("expand")
      ? row.expand.hasOwnProperty(accessor)
       ? row.expand[accessor].name || row.expand[accessor].value
       : row[accessor]
      : row[accessor];
    }}
    sortStatus={sortStatus}
    onSortStatusChange={setSortStatus}
   />
   <Modal
    centered
    size={"auto"}
    opened={opened}
    onClose={close}
    title={editable ? "Edit Info" : "View Info"}
   >
    <FormGenerator
     close={close}
     editable={editable}
     data={formData}
     formStructure={props.formstructure}
    />
   </Modal>
  </>
 );
}