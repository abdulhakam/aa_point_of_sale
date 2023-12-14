"use client";

import { useQuery } from "@tanstack/react-query";
import { ViewTable } from "./ViewTable";
import { listCustomers } from "../api/customers";

const tableStructure = {id:"", name: "Name", phone: "Phone Number", address: "Address" , area: "Area"};
export default function Test(props) {
  const customers = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const { data, isLoading, isError, error, isSuccess } = customers;
  return (
    <>
      {isLoading && <h1>Loading</h1>}
      {isError && <h1>{error.message}</h1>}
      {isSuccess && <ViewTable data={data} tableStructure={tableStructure} />}
    </>
  );
}
