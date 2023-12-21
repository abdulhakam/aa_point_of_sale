import { Container, NumberInput, Select, Table } from "@mantine/core";

export default function Transactions(props) {
  const transactionsTable = [
    "id",
    "invoice",
    "item",
    "qty",
    "price",
    "discount_1",
    "discount_2",
    "total",
    "deleted",
  ];
  const transactionFormData = {
    id: "",
    invoice: props.invoice,
    item: <Select data={[]} />,
    qty: <NumberInput />,
    price: <NumberInput />,
    discount_1: <NumberInput />,
    discount_2: <NumberInput />,
    total: <NumberInput />,
    deleted: <NumberInput />,
  };

  function rowGen(){}

  return (
    <div style={{ height: "100%",width:'100%',border:'1px solid lightgray' }}>
      <Table withRowBorders withColumnBorders stickyHeader withTableBorder stickyHeaderOffset={60}>
        <Table.Thead>
          <Table.Tr>
            {transactionsTable.map((v) => (
              <Table.Th key={`tableHead-${v}`}>{v}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody></Table.Tbody>
      </Table>
    </div>
  );
}
