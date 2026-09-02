/* ============================================================================
 *  Palette des tags Notion (couleur des valeurs de la propriété "Espace").
 *  Module pur (pas d'accès réseau/env) : utilisable côté serveur (page) et
 *  côté client (script de la page /routine) sans embarquer @notionhq/client.
 * ========================================================================== */

export interface TagColor {
  bg: string;
  text: string;
  bgDark: string;
  textDark: string;
}

const NOTION_TAG_COLORS: Record<string, TagColor> = {
  default: { bg: '#f1f1ef', text: '#32302c', bgDark: '#2f2f2f', textDark: '#d4d4d4' },
  gray: { bg: '#e3e2e0', text: '#32302c', bgDark: '#454b4e', textDark: '#c4c4c4' },
  brown: { bg: '#e9e5e3', text: '#442a1e', bgDark: '#4a3228', textDark: '#c9a88c' },
  orange: { bg: '#faebdd', text: '#a54800', bgDark: '#5c3b23', textDark: '#e8a87c' },
  yellow: { bg: '#fbf3db', text: '#866a1e', bgDark: '#59493a', textDark: '#d9c46b' },
  green: { bg: '#dbeddb', text: '#256029', bgDark: '#243d30', textDark: '#6fbf8b' },
  blue: { bg: '#d3e5ef', text: '#0b6e99', bgDark: '#143a4e', textDark: '#6ba6cd' },
  purple: { bg: '#e8deee', text: '#6940a5', bgDark: '#3c2d49', textDark: '#b98cde' },
  pink: { bg: '#f4dfeb', text: '#ad1a72', bgDark: '#4e2a3a', textDark: '#e39ec0' },
  red: { bg: '#fbe4e4', text: '#e03e3e', bgDark: '#4e2c2c', textDark: '#e5726e' },
};

export function tagColorStyle(color: string | null | undefined): string {
  const c = NOTION_TAG_COLORS[color ?? 'default'] ?? NOTION_TAG_COLORS.default;
  return `--badge-bg:${c.bg};--badge-text:${c.text};--badge-bg-dark:${c.bgDark};--badge-text-dark:${c.textDark};`;
}
