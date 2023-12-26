import { transactionFormStructure, useTransactions } from "@/app/api/transactions";
import DataViewTable from "@/app/components/DataViewTable";

export default function TransactionTable(props) {
  const transactions = useTransactions().data;
  const records = transactions.filter((tr) => tr.invoice === props.invoiceNo) || [];
  const viewableRecords = records.map((r,index) => ({ ...r, name: r.expand.item.name,count:index+1 }));

  return (
    <>
      <DataViewTable
        columns={[
          { accessor: "count",title:'#', width: "12px" },
          { accessor: "name", title: "Item", width: "12rem" },
          { accessor: "price", width: "3rem" },
          { accessor: "qty", width: "3rem" },
          { accessor: "discount_1", width: "3rem" },
          { accessor: "discount_2", width: "3rem" },
          { accessor: "total", width: "3rem" },
        ]}
        data={viewableRecords}
        formStructure={transactionFormStructure}
      />
    </>
  );
}
