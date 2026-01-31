import { Badge, Box, Icon, TextArea, ui } from "@adamjanicki/ui";
import { architect } from "@adamjanicki/ui/icons";
import { useState } from "react";
import DemoMarkdown from "src/components/DemoMarkdown";
import Heading from "src/components/Heading";
import Para from "src/components/Para";
import Snippet from "src/components/Snippet";

export default function Main() {
  const [markdown, setMarkdown] = useState(starterMarkdown);

  return (
    <Box className="main-container">
      <ui.h1 vfx={{ textAlign: "center", fontSize: "xxl" }}>
        Markdown → React
      </ui.h1>
      <ui.p
        vfx={{
          color: "muted",
          textAlign: "center",
          fontWeight: 5,
          fontSize: "l",
        }}
      >
        A component for converting Markdown into React
        <ui.br />
        Check out the docs and examples below to see what's available.
      </ui.p>
      <Snippet lang="bash">npm install --save @adamjanicki/markdown</Snippet>

      <Heading level={1}>Setup</Heading>
      <Para>
        After installing the package and getting set up, usage is simple: simply
        import the component and pass in the Markdown source to have it rendered
        as React! For further customization, you can supply custom render
        functions for each DOM element; hide or fully drop any unwanted Markdown
        component types, or fully extend the feature set with custom inline
        modifiers.
      </Para>
      <Snippet>
        {`import Markdown from "@adamjanicki/markdown";

export default function Example() {
  return (
    <Markdown>
      {"# Hello world!"}
    </Markdown>
  );
}`}
      </Snippet>

      <Heading level={1}>Components</Heading>
      <Para>
        The parser supports the everyday Markdown you expect, like bold,
        italics, inline code, and links, plus GFM extensions like tables.
        Anything you don't like can be dropped or swapped out with a renderer
        that matches your design system.
      </Para>
      <Box vfx={{ axis: "x", gap: "s", wrap: true }}>
        <Badge type="success">Headings (h1-h6)</Badge>
        <Badge type="success">Paragraphs</Badge>
        <Badge type="success">Links</Badge>
        <Badge type="success">Images</Badge>
        <Badge type="success">Blockquotes</Badge>
        <Badge type="success">Inline code</Badge>
        <Badge type="success">Code blocks</Badge>
        <Badge type="success">Lists (ul/ol)</Badge>
        <Badge type="success">Tables</Badge>
        <Badge type="success">Horizontal rules</Badge>
        <Badge type="success">Line breaks</Badge>
        <Badge type="success">Bold / Italic / Strike</Badge>
      </Box>
      <Para>
        Need to push beyond custom renderers for existing components? You can
        add your own inline extensions to get more functionality out of
        Markdown! For example, you could make <ui.code>==</ui.code> translate to{" "}
        <ui.code>{"<mark>"}</ui.code> elements, which is what I did below in the
        playground.
      </Para>

      <Heading level={1}>Playground</Heading>
      <Box
        vfx={{ axis: "x", gap: "l", width: "full", align: "start", wrap: true }}
      >
        <Box
          vfx={{ axis: "y", gap: "s", width: "full" }}
          style={{ flex: 1, minWidth: 280 }}
        >
          <ui.h3>Input</ui.h3>
          <TextArea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={30}
          />
        </Box>
        <Box
          vfx={{ axis: "y", gap: "s", width: "full" }}
          style={{ flex: 1, minWidth: 280 }}
        >
          <ui.h3>Output</ui.h3>
          <Box
            vfx={{
              width: "full",
              paddingY: "s",
              paddingX: "m",
              radius: "rounded",
              border: true,
              shadow: "floating",
              backgroundColor: "default",
            }}
          >
            <DemoMarkdown markdown={markdown} />
          </Box>
        </Box>
      </Box>

      <Para>
        And that's it! Enjoy playing around with some Markdown!
        <ui.br />
        <ui.br />
        Thanks,
        <ui.br />
        Adam
      </Para>
      <Icon
        icon={architect}
        size="xl"
        style={{ color: "var(--aui-link-color)" }}
      />
    </Box>
  );
}

const starterMarkdown = [
  "# Welcome!",
  "",
  "Here are some text modifiers: **bold**, _italic_, `code`, and ~~strikethrough~~",
  "",
  "And here are some custom extensions: ==highlight==, %%subscript%%, and ^^superscript^^!",
  "",
  "> Blockquotes are great for citing lines from movies",
  "",
  "## Lists",
  "- item a",
  "- item b",
  "- item c",
  "",
  "1. Interstellar",
  "2. Alien",
  "",
  "```ts",
  "// How efficient!",
  "function fib(n: number): number {",
  "  if (n <= 1) return n;",
  "  return fib(n - 1) + fib(n - 2);",
  "};",
  "```",
  "",
  "| Element | Supported |",
  "| --- | --- |",
  "| Tables | Yes |",
  "| Links | Yes |",
  "| Images | Yes |",
  "",
  "[Link to the playground](#playground)",
].join("\n");
