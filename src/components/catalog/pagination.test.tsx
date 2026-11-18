import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pagination } from "./pagination";

describe("Pagination", () => {
  it("construye los links conservando los filtros activos", () => {
    render(
      <Pagination page={2} hasPrev hasNext filters={{ process: "washed" }} />,
    );
    expect(screen.getByRole("link", { name: /anterior/i })).toHaveAttribute(
      "href",
      "/coffees?process=washed&page=1",
    );
    expect(screen.getByRole("link", { name: /siguiente/i })).toHaveAttribute(
      "href",
      "/coffees?process=washed&page=3",
    );
  });

  it("deshabilita Anterior en la página 1 y Siguiente cuando no hay más", () => {
    render(<Pagination page={1} hasPrev={false} hasNext={false} filters={{}} />);
    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();
  });

  it("muestra el número de página actual", () => {
    render(<Pagination page={4} hasPrev hasNext filters={{}} />);
    expect(screen.getByText("Página 4")).toBeInTheDocument();
  });
});
