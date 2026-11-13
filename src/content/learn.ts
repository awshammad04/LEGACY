import type { LearnCard } from '../core/types';
import { L } from './l';

/** Point-to-Learn cards: Name · What it is · What it does · Why it matters · Connection · Source */
export const ORBIT_LEARN_CARDS: LearnCard[] = [
  {
    id: 'lc-iss', provenance: 'verified', sourceId: 'nasa-iss',
    name: L('International Space Station'),
    what: L('A crewed laboratory orbiting about 400 km above Earth, built and operated by several space agencies.'),
    does: L('Astronauts live aboard for months, studying how the human body and many experiments behave in microgravity.'),
    why: L('It circles Earth roughly every 90 minutes — about 16 orbits a day.'),
    connection: L('What we learn about crew health on the station shapes how future Moon and Mars crews will be protected.'),
  },
  {
    id: 'lc-terra', provenance: 'verified', sourceId: 'nasa-terra',
    name: L('Terra (NASA Earth-observing satellite)'),
    what: L('A NASA satellite launched in 1999 that observes land, oceans and atmosphere.'),
    does: L("Its instruments measure clouds, fires, vegetation, pollution and Earth's energy balance."),
    why: L('Long records from the same orbit let scientists see how our planet changes over decades.'),
    connection: L('Like your rover, Terra had to balance instruments against mass, power and data limits.'),
  },
  {
    id: 'lc-aqua', provenance: 'verified', sourceId: 'nasa-aqua',
    name: L('Aqua (NASA Earth-observing satellite)'),
    what: L("A NASA satellite launched in 2002 focused on Earth's water cycle."),
    does: L('It measures water vapor, clouds, rainfall, sea ice and ocean temperature.'),
    why: L('Water links weather, climate and life — on Earth, and in the search for habitable places elsewhere.'),
    connection: L('On Mars, your mission looks for traces of water that flowed billions of years ago.'),
  },
  {
    id: 'lc-landsat', provenance: 'verified', sourceId: 'nasa-landsat9',
    name: L('Landsat 9 (NASA / USGS)'),
    what: L('An Earth-imaging satellite launched in 2021, continuing a record of images that began in 1972.'),
    does: L("It photographs Earth's land surface in visible and infrared light."),
    why: L('Half a century of images shows how forests, cities, farms and glaciers change.'),
    connection: L('Orbital images guide surface work — just as orbiters helped choose your Mars landing site.'),
  },
  {
    id: 'lc-starlink', provenance: 'verified', sourceId: 'celestrak-starlink',
    name: L('Starlink satellites (operated by SpaceX — not NASA)'),
    what: L('A large constellation of communication satellites in low Earth orbit, operated by the company SpaceX.'),
    does: L('Thousands of satellites relay internet signals to users on the ground.'),
    why: L('Large constellations show how many satellites can share an orbit — and why tracking them matters.'),
    connection: L('Positions shown here are an illustrative animation, not live tracking data.'),
  },
  {
    id: 'lc-leo', provenance: 'verified', sourceId: 'nasa-iss',
    name: L('Low Earth orbit'),
    what: L('The region of space up to about 2,000 km above Earth, where most satellites and the space station fly.'),
    does: L('Satellites here circle Earth in about 90 to 120 minutes.'),
    why: L('A higher orbit takes longer to circle Earth. The angle of an orbit (its inclination) decides which parts of Earth a satellite passes over.'),
    connection: L('Your spacecraft starts in a parking orbit before a burn sends it on the transfer path to Mars.'),
  },
];

export const M2_LEARN_CARDS: LearnCard[] = [
  ...ORBIT_LEARN_CARDS,
  {
    id: 'lc-mastcam', provenance: 'verified', sourceId: 'nasa-perseverance-instruments',
    name: L('Mastcam-Z (inspiration for your camera)'),
    what: L("Perseverance's pair of zoomable cameras on its mast."),
    does: L('It takes color, 3D and zoomed images of the landscape and rocks.'),
    why: L('Images give context: where a rock sits, what its layers look like, which targets deserve a closer look.'),
    connection: L('Your science camera is a fictional design inspired by it.'),
  },
  {
    id: 'lc-pixl', provenance: 'verified', sourceId: 'nasa-perseverance-instruments',
    name: L('PIXL (inspiration for your X-ray spectrometer)'),
    what: L("An X-ray instrument on Perseverance's robotic arm."),
    does: L('It maps which chemical elements are in a rock, at the scale of tiny grains.'),
    why: L('Chemistry reveals how a rock formed and what water did to it.'),
    connection: L('PIXL helped identify the iron-phosphate and iron-sulfide minerals in the leopard spots.'),
  },
  {
    id: 'lc-sherloc', provenance: 'verified', sourceId: 'nasa-perseverance-instruments',
    name: L('SHERLOC (inspiration for your UV Raman spectrometer)'),
    what: L("An ultraviolet laser spectrometer with a close-up camera, on Perseverance's arm."),
    does: L('It detects organic compounds and identifies minerals.'),
    why: L('Organic molecules are building blocks of life — but they can also form without life.'),
    connection: L('Finding organics is important evidence, not proof.'),
  },
  {
    id: 'lc-rimfax', provenance: 'verified', sourceId: 'nasa-perseverance-instruments',
    name: L('RIMFAX (inspiration for your radar)'),
    what: L("Perseverance's ground-penetrating radar."),
    does: L('It images rock layers beneath the rover as it drives.'),
    why: L('Buried layers reveal the history of a landscape.'),
    connection: L("Useful context — but it cannot measure a single rock's chemistry."),
  },
  {
    id: 'lc-caching', provenance: 'verified', sourceId: 'nasa-perseverance',
    name: L('Sample caching'),
    what: L('Perseverance drills rock cores and seals them in tubes.'),
    does: L('The sealed tubes preserve samples for possible future return to Earth.'),
    why: L('Earth laboratories can run tests far beyond what any rover can carry.'),
    connection: L('NASA scientists say confirming the Sapphire Canyon result would likely need returned samples.'),
  },
];

/** "Look Around" sky objects (illustrative placement — not a real-time star map). */
export const SKY_CARDS: LearnCard[] = [
  {
    id: 'sky-moon', provenance: 'verified', sourceId: 'nasa-moon',
    name: L('The Moon', 'القمر'),
    what: L("Earth's only natural satellite, about 384,400 km away on average.", 'التابع الطبيعي الوحيد للأرض، ويبعد في المتوسط نحو 384,400 كم.'),
    does: L('Its gravity drives most of the tides in Earth\'s oceans.', 'جاذبيته هي المسبّب الرئيسي لمعظم المدّ والجزر في محيطات الأرض.'),
    why: L('It is the only other world humans have walked on — during the Apollo missions.', 'إنه العالم الوحيد الآخر الذي مشى عليه البشر — خلال مهمات أبولو.'),
    connection: L('Mission 01, Echoes of Apollo, will take you to the Apollo 15 landing region.', 'ستأخذك المهمة 01، أصداء أبولو، إلى منطقة هبوط أبولو 15.'),
  },
  {
    id: 'sky-venus', provenance: 'verified', sourceId: 'nasa-venus',
    name: L('Venus', 'الزهرة'),
    what: L('The second planet from the Sun and the brightest planet in our sky.', 'الكوكب الثاني من الشمس وألمع كوكب في سمائنا.'),
    does: L('Its thick carbon-dioxide atmosphere traps heat, making it the hottest planet in the solar system.', 'يحبس غلافه الجوي الكثيف من ثاني أكسيد الكربون الحرارة، فيجعله أشدّ كواكب المجموعة الشمسية حرارة.'),
    why: L('Venus shows how an atmosphere can change a whole planet\'s climate.', 'تُظهر الزهرة كيف يمكن لغلاف جوي أن يغيّر مناخ كوكب بأكمله.'),
    connection: L('Bright planets are among the easiest objects to spot from a spacecraft window.', 'الكواكب اللامعة من أسهل الأجرام رصدًا من نافذة مركبة فضائية.'),
  },
  {
    id: 'sky-mars', provenance: 'verified', sourceId: 'nasa-mars-facts',
    name: L('Mars — your destination', 'المريخ — وجهتك'),
    what: L('The fourth planet from the Sun. Iron-rich dust gives its surface a reddish color.', 'الكوكب الرابع من الشمس. يمنح الغبار الغني بالحديد سطحه لونًا مائلًا إلى الحمرة.'),
    does: L('Radio signals take many minutes to travel between Earth and Mars; the delay depends on where both planets are in their orbits.', 'تستغرق إشارات الراديو دقائق عديدة للسفر بين الأرض والمريخ، ويعتمد التأخير على موقع الكوكبين في مداريهما.'),
    why: L('That delay is why Mars rovers must drive themselves between commands.', 'هذا التأخير هو سبب اضطرار المركبات الجوالة على المريخ إلى القيادة الذاتية بين الأوامر.'),
    connection: L('Your rover will land in Jezero Crater, an ancient lake bed.', 'ستهبط مركبتك الجوالة في فوهة جيزيرو، قاع بحيرة قديمة.'),
  },
  {
    id: 'sky-jupiter', provenance: 'verified', sourceId: 'nasa-jupiter',
    name: L('Jupiter', 'المشتري'),
    what: L('The largest planet in our solar system — about 11 times wider than Earth.', 'أكبر كواكب مجموعتنا الشمسية — أعرض من الأرض بنحو 11 مرة.'),
    does: L('A gas giant with a storm, the Great Red Spot, bigger than Earth.', 'عملاق غازي فيه عاصفة، البقعة الحمراء العظيمة، أكبر من الأرض.'),
    why: L('Its powerful gravity has shaped the orbits of many asteroids and comets.', 'شكّلت جاذبيته القوية مدارات كثير من الكويكبات والمذنبات.'),
    connection: L('Even a bright planet like Jupiter can be hard to see when sunlight floods a camera\'s view.', 'حتى كوكب لامع مثل المشتري قد يصعب رؤيته عندما يغمر ضوء الشمس مجال رؤية الكاميرا.'),
  },
];
