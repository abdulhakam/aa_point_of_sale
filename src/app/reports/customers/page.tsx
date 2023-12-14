"use client";
import { useQuery } from "@tanstack/react-query";
import ReportTable from "../ReportTable";
import { listCustomers } from "@/app/api/customers";

// {keyOfInputDataRow: "Header of the table"}

export default function AllCustomers(props) {
  const tableStructure = { name: "Name", phone: "Phone Number",area:"Area", address: "Address" };
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
  });
  const { data, isError, error, isSuccess, isLoading } = customers;
  return (
    <>
      {isLoading && <h1>LOADING...</h1>}
      {isError && <h1>{error.message}</h1>}
      {isSuccess && <ReportTable tableStructure={tableStructure} data={data} expanded={['area']}/>}
    </>
  );
}
