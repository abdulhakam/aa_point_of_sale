"use client";

import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import sortBy from "lodash.sortBy";
import { useEffect, useState } from "react";
import dataFilter from "./functions/dataFilter";

export default function ReportViewTable(props) {
  const [sortStatus, setSortStatus] = useState({
    columnAccessor: "created",
    direction: "asc",
  } as DataTableSortStatus);
  const [records, setRecords] = useState(sortBy(props.data, "name"));
  useEffect(() => {
    const data = sortBy(dataFilter(props.filter ? props.filter : [], props.data), sortStatus.columnAccessor);
    setRecords(sortStatus.direction === "desc" ? data.reverse() : data);
  }, [sortStatus, props.filter, props.data]);
  const columns = props.columns;

  return (
    <>
      <DataTable
        withTableBorder
        withColumnBorders
        records={records}
        columns={columns}
        emptyState={props.emptyState || <></>}
        rowStyle={props.rowStyle}
        defaultColumnRender={(row, _, accessor) => {
          return row.hasOwnProperty("expand")
            ? row.expand.hasOwnProperty(accessor)
              ? row.expand[accessor].name || row.expand[accessor].value
              : row[accessor]
            : row[accessor];
        }}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        sortIcons={{
          sorted: <></>,
          unsorted: <></>,
        }}
      />
    </>
  );
}
