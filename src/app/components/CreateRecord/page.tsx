import { areaCreateForm } from "@/app/api/areas";
import CreateRecord from "./CreateRecord";

export default function Test(){
  return <><CreateRecord formStructure={areaCreateForm} /></>
}