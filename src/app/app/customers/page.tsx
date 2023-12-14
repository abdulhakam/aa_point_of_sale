"use client";
import CustomersTable from "./CustomersTable";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listCustomers } from "./customers";
import { CreateCustomerModal } from "./CustomerView";
export default function Customers() {
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers, 
  });
  const { data, isError, error, isSuccess, isLoading } = customers;
  const rowData = data?.map((cust) => {
    return { id: cust.id, name: cust.name, address: cust.address, phone: cust.phone ? cust.phone : "" };
  });
  if (isLoading) {
    return <h1>LOADING...</h1>;
  }
  if (isError) {
    return <h1>{error.message}</h1>;
  }
  if (isSuccess) {
    return (
      <>
        <CreateCustomerModal />
        <CustomersTable data={rowData} />
      </>
    );
  }
}
