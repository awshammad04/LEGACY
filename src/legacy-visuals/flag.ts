/**
 * Reversible switch for the graphics-kit visual layer (Mars surface only).
 * On by default on this branch; add `?visuals=classic` to the URL to compare
 * against or fall back to the previous look. No save data depends on it.
 */
export const kitVisualsEnabled = () => {
  try {
    return new URLSearchParams(location.search).get('visuals') !== 'classic';
  } catch {
    return true;
  }
};
