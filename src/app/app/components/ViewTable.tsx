import { Table, UnstyledButton, Group, Text, Center, rem, TextInput } from "@mantine/core";
import { IconSelector, IconChevronDown, IconChevronUp, IconSearch } from "@tabler/icons-react";
import classes from "./table.module.css";
import { useState } from "react";

interface ThProps {
  children: React.ReactNode;
  reversed: boolean;
  sorted: boolean;
  onSort(): void;
}

function Th({ children, reversed, sorted, onSort }: ThProps) {
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <Table.Th className={classes.th}>
      <UnstyledButton onClick={onSort} className={classes.control}>
        <Group justify='space-between'>
          <Text fw={500} fz='sm'>
            {children}
          </Text>
          <Center className={classes.icon}>
            <Icon style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
          </Center>
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}
const tableStructure = { name: "Name", email: "Email", company: "Company" };
const data = [
  {
    id: "1",
    name: "Athena Weissnat",
    company: "Little - Rippin",
    email: "Elouise.Prohaska@yahoo.com",
  },
  {
    id: "2",
    name: "Deangelo Runolfsson",
    company: "Greenfelder - Krajcik",
    email: "Kadin_Trantow87@yahoo.com",
  },
  {
    id: "3",
    name: "Danny Carter",
    company: "Kohler and Sons",
    email: "Marina3@hotmail.com",
  },
  {
    id: "4",
    name: "Trace Tremblay PhD",
    company: "Crona, Aufderhar and Senger",
    email: "Antonina.Pouros@yahoo.com",
  },
  {
    id: "5",
    name: "Derek Dibbert",
    company: "Gottlieb LLC",
    email: "Abagail29@hotmail.com",
  },
  {
    id: "6",
    name: "Viola Bernhard",
    company: "Funk, Rohan and Kreiger",
    email: "Jamie23@hotmail.com",
  },
  {
    id: "7",
    name: "Austin Jacobi",
    company: "Botsford - Corwin",
    email: "Genesis42@yahoo.com",
  },
  {
    id: "8",
    name: "Hershel Mosciski",
    company: "Okuneva, Farrell and Kilback",
    email: "Idella.Stehr28@yahoo.com",
  },
  {
    id: "9",
    name: "Mylene Ebert",
    company: "Kirlin and Sons",
    email: "Hildegard17@hotmail.com",
  },
  {
    id: "10",
    name: "Lou Trantow",
    company: "Parisian - Lemke",
    email: "Hillard.Barrows1@hotmail.com",
  },
  {
    id: "11",
    name: "Dariana Weimann",
    company: "Schowalter - Donnelly",
    email: "Colleen80@gmail.com",
  },
  {
    id: "12",
    name: "Dr. Christy Herman",
    company: "VonRueden - Labadie",
    email: "Lilyan98@gmail.com",
  },
  {
    id: "13",
    name: "Katelin Schuster",
    company: "Jacobson - Smitham",
    email: "Erich_Brekke76@gmail.com",
  },
  {
    id: "14",
    name: "Melyna Macejkovic",
    company: "Schuster LLC",
    email: "Kylee4@yahoo.com",
  },
  {
    id: "15",
    name: "Pinkie Rice",
    company: "Wolf, Trantow and Zulauf",
    email: "Fiona.Kutch@hotmail.com",
  },
  {
    id: "16",
    name: "Brain Kreiger",
    company: "Lueilwitz Group",
    email: "Rico98@hotmail.com",
  },
  {
    id: "17",
    name: "Myrtice McGlynn",
    company: "Feest, Beahan and Johnston",
    email: "Julius_Tremblay29@hotmail.com",
  },
  {
    id: "18",
    name: "Chester Carter PhD",
    company: "Gaylord - Labadie",
    email: "Jensen_McKenzie@hotmail.com",
  },
  {
    id: "19",
    name: "Mrs. Ericka Bahringer",
    company: "Conn and Sons",
    email: "Lisandro56@hotmail.com",
  },
  {
    id: "20",
    name: "Korbin Buckridge Sr.",
    company: "Mraz, Rolfson and Predovic",
    email: "Leatha9@yahoo.com",
  },
  {
    id: "21",
    name: "Dr. Daisy Becker",
    company: "Carter - Mueller",
    email: "Keaton_Sanford27@gmail.com",
  },
  {
    id: "22",
    name: "Derrick Buckridge Sr.",
    company: "O'Reilly LLC",
    email: "Kay83@yahoo.com",
  },
  {
    id: "23",
    name: "Ernie Hickle",
    company: "Terry, O'Reilly and Farrell",
    email: "Americo.Leffler89@gmail.com",
  },
  {
    id: "24",
    name: "Jewell Littel",
    company: "O'Connell Group",
    email: "Hester.Hettinger9@hotmail.com",
  },
  {
    id: "25",
    name: "Cyrus Howell",
    company: "Windler, Yost and Fadel",
    email: "Rick0@gmail.com",
  },
  {
    id: "26",
    name: "Dr. Orie Jast",
    company: "Hilll - Pacocha",
    email: "Anna56@hotmail.com",
  },
  {
    id: "27",
    name: "Luisa Murphy",
    company: "Turner and Sons",
    email: "Christine32@yahoo.com",
  },
  {
    id: "28",
    name: "Lea Witting",
    company: "Hodkiewicz Inc",
    email: "Ford_Kovacek4@yahoo.com",
  },
  {
    id: "29",
    name: "Kelli Runolfsson",
    company: "Feest - O'Hara",
    email: "Dimitri87@yahoo.com",
  },
  {
    id: "30",
    name: "Brook Gaylord",
    company: "Conn, Huel and Nader",
    email: "Immanuel77@gmail.com",
  },
];

function filterData(data: any[], search: string, column: string = "") {
  const query = search.toLowerCase().trim();
  if (column === "") {
    return data.filter((item) => keys(data[0]).some((key) => item[key].toLowerCase().includes(query)));
  } else {
    return data.filter((item) => item[column].toLowerCase().includes(query));
  }
}

function sortData(data: any[], payload: { sortBy: keyof any | null; reversed: boolean; search: string }) {
  const { sortBy } = payload;

  if (!sortBy) {
    return filterData(data, payload.search);
  }

  return filterData(
    [...data].sort((a, b) => {
      if (payload.reversed) {
        return b[sortBy].localeCompare(a[sortBy]);
      }

      return a[sortBy].localeCompare(b[sortBy]);
    }),
    payload.search
  );
}

export default function ViewTable(props: any) {
  const [sortedData, setSortedData] = useState(data);
  const [sortBy, setSortBy] = useState<keyof any | null>(null);
  const [search, setSearch] = useState("");
  const [reverseSortDirection, setReverseSortDirection] = useState(false);

  const setSorting = (field: keyof any) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
    setSortedData(sortData(data, { sortBy: field, reversed, search }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setSortedData(sortData(data, { sortBy, reversed: reverseSortDirection, search: value }));
  };

  const rows = sortedData.map((row) => (
    <Table.Tr key={row.id}>
      {Object.keys(props.tableStructure).map((key) => (
        <Table.Td key={`${row[key]}-${row.id}`}>{`${row[key]}`}</Table.Td>
      ))}
    </Table.Tr>
  ));
  return (
    <div>
      <TextInput
        placeholder='Search by any field'
        mb='md'
        leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
        value={search}
        onChange={handleSearchChange}
      />
      <Table horizontalSpacing='md' verticalSpacing='xs' miw={700} layout='fixed'>
        <Table.Tbody>
          <Table.Tr>
            {Object.keys(props.tableStructure).map((key) => (
              <Th
                key={`tabhead-${key}`}
                sorted={props.sortBy === `${key}`}
                reversed={props.reverseSortDirection}
                onSort={() => props.setSorting(`${key}`)}
              >
                {`${props.tableStructure[key]}`}
              </Th>
            ))}
          </Table.Tr>
        </Table.Tbody>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={Object.keys(props.tableStructure).length}>
                <Text fw={500} ta='center'>
                  Nothing found
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
}
