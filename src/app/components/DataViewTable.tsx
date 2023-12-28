"use client";

import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import sortBy from "lodash.sortBy";
import { useEffect, useState } from "react";
import { ActionIcon, Box, Group, Modal } from "@mantine/core";

import { IconEye, IconEdit, IconTrash } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import FormGenerator from "@/app/components/FormGenerator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function DataViewTable(props) {
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const deleteEntry = useMutation({
    mutationFn: props.formStructure.onDelete,
    onSuccess: () => {
      queryClient.invalidateQueries(props.formStructure.queryKey);
      close()
    },
  });
  const [formData, setFormData] = useState({});
  const [formEditing, setFormEditing] = useState(false);
  function showModal({ data, action }) {
    if (action === "view") {
      setFormData(data);
      setFormEditing(false);
      open();
    }
    if (action === "edit") {
      setFormData(data);
      setFormEditing(true);
      open();
    }
    if (action === "delete") {
      deleteEntry.mutate(data);
    }
  }
  const [sortStatus, setSortStatus] = useState({
    columnAccessor: "name",
    direction: "asc",
  } as DataTableSortStatus);
  const [records, setRecords] = useState(sortBy(props.data, "name"));
  useEffect(() => {
    const data = sortBy(newFilter(props.filter ? props.filter : [], props.data), sortStatus.columnAccessor);
    setRecords(sortStatus.direction === "desc" ? data.reverse() : data);
  }, [sortStatus, props.filter, props.data]);

  return (
    <>
      <DataTable
      style={{border:'1px solid lightgray',borderRadius:'5px'}}
        withTableBorder
        withColumnBorders
        records={records}
        columns={props.columns}
        defaultColumnRender={(row, _, accessor) => {
          return row.hasOwnProperty("expand")
            ? row.expand.hasOwnProperty(accessor)
              ? row.expand[accessor].name || row.expand[accessor].value
              : row[accessor]
            : row[accessor];
        }}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        {...props}
      />
      <Modal centered size={"auto"} opened={opened} onClose={close}>
        <FormGenerator
          close={close}
          editable={formEditing}
          formStructure={props.formStructure}
          data={formData}
        />
      </Modal>
    </>
  );
}
//TODO: tobe removed in near future code cleanups
// function filterData(filters = [], data = []) {
//   return data.filter((item) => {
//     return filters.every((filter) => {
//       const { key, value } = filter;

//       if (key === "") {
//         // If key is empty, search in all fields
//         return Object.values(item).some((field) => {
//           if (typeof field === "string") {
//             return field.toLowerCase().includes(value.toLowerCase());
//           } else if (typeof field === "number" && !isNaN(value)) {
//             return field === Number(value);
//           }
//           return false;
//         });
//       } else if (typeof item[key] === "string" && typeof value === "string") {
//         return item[key].toLowerCase().includes(value.toLowerCase());
//       } else if (typeof item[key] === "number" && !isNaN(value)) {
//         return item[key] === Number(value);
//       }

//       return false;
//     });
//   });
// }

function newFilter(filters = [], data = []) {
  function getExpandedValue(item, property) {
    return item.hasOwnProperty("expand")
      ? item.expand.hasOwnProperty(property)
        ? item.expand[property].name || item.expand[property].value
        : item[property]
      : item[property];
  }

  return data.filter((item) => {
    return filters.every((filter) => {
      const { key, value } = filter;

      if (key === "") {
        // If key is empty, search in all fields
        return Object.keys(item).some((property) => {
          const expandedValue = getExpandedValue(item, property);

          if (typeof expandedValue === "string") {
            return expandedValue.toLowerCase().includes(value.toLowerCase());
          } else if (typeof expandedValue === "number" && !isNaN(value)) {
            return expandedValue === Number(value);
          }
          return false;
        });
      } else {
        const expandedValue = getExpandedValue(item, key);

        if (typeof expandedValue === "string" && typeof value === "string") {
          return expandedValue.toLowerCase().includes(value.toLowerCase());
        } else if (typeof expandedValue === "number" && !isNaN(value)) {
          return expandedValue === Number(value);
        }
        return false;
      }
    });
  });
}

