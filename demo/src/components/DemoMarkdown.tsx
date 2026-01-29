import Markdown from "@adamjanicki/markdown";
import { Link, ui } from "@adamjanicki/ui";

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
        table: ({ children }) => (
          <ui.table
            vfx={{
              margin: "none",
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
