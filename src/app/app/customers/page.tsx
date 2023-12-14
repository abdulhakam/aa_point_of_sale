"use client";

import { useQuery } from "@tanstack/react-query";
import { ViewTable } from "../../components/ViewTable";
import { listCustomers } from "../../api/customers";
import { CreateCustomerModal } from "./CustomerView";

const tableStructure = {id:"id", name: "Name", phone: "Phone Number", address: "Address" , area: "Area"};
export default function Test(props) {
  const customers = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const { data, isLoading, isError, error, isSuccess,isRefetching} = customers;
  return (
    <>
    <CreateCustomerModal/>
      {isLoading && <h1>Loading</h1>}
      {isError && <h1>{error.message}</h1>}
      {isSuccess && <ViewTable data={data} tableStructure={tableStructure} expanded={['area']}/>}
    </>
  );
}
