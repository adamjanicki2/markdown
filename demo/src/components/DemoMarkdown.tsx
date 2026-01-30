import Markdown from "@adamjanicki/markdown";
import { Badge, Box, Button, Icon, Link, ui } from "@adamjanicki/ui";
import { check, clipboard } from "@adamjanicki/ui/icons";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight as light } from "react-syntax-highlighter/dist/esm/styles/prism";

function CodeBlock({ children, lang }: { children: string; lang?: string }) {
  const code = children.trim();
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Box
      vfx={{
        axis: "y",
        width: "full",
        border: true,
        radius: "rounded",
        shadow: "subtle",
      }}
    >
      <Box
        vfx={{
          axis: "x",
          align: "center",
          justify: "between",
          width: "full",
          paddingX: "s",
          paddingY: "xs",
          borderBottom: true,
        }}
      >
        <ui.span vfx={{ fontSize: "s", fontWeight: 5 }}>
          {lang || "text"}
        </ui.span>
        {copied ? (
          <Badge vfx={{ axis: "x", align: "center", gap: "xs" }} type="success">
            <Icon icon={check} /> Copied
          </Badge>
        ) : (
          <Button
            vfx={{ axis: "x", align: "center", gap: "xs", paddingY: "xxs" }}
            onClick={copyCode}
            size="small"
            variant="secondary"
          >
            <Icon icon={clipboard} />
            Copy
          </Button>
        )}
      </Box>
      <ui.pre
        vfx={{
          axis: "x",
          margin: "none",
          overflow: "auto",
          padding: "s",
          width: "full",
        }}
        className="no-bg"
      >
        <SyntaxHighlighter
          style={light}
          language={lang || "text"}
          customStyle={{
            padding: 0,
            margin: 0,
          }}
        >
          {code}
        </SyntaxHighlighter>
      </ui.pre>
    </Box>
  );
}

export default function DemoMarkdown({ markdown }: { markdown: string }) {
  return (
    <Markdown
      renderers={{
        a: ({ href, ...props }) => <Link {...props} to={href} />,
        blockquote: ({ children }) => (
          <ui.blockquote
            vfx={{
              padding: "s",
              marginX: "xs",
              borderLeft: true,
              borderWidth: "l",
              italics: true,
              fontWeight: 5,
            }}
            {...{ children }}
          />
        ),
        img: ({ alt, src }) => (
          <ui.span vfx={{ axis: "y", align: "center", width: "full" }}>
            <ui.img
              src={src}
              vfx={{ radius: "rounded", maxWidth: "full" }}
              style={{ maxHeight: "50vh" }}
              alt=""
            />
            <ui.em vfx={{ color: "muted", fontWeight: 6, textAlign: "center" }}>
              {alt}
            </ui.em>
          </ui.span>
        ),
        p: (props) => <ui.p {...props} vfx={{ lineHeight: "m" }} />,
        li: (props) => <ui.li {...props} vfx={{ lineHeight: "m" }} />,
        pre: (props) => <CodeBlock {...props} />,
        table: ({ children }) => (
          <ui.table
            vfx={{
              marginY: "s",
              border: true,
              radius: "rounded",
              shadow: "subtle",
              width: "full",
            }}
          >
            {children}
          </ui.table>
        ),
        tr: ({ children }) => (
          <ui.tr
            vfx={{
              axis: "x",
              align: "center",
              width: "full",
              borderBottom: true,
            }}
            {...{ children }}
          />
        ),
        th: ({ children }) => (
          <ui.td
            vfx={{ fontWeight: 7, stretch: "even", padding: "s" }}
            {...{ children }}
          />
        ),
        td: ({ children }) => (
          <ui.td vfx={{ stretch: "even", padding: "s" }} {...{ children }} />
        ),
      }}
      inlineExtensions={[
        {
          token: "==",
          intraword: true,
          renderer: (props) => (
            <ui.mark {...props} style={{ backgroundColor: "#00FFFF" }} />
          ),
        },
        {
          token: "^^",
          intraword: true,
          renderer: (props) => <ui.sup {...props} />,
        },
        {
          token: "%%",
          intraword: true,
          renderer: (props) => <ui.sub {...props} />,
        },
      ]}
    >
      {markdown}
    </Markdown>
  );
}
