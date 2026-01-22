import { Box, Icon, ui } from "@adamjanicki/ui";
import { architect } from "@adamjanicki/ui/icons";
import Para from "src/components/Para";
import Snippet from "src/components/Snippet";

export default function Main() {
  return (
    <Box className="main-container">
      <ui.h1 vfx={{ textAlign: "center", fontSize: "xxl" }}>
        @adamjanicki/npm-skeleton
      </ui.h1>
      <ui.p
        vfx={{
          color: "muted",
          textAlign: "center",
          fontWeight: 5,
          fontSize: "l",
        }}
      >
        Skeleton/template for an NPM package
        <ui.br />
        Checkout the docs and examples below to see what's available.
      </ui.p>
      <Snippet lang="bash">
        npm install --save @adamjanicki/npm-skeleton
      </Snippet>
      <Para>
        And that's it!
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
