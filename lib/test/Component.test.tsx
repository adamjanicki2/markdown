import { render, screen } from "@testing-library/react";

import { Component } from "../src";

describe("Component", () => {
  it("renders", () => {
    render(<Component />);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });
});
