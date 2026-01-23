import { constructAst } from "../src/ast";

describe("ast", () => {
  it("parses a heading and paragraph", () => {
    expect(constructAst("# Title\n\nHello")).toEqual([
      {
        type: "heading",
        level: 1,
        children: [{ type: "text", value: "Title" }],
      },
      { type: "p", children: [{ type: "text", value: "Hello" }] },
    ]);
  });

  it("parses an unordered list as paragraph children in list items", () => {
    expect(constructAst("- a\n- b")).toEqual([
      {
        type: "ul",
        items: [
          {
            type: "li",
            children: [{ type: "p", children: [{ type: "text", value: "a" }] }],
          },
          {
            type: "li",
            children: [{ type: "p", children: [{ type: "text", value: "b" }] }],
          },
        ],
      },
    ]);
  });

  it("parses an ordered list", () => {
    expect(constructAst("1. a\n2. b")).toEqual([
      {
        type: "ol",
        items: [
          {
            type: "li",
            children: [{ type: "p", children: [{ type: "text", value: "a" }] }],
          },
          {
            type: "li",
            children: [{ type: "p", children: [{ type: "text", value: "b" }] }],
          },
        ],
      },
    ]);
  });

  it("parses a line break", () => {
    expect(constructAst("---")).toEqual([{ type: "hr" }]);
  });

  it("parses a fenced code block with language", () => {
    expect(constructAst("```ts\nconst x = 1;\n```")).toEqual([
      { type: "pre", lang: "ts", value: "const x = 1;" },
    ]);
  });

  it("parses a blockquote", () => {
    expect(constructAst("> hello")).toEqual([
      {
        type: "blockquote",
        children: [{ type: "p", children: [{ type: "text", value: "hello" }] }],
      },
    ]);
  });

  it("turns soft line breaks into a single space text node", () => {
    expect(constructAst("hello\nworld")).toEqual([
      { type: "p", children: [{ type: "text", value: "hello world" }] },
    ]);
  });

  it("turns hard line breaks into a dedicated br node", () => {
    expect(constructAst("hello  \nworld")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", value: "hello" },
          { type: "br" },
          { type: "text", value: "world" },
        ],
      },
    ]);
  });

  it("parses inline code spans inside paragraphs", () => {
    expect(constructAst("Use `x`.")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", value: "Use " },
          { type: "code", value: "x" },
          { type: "text", value: "." },
        ],
      },
    ]);
  });

  it("parses inline links and images", () => {
    expect(
      constructAst("See [docs](https://example.com) ![caption](img.png)")
    ).toEqual([
      {
        type: "p",
        children: [
          { type: "text", value: "See " },
          {
            type: "a",
            url: "https://example.com",
            children: [{ type: "text", value: "docs" }],
          },
          { type: "text", value: " " },
          {
            type: "img",
            url: "img.png",
            alt: "caption",
          },
        ],
      },
    ]);
  });
});
