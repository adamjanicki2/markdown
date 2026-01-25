export const TEST_CASES = [
  { name: "1 paragraph", input: "Hello world", output: "<p>Hello world</p>" },
  {
    name: "2 paragraph does not hardbreak on single newline",
    input: "Hello\nworld",
    output: "<p>Hello\nworld</p>",
  },
  {
    name: "3 paragraph supports inline formatting",
    input: "Hello **bold** _em_ `x`",
    output: "<p>Hello <strong>bold</strong> <em>em</em> <code>x</code></p>",
  },
  {
    name: "4 paragraph hardbreak renders as <br />",
    input: "Hello  \nworld",
    output: "<p>Hello<br />\nworld</p>",
  },
  {
    name: "5 nested emphasis/strong",
    input: "**a _b_ c**",
    output: "<p><strong>a <em>b</em> c</strong></p>",
  },
  {
    name: "6 triple nesting combo: del > strong > em",
    input: "~~***combo***~~",
    output: "<p><del><em><strong>combo</strong></em></del></p>",
  },
  {
    name: "7 deeply nested mix",
    input: "*a **b ~~c~~ d** e*",
    output: "<p><em>a <strong>b <del>c</del> d</strong> e</em></p>",
  },
  {
    name: "8 unmatched delimiters left as text",
    input: "Unmatched *stars and ~~tildes",
    output: "<p>Unmatched *stars and ~~tildes</p>",
  },
  {
    name: "9 underscores inside words do not emphasize",
    input: "snake_case foo_bar baz_qux",
    output: "<p>snake_case foo_bar baz_qux</p>",
  },
  {
    name: "10 backslash escapes prevent emphasis",
    input: "\\*not italic\\*",
    output: "<p>*not italic*</p>",
  },
  {
    name: "11 code spans block delimiter parsing",
    input: "**a `*b*` c**",
    output: "<p><strong>a <code>*b*</code> c</strong></p>",
  },
  {
    name: "12 link with inline label",
    input: "See [docs `v1`](https://example.com)",
    output: '<p>See <a href="https://example.com">docs <code>v1</code></a></p>',
  },
  {
    name: "13 image renders with escaped attrs",
    input: '![a "b"](x.png)',
    output: '<p><img src="x.png" alt="a \"b\"" /></p>',
  },
  {
    name: "14 html is left alone",
    input: "<div>x</div>",
    output: "<p><div>x</div></p>",
  },
  {
    name: "15 mixed: link + em + code + del",
    input: "a [b](x) _c_ `d` ~~e~~",
    output: '<p>a <a href="x">b</a> <em>c</em> <code>d</code> <del>e</del></p>',
  },
  {
    name: "16 multiple single lines",
    input: "a\nb\nc",
    output: "<p>a\nb\nc</p>",
  },
  {
    name: "17 hardbreak inside emphasis",
    input: "*a  \nb*",
    output: "<p><em>a<br />\nb</em></p>",
  },
  {
    name: "18 single newline inside emphasis",
    input: "*a\nb*",
    output: "<p><em>a\nb</em></p>",
  },
  { name: "19 heading", input: "# Title", output: "<h1>Title</h1>" },
  {
    name: "20 heading supports inline formatting",
    input: "# Title **Bold**",
    output: "<h1>Title <strong>Bold</strong></h1>",
  },
  {
    name: "21 heading strips trailing hashes",
    input: "## Hi ###",
    output: "<h2>Hi</h2>",
  },
  { name: "22 thematic break", input: "---", output: "<hr />" },
  { name: "23 thematic break with spaces", input: "- - -", output: "<hr />" },
  {
    name: "24 fenced code block with language",
    input: "```ts\nconst x = 1;\n```\n",
    output: '<pre><code class="language-ts">const x = 1;\n</code></pre>',
  },
  {
    name: "25 fenced code block escapes HTML",
    input: "```html\n<div>x</div>\n```",
    output: '<pre><code class="language-html"><div>x</div>\n</code></pre>',
  },
  {
    name: "26 fenced code without language",
    input: "```\n<x>\n```",
    output: "<pre><code><x>\n</code></pre>",
  },
  {
    name: "27 code fence end can be longer than start",
    input: "```js\nx\n````",
    output: '<pre><code class="language-js">x\n</code></pre>',
  },
  {
    name: "28 code fence can start after up to 3 spaces",
    input: "   ```\nhi\n   ```",
    output: "<pre><code>hi\n</code></pre>",
  },
  {
    name: "29 blockquote (simple)",
    input: "> Hello",
    output: "<blockquote>\n<p>Hello</p>\n</blockquote>",
  },
  {
    name: "30 blockquote supports lazy continuation lines",
    input: "> a\nb",
    output: "<blockquote>\n<p>a\nb</p>\n</blockquote>",
  },
  {
    name: "31 nested blockquotes (>>)",
    input: ">> a",
    output:
      "<blockquote>\n<blockquote>\n<p>a</p>\n</blockquote>\n</blockquote>",
  },
  {
    name: "32 nested blockquotes with spaced markers",
    input: "> > a",
    output:
      "<blockquote>\n<blockquote>\n<p>a</p>\n</blockquote>\n</blockquote>",
  },
  {
    name: "33 blockquote marker allowed after indentation",
    input: "  > a",
    output: "<blockquote>\n<p>a</p>\n</blockquote>",
  },
  {
    name: "34 blockquote contains heading + paragraph",
    input: "> # H\n> x",
    output: "<blockquote>\n<h1>H</h1>\n<p>x</p>\n</blockquote>",
  },
  {
    name: "35 blockquote contains thematic break",
    input: "> ---",
    output: "<blockquote>\n<hr />\n</blockquote>",
  },
  {
    name: "36 blockquote contains nested quote + list",
    input: "> > - a\n> > - b",
    output:
      "<blockquote>\n<blockquote>\n<ul>\n<li>a</li>\n<li>b</li>\n</ul>\n</blockquote>\n</blockquote>",
  },
  {
    name: "37 unordered list (simple)",
    input: "- a\n- b",
    output: "<ul>\n<li>a</li>\n<li>b</li>\n</ul>",
  },
  {
    name: "38 ordered list (simple)",
    input: "1. a\n2. b",
    output: "<ol>\n<li>a</li>\n<li>b</li>\n</ol>",
  },
  {
    name: "39 ordered list with start != 1",
    input: "3. a\n4. b",
    output: '<ol start="3">\n<li>a</li>\n<li>b</li>\n</ol>',
  },
  {
    name: "40 list item lazy continuation",
    input: "- a\nb\n- c",
    output: "<ul>\n<li>a\nb</li>\n<li>c</li>\n</ul>",
  },
  {
    name: "41 list item continuation stops before heading",
    input: "- a\n# h",
    output: "<ul>\n<li>a</li>\n</ul>\n<h1>h</h1>",
  },
  {
    name: "42 blank line makes list loose (still same HTML)",
    input: "- a\n\n- b",
    output: "<ul>\n<li>\n<p>a</p>\n</li>\n<li>\n<p>b</p>\n</li>\n</ul>",
  },
  {
    name: "43 nested unordered list",
    input: "- a\n  - b\n  - c\n- d",
    output:
      "<ul>\n<li>a\n<ul>\n<li>b</li>\n<li>c</li>\n</ul>\n</li>\n<li>d</li>\n</ul>",
  },
  {
    name: "44 nested ordered inside unordered",
    input: "- a\n  1. b\n  2. c\n- d",
    output:
      "<ul>\n<li>a\n<ol>\n<li>b</li>\n<li>c</li>\n</ol>\n</li>\n<li>d</li>\n</ul>",
  },
  {
    name: "45 nested list under list item using content indentation",
    input: "- a\n  - b\n    - c\n- d",
    output:
      "<ul>\n<li>a\n<ul>\n<li>b\n<ul>\n<li>c</li>\n</ul>\n</li>\n</ul>\n</li>\n<li>d</li>\n</ul>",
  },
  {
    name: "46 ordered list with multi-digit marker supports nesting",
    input: "10. a\n    - b",
    output: '<ol start="10">\n<li>a\n<ul>\n<li>b</li>\n</ul>\n</li>\n</ol>',
  },
  {
    name: "47 list item contains multiple paragraphs",
    input: "- a\n\n  b",
    output: "<ul>\n<li>\n<p>a</p>\n<p>b</p>\n</li>\n</ul>",
  },
  {
    name: "48 list item contains heading + paragraph continuation stops correctly",
    input: "- a\n  # h\n  b",
    output: "<ul>\n<li>a\n<h1>h</h1>\nb</li>\n</ul>",
  },
  {
    name: "49 list item can contain a blockquote that contains a list",
    input: "- a\n  > - b\n  > - c\n- d",
    output:
      "<ul>\n<li>a\n<blockquote>\n<ul>\n<li>b</li>\n<li>c</li>\n</ul>\n</blockquote>\n</li>\n<li>d</li>\n</ul>",
  },
  {
    name: "50 blockquote can contain a list",
    input: "> - a\n> - b",
    output: "<blockquote>\n<ul>\n<li>a</li>\n<li>b</li>\n</ul>\n</blockquote>",
  },
  {
    name: "51 nested list inside blockquote with lazy continuation",
    input: "> - a\n> b\n> - c",
    output:
      "<blockquote>\n<ul>\n<li>a\nb</li>\n<li>c</li>\n</ul>\n</blockquote>",
  },
  {
    name: "52 list contains nested blockquote then paragraph (lazy continuation stays in quote)",
    input: "- a\n  > x\ny",
    output:
      "<ul>\n<li>a\n<blockquote>\n<p>x\ny</p>\n</blockquote>\n</li>\n</ul>",
  },
  {
    name: "53 ordered list siblings must align by indent (indented ordered marker nests)",
    input: "1. a\n  2. b",
    output: "<ol>\n<li>a</li>\n<li>b</li>\n</ol>",
  },
  {
    name: "54 list item inline formatting",
    input: "- a **b** _c_",
    output: "<ul>\n<li>a <strong>b</strong> <em>c</em></li>\n</ul>",
  },
  {
    name: "55 nested list item inline formatting",
    input: "- a\n  - **b**\n  - _c_",
    output:
      "<ul>\n<li>a\n<ul>\n<li><strong>b</strong></li>\n<li><em>c</em></li>\n</ul>\n</li>\n</ul>",
  },
  {
    name: "56 fenced code inside list item",
    input: "- a\n  ```\n  x\n  ```\n- b",
    output:
      "<ul>\n<li>a\n<pre><code>x\n</code></pre>\n</li>\n<li>b</li>\n</ul>",
  },
  {
    name: "57 fenced code inside blockquote",
    input: "> ```\n> x\n> ```",
    output: "<blockquote>\n<pre><code>x\n</code></pre>\n</blockquote>",
  },
  {
    name: "58 fenced code inside blockquote inside list item",
    input: "- a\n  > ```\n  > x\n  > ```\n- b",
    output:
      "<ul>\n<li>a\n<blockquote>\n<pre><code>x\n</code></pre>\n</blockquote>\n</li>\n<li>b</li>\n</ul>",
  },
  {
    name: "59 list in blockquote in list in blockquote (deep structure)",
    input: "> - a\n>   > - b\n>   >   - c\n> - d",
    output:
      "<blockquote>\n<ul>\n<li>a\n<blockquote>\n<ul>\n<li>b\n<ul>\n<li>c</li>\n</ul>\n</li>\n</ul>\n</blockquote>\n</li>\n<li>d</li>\n</ul>\n</blockquote>",
  },
  {
    name: "60 paragraph after complex structures",
    input: "- a\n  > x\n\nz",
    output:
      "<ul>\n<li>a\n<blockquote>\n<p>x</p>\n</blockquote>\n</li>\n</ul>\n<p>z</p>",
  },
  {
    name: "61 basic table",
    input: "| a | b |\n| - | - |\n| c | d |",
    output:
      "<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>c</td>\n<td>d</td>\n</tr>\n</tbody>\n</table>",
  },
  {
    name: "62 table supports inline in cells",
    input: "| a | b |\n| - | - |\n| **c** | d |",
    output:
      "<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><strong>c</strong></td>\n<td>d</td>\n</tr>\n</tbody>\n</table>",
  },
  {
    name: "63 table supports multiple body rows + inline",
    input: "| a | b |\n| - | - |\n| c | _d_ |\n| `x` | ~~y~~ |",
    output:
      "<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>c</td>\n<td><em>d</em></td>\n</tr>\n<tr>\n<td><code>x</code></td>\n<td><del>y</del></td>\n</tr>\n</tbody>\n</table>",
  },
  {
    name: "64 table without outer pipes",
    input: "a | b\n- | -\nc | d",
    output: "<p>a | b</p>\n<ul>\n<li>| -\nc | d</li>\n</ul>",
  },
  {
    name: "65 heading with leading spaces",
    input: "  # not heading",
    output: "<h1>not heading</h1>",
  },
  {
    name: "66 weird nested list syntax",
    input: "* - *",
    output:
      "<ul>\n<li>\n<ul>\n<li>\n<ul>\n<li></li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>",
  },
  {
    name: "67 fence allows internal backticks",
    input: "```\n`nested code`\n```",
    output: "<pre><code>`nested code`\n</code></pre>",
  },
  {
    name: "68 double backtick code span",
    input: "``code``",
    output: "<p><code>code</code></p>",
  },
  {
    name: "69 code span preserves leading and trailing spaces",
    input: "` code `",
    output: "<p><code> code </code></p>",
  },
  {
    name: "70 trailing backslash is literal",
    input: "foo\\",
    output: "<p>foo\\</p>",
  },
  {
    name: "71 empty link url should still create link",
    input: "[x]()",
    output: '<p><a href="">x</a></p>',
  },
  {
    name: "72 empty image url should still create image",
    input: "![x]()",
    output: '<p><img src="" alt="x" /></p>',
  },
  {
    name: "73 link url trims whitespace",
    input: "[x](  https://a.com  )",
    output: '<p><a href="https://a.com">x</a></p>',
  },
  {
    name: "74 deep inline nesting with del/strong/em",
    input: "*a **b ~~c _d_~~ e** f*",
    output: "<p><em>a <strong>b <del>c <em>d</em></del> e</strong> f</em></p>",
  },
  {
    name: "75 emphasis wraps a link",
    input: "*see [x](y)*",
    output: '<p><em>see <a href="y">x</a></em></p>',
  },
  {
    name: "76 code span blocks link parsing",
    input: "`[x](y)`",
    output: "<p><code>[x](y)</code></p>",
  },
  {
    name: "77 autolink plain url",
    input: "Here's a link https://example.com",
    output:
      '<p>Here\'s a link <a href="https://example.com">https://example.com</a></p>',
  },
  {
    name: "78 autolink trims trailing punctuation",
    input: "Visit https://example.com.",
    output:
      '<p>Visit <a href="https://example.com">https://example.com</a>.</p>',
  },
  {
    name: "79 table inside blockquote",
    input: "> | a | b |\n> | - | - |\n> | c | d |",
    output:
      "<blockquote>\n<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>c</td>\n<td>d</td>\n</tr>\n</tbody>\n</table>\n</blockquote>",
  },
  {
    name: "80 table inside list item",
    input: "- | a | b |\n  | - | - |\n  | c | d |",
    output:
      "<ul>\n<li>\n<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>c</td>\n<td>d</td>\n</tr>\n</tbody>\n</table>\n</li>\n</ul>",
  },
  {
    name: "81 horizontal rule before list item",
    input: "- ---\n- a",
    output: "<hr />\n<ul>\n<li>a</li>\n</ul>",
  },
  {
    name: "82 blockquote with list, blank line, then paragraph",
    input: "> - a\n>   - b\n> \n> c",
    output:
      "<blockquote>\n<ul>\n<li>a\n<ul>\n<li>b</li>\n</ul>\n</li>\n</ul>\n<p>c</p>\n</blockquote>",
  },
  {
    name: "83 ordered list with blockquote and nested list",
    input: "2. a\n   > b\n   > - c\n3. d",
    output:
      '<ol start="2">\n<li>a\n<blockquote>\n<p>b</p>\n<ul>\n<li>c</li>\n</ul>\n</blockquote>\n</li>\n<li>d</li>\n</ol>',
  },
  {
    name: "84 loose list item with fenced code block",
    input: "- a\n\n  ```\n  code\n  ```\n\n- b",
    output:
      "<ul>\n<li>\n<p>a</p>\n<pre><code>code\n</code></pre>\n</li>\n<li>\n<p>b</p>\n</li>\n</ul>",
  },
  {
    name: "85 blockquote with fenced code and language",
    input: "> ```ts\n> const x = 1;\n> ```",
    output:
      '<blockquote>\n<pre><code class="language-ts">const x = 1;\n</code></pre>\n</blockquote>',
  },
  {
    name: "86 heading with tab after marker",
    input: "#\tTitle",
    output: "<h1>Title</h1>",
  },
  {
    name: "87 code fence info only uses first token",
    input: "```js extra\nx\n```",
    output: '<pre><code class="language-js">x\n</code></pre>',
  },
  {
    name: "88 unordered list with plus markers",
    input: "+ a\n+ b",
    output: "<ul>\n<li>a</li>\n<li>b</li>\n</ul>",
  },
  {
    name: "89 unordered list makes separate list with mixed markers",
    input: "- a\n+ b",
    output: "<ul>\n<li>a</li>\n</ul>\n<ul>\n<li>b</li>\n</ul>",
  },
  {
    name: "90 ordered list with paren markers",
    input: "1) a\n2) b",
    output: "<ol>\n<li>a</li>\n<li>b</li>\n</ol>",
  },
  {
    name: "91 ordered list allows long numeric marker",
    input: "123456789. a\n123456790. b",
    output: '<ol start="123456789">\n<li>a</li>\n<li>b</li>\n</ol>',
  },
  {
    name: "92 list item continuation with extra indentation",
    input: "- a\n   b",
    output: "<ul>\n<li>a\nb</li>\n</ul>",
  },
  {
    name: "93 nested list with deeper indentation",
    input: "- a\n    - b",
    output: "<ul>\n<li>a\n<ul>\n<li>b</li>\n</ul>\n</li>\n</ul>",
  },
  {
    name: "94 blockquote ends before heading",
    input: "> a\n# b",
    output: "<blockquote>\n<p>a</p>\n</blockquote>\n<h1>b</h1>",
  },
  {
    name: "95 table delimiter rejects colons",
    input: "<p>| a | b |\n| :-- | --: |\n| c | d |</p>",
    output:
      '<table>\n<thead>\n<tr>\n<th align="left">a</th>\n<th align="right">b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td align="left">c</td>\n<td align="right">d</td>\n</tr>\n</tbody>\n</table>',
  },
  {
    name: "96 table with spaced cells and no outer pipes",
    input: " a | b \n --- | --- \n c | d ",
    output:
      "<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>c</td>\n<td>d</td>\n</tr>\n</tbody>\n</table>",
  },
  {
    name: "97 hardbreak inside link label",
    input: "[a  \nb](x)",
    output: '<p><a href="x">a<br />\nb</a></p>',
  },
  {
    name: "98 emphasis across line break inside link label",
    input: "[*a\nb*](x)",
    output: '<p><a href="x"><em>a\nb</em></a></p>',
  },
  {
    name: "99 image alt does not parse inline",
    input: "![**a**](x)",
    output: '<p><img src="x" alt="**a**" /></p>',
  },
  {
    name: "100 unterminated code fence consumes rest of document",
    input: "```\ncode",
    output: "<pre><code>code\n</code></pre>",
  },
  {
    name: "101 deep nesting: blockquote > list > blockquote > list > code",
    input: "> - a\n>   > b\n>   > - `c`\n> - d",
    output:
      "<blockquote>\n<ul>\n<li>a\n<blockquote>\n<p>b</p>\n<ul>\n<li><code>c</code></li>\n</ul>\n</blockquote>\n</li>\n<li>d</li>\n</ul>\n</blockquote>",
  },
  {
    name: "102 very deep inline nesting with code",
    input: "~~**_`x`_**~~",
    output: "<p><del><strong><em><code>x</code></em></strong></del></p>",
  },
  {
    name: "103 autolink standalone url",
    input: "https://example.com",
    output: '<p><a href="https://example.com">https://example.com</a></p>',
  },
  {
    name: "104 autolink with query and fragment",
    input: "Go https://example.com/a?b=c#d now",
    output:
      '<p>Go <a href="https://example.com/a?b=c#d">https://example.com/a?b=c#d</a> now</p>',
  },
  {
    name: "105 autolink multiple with punctuation",
    input: "Links: https://a.com, https://b.com;",
    output:
      '<p>Links: <a href="https://a.com">https://a.com</a>, <a href="https://b.com">https://b.com</a>;</p>',
  },
  {
    name: "106 autolink wrapped in parentheses",
    input: "See (https://example.com/path)",
    output:
      '<p>See (<a href="https://example.com/path">https://example.com/path</a>)</p>',
  },
  {
    name: "107 autolink with port",
    input: "Use https://example.com:8080/a",
    output:
      '<p>Use <a href="https://example.com:8080/a">https://example.com:8080/a</a></p>',
  },
  {
    name: "108 autolink inside emphasis",
    input: "*https://example.com*",
    output:
      '<p><em><a href="https://example.com">https://example.com</a></em></p>',
  },
  {
    name: "109 autolink inside blockquote",
    input: "> see https://example.com",
    output:
      '<blockquote>\n<p>see <a href="https://example.com">https://example.com</a></p>\n</blockquote>',
  },
  {
    name: "110 autolink inside list item",
    input: "- see https://example.com",
    output:
      '<ul>\n<li>see <a href="https://example.com">https://example.com</a></li>\n</ul>',
  },
  {
    name: "111 autolink inside table cell",
    input: "| a | b |\n| - | - |\n| https://example.com | c |",
    output:
      '<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><a href="https://example.com">https://example.com</a></td>\n<td>c</td>\n</tr>\n</tbody>\n</table>',
  },
  {
    name: "112 autolink in blockquote lazy continuation",
    input: "> https://example.com\ncontinued",
    output:
      '<blockquote>\n<p><a href="https://example.com">https://example.com</a>\ncontinued</p>\n</blockquote>',
  },
  {
    name: "113 autolink not in code span",
    input: "`https://example.com`",
    output: "<p><code>https://example.com</code></p>",
  },
  {
    name: "114 autolink trims trailing exclamation",
    input: "Wow https://example.com!",
    output: '<p>Wow <a href="https://example.com">https://example.com</a>!</p>',
  },
  {
    name: "115 autolink trims trailing colon",
    input: "Go https://example.com:",
    output: '<p>Go <a href="https://example.com">https://example.com</a>:</p>',
  },
  {
    name: "116 list item blank line then autolink paragraph",
    input: "- a\n\n  https://example.com",
    output:
      '<ul>\n<li>\n<p>a</p>\n<p><a href="https://example.com">https://example.com</a></p>\n</li>\n</ul>',
  },
  {
    name: "117 list item table with autolink cell",
    input: "- | a | b |\n  | - | - |\n  | https://example.com | c |",
    output:
      '<ul>\n<li>\n<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><a href="https://example.com">https://example.com</a></td>\n<td>c</td>\n</tr>\n</tbody>\n</table>\n</li>\n</ul>',
  },
  {
    name: "118 code fence with url literal",
    input: "```\nhttps://example.com\n```",
    output: "<pre><code>https://example.com\n</code></pre>",
  },
  {
    name: "119 autolink inside heading",
    input: "# https://example.com",
    output: '<h1><a href="https://example.com">https://example.com</a></h1>',
  },
  {
    name: "120 autolinks across newline",
    input: "https://example.com\nand https://example.org",
    output:
      '<p><a href="https://example.com">https://example.com</a>\nand <a href="https://example.org">https://example.org</a></p>',
  },
  {
    name: "121 hardbreak with trailing backslash",
    input: "a\\\nb",
    output: "<p>a<br />\nb</p>",
  },
  {
    name: "122 trailing backslash before blank line is literal",
    input: "a\\\n\nb",
    output: "<p>a\\</p>\n<p>b</p>",
  },
  {
    name: "123 hardbreak backslash inside emphasis",
    input: "*a\\\nb*",
    output: "<p><em>a<br />\nb</em></p>",
  },
  {
    name: "124 hardbreak backslash inside strong",
    input: "**a\\\nb**",
    output: "<p><strong>a<br />\nb</strong></p>",
  },
  {
    name: "125 hardbreak backslash inside del",
    input: "~~a\\\nb~~",
    output: "<p><del>a<br />\nb</del></p>",
  },
  {
    name: "126 hardbreak backslash inside link label",
    input: "[a\\\nb](x)",
    output: '<p><a href="x">a<br />\nb</a></p>',
  },
  {
    name: "127 hardbreak backslash inside blockquote",
    input: "> a\\\n> b",
    output: "<blockquote>\n<p>a<br />\nb</p>\n</blockquote>",
  },
  {
    name: "128 hardbreak backslash inside list item",
    input: "- a\\\n  b",
    output: "<ul>\n<li>a<br />\nb</li>\n</ul>",
  },
  {
    name: "129 hardbreak backslash inside heading",
    input: "# a\\\nb",
    output: "<h1>a\\</h1>\n<p>b</p>",
  },
  {
    name: "130 trailing backslash without newline is literal",
    input: "a\\",
    output: "<p>a\\</p>",
  },
  {
    name: "131 backslash before newline in code fence stays literal",
    input: "```\na\\\nb\n```",
    output: "<pre><code>a\\\nb\n</code></pre>",
  },
  {
    name: "132 autolink with parenthesis works",
    input: "See https://example.com/a(b)c",
    output:
      '<p>See <a href="https://example.com/a(b)c">https://example.com/a(b)c</a></p>',
  },
  {
    name: "133 autolink does not trim trailing )",
    input: "See https://example.com/a)b",
    output:
      '<p>See <a href="https://example.com/a)b">https://example.com/a)b</a></p>',
  },
  {
    name: "134 autolink followed by bracket",
    input: "x https://example.com] y",
    output: '<p>x <a href="https://example.com">https://example.com</a>] y</p>',
  },
  {
    name: "135 autolink after punctuation with no space",
    input: "x:https://example.com",
    output: '<p>x:<a href="https://example.com">https://example.com</a></p>',
  },
  {
    name: "136 autolink with fragment only",
    input: "https://example.com/#hash",
    output:
      '<p><a href="https://example.com/#hash">https://example.com/#hash</a></p>',
  },
  {
    name: "137 autolink followed by ellipsis",
    input: "See https://example.com...",
    output:
      '<p>See <a href="https://example.com">https://example.com</a>...</p>',
  },
  {
    name: "138 autolink in nested list item paragraph",
    input: "- a\n  - see https://example.com",
    output:
      '<ul>\n<li>a\n<ul>\n<li>see <a href="https://example.com">https://example.com</a></li>\n</ul>\n</li>\n</ul>',
  },
  {
    name: "139 table row with autolink and emphasis",
    input: "| a | b |\n| - | - |\n| *https://e.com* | c |",
    output:
      '<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><em><a href="https://e.com">https://e.com</a></em></td>\n<td>c</td>\n</tr>\n</tbody>\n</table>',
  },
  {
    name: "140 blockquote lazy continuation with autolink + hardbreak",
    input: "> a\\\nhttps://example.com",
    output:
      '<blockquote>\n<p>a<br />\n<a href="https://example.com">https://example.com</a></p>\n</blockquote>',
  },
  {
    name: "141 backslash escape before autolink should not hardbreak",
    input: "a\\\\\nhttps://example.com",
    output: '<p>a\\\n<a href="https://example.com">https://example.com</a></p>',
  },
  {
    name: "142 autolink with trailing slash and punctuation",
    input: "https://example.com/,",
    output: '<p><a href="https://example.com/">https://example.com/</a>,</p>',
  },
  {
    name: "143 hardbreak backslash then emphasis continues",
    input: "a\\\n*bc*",
    output: "<p>a<br />\n<em>bc</em></p>",
  },
  {
    name: "144 hardbreak backslash with two spaces after",
    input: "a\\  \nb",
    output: "<p>a\\<br />\nb</p>",
  },
  {
    name: "145 autolink near emphasis markers",
    input: "_https://example.com_",
    output:
      '<p><em><a href="https://example.com">https://example.com</a></em></p>',
  },
  {
    name: "146 autolink across paragraph boundary should not join",
    input: "https://a.com\n\nhttps://b.com",
    output:
      '<p><a href="https://a.com">https://a.com</a></p>\n<p><a href="https://b.com">https://b.com</a></p>',
  },
  {
    name: "147 heading followed by paragraph autolink",
    input: "# Title\nhttps://example.com",
    output:
      '<h1>Title</h1>\n<p><a href="https://example.com">https://example.com</a></p>',
  },
  {
    name: "148 blockquote with table and autolink cell",
    input: "> | a | b |\n> | - | - |\n> | https://a.com | c |",
    output:
      '<blockquote>\n<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><a href="https://a.com">https://a.com</a></td>\n<td>c</td>\n</tr>\n</tbody>\n</table>\n</blockquote>',
  },
  {
    name: "149 list item with autolink and hardbreak backslash",
    input: "- https://a.com \\\n  b",
    output:
      '<ul>\n<li><a href="https://a.com">https://a.com</a> <br />\nb</li>\n</ul>',
  },
  {
    name: "150 hardbreak backslash before blockquote",
    input: "a\\\n> b",
    output: "<p>a\\</p>\n<blockquote>\n<p>b</p>\n</blockquote>",
  },
  {
    name: "151 list item contains table then paragraph continuation",
    input: "- intro\n  | a | b |\n  | - | - |\n  | c | d |\n  tail",
    output:
      "<ul>\n<li>intro\n<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>c</td>\n<td>d</td>\n</tr>\n<tr>\n<td>tail</td>\n<td></td>\n</tr>\n</tbody>\n</table>\n</li>\n</ul>",
  },
  {
    name: "152 list > blockquote > list item contains table",
    input:
      "- a\n  > - b\n  >   | h | i |\n  >   | - | - |\n  >   | x | y |\n- c",
    output:
      "<ul>\n<li>a\n<blockquote>\n<ul>\n<li>b\n<table>\n<thead>\n<tr>\n<th>h</th>\n<th>i</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>x</td>\n<td>y</td>\n</tr>\n</tbody>\n</table>\n</li>\n</ul>\n</blockquote>\n</li>\n<li>c</li>\n</ul>",
  },
  {
    name: "153 blockquote contains list whose item contains table and code fence",
    input:
      '> - item\n>   | a | b |\n>   | - | - |\n>   | `x|y` | ~~z~~ |\n>\n>   ```js\n>   const url = "https://example.com";\n>   ```',
    output:
      '<blockquote>\n<ul>\n<li>\n<p>item</p>\n<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>`x</td>\n<td>y`</td>\n</tr>\n</tbody>\n</table>\n<pre><code class="language-js">const url = &quot;https://example.com&quot;;\n</code></pre>\n</li>\n</ul>\n</blockquote>',
  },
  {
    name: "154 atx heading requires space after # (should be paragraph)",
    input: "#Title",
    output: "<p>#Title</p>",
  },
  {
    name: "155 atx heading with more than 6 hashes clamps/treated as heading 6-ish",
    input: "####### too many",
    output: "<p>####### too many</p>",
  },
  {
    name: "156 thematic break not enough markers (should be paragraph)",
    input: "--",
    output: "<p>--</p>",
  },
  {
    name: "157 thematic break with tabs between markers",
    input: "-\t-\t-",
    output: "<hr />",
  },
  {
    name: "158 thematic break with leading indentation 3 spaces still hr",
    input: "   ---",
    output: "<hr />",
  },
  {
    name: "159 indented 4 spaces prevents hr (code block)",
    input: "    ---",
    output: "<pre><code>---\n</code></pre>",
  },
  {
    name: "160 code span with internal backtick via double fence",
    input: "``a`b``",
    output: "<p><code>a`b</code></p>",
  },
  {
    name: "161 code span trims one leading/trailing space only",
    input: "`  x  `",
    output: "<p><code> x </code></p>",
  },
  { name: "162 code span empty", input: "``", output: "<p>``</p>" },
  {
    name: "163 backslash escapes punctuation literal",
    input: "\\[brackets\\] and \\(parens\\)",
    output: "<p>[brackets] and (parens)</p>",
  },
  {
    name: "164 backslash before space is literal",
    input: "a\\ b",
    output: "<p>a\\ b</p>",
  },
  {
    name: "165 emphasis with intraword underscores should not emphasize",
    input: "a__b__c",
    output: "<p>a__b__c</p>",
  },
  {
    name: "166 emphasis with intraword asterisks should not emphasize",
    input: "a**b**c",
    output: "<p>a<strong>b</strong>c</p>",
  },
  {
    name: "167 mixed delimiter runs ambiguous",
    input: "***x**",
    output: "<p>*<strong>x</strong></p>",
  },
  {
    name: "168 nested empty emphasis nodes should not be emitted",
    input: "**__**",
    output: "<p><strong>__</strong></p>",
  },
  {
    name: "169 emphasis around punctuation",
    input: "*!@#* **(x)**",
    output: "<p><em>!@#</em> <strong>(x)</strong></p>",
  },
  {
    name: "170 link destination with parentheses balanced",
    input: "[link](http://example.com/a(b)c)",
    output: '<p><a href="http://example.com/a(b)c">link</a></p>',
  },
  {
    name: "171 link destination with spaces must be trimmed",
    input: "[x](   http://example.com  )",
    output: '<p><a href="http://example.com">x</a></p>',
  },
  {
    name: "172 link destination with title in quotes",
    input: '[x](http://example.com "t")',
    output: '<p><a href="http://example.com" title="t">x</a></p>',
  },
  {
    name: "173 link label with nested brackets",
    input: "[a [b] c](x)",
    output: '<p><a href="x">a [b] c</a></p>',
  },
  {
    name: "174 link label with escaped closing bracket",
    input: "[a \\] b](x)",
    output: '<p><a href="x">a ] b</a></p>',
  },
  {
    name: "175 link destination angle form",
    input: "[x](<http://example.com/a(b)c>)",
    output: '<p><a href="http://example.com/a(b)c">x</a></p>',
  },
  {
    name: "176 image alt with brackets and escapes",
    input: "![a \\] b [c]](x.png)",
    output: '<p><img src="x.png" alt="a ] b [c]" /></p>',
  },
  {
    name: "177 image title in single quotes",
    input: "![x](img.png 't')",
    output: '<p><img src="img.png" alt="x" title="t" /></p>',
  },
  {
    name: "178 autolink with query chars",
    input: "https://example.com/a?b=(c)&d=e",
    output:
      '<p><a href="https://example.com/a?b=(c)&amp;d=e">https://example.com/a?b=(c)&amp;d=e</a></p>',
  },
  {
    name: "179 autolink followed by close paren balanced should include",
    input: "https://example.com/a(b)c",
    output:
      '<p><a href="https://example.com/a(b)c">https://example.com/a(b)c</a></p>',
  },
  {
    name: "180 autolink trailing paren should be trimmed if unbalanced",
    input: "https://example.com/a(b))",
    output:
      '<p><a href="https://example.com/a(b)">https://example.com/a(b)</a>)</p>',
  },
  {
    name: "181 inline html-like tag should be escaped",
    input: 'x <span class="a">y</span> z',
    output: "<p>x <!-- raw HTML omitted -->y<!-- raw HTML omitted --> z</p>",
  },
  {
    name: "182 entity-like text should remain text",
    input: "&copy; &notanentity;",
    output: "<p>© &amp;notanentity;</p>",
  },
  {
    name: "183 blockquote lazy continuation with blank line ends quote",
    input: "> a\n>\n b",
    output: "<blockquote>\n<p>a</p>\n</blockquote>\n<p>b</p>",
  },
  {
    name: "184 blockquote with mixed starters",
    input: "> # h\n> - a\n>   - b\n> \n> end",
    output:
      "<blockquote>\n<h1>h</h1>\n<ul>\n<li>a\n<ul>\n<li>b</li>\n</ul>\n</li>\n</ul>\n<p>end</p>\n</blockquote>",
  },
  {
    name: "185 deep blockquote stack then paragraph",
    input: ">>> deep\n\nout",
    output:
      "<blockquote>\n<blockquote>\n<blockquote>\n<p>deep</p>\n</blockquote>\n</blockquote>\n</blockquote>\n<p>out</p>",
  },
  {
    name: "186 ordered list marker 0 is allowed? (edge)",
    input: "0. a\n1. b",
    output: '<ol start="0">\n<li>a</li>\n<li>b</li>\n</ol>',
  },
  {
    name: "187 ordered list marker with huge indent nests",
    input: "1. a\n       2. b",
    output: "<ol>\n<li>a\n2. b</li>\n</ol>",
  },
  {
    name: "188 list item with blank line but no sibling should not loosen outer",
    input: "- a\n\nx",
    output: "<ul>\n<li>a</li>\n</ul>\n<p>x</p>",
  },
  {
    name: "189 list item with thematic break child",
    input: "- a\n  ---\n- b",
    output: "<ul>\n<li>\n<h2>a</h2>\n</li>\n<li>b</li>\n</ul>",
  },
  {
    name: "190 list item with fenced code then paragraph continuation",
    input: "- a\n  ```\n  code\n  ```\n  b",
    output: "<ul>\n<li>a\n<pre><code>code\n</code></pre>\nb</li>\n</ul>",
  },
  {
    name: "191 tight list with inline-only item should render fragment",
    input: "- a\n- b\n- **c**",
    output: "<ul>\n<li>a</li>\n<li>b</li>\n<li><strong>c</strong></li>\n</ul>",
  },
  {
    name: "192 loose list with multiple paragraphs and inline",
    input: "- a\n\n  b _c_",
    output: "<ul>\n<li>\n<p>a</p>\n<p>b <em>c</em></p>\n</li>\n</ul>",
  },
  {
    name: "193 nested list mixed markers should keep same list",
    input: "- a\n  + b\n  * c",
    output:
      "<ul>\n<li>a\n<ul>\n<li>b</li>\n</ul>\n<ul>\n<li>c</li>\n</ul>\n</li>\n</ul>",
  },
  {
    name: "194 nested list after long ordered marker",
    input: "123. a\n     - b\n     - c",
    output:
      '<ol start="123">\n<li>a\n<ul>\n<li>b</li>\n<li>c</li>\n</ul>\n</li>\n</ol>',
  },
  {
    name: "195 table with pipes inside code spans",
    input: "| a | b |\n| - | - |\n| `x|y` | z |",
    output:
      "<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>`x</td>\n<td>y`</td>\n</tr>\n</tbody>\n</table>",
  },
  {
    name: "196 table with escaped pipe in cell",
    input: "| a | b |\n| - | - |\n| x \\| y | z |",
    output:
      "<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>x | y</td>\n<td>z</td>\n</tr>\n</tbody>\n</table>",
  },
  {
    name: "197 table should not parse if separator row invalid",
    input: "| a | b |\n| --- | -x- |\n| c | d |",
    output: "<p>| a | b |\n| --- | -x- |\n| c | d |</p>",
  },
  {
    name: "198 table with leading/trailing spaces in cells",
    input: "|  a  |  b  |\n| - | - |\n|  c  |  d  |",
    output:
      "<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>c</td>\n<td>d</td>\n</tr>\n</tbody>\n</table>",
  },
  {
    name: "199 fenced code in blockquote with lazy line",
    input: "> ```\n> a\n> ```\n> b",
    output:
      "<blockquote>\n<pre><code>a\n</code></pre>\n<p>b</p>\n</blockquote>",
  },
  {
    name: "200 fence closer must be >= opener length",
    input: "````\na\n```",
    output: "<pre><code>a\n```\n</code></pre>",
  },
] as const;
