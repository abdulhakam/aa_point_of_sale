/**
 * Generates a display string for the quantity of an item.
 *
 * @param {object} item - The item for which to generate the quantity display.
 * @param {number} qty - The quantity of the item.
 * @return {string} The formatted display string for the quantity.
 */
export function qtyDisplay(item, qty) {
  const boxSizeQty = item.box_size_qty;
  const numBoxes = Math.floor(qty / boxSizeQty);
  const numPcs = qty % boxSizeQty;
  const boxLabel = numBoxes === 1 ? "bx" : "bxs";
  const pcsLabel = numPcs === 1 ? "pc" : "pcs";
  return `${numBoxes >= 0 ? numBoxes : numBoxes + 1} ${boxLabel} ${numPcs} ${pcsLabel}`;
}
export function getQtyFromString(qty) {
  const splits = String(qty).split(" ",4);
  return { numBoxes: splits[0], numPcs: splits[2] };
}

export function getQty(item, qty) {
  const boxSizeQty = item.box_size_qty;
  const numBoxes = Math.floor(qty / boxSizeQty);
  const numPcs = qty % boxSizeQty;
  const boxLabel = numBoxes === 1 ? "bx" : "bxs";
  const pcsLabel = numPcs === 1 ? "pc" : "pcs";
  return { numBoxes: numBoxes >= 0 ? numBoxes : numBoxes + 1, numPcs };
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
