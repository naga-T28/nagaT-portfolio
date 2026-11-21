export const LANGUAGES = ['ja', 'en'] as const;
export type Lang = (typeof LANGUAGES)[number];

/** Japanese pages keep their plain URLs. English pages live under /en/. */
export const langOf = (url: URL): Lang => (url.pathname === '/en' || url.pathname.startsWith('/en/') ? 'en' : 'ja');

/** Turns a Japanese path such as /about/ into the same page in the given language. */
export const localize = (path: string, lang: Lang): string => (lang === 'en' ? `/en${path}` : path);

/** The path of the current page in the other language. The 404 page has no pair, so it goes to the home page. */
export function alternatePath(pathname: string): string {
  if (pathname.startsWith('/404')) return '/en/';
  return pathname.startsWith('/en/') ? pathname.slice(3) : `/en${pathname}`;
}

/** Params for a page that exists in both languages. */
export const languageParams = (lang: Lang): { lang: string | undefined } => ({ lang: lang === 'en' ? 'en' : undefined });

export const languagePaths = () => LANGUAGES.map((lang) => ({ params: languageParams(lang) }));
