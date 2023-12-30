export default function dataFilter(filters = [], data = []) {
  function getExpandedValue(item, property) {
    return item.hasOwnProperty("expand")
      ? item.expand.hasOwnProperty(property)
        ? item.expand[property].name || item.expand[property].value
        : item[property]
      : item[property];
  }

  return data.filter((item) => {
    return filters.every((filter) => {
      const { key, value } = filter;

      if (key === "") {
        // If key is empty, search in all fields
        return Object.keys(item).some((property) => {
          const expandedValue = getExpandedValue(item, property);

          if (typeof expandedValue === "string") {
            return expandedValue.toLowerCase().includes(value.toLowerCase());
          } else if (typeof expandedValue === "number" && !isNaN(value)) {
            return expandedValue === Number(value);
          }
          return false;
        });
      } else {
        const expandedValue = getExpandedValue(item, key);

        if (typeof expandedValue === "string" && typeof value === "string") {
          return expandedValue.toLowerCase().includes(value.toLowerCase());
        } else if (typeof expandedValue === "number" && !isNaN(value)) {
          return expandedValue === Number(value);
        }
        return false;
      }
    });
  });
}

