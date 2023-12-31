import { Children } from "react";

export const checkSuccess = (arr = []) => {
  return arr.filter((q) => q.status === "success").length === arr.length;
};

export const checkLoading = (arr = []) => {
  return arr.filter((q) => q.isLoading).length > 0;
};

export const checkError = (arr = []) => {
  return arr.filter((q) => q.status === "error").length > 0;
};

export const getError = (arr = []) => {
  return arr.find((it) => it.status === "error")?.error;
};

export default function StatusCheck({check}) {
  const arr = check;
  if (checkLoading(arr)) {
    return <h1>Loading...</h1>;
  } else if (checkError(arr)) {
    return (
      <>
        <h1>Error</h1>
        <h2>{getError(arr)}</h2>
      </>
    );
  } else if (checkSuccess(arr)){
    return null
  }
}
