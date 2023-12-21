"use client";

import { useQuery } from "@tanstack/react-query";
import { listItems } from "../../api/items";
import { listItemCategories } from "../../api/categories.js";
import TableGenerator from "../../components/TableGenerator";
import { FormGenerator } from "../../components/FormGenerator";

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
const formSubmitHandler = {}   //TODO: this could be sent to FormGenerator that will either create or edit item according to form state
function quantitesCalc(qty, boxSize) {
  const box = Number(BigInt(qty) / BigInt(boxSize));
  const piece = qty % boxSize;
  return `${box} ${box === 1 ? "box" : "boxes"} ${piece} ${piece === 1 ? "piece" : "pieces"} `;
}
export default function Test(props) {
  const items = useQuery({ queryKey: ["items"], queryFn: listItems });
  const categories = useQuery({ queryKey: ["categories"], queryFn: listItemCategories });

  if (items.isSuccess && categories.isSuccess) {
    const modifiedTableData = items.data.map((item) => {
      const mdata = {
        ...item,
        expand: {
          ...item.expand,
          qty: {
            ...item.expand.qty,
            name: `${item.expand.qty.value} (${quantitesCalc(item.expand.qty.value, item.box_size_qty)})`,
          },
        },
      };
      return mdata;
    });

    const completeFormStructureData = {
      ...formStructure,
      category: {
        type: "select",
        label: "Category",
        data: categories.data.map((dat) => ({ value: dat.id, label: dat.name })),
      },
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
  } else if (items.isLoading || categories.isLoading) {
    return <h1>Loading</h1>;
  } else if (items.isError || categories.isError) {
    return <h2>{items.error.message || categories.error.message}</h2>;
  } else
    return (
      <>
        <h1>What is happening?</h1>
      </>
    );
}
