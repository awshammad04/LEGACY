import type { Source } from '../core/types';

/**
 * Sources registry. Every "verified" fact and every NASA asset must point at an entry here.
 * The credits screen is generated from this list.
 */
export const SOURCES: Source[] = [
  { id: 'nasa-brief-history', title: 'A Brief History of NASA (Apollo program cost)', credit: 'NASA History Office', url: 'https://www.nasa.gov/history/SP-4225/documentation/brief-history/history.htm', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'jpl-m2020-quickfacts', title: 'Mars 2020 Launch Press Kit — Quick Facts', credit: 'NASA/JPL-Caltech', url: 'https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/quick_facts/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'jpl-mer-presskit', title: 'Mars Exploration Rover Landings Press Kit', credit: 'NASA/JPL-Caltech', url: 'https://www.jpl.nasa.gov/news/press_kits/merlandings.pdf', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'gsfc-swift-faq', title: 'Swift Observatory FAQ', credit: 'NASA Goddard Space Flight Center', url: 'https://imagine.gsfc.nasa.gov/observatories/learning/swift/faq/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-webb-review-2018', title: 'NASA Completes Webb Telescope Review (2018)', credit: 'NASA', url: 'https://www.nasa.gov/news-release/nasa-completes-webb-telescope-review-commits-to-launch-in-early-2021/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-biosignature-2025', title: 'NASA Says Mars Rover Discovered Potential Biosignature Last Year (Sept 10, 2025)', credit: 'NASA', url: 'https://www.nasa.gov/news-release/nasa-says-mars-rover-discovered-potential-biosignature-last-year/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-mars-report-2025-09', title: 'The Mars Report — September 2025 Special Edition', credit: 'NASA Science', url: 'https://science.nasa.gov/mars/the-mars-report/2025-september-special-edition/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-perseverance', title: 'Mars 2020: Perseverance Rover', credit: 'NASA Science', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-perseverance-instruments', title: 'Perseverance Science Instruments', credit: 'NASA Science', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-opportunity', title: 'Opportunity Rover', credit: 'NASA Science', url: 'https://science.nasa.gov/mission/mer-opportunity/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-opportunity-end', title: "NASA's Opportunity Rover Mission on Mars Comes to End", credit: 'NASA Science', url: 'https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-apollo15', title: 'Apollo 15 on the Moon', credit: 'NASA Science', url: 'https://science.nasa.gov/resource/apollo-15-on-the-moon/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-lro-apollo15', title: 'Retracing the Steps of Apollo 15 (LRO imagery)', credit: 'NASA/GSFC/Arizona State University', url: 'https://science.nasa.gov/photojournal/retracing-the-steps-of-apollo-15/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-lunar-heritage', title: 'NASA Recommendations to Space-Faring Entities: Protecting Lunar Historic Sites', credit: 'NASA', url: 'https://www.nasa.gov/wp-content/uploads/2023/12/nasa-usg-lunar-historic-sites-reva.pdf', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-hrp-hazards', title: 'Five Hazards of Human Spaceflight', credit: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/hazards/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-radiation', title: 'Space Radiation Hazard', credit: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/hazard-space-radiation/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-webb-l2', title: "Webb's Orbit Near L2", credit: 'NASA Science', url: 'https://science.nasa.gov/asset/webb/webbs-orbit-at-sun-earth-lagrange-point-2-l2/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-mars-facts', title: 'Mars Facts', credit: 'NASA Science', url: 'https://science.nasa.gov/mars/facts/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-iss', title: 'International Space Station Facts and Figures', credit: 'NASA', url: 'https://www.nasa.gov/international-space-station/space-station-facts-and-figures/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-terra', title: 'Terra Mission', credit: 'NASA', url: 'https://terra.nasa.gov/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-aqua', title: 'Aqua Mission', credit: 'NASA', url: 'https://aqua.nasa.gov/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-landsat9', title: 'Landsat 9', credit: 'NASA / USGS', url: 'https://landsat.gsfc.nasa.gov/satellites/landsat-9/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'celestrak-starlink', title: 'CelesTrak — Starlink orbital catalog (non-NASA)', credit: 'CelesTrak (data: U.S. Space Force); Starlink operated by SpaceX', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json', license: 'Public catalog data', accessed: '2026-11-13' },
  { id: 'nasa-moon', title: "Earth's Moon: Facts", credit: 'NASA Science', url: 'https://science.nasa.gov/moon/facts/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-venus', title: 'Venus: Facts', credit: 'NASA Science', url: 'https://science.nasa.gov/venus/venus-facts/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'nasa-jupiter', title: 'Jupiter: Facts', credit: 'NASA Science', url: 'https://science.nasa.gov/jupiter/jupiter-facts/', license: 'NASA public information', accessed: '2026-11-13' },
  { id: 'legacy-game-model', title: 'LEGACY simplified game model (fictional, educational)', credit: 'LEGACY team', url: '#how-numbers-work', license: 'Original work', accessed: '2026-11-13' },
];

export const sourceById = (id: string | undefined): Source | undefined => SOURCES.find((s) => s.id === id);
