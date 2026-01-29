import { Alert, Badge, Box, Icon, TextArea, ui } from "@adamjanicki/ui";
import { architect, infoSquare } from "@adamjanicki/ui/icons";
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
        Checkout the docs and examples below to see what's available.
      </ui.p>
      <Snippet lang="bash">npm install --save @adamjanicki/markdown</Snippet>

      <Heading level={1}>Setup</Heading>
      <Para>
        After installing the package and getting setup, usage is simple: simply
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

      <Heading level={1}>Supported Elements</Heading>
      <Para>
        The parser supports the everyday Markdown you expect, including tables
        and fenced code blocks. Anything you don't like can be dropped or
        swapped out with a renderer that matches your design system.
      </Para>
      <Box vfx={{ axis: "x", gap: "s", wrap: true }}>
        <Badge type="static">Headings (h1-h6)</Badge>
        <Badge type="static">Paragraphs</Badge>
        <Badge type="static">Links</Badge>
        <Badge type="static">Images</Badge>
        <Badge type="static">Blockquotes</Badge>
        <Badge type="static">Inline code</Badge>
        <Badge type="static">Code blocks</Badge>
        <Badge type="static">Lists (ul/ol)</Badge>
        <Badge type="static">Tables</Badge>
        <Badge type="static">Horizontal rules</Badge>
        <Badge type="static">Line breaks</Badge>
        <Badge type="static">Bold / Italic / Strike</Badge>
      </Box>
      <Para>
        Need more? Add your own inline extensions or replace any element with a
        custom component in the renderers map.
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
            rows={16}
          />
          <Alert type="info" vfx={{ axis: "x", gap: "s" }}>
            <Icon icon={infoSquare} size="s" />
            Tip: try using "==" to render highlighted nodes using the custom
            syntax extensions!
          </Alert>
        </Box>
        <Box
          vfx={{ axis: "y", gap: "s", width: "full" }}
          style={{ flex: 1, minWidth: 280 }}
        >
          <ui.h3>Output</ui.h3>
          <Box
            vfx={{
              width: "full",
              padding: "s",
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
  "# Hello, Markdown!",
  "",
  "This is **bold**, _italic_, ~~strikethrough~~, ==highlight==, %%subscript%%, and ^^superscript^^!",
  "",
  "> Blockquotes are great for callouts.",
  "",
  "## Lists",
  "- First item",
  "- Second item",
  "- Third item",
  "",
  "1. Ordered item",
  "2. Another ordered item",
  "",
  "```ts",
  'const message = "Hello world";',
  "```",
  "",
  "| Element | Supported |",
  "| --- | --- |",
  "| Tables | Yes |",
  "| Links | Yes |",
  "| Images | Yes |",
  "",
  "[Playground](#playground)",
].join("\n");
