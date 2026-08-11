import { parse } from "@babel/parser";
import { readFileSync } from "fs";
const code = readFileSync("All Module/Document/CaseDocument.js", "utf8");
try {
  parse(code, { sourceType: "module", plugins: ["jsx"] });
  console.log("OK");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
