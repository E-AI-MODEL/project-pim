/**
 * /app heeft geen modi meer: er is één werkruimte. Oude links met ?mode=...
 * blijven werken, de parameter wordt simpelweg genegeerd en weggelaten.
 */
export type AppSearch = Record<string, never>;

export function validateAppSearch(_input?: Record<string, unknown>): AppSearch {
  return {};
}
