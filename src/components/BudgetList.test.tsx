import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { budgetProgress } from "../lib/budget";
import { BudgetList } from "./BudgetList";

describe("BudgetList", () => {
  it("edits a limit and converts the typed dollars to integer cents", async () => {
    const user = userEvent.setup();
    const onSetBudget = vi.fn();
    const rows = budgetProgress({ Dining: 20000 }, [{ category: "Dining", cents: 18000 }]);
    render(<BudgetList rows={rows} unbudgeted={[]} onSetBudget={onSetBudget} />);

    expect(screen.getByText("Close to limit")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Edit Dining budget/ }));
    const input = screen.getByLabelText("Monthly limit for Dining");
    await user.clear(input);
    await user.type(input, "250.10{Enter}");
    expect(onSetBudget).toHaveBeenCalledWith("Dining", 25010);
  });

  it("shows a validation error instead of saving a bad amount", async () => {
    const user = userEvent.setup();
    const onSetBudget = vi.fn();
    const rows = budgetProgress({ Dining: 20000 }, []);
    render(<BudgetList rows={rows} unbudgeted={[]} onSetBudget={onSetBudget} />);

    await user.click(screen.getByRole("button", { name: /Edit Dining budget/ }));
    const input = screen.getByLabelText("Monthly limit for Dining");
    await user.clear(input);
    await user.type(input, "twelve{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent('"twelve" is not a valid amount');
    expect(onSetBudget).not.toHaveBeenCalled();
  });
});
