"use client";

import { useQuery } from "@tanstack/react-query";
import { listItems } from "../api/items";
import TableGenerator from "./TableGenerator";
import { FormGenerator } from "./FormGenerator";

const tableStructure = {
  name: "Name",
  cost_price: "CP",
  sale_price: "SP",
  qty: "Quantity",
  box_size_qty: "Box Size",
  category: "Category",
};
const formStructure = {
  name: { type: "text", label: "Name" },
  cost_price: { type: "number", label: "CP" },
  sale_price: { type: "number", label: "SP" },
  qty: { type: "number", label: "Quantity" },
  box_size_qty: { type: "number", label: "Box Size" },
  category: {
    type: "select",
    label: "Category",
    data: [
      { value: "value 1", label: "label 1" },
      { value: "value 3", label: "label 3" },
      { value: "value 2", label: "label 2" },
    ],
  },
};
export default function Test(props) {
  const customers = useQuery({ queryKey: ["items"], queryFn: listItems });
  const { data, isLoading, isError, error, isSuccess } = customers;
  return (
    <>
      <FormGenerator formStructure={formStructure} />
      {isLoading && <h1>Loading</h1>}
      {isError && <h1>{error.message}</h1>}
      {isSuccess && <TableGenerator data={data} tableStructure={tableStructure} />}
    </>
  );
}
