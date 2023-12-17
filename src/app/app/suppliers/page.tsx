"use client";

import { useQuery } from "@tanstack/react-query";
import { listSuppliers } from "../../api/suppliers";
import { listItemCategories } from "../../api/itemCategories.js";
import TableGenerator from "../../components/TableGenerator";
import { FormGenerator } from "../../components/FormGenerator";

const tableStructure = {
  name: "Name",
  phone: 'Phone',
  items: 'Items'
};

const formStructure = {
  name: { type: "text", label: "Name" },
  phone:{ type: 'number', label: "Phone"},
};
const formSubmitHandler = {}   //TODO: this could be sent to FormGenerator that will either create or edit item according to form state

export default function Test(props) {
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers });

  if (suppliers.isSuccess) {
    console.log(suppliers.data)
    const modifiedTableData = suppliers.data.map((item) => {
      return {
        ...item,
        expand: {
          ...item.expand,
        },
      };
    });

    const completeFormStructureData = {
      ...formStructure,
      // category: {                        //// this code might be needed for items sold by supplier
      //   type: "select",
      //   label: "Category",
      //   data: categories.data.map((dat) => ({ value: dat.id, label: dat.name })),
      // },
    };
    return (
      <>
        <FormGenerator formStructure={completeFormStructureData} />
        <TableGenerator
          data={modifiedTableData}
          formStructure={completeFormStructureData}
          tableStructure={tableStructure}
        />
      </>
    );
  } else if (suppliers.isLoading || categories.isLoading) {
    return <h1>Loading</h1>;
  } else if (suppliers.isError || categories.isError) {
    return <h2>{suppliers.error.message || categories.error.message}</h2>;
  } else
    return (
      <>
        <h1>What is happening?</h1>
      </>
    );
}
