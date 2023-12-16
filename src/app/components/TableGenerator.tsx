// components/TableGenerator.js
import { useState } from 'react';
import InfoViewGenerator from './InfoViewGenerator';
import { Table,Input } from '@mantine/core';

const TableGenerator = ({ data, tableStructure, selectables=[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('');

  const filteredData = data.filter((item) =>
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
            {Object.entries(tableStructure).map(([key, value]) => (
              <Table.Th key={key} onClick={() => handleSort(key)}>
                <>{value}</>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedData.map((item, index) => (
            <Table.Tr key={index}>
              {Object.keys(tableStructure).map((key) => (
                <InfoViewGenerator tableStructure={tableStructure} data={item} clickable key={key}>
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
