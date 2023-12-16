"use client";

import { useQuery } from "@tanstack/react-query";
import { listItems } from "../api/items";
import {listItemCategories} from '../api/itemCategories.js'
import TableGenerator from "./TableGenerator";
import { FormGenerator } from "./FormGenerator";
import { useState } from "react";

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
      //directly acquired query data from useQuery
    ],
  },
};
//TODO: REMOVE THE PROP DRILLING FOR FORM STRUCTURE
export default function Test(props) {
  const items = useQuery({ queryKey: ["items"], queryFn: listItems });
  const categories = useQuery({queryKey:["categories"],queryFn: listItemCategories})
  const completeStructure = {...formStructure,category:{type:"select",label:"Category",data:categories.data}}
  const { data, isLoading, isError, error, isSuccess } = items;
  return (
    <>
      {categories.isSuccess && <FormGenerator formStructure={completeStructure} />}
      {isLoading && <h1>Loading</h1>}
      {isError && <h1>{error.message}</h1>}
      {isSuccess && <TableGenerator data={data} formStructure={completeStructure} tableStructure={tableStructure} />}
    </>
  );
}
