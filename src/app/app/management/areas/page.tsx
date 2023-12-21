"use client";
import { useAreas } from "@/app/api/areas";
import { DataTable, DataTableColumn } from "mantine-datatable";
import InfoViewModal from "./InfoViewModal";

// { name: "id", label: "ID", type: "autocomplete", collection: "areas" },
const formStructure = {
  items: [
    { name: "id", label: "ID", type: "number", defaultValue: 6711003 },
    { name: "name", label: "NAME", type: "text", defaultValue: "testing name String" },
    { name: "created", label: "CREATED", type: "text", defaultValue: "testing date String" },
  ],
};
const tableStructure: DataTableColumn[] = [
  { accessor: "id", title: "Identity", sortable: true },
  { accessor: "name" },
  { accessor: "created" },
];
export default function Areas() {
  const areas = useAreas();
  return (
    <>
      <InfoViewModal formStructure={formStructure} component='button'>
        Show Test modal
      </InfoViewModal>
      {areas.isLoading && <h1>Loading...</h1>}
      {areas.isError && <h2>{areas.error.message}</h2>}
      {areas.isSuccess && (
        <DataTable withTableBorder withColumnBorders columns={tableStructure} records={areas.data} />
      )}
    </>
  );
}
