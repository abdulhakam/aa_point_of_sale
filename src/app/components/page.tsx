"use client";
import { useQuery } from "@tanstack/react-query";
import ReportTable from "./ReportTable";
import { Container, Grid, Table, TableData } from "@mantine/core";
import { useState } from "react";
import { DateInput, DatePicker } from "@mantine/dates";
import { listItems } from "../api/items";

const tableData: TableData = {
  caption: "Some elements from periodic table",
  head: ["Element position", "Atomic mass", "Symbol", "Element name"],
  body: [
    [6, 12.011, "C", "Carbon"],
    [7, 14.007, "N", "Nitrogen"],
    [39, 88.906, "Y", "Yttrium"],
    [56, 137.33, "Ba", "Barium"],
    [58, 140.12, "Ce", "Cerium"],
  ],
};

// function Demo() {
//   return <Table data={tableData} />;
// }

export default function AllItems(props) {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const items = useQuery({
    queryKey: ["items"],
    queryFn: listItems,
  });
  const { data, isError, error, isSuccess, isLoading } = items;
  return (
    <>
      <Container>
        <DatePicker
          size='xs'
          defaultDate={new Date(2023, 12)}
          defaultLevel='month'
          firstDayOfWeek={6}
          weekendDays={[5]}
          type='range'
          allowSingleDateInRange
          value={dateRange}
          onChange={setDateRange}
          minDate={new Date(2022, 1, 1)}
          maxDate={new Date()}
        />
      </Container>
      {isLoading && <h1>LOADING...</h1>}
      {isError && <h1>{error.message}</h1>}
      {isSuccess && <ReportTable/>}
    </>
  );
}
