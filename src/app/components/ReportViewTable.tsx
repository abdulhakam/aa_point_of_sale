"use client";

import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import sortBy from "lodash.sortBy";
import { useEffect, useState } from "react";
import dataFilter from "./functions/dataFilter";
import classes from "./tableclasses.module.css";

export default function ReportViewTable(props) {
  // const [sortStatus, setSortStatus] = useState({
  //   columnAccessor: "created",
  //   direction: "asc",
  // } as DataTableSortStatus);
  // const [records, setRecords] = useState(sortBy(props.data, "name"));
  // useEffect(() => {
  //   const data = sortBy(dataFilter(props.filter ? props.filter : [], props.data), sortStatus.columnAccessor);
  //   setRecords(sortStatus.direction === "desc" ? data.reverse() : data);
  // }, [sortStatus, props.filter, props.data]);
  // const columns = props.columns;

  return (
    <>
      <DataTable<any>
        fz={"xs"}
        verticalSpacing={0}
        horizontalSpacing={2}
        withTableBorder
        withColumnBorders
        borderColor={"black"}
        records={props.data}
        columns={[{ accessor: "no", title: "#", width: "1em", render: (_, i) => i + 1 }, ...props.columns]}
        rowStyle={props.rowStyle || null}
        defaultColumnRender={(row, _, accessor) => {
          return row.hasOwnProperty("expand")
            ? row.expand.hasOwnProperty(accessor)
              ? row.expand[accessor].name || row.expand[accessor].value
              : row[accessor]
            : row[accessor];
        }}
        classNames={{
          root: classes.root,
          table: classes.table,
          header: classes.header,
          footer: classes.footer,
          pagination: classes.pagination,
        }}
        // sortStatus={sortStatus}
        // onSortStatusChange={setSortStatus}
        // sortIcons={{
        //   sorted: <></>,
        //   unsorted: <></>,
        // }}
      />
    </>
  );
}
