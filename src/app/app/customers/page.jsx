"use client";

import { useQuery } from "@tanstack/react-query";
import { ViewTable } from "../../components/ViewTable";
import { listCustomers } from "../../api/customers";

import { CreateCustomerModal } from "./CustomerView";

import { listAreas } from "../../api/areas";
const tableStructure = { id: "id", name: "Name", phone: "Phone Number", address: "Address", area: "Area" };
export default function CustomersPage(props) {
  const customers = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const areaQuery = useQuery({ queryKey: ["areas"], queryFn: listAreas });
  const { data, isLoading, isError, error, isSuccess, isRefetching } = customers;
  return (
    <>
      {areaQuery.isLoading && <h1>.</h1>}
      {areaQuery.isError && <h1>{error.message}</h1>}
      {areaQuery.isSuccess && <CreateCustomerModal areas={areaQuery.data} />}
      {isLoading && <h1>Loading</h1>}
      {isError && <h1>{error.message}</h1>}
      {isSuccess && <ViewTable data={data} tableStructure={tableStructure} expanded={["area"]} />}
    </>
  );
}
