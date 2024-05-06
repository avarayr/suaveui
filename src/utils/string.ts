export const camelCaseToSpaced = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])/g, " $1")
    // first letter of each word is capitalized
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
