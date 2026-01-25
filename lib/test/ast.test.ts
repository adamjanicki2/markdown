import { buildAst } from "../src/ast";
import { renderHtml } from "./helpers";

describe("ast", () => {
  const runTest = (md: string) => renderHtml(buildAst(md));

  it("1 paragraph", () => {
    expect(runTest("Hello world")).toBe("<p>Hello world</p>");
  });

  it("2 paragraph does not hardbreak on single newline", () => {
    expect(runTest("Hello\nworld")).toBe("<p>Hello world</p>");
  });

  it("3 paragraph supports inline formatting", () => {
    expect(runTest("Hello **bold** _em_ `x`")).toBe(
      "<p>Hello <strong>bold</strong> <em>em</em> <code>x</code></p>"
    );
  });

  it("4 paragraph hardbreak renders as <br />", () => {
    expect(runTest("Hello  \nworld")).toBe("<p>Hello<br />world</p>");
  });

  it("5 nested emphasis/strong", () => {
    expect(runTest("**a _b_ c**")).toBe(
      "<p><strong>a <em>b</em> c</strong></p>"
    );
  });

  it("6 triple nesting combo: del > strong > em", () => {
    expect(runTest("~~***combo***~~")).toBe(
      "<p><del><strong><em>combo</em></strong></del></p>"
    );
  });

  it("7 deeply nested mix", () => {
    expect(runTest("*a **b ~~c~~ d** e*")).toBe(
      "<p><em>a <strong>b <del>c</del> d</strong> e</em></p>"
    );
  });

  it("8 unmatched delimiters left as text", () => {
    expect(runTest("Unmatched *stars and ~~tildes")).toBe(
      "<p>Unmatched *stars and ~~tildes</p>"
    );
  });

  it("9 underscores inside words do not emphasize", () => {
    expect(runTest("snake_case foo_bar baz_qux")).toBe(
      "<p>snake_case foo_bar baz_qux</p>"
    );
  });

  it("10 backslash escapes prevent emphasis", () => {
    expect(runTest("\\*not italic\\*")).toBe("<p>*not italic*</p>");
  });

  it("11 code spans block delimiter parsing", () => {
    expect(runTest("**a `*b*` c**")).toBe(
      "<p><strong>a <code>*b*</code> c</strong></p>"
    );
  });

  it("12 link with inline label", () => {
    expect(runTest("See [docs `v1`](https://example.com)")).toBe(
      '<p>See <a href="https://example.com">docs <code>v1</code></a></p>'
    );
  });

  it("13 image renders with escaped attrs", () => {
    expect(runTest('![a "b"](x.png)')).toBe(
      '<p><img src="x.png" alt="a &quot;b&quot;" /></p>'
    );
  });

  it("14 html in paragraph is escaped", () => {
    expect(runTest("<div>x</div>")).toBe("<p>&lt;div&gt;x&lt;/div&gt;</p>");
  });

  it("15 mixed: link + em + code + del", () => {
    expect(runTest("a [b](x) _c_ `d` ~~e~~")).toBe(
      '<p>a <a href="x">b</a> <em>c</em> <code>d</code> <del>e</del></p>'
    );
  });

  it("16 multiple single lines", () => {
    expect(runTest("a\nb\nc")).toBe("<p>a b c</p>");
  });

  it("17 hardbreak inside emphasis", () => {
    expect(runTest("*a  \nb*")).toBe("<p><em>a<br />b</em></p>");
  });

  it("18 single newline inside emphasis", () => {
    expect(runTest("*a\nb*")).toBe("<p><em>a b</em></p>");
  });

  it("19 heading", () => {
    expect(runTest("# Title")).toBe("<h1>Title</h1>");
  });

  it("20 heading supports inline formatting", () => {
    expect(runTest("# Title **Bold**")).toBe(
      "<h1>Title <strong>Bold</strong></h1>"
    );
  });

  it("21 heading strips trailing hashes", () => {
    expect(runTest("## Hi ###")).toBe("<h2>Hi</h2>");
  });

  it("22 thematic break", () => {
    expect(runTest("---")).toBe("<hr />");
  });

  it("23 thematic break with spaces", () => {
    expect(runTest("- - -")).toBe("<hr />");
  });

  it("24 fenced code block with language", () => {
    expect(runTest("```ts\nconst x = 1;\n```\n")).toBe(
      `<pre><code class="language-ts">const x = 1;</code></pre>`
    );
  });

  it("25 fenced code block escapes HTML", () => {
    expect(runTest("```html\n<div>x</div>\n```")).toBe(
      `<pre><code class="language-html">&lt;div&gt;x&lt;/div&gt;</code></pre>`
    );
  });

  it("26 fenced code without language", () => {
    expect(runTest("```\n<x>\n```")).toBe("<pre><code>&lt;x&gt;</code></pre>");
  });

  it("27 code fence end can be longer than start", () => {
    expect(runTest("```js\nx\n````")).toBe(
      `<pre><code class="language-js">x</code></pre>`
    );
  });

  it("28 code fence can start after up to 3 spaces", () => {
    expect(runTest("   ```\nhi\n   ```")).toBe("<pre><code>hi</code></pre>");
  });

  it("29 blockquote (simple)", () => {
    expect(runTest("> Hello")).toBe("<blockquote><p>Hello</p></blockquote>");
  });

  it("30 blockquote supports lazy continuation lines", () => {
    expect(runTest("> a\nb")).toBe("<blockquote><p>a b</p></blockquote>");
  });

  it("31 nested blockquotes (>>)", () => {
    expect(runTest(">> a")).toBe(
      "<blockquote><blockquote><p>a</p></blockquote></blockquote>"
    );
  });

  it("32 nested blockquotes with spaced markers", () => {
    expect(runTest("> > a")).toBe(
      "<blockquote><blockquote><p>a</p></blockquote></blockquote>"
    );
  });

  it("33 blockquote marker allowed after indentation", () => {
    expect(runTest("  > a")).toBe("<blockquote><p>a</p></blockquote>");
  });

  it("34 blockquote contains heading + paragraph", () => {
    expect(runTest("> # H\n> x")).toBe(
      "<blockquote><h1>H</h1><p>x</p></blockquote>"
    );
  });

  it("35 blockquote contains thematic break", () => {
    expect(runTest("> ---")).toBe("<blockquote><hr /></blockquote>");
  });

  it("36 blockquote contains nested quote + list", () => {
    expect(runTest("> > - a\n> > - b")).toBe(
      "<blockquote><blockquote><ul><li><p>a</p></li><li><p>b</p></li></ul></blockquote></blockquote>"
    );
  });

  it("37 unordered list (simple)", () => {
    expect(runTest("- a\n- b")).toBe(
      "<ul><li><p>a</p></li><li><p>b</p></li></ul>"
    );
  });

  it("38 ordered list (simple)", () => {
    expect(runTest("1. a\n2. b")).toBe(
      "<ol><li><p>a</p></li><li><p>b</p></li></ol>"
    );
  });

  it("39 ordered list with start != 1", () => {
    expect(runTest("3. a\n4. b")).toBe(
      `<ol start="3"><li><p>a</p></li><li><p>b</p></li></ol>`
    );
  });

  it("40 list item lazy continuation", () => {
    expect(runTest("- a\nb\n- c")).toBe(
      "<ul><li><p>a b</p></li><li><p>c</p></li></ul>"
    );
  });

  it("41 list item continuation stops before heading", () => {
    expect(runTest("- a\n# h")).toBe("<ul><li><p>a</p></li></ul><h1>h</h1>");
  });

  it("42 blank line makes list loose (still same HTML)", () => {
    expect(runTest("- a\n\n- b")).toBe(
      "<ul><li><p>a</p></li><li><p>b</p></li></ul>"
    );
  });

  it("43 nested unordered list", () => {
    expect(runTest("- a\n  - b\n  - c\n- d")).toBe(
      "<ul><li><p>a</p><ul><li><p>b</p></li><li><p>c</p></li></ul></li><li><p>d</p></li></ul>"
    );
  });

  it("44 nested ordered inside unordered", () => {
    expect(runTest("- a\n  1. b\n  2. c\n- d")).toBe(
      "<ul><li><p>a</p><ol><li><p>b</p></li><li><p>c</p></li></ol></li><li><p>d</p></li></ul>"
    );
  });

  it("45 nested list under list item using content indentation", () => {
    expect(runTest("- a\n  - b\n    - c\n- d")).toBe(
      "<ul><li><p>a</p><ul><li><p>b</p><ul><li><p>c</p></li></ul></li></ul></li><li><p>d</p></li></ul>"
    );
  });

  it("46 ordered list with multi-digit marker supports nesting", () => {
    expect(runTest("10. a\n    - b")).toBe(
      '<ol start="10"><li><p>a</p><ul><li><p>b</p></li></ul></li></ol>'
    );
  });

  it("47 list item contains multiple paragraphs", () => {
    expect(runTest("- a\n\n  b")).toBe("<ul><li><p>a</p><p>b</p></li></ul>");
  });

  it("48 list item contains heading + paragraph continuation stops correctly", () => {
    expect(runTest("- a\n  # h\n  b")).toBe(
      "<ul><li><p>a</p><h1>h</h1><p>b</p></li></ul>"
    );
  });

  it("49 list item can contain a blockquote that contains a list", () => {
    expect(runTest("- a\n  > - b\n  > - c\n- d")).toBe(
      "<ul>" +
        "<li><p>a</p><blockquote><ul><li><p>b</p></li><li><p>c</p></li></ul></blockquote></li>" +
        "<li><p>d</p></li>" +
        "</ul>"
    );
  });

  it("50 blockquote can contain a list", () => {
    expect(runTest("> - a\n> - b")).toBe(
      "<blockquote><ul><li><p>a</p></li><li><p>b</p></li></ul></blockquote>"
    );
  });

  it("51 nested list inside blockquote with lazy continuation", () => {
    expect(runTest("> - a\n> b\n> - c")).toBe(
      "<blockquote><ul><li><p>a b</p></li><li><p>c</p></li></ul></blockquote>"
    );
  });

  it("52 list contains nested blockquote then paragraph (lazy continuation stays in quote)", () => {
    expect(runTest("- a\n  > x\ny")).toBe(
      "<ul><li><p>a</p><blockquote><p>x y</p></blockquote></li></ul>"
    );
  });

  it("53 ordered list siblings must align by indent (indented ordered marker nests)", () => {
    expect(runTest("1. a\n  2. b")).toBe(
      '<ol><li><p>a</p><ol start="2"><li><p>b</p></li></ol></li></ol>'
    );
  });

  it("54 list item inline formatting", () => {
    expect(runTest("- a **b** _c_")).toBe(
      "<ul><li><p>a <strong>b</strong> <em>c</em></p></li></ul>"
    );
  });

  it("55 nested list item inline formatting", () => {
    expect(runTest("- a\n  - **b**\n  - _c_")).toBe(
      "<ul><li><p>a</p><ul><li><p><strong>b</strong></p></li><li><p><em>c</em></p></li></ul></li></ul>"
    );
  });

  it("56 fenced code inside list item", () => {
    expect(runTest("- a\n  ```\n  x\n  ```\n- b")).toBe(
      "<ul>" +
        "<li><p>a</p><pre><code>x</code></pre></li>" +
        "<li><p>b</p></li>" +
        "</ul>"
    );
  });

  it("57 fenced code inside blockquote", () => {
    expect(runTest("> ```\n> x\n> ```")).toBe(
      "<blockquote><pre><code>x</code></pre></blockquote>"
    );
  });

  it("58 fenced code inside blockquote inside list item", () => {
    expect(runTest("- a\n  > ```\n  > x\n  > ```\n- b")).toBe(
      "<ul>" +
        "<li><p>a</p><blockquote><pre><code>x</code></pre></blockquote></li>" +
        "<li><p>b</p></li>" +
        "</ul>"
    );
  });

  it("59 list in blockquote in list in blockquote (deep structure)", () => {
    expect(
      runTest(["> - a", ">   > - b", ">   >   - c", "> - d"].join("\n"))
    ).toBe(
      "<blockquote><ul>" +
        "<li><p>a</p><blockquote><ul><li><p>b</p><ul><li><p>c</p></li></ul></li></ul></blockquote></li>" +
        "<li><p>d</p></li>" +
        "</ul></blockquote>"
    );
  });

  it("60 paragraph after complex structures", () => {
    expect(runTest("- a\n  > x\n\nz")).toBe(
      "<ul><li><p>a</p><blockquote><p>x</p></blockquote></li></ul><p>z</p>"
    );
  });

  it("61 basic table", () => {
    expect(runTest("| a | b |\n| - | - |\n| c | d |")).toBe(
      "<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>c</td><td>d</td></tr></tbody></table>"
    );
  });

  it("62 table supports inline in cells", () => {
    expect(runTest("| a | b |\n| - | - |\n| **c** | d |")).toBe(
      "<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td><strong>c</strong></td><td>d</td></tr></tbody></table>"
    );
  });

  it("63 table supports multiple body rows + inline", () => {
    expect(runTest("| a | b |\n| - | - |\n| c | _d_ |\n| `x` | ~~y~~ |")).toBe(
      "<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody>" +
        "<tr><td>c</td><td><em>d</em></td></tr>" +
        "<tr><td><code>x</code></td><td><del>y</del></td></tr>" +
        "</tbody></table>"
    );
  });

  it("64 table without outer pipes", () => {
    expect(runTest("a | b\n- | -\nc | d")).toBe(
      "<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>c</td><td>d</td></tr></tbody></table>"
    );
  });

  it("65 leading spaces prevent heading parsing", () => {
    expect(runTest("  # not heading")).toBe("<p>  # not heading</p>");
  });

  it("66 thematic break requires same marker", () => {
    expect(runTest("* - *")).toBe("<p>* - *</p>");
  });

  it("67 fence allows internal backticks", () => {
    expect(runTest("```\n`nested code`\n```")).toBe(
      "<pre><code>`nested code`</code></pre>"
    );
  });

  it("68 double backtick code span", () => {
    expect(runTest("``code``")).toBe("<p><code>code</code></p>");
  });

  it("69 code span preserves leading and trailing spaces", () => {
    expect(runTest("` code `")).toBe("<p><code> code </code></p>");
  });

  it("70 trailing backslash is literal", () => {
    expect(runTest("foo\\")).toBe("<p>foo\\</p>");
  });

  it("71 empty link url should not create link", () => {
    expect(runTest("[x]()")).toBe("<p>[x]()</p>");
  });

  it("72 empty image url should not create image", () => {
    expect(runTest("![x]()")).toBe("<p>![x]()</p>");
  });

  it("73 link url trims whitespace", () => {
    expect(runTest("[x](  https://a.com  )")).toBe(
      '<p><a href="https://a.com">x</a></p>'
    );
  });

  it("74 deep inline nesting with del/strong/em", () => {
    expect(runTest("*a **b ~~c _d_~~ e** f*")).toBe(
      "<p><em>a <strong>b <del>c <em>d</em></del> e</strong> f</em></p>"
    );
  });

  it("75 emphasis wraps a link", () => {
    expect(runTest("*see [x](y)*")).toBe(
      '<p><em>see <a href="y">x</a></em></p>'
    );
  });

  it("76 code span blocks link parsing", () => {
    expect(runTest("`[x](y)`")).toBe("<p><code>[x](y)</code></p>");
  });

  it("77 autolink plain url", () => {
    expect(runTest("Here's a link https://example.com")).toBe(
      '<p>Here\'s a link <a href="https://example.com">https://example.com</a></p>'
    );
  });

  it("78 autolink trims trailing punctuation", () => {
    expect(runTest("Visit https://example.com.")).toBe(
      '<p>Visit <a href="https://example.com">https://example.com</a>.</p>'
    );
  });

  it("79 table inside blockquote", () => {
    expect(runTest("> | a | b |\n> | - | - |\n> | c | d |")).toBe(
      "<blockquote><table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>c</td><td>d</td></tr></tbody></table></blockquote>"
    );
  });

  it("80 table inside list item", () => {
    expect(runTest("- | a | b |\n  | - | - |\n  | c | d |")).toBe(
      "<ul><li><table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>c</td><td>d</td></tr></tbody></table></li></ul>"
    );
  });

  it("81 horizontal rule inside list item", () => {
    expect(runTest("- ---\n- a")).toBe(
      "<ul><li><hr /></li><li><p>a</p></li></ul>"
    );
  });

  it("82 blockquote with list, blank line, then paragraph", () => {
    expect(runTest("> - a\n>   - b\n> \n> c")).toBe(
      "<blockquote><ul><li><p>a</p><ul><li><p>b</p></li></ul></li></ul><p>c</p></blockquote>"
    );
  });

  it("83 ordered list with blockquote and nested list", () => {
    expect(runTest("2. a\n   > b\n   > - c\n3. d")).toBe(
      '<ol start="2"><li><p>a</p><blockquote><p>b</p><ul><li><p>c</p></li></ul></blockquote></li><li><p>d</p></li></ol>'
    );
  });

  it("84 loose list item with fenced code block", () => {
    expect(runTest("- a\n\n  ```\n  code\n  ```\n\n- b")).toBe(
      "<ul><li><p>a</p><pre><code>code</code></pre></li><li><p>b</p></li></ul>"
    );
  });

  it("85 blockquote with fenced code and language", () => {
    expect(runTest("> ```ts\n> const x = 1;\n> ```")).toBe(
      '<blockquote><pre><code class="language-ts">const x = 1;</code></pre></blockquote>'
    );
  });

  it("86 heading with tab after marker", () => {
    expect(runTest("#\tTitle")).toBe("<h1>Title</h1>");
  });

  it("87 code fence info only uses first token", () => {
    expect(runTest("```js extra\nx\n```")).toBe(
      '<pre><code class="language-js">x</code></pre>'
    );
  });

  it("88 unordered list with plus markers", () => {
    expect(runTest("+ a\n+ b")).toBe(
      "<ul><li><p>a</p></li><li><p>b</p></li></ul>"
    );
  });

  it("89 unordered list keeps grouping with mixed markers", () => {
    expect(runTest("- a\n+ b")).toBe(
      "<ul><li><p>a</p></li><li><p>b</p></li></ul>"
    );
  });

  it("90 ordered list with paren markers", () => {
    expect(runTest("1) a\n2) b")).toBe(
      "<ol><li><p>a</p></li><li><p>b</p></li></ol>"
    );
  });

  it("91 ordered list allows long numeric marker", () => {
    expect(runTest("123456789. a\n123456790. b")).toBe(
      '<ol start="123456789"><li><p>a</p></li><li><p>b</p></li></ol>'
    );
  });

  it("92 list item continuation with extra indentation", () => {
    expect(runTest("- a\n   b")).toBe("<ul><li><p>a b</p></li></ul>");
  });

  it("93 nested list with deeper indentation", () => {
    expect(runTest("- a\n    - b")).toBe(
      "<ul><li><p>a</p><ul><li><p>b</p></li></ul></li></ul>"
    );
  });

  it("94 blockquote ends before heading", () => {
    expect(runTest("> a\n# b")).toBe(
      "<blockquote><p>a</p></blockquote><h1>b</h1>"
    );
  });

  it("95 table delimiter rejects colons", () => {
    expect(runTest("| a | b |\n| :-- | --: |\n| c | d |")).toBe(
      "<p>| a | b | | :-- | --: | | c | d |</p>"
    );
  });

  it("96 table with spaced cells and no outer pipes", () => {
    expect(runTest(" a | b \n --- | --- \n c | d ")).toBe(
      "<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>c</td><td>d</td></tr></tbody></table>"
    );
  });

  it("97 hardbreak inside link label", () => {
    expect(runTest("[a  \nb](x)")).toBe('<p><a href="x">a<br />b</a></p>');
  });

  it("98 emphasis across line break inside link label", () => {
    expect(runTest("[*a\nb*](x)")).toBe('<p><a href="x"><em>a b</em></a></p>');
  });

  it("99 image alt does not parse inline", () => {
    expect(runTest("![**a**](x)")).toBe('<p><img src="x" alt="**a**" /></p>');
  });

  it("100 unterminated code fence consumes rest of document", () => {
    expect(runTest("```\ncode")).toBe("<pre><code>code</code></pre>");
  });

  it("101 deep nesting: blockquote > list > blockquote > list > code", () => {
    expect(runTest("> - a\n>   > b\n>   > - `c`\n> - d")).toBe(
      "<blockquote><ul><li><p>a</p><blockquote><p>b</p><ul><li><p><code>c</code></p></li></ul></blockquote></li><li><p>d</p></li></ul></blockquote>"
    );
  });

  it("102 very deep inline nesting with code", () => {
    expect(runTest("~~**_`x`_**~~")).toBe(
      "<p><del><strong><em><code>x</code></em></strong></del></p>"
    );
  });

  it("103 autolink standalone url", () => {
    expect(runTest("https://example.com")).toBe(
      '<p><a href="https://example.com">https://example.com</a></p>'
    );
  });

  it("104 autolink with query and fragment", () => {
    expect(runTest("Go https://example.com/a?b=c#d now")).toBe(
      '<p>Go <a href="https://example.com/a?b=c#d">https://example.com/a?b=c#d</a> now</p>'
    );
  });

  it("105 autolink multiple with punctuation", () => {
    expect(runTest("Links: https://a.com, https://b.com;")).toBe(
      '<p>Links: <a href="https://a.com">https://a.com</a>, <a href="https://b.com">https://b.com</a>;</p>'
    );
  });

  it("106 autolink wrapped in parentheses", () => {
    expect(runTest("See (https://example.com/path)")).toBe(
      '<p>See (<a href="https://example.com/path">https://example.com/path</a>)</p>'
    );
  });

  it("107 autolink with port", () => {
    expect(runTest("Use https://example.com:8080/a")).toBe(
      '<p>Use <a href="https://example.com:8080/a">https://example.com:8080/a</a></p>'
    );
  });

  it("108 autolink inside emphasis", () => {
    expect(runTest("*https://example.com*")).toBe(
      '<p><em><a href="https://example.com">https://example.com</a></em></p>'
    );
  });

  it("109 autolink inside blockquote", () => {
    expect(runTest("> see https://example.com")).toBe(
      '<blockquote><p>see <a href="https://example.com">https://example.com</a></p></blockquote>'
    );
  });

  it("110 autolink inside list item", () => {
    expect(runTest("- see https://example.com")).toBe(
      '<ul><li><p>see <a href="https://example.com">https://example.com</a></p></li></ul>'
    );
  });

  it("111 autolink inside table cell", () => {
    expect(runTest("| a | b |\n| - | - |\n| https://example.com | c |")).toBe(
      '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td><a href="https://example.com">https://example.com</a></td><td>c</td></tr></tbody></table>'
    );
  });

  it("112 autolink in blockquote lazy continuation", () => {
    expect(runTest("> https://example.com\ncontinued")).toBe(
      '<blockquote><p><a href="https://example.com">https://example.com</a> continued</p></blockquote>'
    );
  });

  it("113 autolink not in code span", () => {
    expect(runTest("`https://example.com`")).toBe(
      "<p><code>https://example.com</code></p>"
    );
  });

  it("114 autolink trims trailing exclamation", () => {
    expect(runTest("Wow https://example.com!")).toBe(
      '<p>Wow <a href="https://example.com">https://example.com</a>!</p>'
    );
  });

  it("115 autolink trims trailing colon", () => {
    expect(runTest("Go https://example.com:")).toBe(
      '<p>Go <a href="https://example.com">https://example.com</a>:</p>'
    );
  });

  it("116 list item blank line then autolink paragraph", () => {
    expect(runTest("- a\n\n  https://example.com")).toBe(
      '<ul><li><p>a</p><p><a href="https://example.com">https://example.com</a></p></li></ul>'
    );
  });

  it("117 list item table with autolink cell", () => {
    expect(
      runTest("- | a | b |\n  | - | - |\n  | https://example.com | c |")
    ).toBe(
      '<ul><li><table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td><a href="https://example.com">https://example.com</a></td><td>c</td></tr></tbody></table></li></ul>'
    );
  });

  it("118 code fence with url literal", () => {
    expect(runTest("```\nhttps://example.com\n```")).toBe(
      "<pre><code>https://example.com</code></pre>"
    );
  });

  it("119 autolink inside heading", () => {
    expect(runTest("# https://example.com")).toBe(
      '<h1><a href="https://example.com">https://example.com</a></h1>'
    );
  });

  it("120 autolinks across newline", () => {
    expect(runTest("https://example.com\nand https://example.org")).toBe(
      '<p><a href="https://example.com">https://example.com</a> and <a href="https://example.org">https://example.org</a></p>'
    );
  });

  it("121 hardbreak with trailing backslash", () => {
    expect(runTest("a\\\nb")).toBe("<p>a<br />b</p>");
  });

  it("122 trailing backslash before blank line is literal", () => {
    expect(runTest("a\\\n\nb")).toBe("<p>a\\</p><p>b</p>");
  });

  it("123 hardbreak backslash inside emphasis", () => {
    expect(runTest("*a\\\nb*")).toBe("<p><em>a<br />b</em></p>");
  });

  it("124 hardbreak backslash inside strong", () => {
    expect(runTest("**a\\\nb**")).toBe("<p><strong>a<br />b</strong></p>");
  });

  it("125 hardbreak backslash inside del", () => {
    expect(runTest("~~a\\\nb~~")).toBe("<p><del>a<br />b</del></p>");
  });

  it("126 hardbreak backslash inside link label", () => {
    expect(runTest("[a\\\nb](x)")).toBe('<p><a href="x">a<br />b</a></p>');
  });

  it("127 hardbreak backslash inside blockquote", () => {
    expect(runTest("> a\\\n> b")).toBe(
      "<blockquote><p>a<br />b</p></blockquote>"
    );
  });

  it("128 hardbreak backslash inside list item", () => {
    expect(runTest("- a\\\n  b")).toBe("<ul><li><p>a<br />b</p></li></ul>");
  });

  it("129 hardbreak backslash inside heading", () => {
    expect(runTest("# a\\\nb")).toBe("<h1>a\\</h1><p>b</p>");
  });

  it("130 trailing backslash without newline is literal", () => {
    expect(runTest("a\\")).toBe("<p>a\\</p>");
  });

  it("131 backslash before newline in code fence stays literal", () => {
    expect(runTest("```\na\\\nb\n```")).toBe("<pre><code>a\\\nb</code></pre>");
  });

  it("132 autolink with close paren should stop before paren", () => {
    expect(runTest("See https://example.com/a(b)c")).toBe(
      '<p>See <a href="https://example.com/a">https://example.com/a</a>(b)c</p>'
    );
  });

  it("133 autolink trims trailing ) when unbalanced", () => {
    expect(runTest("See https://example.com/a)b")).toBe(
      '<p>See <a href="https://example.com/a">https://example.com/a</a>)b</p>'
    );
  });

  it("134 autolink followed by bracket", () => {
    expect(runTest("x https://example.com] y")).toBe(
      '<p>x <a href="https://example.com">https://example.com</a>] y</p>'
    );
  });

  it("135 autolink after punctuation with no space", () => {
    expect(runTest("x:https://example.com")).toBe(
      '<p>x:<a href="https://example.com">https://example.com</a></p>'
    );
  });

  it("136 autolink with fragment only", () => {
    expect(runTest("https://example.com/#hash")).toBe(
      '<p><a href="https://example.com/#hash">https://example.com/#hash</a></p>'
    );
  });

  it("137 autolink followed by ellipsis", () => {
    expect(runTest("See https://example.com...")).toBe(
      '<p>See <a href="https://example.com">https://example.com</a>...</p>'
    );
  });

  it("138 autolink in nested list item paragraph", () => {
    expect(runTest("- a\n  - see https://example.com")).toBe(
      '<ul><li><p>a</p><ul><li><p>see <a href="https://example.com">https://example.com</a></p></li></ul></li></ul>'
    );
  });

  it("139 table row with autolink and emphasis", () => {
    expect(runTest("| a | b |\n| - | - |\n| *https://e.com* | c |")).toBe(
      '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td><em><a href="https://e.com">https://e.com</a></em></td><td>c</td></tr></tbody></table>'
    );
  });

  it("140 blockquote lazy continuation with autolink + hardbreak", () => {
    expect(runTest("> a\\\nhttps://example.com")).toBe(
      '<blockquote><p>a<br /><a href="https://example.com">https://example.com</a></p></blockquote>'
    );
  });

  it("141 backslash escape before autolink should not break", () => {
    expect(runTest("a\\\\\nhttps://example.com")).toBe(
      '<p>a<br /><a href="https://example.com">https://example.com</a></p>'
    );
  });

  it("142 autolink with trailing slash and punctuation", () => {
    expect(runTest("https://example.com/,")).toBe(
      '<p><a href="https://example.com/">https://example.com/</a>,</p>'
    );
  });

  it("143 hardbreak backslash then emphasis continues", () => {
    expect(runTest("a\\\n*bc*")).toBe("<p>a<br /><em>bc</em></p>");
  });

  it("144 hardbreak backslash with two spaces after", () => {
    expect(runTest("a\\  \nb")).toBe("<p>a\\<br />b</p>");
  });

  it("145 autolink near emphasis markers", () => {
    expect(runTest("_https://example.com_")).toBe(
      '<p><em><a href="https://example.com">https://example.com</a></em></p>'
    );
  });

  it("146 autolink across paragraph boundary should not join", () => {
    expect(runTest("https://a.com\n\nhttps://b.com")).toBe(
      '<p><a href="https://a.com">https://a.com</a></p><p><a href="https://b.com">https://b.com</a></p>'
    );
  });

  it("147 heading followed by paragraph autolink", () => {
    expect(runTest("# Title\nhttps://example.com")).toBe(
      '<h1>Title</h1><p><a href="https://example.com">https://example.com</a></p>'
    );
  });

  it("148 blockquote with table and autolink cell", () => {
    expect(runTest("> | a | b |\n> | - | - |\n> | https://a.com | c |")).toBe(
      '<blockquote><table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td><a href="https://a.com">https://a.com</a></td><td>c</td></tr></tbody></table></blockquote>'
    );
  });

  it("149 list item with autolink and hardbreak backslash", () => {
    expect(runTest("- https://a.com \\\n  b")).toBe(
      '<ul><li><p><a href="https://a.com">https://a.com</a> <br />b</p></li></ul>'
    );
  });

  it("150 hardbreak backslash before blockquote", () => {
    expect(runTest("a\\\n> b")).toBe(
      "<p>a\\</p><blockquote><p>b</p></blockquote>"
    );
  });
});
