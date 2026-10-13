import type { Theme } from "../hooks/useTheme";

/**
 * Chart colors live in JS (not CSS variables) because Recharts writes them
 * into SVG attributes. Income/expense hues were checked for color-vision
 * deficiency separation against each mode's surface; every chart with two
 * series also has a legend so color is never the only cue.
 */
export const chartColors = {
  light: {
    income: "#2a78d6",
    expense: "#e0602a",
    single: "#2a78d6",
    grid: "#dfe6e1",
    axis: "#5a6b64",
    muted: "#b8c6bf",
  },
  dark: {
    income: "#3987e5",
    expense: "#d95926",
    single: "#3987e5",
    grid: "#2a3530",
    axis: "#9aaba3",
    muted: "#3d4b45",
  },
} satisfies Record<Theme, Record<string, string>>;

export type ChartColors = (typeof chartColors)["light"];
