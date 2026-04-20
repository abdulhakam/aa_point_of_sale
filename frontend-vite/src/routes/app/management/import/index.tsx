import { createFileRoute } from "@tanstack/react-router";
import {
  Button,
  Group,
  Text,
  Progress,
  Modal,
  Select,
  TextInput,
  Checkbox,
  ScrollArea,
  Card,
  Title,
  Stack,
} from "@mantine/core";
import { useState, useRef } from "react";
import { uuidv7 } from "uuidv7";
import { sectionsCollection } from "../../../../collections/sections";
import { areasCollection } from "../../../../collections/areas";
import { partiesCollection } from "../../../../collections/parties";
import { orderBookersCollection } from "../../../../collections/order_bookers";
import { invoicesCollection } from "../../../../collections/invoices";
import { categoriesCollection } from "../../../../collections/categories";
import { companiesCollection } from "../../../../collections/companies";
import { productsCollection } from "../../../../collections/products";
import { transactionsCollection } from "../../../../collections/transactions";
import { invoicesReturnReferenceCollection } from "../../../../collections/invoices_return_reference";
import { paymentsCollection } from "../../../../collections/payments";

const tableOrder = [
  "sections",
  "areas",
  "parties",
  "order_bookers",
  "invoices",
  "categories",
  "companies",
  "products",
  "transactions",
  "invoices_return_reference",
  "payments",
];

const collections = {
  sections: sectionsCollection,
  areas: areasCollection,
  parties: partiesCollection,
  order_bookers: orderBookersCollection,
  invoices: invoicesCollection,
  categories: categoriesCollection,
  companies: companiesCollection,
  products: productsCollection,
  transactions: transactionsCollection,
  invoices_return_reference: invoicesReturnReferenceCollection,
  payments: paymentsCollection,
};

export const Route = createFileRoute("/app/management/import/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [files, setFiles] = useState([]);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [mappings, setMappings] = useState({});
  const [importing, setImporting] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");
  const fileInputRef = useRef(null);

  const handleFolderSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
  };

  const openMappingModal = () => {
    if (files.length > 0) {
      setMappingModalOpen(true);
    }
  };

  const startImport = async () => {
    setImporting(true);
    setOverallProgress(0);
    const db = await openIDB();
    let overallIndex = 0;
    const totalTables = tableOrder.length;

    for (const table of tableOrder) {
      setCurrentTable(table);
      setCurrentProgress(0);
      const mapping = mappings[table];
      if (!mapping || !mapping.file) continue;

      const file = files.find((f) => f.name === mapping.file);
      if (!file) continue;

      const data = JSON.parse(await file.text());
      const totalRows = data.length;
      let rowIndex = 0;

      for (const row of data) {
        const newRow = {};
        for (const [jsonKey, dbKey] of Object.entries(mapping.columns)) {
          let value = row[jsonKey];
          if (mapping.foreignKeys[jsonKey]) {
            const refTable = mapping.foreignKeys[jsonKey];
            value = await getMappedId(db, refTable, value);
          }
          newRow[dbKey] = value;
        }
        newRow.created = new Date();
        newRow.updated = new Date();
        if (!newRow.id) newRow.id = uuidv7();

        await collections[table].insert(newRow, { optimistic: false });

        // Store the new ID mapping
        await storeIdMapping(db, table, row.id, newRow.id);

        rowIndex++;
        setCurrentProgress((rowIndex / totalRows) * 100);
      }

      overallIndex++;
      setOverallProgress((overallIndex / totalTables) * 100);
    }

    db.close();
    setImporting(false);
  };

  return (
    <Stack>
      <Title>Import Data from JSONs</Title>
      <Group>
        <input
          ref={fileInputRef}
          type='file'
          webkitdirectory
          multiple
          onChange={handleFolderSelect}
          style={{ display: "none" }}
        />
        <Button onClick={() => fileInputRef.current.click()}>Select Folder</Button>
        <Button onClick={openMappingModal} disabled={files.length === 0}>
          Import from JSONs
        </Button>
      </Group>
      {files.length > 0 && <Text>Selected {files.length} files</Text>}
      {importing && (
        <Stack>
          <Text>Importing {currentTable}</Text>
          <Progress value={currentProgress} />
          <Text>Overall Progress</Text>
          <Progress value={overallProgress} />
        </Stack>
      )}
      <MappingModal
        open={mappingModalOpen}
        onClose={() => setMappingModalOpen(false)}
        files={files}
        mappings={mappings}
        setMappings={setMappings}
        onStartImport={startImport}
      />
    </Stack>
  );
}

function MappingModal({ open, onClose, files, setMappings, onStartImport }) {
  const [tableSelections, setTableSelections] = useState({});
  const [columnMappings, setColumnMappings] = useState({});
  const [foreignKeySelections, setForeignKeySelections] = useState({});

  const tableOptions = tableOrder.map((table) => ({ value: table, label: table }));

  const handleTableSelect = (fileName, table) => {
    setTableSelections((prev) => ({ ...prev, [fileName]: table }));
    const file = files.find((f) => f.name === fileName);
    if (file) {
      file.text().then((text) => {
        const data = JSON.parse(text);
        if (data.length > 0) {
          const columns = Object.keys(data[0]);
          setColumnMappings((prev) => ({
            ...prev,
            [fileName]: columns.reduce((acc, col) => ({ ...acc, [col]: col }), {}),
          }));
          setForeignKeySelections((prev) => ({
            ...prev,
            [fileName]: columns.reduce((acc, col) => ({ ...acc, [col]: null }), {}),
          }));
        }
      });
    }
  };

  const saveMappings = () => {
    const newMappings = {};
    for (const [fileName, table] of Object.entries(tableSelections)) {
      const fks = {};
      for (const [col, ref] of Object.entries(foreignKeySelections[fileName] || {})) {
        if (ref) fks[col] = ref;
      }
      newMappings[table] = {
        file: fileName,
        columns: columnMappings[fileName] || {},
        foreignKeys: fks,
      };
    }
    setMappings(newMappings);
    onStartImport();
    onClose();
  };

  return (
    <Modal opened={open} onClose={onClose} title='Map Files to Tables' size='xl'>
      <ScrollArea h={400}>
        <Stack>
          {files.map((file) => (
            <Card key={file.name}>
              <Text>{file.name}</Text>
              <Select
                data={tableOptions}
                value={tableSelections[file.name] || ""}
                onChange={(value) => handleTableSelect(file.name, value)}
                placeholder='Select table'
              />
              {columnMappings[file.name] && (
                <Stack mt='md'>
                  <Text>Column Mappings</Text>
                  {Object.keys(columnMappings[file.name]).map((col) => (
                    <Group key={col}>
                      <Text>{col} maps to </Text>
                      <TextInput
                        value={columnMappings[file.name][col]}
                        onChange={(e) =>
                          setColumnMappings((prev) => ({
                            ...prev,
                            [file.name]: { ...prev[file.name], [col]: e.target.value },
                          }))
                        }
                      />
                      <Checkbox
                        label='Foreign Key'
                        checked={!!foreignKeySelections[file.name]?.[col]}
                        onChange={(e) =>
                          setForeignKeySelections((prev) => ({
                            ...prev,
                            [file.name]: { ...prev[file.name], [col]: e.target.checked ? "" : null },
                          }))
                        }
                      />
                      {foreignKeySelections[file.name]?.[col] != null && (
                        <Select
                          data={tableOptions}
                          value={foreignKeySelections[file.name][col] || ""}
                          onChange={(value) =>
                            setForeignKeySelections((prev) => ({
                              ...prev,
                              [file.name]: { ...prev[file.name], [col]: value },
                            }))
                          }
                          placeholder='Select reference table'
                        />
                      )}
                    </Group>
                  ))}
                </Stack>
              )}
            </Card>
          ))}
        </Stack>
      </ScrollArea>
      <Group mt='md'>
        <Button onClick={saveMappings}>Start Import</Button>
        <Button variant='outline' onClick={onClose}>
          Cancel
        </Button>
      </Group>
    </Modal>
  );
}

async function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ImportMappings", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("mappings")) {
        db.createObjectStore("mappings", { keyPath: ["table", "oldId"] });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeIdMapping(db, table, oldId, newId) {
  const transaction = db.transaction(["mappings"], "readwrite");
  const store = transaction.objectStore("mappings");
  store.put({ table, oldId, newId });
}

async function getMappedId(db, table, oldId) {
  return new Promise((resolve) => {
    const transaction = db.transaction(["mappings"], "readonly");
    const store = transaction.objectStore("mappings");
    const request = store.get([table, oldId]);
    request.onsuccess = () => resolve(request.result?.newId || oldId);
    request.onerror = () => resolve(oldId);
  });
}
