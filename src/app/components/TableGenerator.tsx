import { useState } from 'react';
import InfoViewGenerator from './InfoViewGenerator';
import { Table,Input } from '@mantine/core';

/*TODO: IMPORTANT look for a solution in TableGenerator and FormGenerator
that shall handle multiple chioces for multiple items sold by a single 
supplier.
*/
const TableGenerator = (props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('')
  const filteredData = props.data.filter((item) =>
    Object.values(item).some(
      (value) =>
        typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1))
    : filteredData;
  const handleSort = (key) => {
    setSortKey(key);
  };

  return (
    <div>
      <Input
        type="text"
        placeholder="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Table>
        <Table.Thead>
          <Table.Tr>
            {Object.entries(props.tableStructure).map(([key, value]) => (
              <Table.Th key={key} onClick={() => handleSort(key)}>
                <>{value}</>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedData.map((item, index) => (
            <Table.Tr key={index}>
              {Object.keys(props.tableStructure).map((key) => (
                <InfoViewGenerator formStructure={props.formStructure} tableStructure={props.tableStructure} data={item} clickable key={key}>
                  {item.expand && item.expand[key]
                    ? item.expand[key].name || item.expand[key].value || '-------'
                    : item[key] || '-------'}
                </InfoViewGenerator>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
};

export default TableGenerator;
