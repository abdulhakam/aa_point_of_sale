import { Button, FileInput, Group, Stack, Text } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import initSqlJs from "sql.js";

export const Route = createFileRoute("/app/management/import/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // Fetch the WebAssembly binary
      const response = await fetch('/sql-wasm.wasm');
      const wasmBinary = await response.arrayBuffer();

      const SQL = await initSqlJs({
        wasmBinary,
      });

      const filebuffer = await file.arrayBuffer();
      const db = new SQL.Database(new Uint8Array(filebuffer));

      // Get all table names, excluding views and sqlite internal tables
      const tablesResult = db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      );

      const tables = (tablesResult[0]?.values.flat() as string[]) || [];

      const data: Record<string, any[]> = {};

      for (const table of tables) {
        const result = db.exec(`SELECT * FROM \`${table}\``);
        if (result.length > 0) {
           const columns = result[0].columns;
           const rows = result[0].values.map((row: any[]) =>
             Object.fromEntries(columns.map((col: string, i: number) => [col, row[i]])),
           );
          data[table] = rows;
        } else {
          data[table] = [];
        }
      }

      db.close();

      const json = JSON.stringify(data, null, 2);
      setJsonData(json);
    } catch (error) {
      console.error("Error processing database:", error);
      alert("Error processing the database file.");
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    if (!jsonData) return;

    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "database.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Stack>
      <Text>Upload a .db file to convert to JSON</Text>
      <Group>
        <FileInput placeholder='Select .db file' accept='.db' value={file} onChange={setFile} />
        <Button onClick={handleSubmit} loading={loading} disabled={!file}>
          Convert
        </Button>
      </Group>
      {jsonData && (
        <Group>
          <Button onClick={downloadJson}>Download JSON</Button>
          <Text>JSON generated successfully. Click to download.</Text>
        </Group>
      )}
    </Stack>
  );
}
