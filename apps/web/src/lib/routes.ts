/** Routes that open with a full-bleed hero, so the header starts transparent and content sits underneath it. */
export const HERO_ROUTES = [/^\/$/, /^\/collections\/[^/]+$/];
export const hasHero = (pathname: string) => HERO_ROUTES.some((r) => r.test(pathname));
