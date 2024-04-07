function calculateCartonsAndUnits(qty, boxSizeQty) {
  const neg = qty < 0?"-":"";
  const absQty = Math.abs(qty);
  const ctns = Math.floor(absQty / boxSizeQty);
  const units = absQty % boxSizeQty;
  return { neg, ctns, units };
}

/**
 * Generates a display string for the quantity of an item.
 *
 * @param {object} item - The item for which to generate the quantity display.
 * @param {number} qty - The quantity of the item.
 * @return {string} The formatted display string for the quantity.
 */
export function qtyDisplay(item, qty) {
  const boxSizeQty = item.box_size_qty;
  const {neg,ctns,units} = calculateCartonsAndUnits(qty, boxSizeQty);
  const numBoxes = ctns;
  const numPcs = units;
  const boxLabel = numBoxes === 1 ? "ctn" : "ctns";
  const pcsLabel = numPcs === 1 ? "unit" : "units";
  return `${neg}${numBoxes} ${boxLabel} ${numPcs} ${pcsLabel}`;
}

/**
 * Returns the number of boxes and remaining units when given an item and quantity.
 *
 * @param {Object} item - the item object containing box size quantity
 * @param {number} qty - the total quantity
 * @return {Object} an object containing the number of boxes and remaining units
 */
export function getQty(item, qty) {
  const boxSizeQty = item.box_size_qty;
  const numBoxes = Math.floor(qty / boxSizeQty);
  const numPcs = qty % boxSizeQty;
  const boxLabel = numBoxes === 1 ? "ctn" : "ctns";
  const pcsLabel = numPcs === 1 ? "unit" : "units";
  return { ctns: numBoxes >= 0 ? numBoxes : numBoxes + 1, units: numPcs };
}

/**
 * Retrieves the number of boxes and number of pieces from the input string.
 *
 * @param {string} qty - The input string containing quantity information
 * @return {Object} An object containing the number of cartons and number of units
 */
export function getQtyFromString(qty) {
  const splits = String(qty).split(" ", 4);
  return { ctns: splits[0], units: splits[2] };
}

/**
 * Calculates the total quantity based on the number of boxes and pieces.
 *
 * @param {Object} item - The item object containing box size quantity.
 * @param {number} qtyBoxes - The number of boxes.
 * @param {number} qtyPcs - The number of pieces.
 * @return {number} The total quantity.
 */
export function qtyInput(item, qtyBoxes, qtyPcs) {
  const boxSizeQty = item.box_size_qty;
  return qtyBoxes * boxSizeQty + qtyPcs;
}
