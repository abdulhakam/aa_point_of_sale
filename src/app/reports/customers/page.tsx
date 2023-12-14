'use client'
import ReportTable from "../ReportTable";
import { useState } from "react";

// {keyOfInputDataRow: "Header of the table"}
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

function sortData(data: any[], payload: { sortBy: keyof any | null; reversed: boolean; search: string }) {
  const { sortBy } = payload;
  return [...data].sort((a, b) => {
      if (payload.reversed) {
        return b[sortBy].localeCompare(a[sortBy]);
      }

      return a[sortBy].localeCompare(b[sortBy]);
    })
}

export default function Table() {
  const [sortedData, setSortedData] = useState(data);
  const [sortBy, setSortBy] = useState<keyof any | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);

  const setSorting = (field: keyof any) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
    setSortedData(sortData(data, { sortBy: field, reversed }));
  };

  return (
    <>
      
      <ReportTable tableStructure={tableStructure} data={sortedData} setSorting={setSorting} sortBy={sortBy} reverseSortDirection={reverseSortDirection}/>
    </>
  );
}
