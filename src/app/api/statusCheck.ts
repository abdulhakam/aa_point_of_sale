export const checkSuccess = (arr = []) => {
  return arr.filter((q) => q.status === "success").length === arr.length;
};

export const checkLoading = (arr = []) => {
  return arr.filter((q) => q.status === "pending").length > 0 ;
};

export const checkError = (arr = []) => {
  return arr.filter((q) => q.status === "error").length > 0 ;
};

export const getError = (arr = []) => {
  return arr.find((it) => it.status === "error")?.error;
};
