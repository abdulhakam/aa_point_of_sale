"use client";
import { useQuery } from "@tanstack/react-query";
import ReportTable from "../ReportTable";
import { listItems } from "@/app/api/items";

// {keyOfInputDataRow: "Header of the table"}

export default function AllItems(props) {
  const tableStructure = {
    name: "Name",
    cost_price: "CP",
    sale_price: "SP",
    qty: "Quantity",
    box_size_qty: "Box Size",
    category: "Category",
  };
  const items = useQuery({
    queryKey: ["items"],
    queryFn: listItems,
  });
  const { data, isError, error, isSuccess, isLoading } = items;
  return (
    <>
      {isLoading && <h1>LOADING...</h1>}
      {isError && <h1>{error.message}</h1>}
      {isSuccess && <ReportTable tableStructure={tableStructure} data={data} expanded={['qty','category']}/>}
    </>
  );
}
