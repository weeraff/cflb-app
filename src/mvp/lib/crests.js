// Club crests hosted on australianchampionship.com.au. The FFA feed has no
// logos and spells some clubs differently between rounds ("Preston Lions
// FC" in Round 1, "Preston Lions" in Round 2), so names are normalised
// before lookup. Unknown names return null and TeamCrest shows a monogram.
const BASE = 'https://australianchampionship.com.au/sites/default/files/styles/image_600x/public/'

const CRESTS = {
  lions: '2026-09/153910404_lions_fc_-_logo_suite-type_2.png?itok=WDZ_DWLJ',
  prestonlions: '2025-01/Preston_Lions_FC_%28logo%29.svg.png?itok=OtCco-KW',
  southmelbourne: '2025-01/South_Melbourne_FC_logo.svg.png?itok=eTlkSEVj',
  sydneyunited58: '2025-01/Sydney_United_FC.png?itok=YFh3f0BZ',
  adelaidecity: '2026-09/adelaide-city-logo-1.png?itok=VpmlxbV8',
  westsapia: '2025-10/20439.png?itok=rZmeAnbi',
  avondale: '2025-01/Avondale-FC-Logo.png?itok=VvEo4RZU',
  broadmeadowmagic: '2025-09/9946.png?itok=-SRXTHXo',
  marconistallions: '2025-09/3502.png?itok=8-USNegn',
  oakleighcannons: '2026-09/oakleigh-cannons_1.png?itok=XaGin7Nz',
  canberracroatia: '2025-09/11255_0.png?itok=fDzwq-T1',
  sutherlandsharks: '2026-09/sharksfc_logo_2026_screen_primary_ocean_rgb.png?itok=D5ZcRxc3',
  wollongongwolves: '2025-08/wolves.png?itok=XNhW_KSn',
  southhobart: '2025-09/9928.png?itok=vs--guK6',
  sydneyolympic: '2026-09/9938.png?itok=rZBQM69R',
  bayswatercity: '2025-09/bayswater.png?itok=AhP9zRFl',
}

function normalise(name) {
  return name
    .toLowerCase()
    .replace(/\b(fc|sc)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function crestFor(name) {
  if (!name) return null
  const path = CRESTS[normalise(name)]
  return path ? BASE + path : null
}
