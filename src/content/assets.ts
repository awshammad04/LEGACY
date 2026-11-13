/** Every bundled media file, with its credit line and source (attribution registry). */
export interface AssetCredit {
  file: string;
  title: string;
  credit: string;
  url: string;
  license: string;
  modified?: string;
}

export const ASSETS: AssetCredit[] = [
  { file: 'assets/tex/earth-day.jpg', title: 'Blue Marble Next Generation (December 2004)', credit: 'NASA Earth Observatory (Reto Stöckli)', url: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/', license: 'NASA media — not copyrighted', modified: 'Resized from 5400×2700 to 4096×2048' },
  { file: 'assets/tex/earth-clouds.jpg', title: 'Blue Marble cloud layer', credit: 'NASA Earth Observatory — Reto Stöckli, enhancements by Robert Simmon', url: 'https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution', license: 'NASA media — not copyrighted' },
  { file: 'assets/tex/mars.jpg', title: 'Mars Viking MDIM2.1 colorized global mosaic', credit: 'NASA / JPL / USGS', url: 'https://commons.wikimedia.org/wiki/File:Mars_Viking_MDIM21_ClrMosaic_1km.jpg', license: 'Public domain' },
  { file: 'assets/img/jezero-delta.jpg', title: "Jezero Crater, Mars 2020's landing site (PIA23239)", credit: 'NASA/JPL-Caltech/MSSS/JHU-APL', url: 'https://science.nasa.gov/photojournal/jezero-crater-mars-2020s-landing-site/', license: 'NASA media — not copyrighted' },
  { file: 'assets/img/cheyava-falls.jpg', title: "Perseverance Finds a Rock With 'Leopard Spots' (PIA26368)", credit: 'NASA/JPL-Caltech/MSSS', url: 'https://science.nasa.gov/photojournal/perseverance-finds-a-rock-with-leopard-spots/', license: 'NASA media — not copyrighted' },
  { file: 'assets/img/sapphire-canyon-core.jpg', title: "Mastcam-Z Views 'Leopard Spots' in Perseverance's Drill Bit (PIA26370)", credit: 'NASA/JPL-Caltech/ASU/MSSS', url: 'https://science.nasa.gov/photojournal/mastcam-z-views-leopard-spots-in-perseverances-drill-bit', license: 'NASA media — not copyrighted' },
  { file: 'assets/img/pixl-mineral-map.jpg', title: "Perseverance's PIXL Finds Vivianite, Greigite in Cheyava Falls Sample (PIA26640)", credit: 'NASA/JPL-Caltech', url: 'https://science.nasa.gov/photojournal/perseverances-pixl-finds-vivianite-greigite-in-cheyava-falls-sample', license: 'NASA media — not copyrighted' },
  { file: 'assets/img/perseverance.jpg', title: "Perseverance's Selfie with Cheyava Falls (PIA26344)", credit: 'NASA/JPL-Caltech/MSSS', url: 'https://science.nasa.gov/resource/perseverances-selfie-with-cheyava-falls/', license: 'NASA media — not copyrighted' },
];

export const assetCredit = (file: string | undefined) => ASSETS.find((a) => a.file === file);
