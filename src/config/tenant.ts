import type { CSSProperties } from "react";

/**
 * Deployment-level tenant branding.
 *
 * Change this single object for each school deployment. All values use
 * standard hex colors, so they can be copied directly from a brand guide.
 */
export const tenantConfig = {
  name: "Sonic Farms",
  shortName: "Sonic",
  logoUrl: null as string | null,
  supportText: "Secure fee payments for Sonic Music Academy",
  theme: {
    primary: "#2D806D",
    primaryHover: "#236B5B",
    primarySoft: "#E5F3EF",
    header: "#173746",
    page: "#F7F9F8",
    surface: "#FFFFFF",
    heading: "#173746",
    body: "#71848A",
    border: "#DDE5E2",
    buttonText: "#FFFFFF",
  },
} as const;

type ThemeVariable = `--color-${string}`;
export type TenantThemeStyle = CSSProperties & Record<ThemeVariable, string>;

function hexToRgbChannels(hex: string): string {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;

  const number = Number.parseInt(value, 16);
  return `${(number >> 16) & 255} ${(number >> 8) & 255} ${number & 255}`;
}

export const tenantThemeStyle: TenantThemeStyle = {
  "--color-primary": hexToRgbChannels(tenantConfig.theme.primary),
  "--color-primary-hover": hexToRgbChannels(tenantConfig.theme.primaryHover),
  "--color-primary-soft": hexToRgbChannels(tenantConfig.theme.primarySoft),
  "--color-header": hexToRgbChannels(tenantConfig.theme.header),
  "--color-page": hexToRgbChannels(tenantConfig.theme.page),
  "--color-surface": hexToRgbChannels(tenantConfig.theme.surface),
  "--color-heading": hexToRgbChannels(tenantConfig.theme.heading),
  "--color-body": hexToRgbChannels(tenantConfig.theme.body),
  "--color-border": hexToRgbChannels(tenantConfig.theme.border),
  "--color-button-text": hexToRgbChannels(tenantConfig.theme.buttonText),
};
