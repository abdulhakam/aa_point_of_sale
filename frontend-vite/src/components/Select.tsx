import { useLiveQuery } from "@tanstack/react-db";
import { Select as MSelect } from "@mantine/core";
import { useState } from "react";

interface SelectProps {
  collection: any;
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  searchable?: boolean;
}

export default function Select({
  collection,
  label,
  placeholder,
  value,
  onChange,
  searchable = true,
}: SelectProps) {
  const [search, setSearch] = useState("");

  const { data: options } = useLiveQuery((q) =>
    q.from({ item: collection }).orderBy(({ item }) => item.name, "asc")
  );

  const filteredOptions = options?.filter((option) =>
    option.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MSelect
      label={label}
      placeholder={placeholder}
      data={
        filteredOptions?.map((item) => ({
          value: item.id,
          label: item.name,
        })) || []
      }
      value={value}
      onChange={onChange}
      searchable={searchable}
      onSearchChange={setSearch}
    />
  );
}