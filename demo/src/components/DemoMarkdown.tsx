import Markdown from "@adamjanicki/markdown";
import { Link, ui } from "@adamjanicki/ui";

export default function DemoMarkdown({ markdown }: { markdown: string }) {
  return (
    <Markdown
      renderers={{
        a: ({ href, ...props }) => <Link {...props} to={href} />,
      }}
      inlineExtensions={[
        {
          token: "==",
          intraword: true,
          renderer: (props) => (
            <ui.mark {...props} style={{ backgroundColor: "#00FFFF" }} />
          ),
        },
      ]}
    >
      {markdown}
    </Markdown>
  );
}
