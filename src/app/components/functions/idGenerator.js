/**
 * Generates a 15 digit string which can be used as Id for pocketbase
 *
 * @param {*} number can be up to 12 digits
 * @param {*} string 3 digits
 * @return {*} 
 */
export default function idGenerator(number, string) {
  // Check if the number is an integer and the string has three characters
  if (Number.isInteger(number) && string.length === 3) {
    // Convert the number to a string and pad it with zeros
    let numberStr = number.toString().padStart(12, "0");
    // Concatenate the string and the number
    let result = string + numberStr;
    // Return the result
    return result;
  } else {
    // Return an error message
    return "Invalid input";
  }
}