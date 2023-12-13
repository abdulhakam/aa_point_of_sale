"use client";
import CustomersTable from "./CustomersTable";
import React from "react";
import pb from "../../pocketbase";
import { useQuery } from "@tanstack/react-query";

async function allCustomers() {
  return await pb.collection("customers").getFullList({
    sort: "+name",
  });
}

export default function Customers() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: allCustomers });
  const { data, isError, error, isSuccess, isLoading } = customers;
  const rowdata = data?.map((cust) => {
    return { name: cust.name, address: cust.address, number: cust.phone ? cust.phone : "" };
  });
  return (
    <>
      {isLoading && <h1>LOADING...</h1>}
      {isSuccess && <CustomersTable data={rowdata} />}
      {isError && <h1>{error.message}</h1>}
    </>
  );
}
