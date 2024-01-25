"use client";
import { expenseCreateForm } from "@/app/api/expenses";
import DataViewTable from "@/app/components/DataViewTable";
import { useState } from "react";
import { Group, Stack, TextInput, Text } from "@mantine/core";
import CreateRecord from "@/app/components/CreateRecord/CreateRecord";
import { IconZoomMoney } from "@tabler/icons-react";
import useCRUD from "@/app/api/useAPI";
import { DateInput} from "@mantine/dates";
import dataFilter from "@/app/components/functions/dataFilter";

const tableStructure = [
  { accessor: "id", hidden: true },
  { accessor: "description", sortable: true },
  { accessor: "amount", width: "5rem" },
  { accessor: "created",width: '12rem', sortable: true },
];

export default function Expenses() {
  const [fromDate, setFromDate] = useState<Date | null>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0)
  );
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [search, setSearch] = useState("");
  const expenses = useCRUD().fullList({ collection: "expenses" });
  const filteredData = dataFilter(
    [{ key: "", value: search }],
    expenses.data?.filter((pmt) => fromDate < new Date(pmt.created) && toDate > new Date(pmt.created))
  );
  return (
    <>
      <Group align='end'>
        <TextInput
          style={{ width: "10rem" }}
          label='Search'
          onChange={(value) => setSearch(value.target.value)}
          value={search}
        />
        <CreateRecord
          formStructure={expenseCreateForm}
          icon={<IconZoomMoney />}
          label={"Create New Expense"}
        />
      </Group>
      <Group mb={'sm'}>
        <DateInput value={fromDate} onChange={setFromDate} label='Date From' />
        <DateInput value={toDate} onChange={setToDate} label='Date To' />
      </Group>
      {expenses.isLoading && <h1>Loading...</h1>}
      {expenses.isError && <h2>{expenses.error.message}</h2>}
      {expenses.isSuccess && (
        <>
          <DataViewTable
          fz={'sm'}
          horizontalSpacing={4}
          verticalSpacing={4}
          height={'20em'}
            formstructure={expenseCreateForm}
            filter={[{ key: "", value: search }]}
            columns={tableStructure}
            data={filteredData}
          />
          <Group justify='end' style={{border:'1px solid darkgray', position: "relative", marginTop: "0rem", paddingRight: "1rem" }}>
            <Stack>
              <Text mt={0} mb={"xl"} size='xl' fw={700}>
                Total:{filteredData.reduce((sum, item) => sum + item.amount, 0)}
              </Text>
            </Stack>
          </Group>
        </>
      )}
    </>
  );
}
