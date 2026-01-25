import { buildAst } from "../src/ast";
import { renderHtml } from "./helpers";
import { TEST_CASES } from "./inputs";

describe("ast", () => {
  TEST_CASES.forEach(({ name, input, output }) => {
    it(name, () => {
      expect(getActual(input)).toBe(output);
    });
  });
});

function getActual(md: string) {
  return renderHtml(buildAst(md));
}
