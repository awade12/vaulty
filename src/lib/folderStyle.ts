export type FolderColor =
  | "default"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "pink"
  | "teal"
  | "zinc";

export type FolderStyle = "classic" | "minimal" | "square" | "gradient";

interface FolderColorTokens {
  bg: string;
  icon: string;
  swatch: string;
  label: string;
}

export const FOLDER_COLORS: Record<FolderColor, FolderColorTokens> = {
  default: { bg: "bg-accent-50", icon: "text-accent-700", swatch: "bg-accent-400", label: "Default" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", swatch: "bg-blue-400", label: "Blue" },
  green: { bg: "bg-emerald-50", icon: "text-emerald-600", swatch: "bg-emerald-400", label: "Green" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", swatch: "bg-amber-400", label: "Amber" },
  red: { bg: "bg-red-50", icon: "text-red-600", swatch: "bg-red-400", label: "Red" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", swatch: "bg-purple-400", label: "Purple" },
  pink: { bg: "bg-pink-50", icon: "text-pink-600", swatch: "bg-pink-400", label: "Pink" },
  teal: { bg: "bg-teal-50", icon: "text-teal-600", swatch: "bg-teal-400", label: "Teal" },
  zinc: { bg: "bg-zinc-100", icon: "text-zinc-600", swatch: "bg-zinc-400", label: "Slate" },
};

export const FOLDER_COLOR_ORDER: FolderColor[] = [
  "default",
  "blue",
  "green",
  "teal",
  "amber",
  "red",
  "pink",
  "purple",
  "zinc",
];

interface FolderStyleTokens {
  radius: { sm: string; md: string; lg: string };
  background?: (color: FolderColorTokens) => string;
  ring?: string;
  label: string;
  description: string;
}

export const FOLDER_STYLES: Record<FolderStyle, FolderStyleTokens> = {
  classic: {
    radius: { sm: "rounded-md", md: "rounded-lg", lg: "rounded-xl" },
    label: "Classic",
    description: "Soft rounded tiles with tinted backgrounds",
  },
  minimal: {
    radius: { sm: "rounded-md", md: "rounded-lg", lg: "rounded-xl" },
    background: () => "bg-transparent",
    ring: "ring-[0.5px] ring-zinc-200",
    label: "Minimal",
    description: "Transparent tiles with a thin outline",
  },
  square: {
    radius: { sm: "rounded-none", md: "rounded-none", lg: "rounded-sm" },
    label: "Square",
    description: "Sharp corners for a more compact look",
  },
  gradient: {
    radius: { sm: "rounded-md", md: "rounded-lg", lg: "rounded-2xl" },
    background: (c) => `${c.bg} bg-gradient-to-br from-white/40 to-transparent`,
    label: "Gradient",
    description: "Subtle highlight on each tile",
  },
};

export const FOLDER_STYLE_ORDER: FolderStyle[] = ["classic", "minimal", "square", "gradient"];

export function folderTokenKey(connectionId: string | null, folderKey: string): string {
  return `${connectionId ?? "_"}::${folderKey}`;
}
