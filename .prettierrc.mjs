/** @type {import("prettier").Config} */
const config = {
  printWidth: 120,
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,
  plugins: ["prettier-plugin-tailwindcss"],
};

export default config;