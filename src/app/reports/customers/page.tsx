"use client";
import { useQuery } from "@tanstack/react-query";
import ReportTable from "../ReportTable";
import { listCustomers } from "@/app/app/customers/customers";

// {keyOfInputDataRow: "Header of the table"}

export default function AllCustomers() {
  const tableStructure = { name: "Name", phone: "Phone Number", address: "Address" };
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
  });
  const { data, isError, error, isSuccess, isLoading } = customers;

  return (
    <>
      {isLoading && <h1>LOADING...</h1>}
      {isError && <h1>{error.message}</h1>}
      {isSuccess && <ReportTable tableStructure={tableStructure} data={data} />}
    </>
  );
}
