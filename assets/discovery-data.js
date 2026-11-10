(function () {
  'use strict';
  var stores = [
    { id: 'orange', name: 'The Orange Box PH', url: 'https://theorangebox.ph/', region: 'Philippines', currency: 'PHP', note: 'Philippine luxury boutique. Check delivery, condition and returns with the store.' },
    { id: 'collector', name: 'Collector Square', url: 'https://www.collectorsquare.com/en/bags.html', region: 'International', currency: 'EUR', note: 'Bags and watches from a French resale store. Confirm destination eligibility, duties and delivery.' },
    { id: 'fashionphile', name: 'FASHIONPHILE', url: 'https://www.fashionphile.com/', region: 'International', currency: 'USD', note: 'US luxury resale store. Confirm international shipping, import charges and returns before buying.' },
    { id: 'madison', name: 'Madison Avenue Couture', url: 'https://madisonavenuecouture.com/', region: 'International', currency: 'USD', note: 'US luxury boutique. Confirm condition, shipping eligibility and final-sale terms with the store.' }
  ];
  stores.push(
    { id: 'anns', name: "Ann's Fabulous Finds", url: 'https://www.annsfabulousfinds.com/', region: 'International', currency: 'USD', note: 'US resale boutique with handbags and accessories.' },
    { id: 'bagista', name: 'Bagista', url: 'https://bagista.co.uk/', region: 'International', currency: 'GBP', note: 'UK designer handbag resale boutique.' },
    { id: 'redeluxe', name: 'Redeluxe', url: 'https://www.redeluxe.com/', region: 'International', currency: 'PHP', note: 'Luxury handbag resale. References use the PHP prices displayed during our review, not an Opule conversion.' },
    { id: 'luxsecond', name: 'Lux Second Chance', url: 'https://luxsecondchance.com/', region: 'International', currency: 'CAD', note: 'Canadian luxury resale with bags and accessories.' },
    { id: 'helsinki', name: 'Luxury Helsinki', url: 'https://luxuryhelsinki.fi/', region: 'International', currency: 'PHP', note: 'Finnish resale boutique. References use its localized PHP display; this does not confirm Philippine delivery.' },
    { id: 'rebag', name: 'Rebag', url: 'https://www.rebag.com/', region: 'International', currency: 'USD', note: 'US luxury resale destination for handbags, watches and jewelry.' },
    { id: 'yoogi', name: "Yoogi's Closet", url: 'https://www.yoogiscloset.com/', region: 'International', currency: 'USD', note: 'US resale store specializing in designer bags and accessories.' },
    { id: 'watchfinder', name: 'Watchfinder', url: 'https://www.watchfinder.com/', region: 'International', currency: 'USD', note: 'Pre-owned watch specialist. Select your destination on the store website.' },
    { id: 'jadore', name: 'Jadore Couture', url: 'https://jadorecouture.ca/', region: 'International', currency: 'CAD', note: 'Canadian luxury consignment boutique.' },
    { id: '1916', name: 'The 1916 Company', url: 'https://www.the1916company.com/', region: 'International', currency: 'USD', note: 'New and pre-owned watches, jewelry and handbags.' },
    { id: 'bobs', name: "Bob's Watches", url: 'https://www.bobswatches.com/', region: 'International', currency: 'USD', note: 'US specialist in pre-owned Rolex and other luxury watches.' },
    { id: 'sellier', name: 'Sellier', url: 'https://www.sellierknightsbridge.com/', region: 'International', currency: 'GBP', note: 'UK resale boutique for designer handbags, clothing and shoes.' },
    { id: 'lab', name: 'LAB Luxury Resale', url: 'https://www.labluxuryresale.com/', region: 'International', currency: 'CAD', note: 'Hamilton-based Canadian boutique for designer resale.' },
    { id: 'joli', name: 'Joli Closet', url: 'https://www.jolicloset.com/', region: 'International', currency: 'EUR', note: 'European resale platform for designer fashion and accessories.' },
    { id: 'resee', name: 'ReSee', url: 'https://www.resee.com/en/', region: 'International', currency: 'EUR', note: 'Paris-based vintage and pre-owned designer fashion destination.' },
    { id: 'saclab', name: 'SACLAB', url: 'https://saclab.com/', region: 'International', currency: 'EUR', note: 'European pre-owned luxury handbag specialist.' },
    { id: 'cage', name: "Collector's Cage", url: 'https://collectorscage.com/', region: 'International', currency: 'EUR', note: 'Copenhagen designer handbag resale store. Check your selected market and currency.' },
    { id: 'finklepuff', name: 'Finklepuff', url: 'https://finklepuff.com/', region: 'International', currency: 'USD', note: 'Specialist Hermès resale store. Check the destination and currency at the store.' },
    { id: 'cocoon', name: 'COCOON', url: 'https://www.cocoon.club/', region: 'International', currency: 'GBP', note: 'UK designer bag membership and resale. Buying and borrowing have different terms.' },
    { id: 'huntstreet', name: 'HuntStreet', url: 'https://www.huntstreet.com/', region: 'International', currency: 'IDR', note: 'Indonesian luxury resale marketplace. Check destination eligibility directly.' },
    { id: 'aranaz', name: 'ARANAZ', url: 'https://aranaz.ph/', region: 'Philippines', currency: 'PHP', note: 'Official Filipino accessories brand. Selected pieces are described on their product pages as handmade in the Philippines.' },
    { id: 'r2r', name: 'Rags2Riches (R2R)', url: 'https://r2r.ph/', region: 'Philippines', currency: 'PHP', note: 'Official Filipino design house working with Philippine community artisans on handwoven bags and accessories.' }
  );
  stores.forEach(function (store) { store.reviewed = '2026-11-10'; });
  stores.unshift({ id: 'gentry', name: 'Gentry Timepieces', url: 'https://www.gentry.ph/', region: 'Philippines', currency: 'PHP', reviewed: '2026-11-10', note: 'Luxury watch resale, trade and consignment at Shoppesville, Greenhills. Philippine retailer, not a Philippine manufacturing claim.' });
  // Titles, identifiers and prices are factual references, not copied store descriptions.
  var groups = [
    { store: 'orange', evidence: 'Search-index reference', observed: '2026-10-17', rows: [
      ['Gucci', 'Ophidia GG Supreme Vanity Bag', 'Bags', 73000, 'preowned-gucci-ophidia-gg-supreme-vanity-bag-6995322149'],
      ['Chanel', 'Black Caviar Shopping Tote, silver hardware', 'Bags', 389000, 'chanel-black-caviar-shopping-tote-shw', '2026-10-26'],
      ['Hermes', 'Roulis 18 Vert Criquet Evercolor', 'Bags', 504000, 'hermes-roulis-18-vert-criquet-evercolor-gold-hardware', '2026-10-23'],
      ['Hermes', 'Picotin 22 Gold Clemence', 'Bags', 328000, 'brand-new-hermes-picotin-22-gold-clemence-phw-wam003uh', '2026-11-08'],
      ['Prada', 'Black Drawstring Clutch', 'Bags', 19000, 'preowned-prada-drawstring-clutch-black-224', '2026-11-07'],
      ['Prada', 'Gray Zip Wallet', 'Accessories', 49000, 'brand-new-prada-zip-wallet-gray', '2026-07-16'],
      ['Louis Vuitton', 'Twist PM Black Epi, silver hardware', 'Bags', 136000, 'preowned-lv-twist-black-pm-epi-shw-fl0166', '2026-10-12'],
      ['Hermes', 'H Watch Rose Gold, crocodile strap and diamonds', 'Watches', 1398000, 'hermes-h-watch-rosegold-croc-w-diamonds', '2026-11-09']
    ] },
    { store: 'fashionphile', evidence: 'Search-index reference', observed: '2026-10-21', rows: [
      ['Chanel', 'Black Quilted Calfskin Small Bucket Bag', 'Bags', 7995, 'chanel-calfskin-quilted-small-bucket-bag-black-1991825'],
      ['Chanel', 'Black Grained Calfskin Shopping Bag', 'Bags', 8995, 'chanel-grained-calfskin-shopping-bag-black-1992342', '2026-11-08'],
      ['Cartier', 'White Gold Small Juste Un Clou Bracelet, size 17', 'Jewelry', 4150, 'cartier-18k-white-gold-small-juste-un-clou-bracelet-17-1982578', '2026-11-04'],
      ['Cartier', 'Yellow Gold Diamond Small LOVE Bracelet, size 18', 'Jewelry', 22295, 'cartier-18k-yellow-gold-diamond-small-love-paved-bracelet-18-1966641', '2026-10-10']
    ] },
    { store: 'madison', evidence: 'Search-index reference', observed: '2026-10-07', rows: [
      ['Hermes', 'Birkin 25 Naturel Sable Togo, palladium hardware', 'Bags', 30500, 'hermes-birkin-25-naturel-sable-togo-palladium-hardware'],
      ['Hermes', 'Birkin 35 A L’Envers Ficelle-Ecru canvas', 'Bags', 74500, 'hermes-birkin-35-a-lenvers-ficelle-ecru-h-dyed-canvas-and-fauve-barenia-faubourg-palladium-hardware-1', '2026-11-03'],
      ['Chanel', 'Mini Pearly Chain Flap, black lambskin', 'Bags', null, 'chanel-mini-pearly-chain-flap-bag-black-lambskin-brushed-gold-hardware', '2026-11-04'],
      ['Dior', 'Mini Lady Dior, Bleu Myosotis lambskin', 'Bags', null, 'christian-dior-mini-lady-dior-bag-myosotis-bleu-myosotis-lambskin-silver-hardware', '2026-10-09']
    ] },
    { store: 'collector', evidence: 'Store collection reference', observed: '2026-11-10', rows: [
      ['Hermes', 'Birkin 25 Cargo, ecru canvas and Gold Swift', 'Bags', 45500, 'bags/hermes/birkin/hermes-birkin-handbag-25-cm-cargo-in-ecru-canvas-and-swift-gold-leather-436346.html'],
      ['Loro Piana', 'L 27, wool and brown leather', 'Bags', 2680, 'bags/loro-piana/l-27/loro-piana-l-27-handbag-in-wool-and-brown-leather-433452.html'],
      ['Saint Laurent', 'Solferino, beige raffia and brown leather', 'Bags', 1880, 'bags/saint-laurent/solferino/saint-laurent-solferino-shoulder-bag-in-beige-raffia-and-brown-leather-436537.html'],
      ['Hermes', 'Picotin 18, Gold Togo leather', 'Bags', 3550, 'bags/hermes/picotin/hermes-picotin-18-cm-handbag-in-gold-togo-leather-432641.html'],
      ['Celine', 'Anais, brown leather tote', 'Bags', 1750, 'bags/celine/anais/celine-anais-brown-leather-tote-bag-435868.html'],
      ['Celine', 'Triomphe Teen, natural leather', 'Bags', 2980, 'bags/celine/triomphe/celine-triomphe-teen-handbag-in-brown-leather-434838.html'],
      ['Hermes', 'Birkin 40, Gold Courchevel leather', 'Bags', 9450, 'bags/hermes/birkin/hermes-birkin-40-cm-handbag-in-courchevel-gold-leather-434910.html'],
      ['Hermes', 'Kelly 32, Noisette box leather', 'Bags', 12800, 'bags/hermes/kelly/hermes-kelly-32-cm-handbag-in-noisette-coloured-box-calf-leather-430625.html'],
      ['Gucci', 'Brown suede-effect leather handbag', 'Bags', 1380, 'bags/gucci/gucci-handbag-in-brown-suede-effect-leather-436189.html'],
      ['Hermes', 'Kelly 32, brown Courchevel leather', 'Bags', 12900, 'bags/hermes/kelly/hermes-kelly-32-cm-handbag-in-brown-courchevel-leather-424933.html'],
      ['Bottega Veneta', 'Jodie XL, prune Intrecciato leather', 'Bags', 3980, 'bags/bottega-veneta/jodie/bottega-veneta-jodie-xl-handbag-in-prune-coloured-intrecciato-leather-433484.html'],
      ['Louis Vuitton', 'Dauphine Soft large, Monogram canvas', 'Bags', 2450, 'bags/louis-vuitton/dauphine/louis-vuitton-dauphine-soft-handbag-large-size-in-brown-monogram-canvas-and-natural-leather-436124.html'],
      ['Gucci', 'Mini GG, brown canvas and leather', 'Bags', 1280, 'bags/gucci/mini-sac-gg/gucci-shoulder-bag-mini-gg-bag-in-brown-logo-canvas-and-brown-leather-435898.html'],
      ['Fendi', 'Baguette, brown monogram patent leather', 'Bags', 1450, 'bags/fendi/baguette/fendi-baguette-handbag-in-brown-monogram-patent-leather-412543.html'],
      ['Hermes', 'Haut a Courroies 40 Cargo, gray canvas', 'Bags', 45500, 'bags/hermes/haut-a-courroies/hermes-travel-bag-haut-a-courroies-40-cm-cargo-bag-in-grey-canvas-and-black-everkcalf-leather-435796.html'],
      ['Hermes', 'Picotin 18 Cargo, Bleu Marine canvas', 'Bags', 4580, 'bags/hermes/picotin/hermes-picotin-18-cm-cargo-handbag-in-bleu-marine-canvas-and-leather-435867.html'],
      ['Chanel', '31, navy quilted jersey and leather', 'Bags', 3890, 'bags/chanel/31/chanel-31-shoulder-bag-in-navy-blue-quilted-jersey-and-navy-blue-leather-390739.html'],
      ['Hermes', 'Kelly Sport small, Sapphire Blue box leather', 'Bags', 9880, 'bags/hermes/kelly/hermes-kelly-sport-small-model-shoulder-bag-in-sapphire-blue-box-leather-429103.html'],
      ['Rolex', 'GMT-Master II 16710, steel, circa 1991', 'Watches', 12500, 'watches/rolex/gmt-master/gmt-master-ii/rolex-gmt-master-ii-in-stainless-steel-ref-rolex-16710-circa-1991-413124.html'],
      ['Rolex', 'Daytona 116520, steel, circa 2005', 'Watches', 22900, 'watches/rolex/daytona/daytona-automatique/rolex-daytona-automatique-in-stainless-steel-ref-rolex-116520-circa-2005-416954.html'],
      ['Patek Philippe', 'Nautilus 5726, steel, circa 2019', 'Watches', 138800, 'watches/patek-philippe/nautilus/nautilus/patek-philippe-nautilus-steel-watch-ref-patek-philippe-5726-circa-2019-435713.html'],
      ['Audemars Piguet', 'Royal Oak 15510ST, steel', 'Watches', 55500, 'watches/audemars-piguet/royal-oak/royal-oak/audemars-piguet-royal-oak-steel-watch-ref-audemars-piguet-15510st-435474.html'],
      ['Patek Philippe', 'Annual Calendar 5205G-010, white gold', 'Watches', 42500, 'watches/patek-philippe/complications/annual-calendar/patek-philippe-annual-calendar-watch-in-white-gold-ref-patek-philippe-5205g-010-circa-2014-387799.html'],
      ['Breguet', 'Classique Complication 3130, white gold', 'Watches', 21500, 'watches/breguet/classique/classic-complications/breguet-classic-complication-watch-in-white-gold-ref-breguet-3130-circa-1990-435196.html'],
      ['Patek Philippe', 'World Time 5110P, platinum', 'Watches', 55900, 'watches/patek-philippe/world-time/world-time/patek-philippe-world-time-in-platinium-ref-5110p-circa-2000-394003.html'],
      ['Patek Philippe', 'Annual Calendar 5396, white gold', 'Watches', 39800, 'watches/patek-philippe/complications/annual-calendar/patek-philippe-annual-calendar-in-white-gold-ref-patek-philippe-5396-circa-2011-412095.html']
    ] }
  ];
  // Public storefront catalog snapshots; image filenames stay beside their product references.
  groups.push(
    { store: 'anns', evidence: 'Store catalog reference', observed: '2026-11-10', imageBase: 'https://www.annsfabulousfinds.com/cdn/shop/files/', rows: [
      ['Louis Vuitton', 'Green Monogram Heritage Rush Bumbag', 'Bags', 3200, 'louis-vuitton-green-monogram-heritage-rush-bumbag', null, 'LV.Z1028.14_05.jpg?v=1794178985'],
      ['Hermes', 'Black Clemence Evelyne III PM', 'Bags', 3600, 'hermes-black-clemence-evelyne-iii-pm-1', null, 'HR.Z1029.04_10.jpg?v=1794178564'],
      ['Chanel', 'Small Black Quilted Leather Paris-Cosmopolite Flap', 'Bags', 2400, 'chanel-small-black-quilted-leather-paris-cosmopolite-flap', null, 'CH.Z1029.02_07.jpg?v=1794177317'],
      ['Saint Laurent', 'Black Matelasse Grain de Poudre Wallet', 'Accessories', 400, 'saint-laurent-black-matelasse-grain-de-poudre-wallet', null, 'YS.Z1028.07_06.jpg?v=1794176321'],
      ['Hermes', 'Polished Palladium H Belt Buckle 32mm', 'Accessories', 400, 'hermes-polished-palladium-h-belt-buckle-32mm', null, 'HR.Z1026.13_02.jpg?v=1794176026'],
      ['Givenchy', 'Small Black Nightingale', 'Bags', 650, 'givenchy-small-black-nightingale', null, 'GV.Z1028.08_06.jpg?v=1794175977'],
      ['Hermes', 'Mors a Jouets Chemise Silk Scarf 70cm', 'Accessories', 500, 'hermes-mors-a-jouets-chemise-silk-scarf-70cm', null, 'HR.Z1023.10_07.jpg?v=1793981756'],
      ['Chanel', 'Bordeaux Quilted Caviar Grand Shopping Tote GST', 'Bags', 3500, 'ch-z1023-04-chanel-bordeaux-quilted-caviar-grand-shopping-tote-gst', null, 'CH.Z1023.04_08.jpg?v=1793895081'],
      ['Hermes', 'Gold Clemence Picotin Lock 18', 'Bags', 3800, 'hr-z1023-06-hermes-gold-clemence-picotin-lock-18', null, 'HR.Z1023.06_13.jpg?v=1793894863'],
      ['Chanel', 'Mini Blue Caviar CC Day Backpack', 'Bags', 3300, 'ch-z1029-03-chanel-mini-blue-caviar-cc-day-backpack', null, 'CH.Z1029.03_07.jpg?v=1793894391'],
      ['Chanel', 'Red Lambskin Camellia Round Clutch with Chain', 'Bags', 2700, 'ch-z1029-11-chanel-red-lambskin-camellia-round-clutch-with-chain', null, 'CH.Z1029.11_07.jpg?v=1793894154'],
      ['Hermes', 'Thalassa Cotton Twilly Pair', 'Accessories', 500, 'hr-z1023-11-hermes-thalassa-cotton-twilly-pair', null, 'HR.Z1023.11_01.jpg?v=1793893887']
    ] },
    { store: 'bagista', evidence: 'Store catalog reference', observed: '2026-11-10', imageBase: 'https://bagista.co.uk/cdn/shop/files/', rows: [
      ['Chanel', 'Mini Square, Blue Lambskin, silver hardware', 'Bags', 3699, 'chanel-mini-square-navy-lambskin-silver-hardware-copy', null, 'SOR8971CHANELMINISQUARE-BLUELAMBSKINSHW_01.jpg?v=1794244044'],
      ['Chanel', 'Mini Rectangular Pearl Crush, Blue Lambskin', 'Bags', 4399, 'chanel-mini-rectangular-pearl-crush-blue-lambskin-aged-gold-hardware-2', null, 'BO7700CHANELMINIRECTANGULAR-BLUELAMBSKINGHW_01.jpg?v=1793792130'],
      ['Hermes', 'Birkin 30 Iris Togo, gold hardware', 'Bags', 12499, 'hermes-birkin-30-iris-togo-gold-hardware-1', null, 'SOR8936BIRKIN30IRISGHW_01.jpg?v=1793900424'],
      ['Hermes', 'Birkin 25 Vert Vertigo Togo', 'Bags', 21999, 'hermes-birkin-25-vert-vertigo-togo-gold-hardware', null, 'SOR8931HERMESBIRKIN25-VERTVERTIGOTOGOGHW_01.jpg?v=1793626069'],
      ['Dior', 'Mini Lady Dior, Green Crocodile Porosus Diamante', 'Bags', 15999, 'dior-mini-lady-dior-green-crocodile-porus-diamante-champagne-gold-hardware', null, 'SOR8943DIORMINILADYDIOR-GREENCROCODILEPOROSUSDIAMANTECGHW_01_9315f6da-07b7-4912-bc93-c0c8784c69b6.jpg?v=1793967983'],
      ['Hermes', 'Jige Clutch 29, Noir Swift and Alligator', 'Bags', 4999, 'hermes-jige-clutch-29-noir-swift-noir-alligator-mississippiensis-1', null, 'SOR8935HERMESJIGECLUTCHTOUCH-NOIRSWIFT-ALLIGATOR_01.jpg?v=1793888627'],
      ['Hermes', 'Jige Clutch 29, Noir Swift and Natural Lizard', 'Bags', 5899, 'hermes-jige-clutch-29-noir-swift-natural-salvator-lizard-1', null, 'SOR8951HERMESJIGE29TOUCH-NOIRSWIFT-NATURALSALVADORLIZAR_01.jpg?v=1794140303'],
      ['Chanel', 'Vintage Mini Convertible Flap, Green Multicolour Satin', 'Bags', 2499, 'chanel-vintage-mini-convertible-flap-green-multicolour-satin-silver-hardware', null, 'SOR8930CHANELVINTAGEMINICONVERTIBLEFLAP-GREENMULTICOLOURSATINSHW_01.jpg?v=1793878425'],
      ['Fendi', 'Mini Chain Baguette, White Calfskin', 'Bags', 775, 'fendi-mini-baguette-bag-white-calfskin-leather-gold-hardware', null, 'SOR8927FENDIMINICHAINBAGUETTE-WHITECALFSKINGHW_01.jpg?v=1793791980'],
      ['Hermes', 'Kelly Pochette, Black Swift, palladium', 'Bags', 20999, 'hermes-kelly-pochette-black-swift-palladium', null, 'BO7705HERMESKELLYPOCHETTE-NOIRSWIFTPHW_01.jpg?v=1794241762'],
      ['Chanel', 'Maxi Flap 32cm, Black Grained Calfskin', 'Bags', 8999, 'chanel-maxi-flap-32-bag-black-grained-calfskin-gold-hardware-1', null, 'SOR8495CHANELMAXIFLAP35BLACKGRAINEDCALFSKINAGHW_1.jpg?v=1786276161'],
      ['Hermes', 'Mini Kelly 20cm, Vert Amande Epsom', 'Bags', 22999, 'hermes-mini-kelly-20cm-vert-amande-epsom-permabrass-hardware-1', null, 'BO7759HERMESKELLY20-VERTAMANDEEPSOMPBHW_02.jpg?v=1794067718']
    ] },
    { store: 'redeluxe', evidence: 'Store catalog reference', observed: '2026-11-10', imageBase: 'https://www.redeluxe.com/cdn/shop/files/', rows: [
      ['Chanel', '24C Black Caviar Quilted Maxi Travel Flap', 'Bags', 631800, '24c-black-caviar-quilted-maxi-travel-flap-light-gold-hardware', null, '80-DSC05386.jpg?v=1793923593'],
      ['Hermes', 'Herbag 20 Ardoise / Bleu Glacier Ecru Toile', 'Bags', 191900, 'herbag-20-ardoise-vache-hunter-bleu-glacier-ecru-toile-palladium-plated-k-stamp-1', null, '44-DSC04676.jpg?v=1793304519'],
      ['Hermes', 'Evelyne 16 TPM Orange Clemence', 'Bags', 166200, 'evelyne-16-tpm-orange-clemence-gold-plated-b-stamp-1', null, '43-DSC03631.jpg?v=1793304331'],
      ['Hermes', 'Garden Party 36 Etoupe Negonda', 'Bags', 223900, 'garden-party-36-etoupe-negonda-palladium-plated-y-stamp-1', null, '1-DSC02921.jpg?v=1793229282'],
      ['Chanel', 'White Caviar Quilted Classic Flap Small', 'Bags', 576100, 'white-caviar-quilted-classic-flap-small-light-gold-hw-1', null, '107-DSC03383.jpg?v=1793311524'],
      ['Chanel', 'Blue Caviar Quilted Classic Flap Small', 'Bags', 480100, 'blue-caviar-quilted-classic-flap-small-lghw-1', null, '221-DSC03549.jpg?v=1793138882'],
      ['Hermes', 'Picotin 22 Etoupe Clemence', 'Bags', 255900, 'picotin-22-etoupe-clemence-palladium-plated-y-stamp-1', null, '100-DSC03131.jpg?v=1793401817'],
      ['Chanel', '23C Black Satin Crystal CC Flats, size 38.5', 'Shoes', 57600, '23c-black-satin-crystal-embellished-cc-flats-size-38-6', null, '151-DSC03458.jpg?v=1793401941'],
      ['Hermes', 'Birkin 30 Rouge Tomato Epsom', 'Bags', 960100, 'birkin-30-rouge-tomato-epsom-gold-plated-a-stamp', null, '76-DSC09903_a261ec61-0cb9-42a7-8d4f-eac56923319f.jpg?v=1755282591'],
      ['Chanel', '23P Caramel Lambskin Spellout Chain Single Flap', 'Bags', 448000, '23p-caramel-lambskin-quilted-spellout-chain-single-flap-bag-aghw-1', null, '79-DSC04555.jpg?v=1793139376'],
      ['Chanel', '26B White Black Caviar CC Filigree Vanity Small', 'Bags', 319900, '26b-white-black-caviar-quilted-cc-filigree-vanity-case-small-gold-hardware-1', null, '106-DSC03375.jpg?v=1793138774'],
      ['Chanel', '26M White Black Denim Coco Beach Maxi Hobo', 'Bags', 448000, '26m-white-black-denim-coco-beach-maxi-hobo-bag-aghw-1', null, '1-DSC03559.jpg?v=1793225214']
    ] },
    { store: 'luxsecond', evidence: 'Store catalog reference', observed: '2026-11-10', imageBase: 'https://luxsecondchance.com/cdn/shop/files/', rows: [
      ['Marni', 'Beige/Burgundy Leather Museo Soft Tote', 'Bags', 378, 'marni-beige-burgundy-leather-museo-soft-tote', null, 'file_0f59b68b-0d66-4c2d-b71d-562266330bc7.jpg?v=1794238060'],
      ['Bvlgari', 'Red Leather Serpenti Top Handle Bag', 'Bags', 1785, 'bvlgari-red-leather-serpenti-top-handle-bag', null, 'file_fa3486e4-59a4-4ee8-a2eb-840ad9db64e1.jpg?v=1794238056'],
      ['Louis Vuitton', '2020 Monogram Leather Boite Chapeau Souple PM', 'Bags', 2100, 'louis-vuitton-2020-monogram-leather-boite-chapeau-souple-pm', null, 'file_bf73415c-9070-4255-9b0d-af0759a5628f.jpg?v=1794238052'],
      ['Chanel', '2017/18 Black White Canvas Camellia Duffle', 'Bags', 5943, 'pre-loved-chanel-2017-18-black-white-coated-canvas-camellia-duffle-bag', null, 'file_795c2905-d0a7-4910-81c5-48d4229b40cb.jpg?v=1794236461'],
      ['Bottega Veneta', 'Vintage Red Intrecciato Medium Hobo', 'Bags', 2058, 'bottega-veneta-vintage-red-intrecciato-medium-hobo-shoulder-bag', null, 'file_f74f7a94-adbf-4acf-a544-df349e3e3aa3.jpg?v=1794236455'],
      ['Chanel', '2008/09 Navy Red Baseball Spirit Expandable Tote', 'Bags', 2583, 'pre-loved-chanel-2008-09-navy-blue-red-perforated-leather-baseball-spirit-ligne-expandable-tote', null, 'file_a95e55f1-f95a-4964-aa2b-27935d30528c.jpg?v=1794236447'],
      ['Louis Vuitton', '2018 Monogram Keepall 55', 'Bags', 1785, 'louis-vuitton-2018-monogram-keepall-55', null, 'file_b27eea21-b107-4973-bff4-d3dade49d333.jpg?v=1794232730'],
      ['Chanel', '2014 Black Lambskin Classic Jumbo Double Flap', 'Bags', 10500, 'pre-loved-chanel-2014-black-quilted-lambskin-classic-jumbo-double-flap-ghw', null, 'file_90148124-2759-4e33-8672-cac09b9dea7d.jpg?v=1794232721'],
      ['Chanel', '2017 Navy Sequin Astronaut Essentials Backpack', 'Bags', 7308, 'pre-loved-chanel-2017-navy-sequin-astronaut-essentials-backpack', null, 'file_f00ac5f3-a0ea-407d-9274-418a026eff0a.jpg?v=1794232721'],
      ['Chanel', 'Navy Blue CC Small Preppy Mini Shoulder Bag', 'Bags', 10038, 'pre-loved-chanel-navy-blue-cc-small-preppy-mini-shoulder-bag', null, 'file_4675c25a-8c7c-447e-9142-0eb4152ee3b9.jpg?v=1794230828'],
      ['Chanel', '2019 Tweed PVC Clutch', 'Bags', 1848, 'pre-loved-chanel-2019-tweed-pvc-clutch', null, 'file_b30ed97b-e62a-4fde-be5b-4bcef2b4ac82.jpg?v=1794230815'],
      ['Louis Vuitton', 'Monogram Canvas Petit Sac Plat with Strap', 'Bags', 2163, 'louis-vuitton-monogram-canvas-petit-sac-plat-with-strap', null, 'file_81a7bc47-82dd-46e4-953f-8f6c97ad06d4.jpg?v=1794230787']
    ] },
    { store: 'helsinki', evidence: 'Store catalog reference', observed: '2026-11-10', imageBase: 'https://luxuryhelsinki.fi/cdn/shop/files/', rows: [
      ['Saint Laurent', 'Sunset Medium Croco Embossed Black', 'Bags', 130100, 'saint-laurent-sunset-medium-croco-embossed-leather-black-shw', null, '1_1a584dc5-e83d-417c-ae72-afb2e0d52dc7.png?v=1793884320'],
      ['Louis Vuitton', 'Louise Clutch Black Epi', 'Bags', 112000, 'louis-vuitton-louise-clutch-black-epi-leather', null, '1_ee867ac6-0e44-43eb-8f5b-90ea8f6fb0d7.png?v=1793884372'],
      ['Louis Vuitton', 'Ambre Cabas Cruise Vinyl GM', 'Bags', 60000, 'louis-vuitton-ambre-cabas-cruise-vinyl-gm', null, '1_6c053686-c312-41cd-bce2-2333993577cb.png?v=1793884456'],
      ['Louis Vuitton', 'Coussin Hobo MM Washed Grey', 'Bags', 256500, 'louis-vuitton-coussin-hobo-mm-washed-grey', null, '1_c70f7d3f-c312-4b72-9a53-0d5f012ae846.png?v=1793884531'],
      ['Hermes', 'Kelly Wallet Lizard Chevre Anemone Purple', 'Accessories', 177000, 'hermes-kelly-wallet-valanus-niloticus-lizard-chevre-anemone-purple-phw', null, '1_40643485-2dc3-4411-a4bf-3d5b00b8070e.png?v=1793884223'],
      ['Louis Vuitton', 'Monogram Polar Bear Round Coin Purse', 'Accessories', 32600, 'louis-vuitton-monogram-polar-bear-round-coin-purse', null, '1_be1c3cb6-05c4-4f35-9ac0-e81cc9a65239.png?v=1793883886'],
      ['Louis Vuitton', 'Monogram Multipochette Rose', 'Bags', 129300, 'louis-vuitton-monogram-multipochette-rose-1', null, '1_47f64a91-af2e-44e8-bdae-1bb1bcf93856.png?v=1793883359'],
      ['Louis Vuitton', 'Speedy Monogram 25', 'Bags', 93200, 'louis-vuitton-speedy-monogram-25-copy', null, '1_9d337096-eb81-478c-9f72-7804c0e36672.png?v=1793792131'],
      ['Louis Vuitton', 'Alma BB Monogram', 'Bags', 71600, 'louis-vuitton-alma-bb-monogram-4', null, '1_8252e90b-57d4-4115-95de-97dbae3f18fa.png?v=1793719721'],
      ['Louis Vuitton', 'Neverfull MM Monogram', 'Bags', 54200, 'louis-vuitton-neverfull-mm-monogram-copy', null, '1_4892c75c-11ea-48a4-a23e-cf4523ebb8d9.png?v=1793721136'],
      ['Hermes', 'Birkin 25 Gold Togo', 'Bags', 1870700, 'hermes-birkin-25-gold-togo-phw-1', null, '1_f062d20a-5e38-4eb3-8e24-fb3a522a6c9f.png?v=1793370977']
    ] }
  );
  groups.push(
    { store: 'aranaz', evidence: 'Store catalog reference', observed: '2026-11-10', madeIn: 'Philippines', imageBase: 'https://aranaz.ph/cdn/shop/files/', rows: [
      ['ARANAZ', 'Flordeliza (Olive)', 'Bags', 5900, 'flordeliza-black-copy', null, 'ModeldayRenee2343.jpg?v=1793873026'],
      ['ARANAZ', 'Lagrima Kubo (Medium)', 'Bags', 4900, 'lagrima-kubo-medium', null, 'IMG-7558.png?v=1779508680'],
      ['ARANAZ', 'Theresa Large (Black with Tan Leather)', 'Bags', 6200, 'theresa-large-black-with-tan-leather', null, 'BlackWovenHandbagonWoodenChair.png?v=1792137505'],
      ['ARANAZ', 'Oskola Leather (White)', 'Bags', 6950, 'oskola-leather-white', null, 'oskola_clutch_leather_Model_day_Pam-19.png?v=1767933075'],
      ['ARANAZ', 'Flordeliza (Dusty Blue)', 'Bags', 5900, 'flordeliza-dusty-blue', null, 'Flordeliza_dustyblue_aranazmodelshoot-30.png?v=1758693641'],
      ['ARANAZ', 'Amor 1 Medium (Black)', 'Bags', 8500, 'amor-1-medium-black', null, 'Amor1med_fd2b74be-5d86-464b-b5c6-988700b961fa.png?v=1786345418'],
      ['ARANAZ', 'Starfish Hair Tie', 'Accessories', 1200, 'starfish-hair-tie-plain', null, 'ChatGPT_Image_Jul_17_2026_10_26_47_AM.png?v=1784255246'],
      ['ARANAZ', 'Pamela (Black)', 'Bags', 7900, 'pamela-black', null, 'IMG-9213.png?v=1782999606']
    ] },
    { store: 'r2r', evidence: 'Store catalog reference', observed: '2026-11-10', madeIn: 'Philippines', originEvidence: 'https://r2r.ph/', imageBase: 'https://r2r.ph/cdn/shop/files/', rows: [
      ['Rags2Riches', 'Buslo Blocks Pastel', 'Bags', 3880, 'ready-today-buslo-blocks-pastel', null, 'ready-today-buslo-blocks-pastel-fashion-rags2riches-583129.png?v=1730320657'],
      ['Rags2Riches', 'Sili Bag', 'Bags', 6800, 'sili-bag', null, 'ships-out-oct-23-sili-bag-fashion-rags2riches-905035.jpg?v=1788950704'],
      ['Rags2Riches', 'Buslo Micro Medley Macopa', 'Bags', 4100, 'ready-today-buslo-micro-medley-macopa', null, 'buslo-micro-medley-macopa-fashion-rags2riches-976115.jpg?v=1741253129'],
      ['Rags2Riches', 'Buslo Blocks Pink Skies', 'Bags', 3500, 'ready-today-buslo-blocks-pink-skies', null, 'ready-today-buslo-blocks-pink-skies-fashion-rags2riches-281654.jpg?v=1712347181'],
      ['Rags2Riches', 'Mangga Fruit Bag', 'Bags', 6800, 'mangga-fruit-bag', null, 'ships-out-sep-28-mangga-fruit-bag-fashion-rags2riches-143155.jpg?v=1788950684'],
      ['Rags2Riches', 'Saging Fruit Bag', 'Bags', 6800, 'saging-fruit-bag', null, 'ready-today-saging-fruit-bag-fashion-rags2riches-779607.jpg?v=1788950662'],
      ['Rags2Riches', 'Limon Micro Fruit Bag', 'Bags', 2800, 'ready-today-limon-micro-fruit-bag', null, 'limon-micro-fruit-bag-fashion-rags2riches-710725.png?v=1785771955']
    ] }
  );
  groups.unshift({ store: 'gentry', evidence: 'Store catalog reference', observed: '2026-11-10', imageBase: 'https://www.gentry.ph/cdn/shop/files/', rows: [
    ['Rolex', 'Datejust 36 Two Tone Yellow Gold White Anniversary Diamonds 116233, 2008', 'Watches', 719000, 'rolex-datejust-36-two-tone-yellow-gold-white-anniversary-dial-with-diamonds-116233-2008', null, 'A15613_1_4a156b38-2890-499b-99c0-84105f48a3a2.jpg?v=1794120053'],
    ['Rolex', 'Yacht-Master 40 Platinum 16622, 2003', 'Watches', 629000, 'rolex-yacht-master-40-platinum-16622-2003', null, 'A01074_1_cd5c7b65-1219-4f6d-981d-3eba6e37a5b3.jpg?v=1794119904'],
    ['Rolex', 'GMT-Master II Bruce Wayne 126710GRNR, 2024', 'Watches', 1259000, 'rolex-gmt-master-ii-bruce-wayne-126710grnr-2030', null, 'A5105_56f85ff1-5629-48ea-a6e0-1c9905194422.png?v=1794119597'],
    ['Cartier', 'Santos-Dumont Large Two Tone Rose Gold W2SA0011, 2021', 'Watches', 468000, 'cartier-santos-dumont-large-two-tone-rose-gold-white-dial-w2sa0011-2021', null, 'A41631_61d860f9-14d0-4d06-8b9c-e3dfe2c3017e.jpg?v=1794119238'],
    ['Rolex', 'GMT-Master II Bruce Wayne 126710GRNR, 2026', 'Watches', 1349000, 'rolex-gmt-master-ii-bruce-wayne-126710grnr-2031', null, 'A5105_de4d49d9-5c8f-4fe6-aa7a-4164859be322.png?v=1794119083'],
    ['Rolex', 'GMT-Master II Bruce Wayne 126710GRNR, 2026, listed new', 'Watches', 1459000, 'rolex-gmt-master-ii-bruce-wayne-126710grnr-2026-brand-new-6', null, 'ProductID_A4703_576f1b4d-6277-486f-aaeb-e57f5c47c897_e047a13f-3907-4cb0-970b-0b5ef01ba71f_28b9dff2-1b86-47ba-b877-ad3138e3d341.png?v=1794118964'],
    ['Rolex', 'Lady Datejust 26 Two Tone Yellow Gold Champagne 69173, 1989', 'Watches', 319000, 'rolex-lady-datejust-26-two-tone-yellow-gold-champagne-dial-69173-1989', null, 'A08504_1_1_6549a13a-1c7a-4b93-8ab4-c8cac22e58a1.jpg?v=1794118814'],
    ['Rolex', 'Datejust 41 Silver Dial 126300, 2019', 'Watches', 569000, 'rolex-datejust-41-silver-dial-126300-2019', null, 'DJ8141_95ee116f-3b3b-4cc5-b723-f223dc573fb4.jpg?v=1794118688'],
    ['Rolex', 'Datejust 36 Two Tone Yellow Gold White Roman 126233, 2026, listed new', 'Watches', 1219000, 'rolex-datejust-36-two-tone-yellow-gold-white-roman-126233-2026-brand-new', null, 'A4999_03512024-9209-4d89-a0f3-1703beafa12d.jpg?v=1794118461'],
    ['Rolex', 'Oyster Perpetual 26 Two Tone Yellow Gold Champagne 67193, 1983', 'Watches', 259000, 'rolex-oyster-perpetual-26-two-tone-yellow-gold-champagne-dial-67193-1983', null, 'A39341_5795a3bc-518a-4103-86d8-ec575d866d32.jpg?v=1794117744'],
    ['Rolex', 'Datejust II White Dial 116300, 2013', 'Watches', 549000, 'rolex-datejust-ii-white-dial-116300-2013', null, 'A25281_2a8a94b4-9b4e-4a8d-bbe9-8e6d324cf88a.jpg?v=1794117561'],
    ['Rolex', 'Submariner Date 40 Pre-Ceramic Black 16610LN, 1991', 'Watches', 579000, 'rolex-submariner-date-40-pre-ceramic-black-16610ln-1991', null, 'A04094_1_e6eaa471-b6dc-4923-91ab-627b796f901d.jpg?v=1794117246']
  ] });
  var photos = {
    orange: [
      'dfe4-6916de0ba03a6.jpg?v=1792916824', 'e1a6-6a4f807d1a233.jpg?v=1784022229',
      '198d-690f0f0403924.jpg?v=1773035081', '92b9-69115afb76ebd.jpg?v=1773037480',
      '07bc-6890957639e66.jpg?v=1754308057', '0a89-689c5e71a0a80.jpg?v=1755081064',
      'dsfbv.jpg?v=1792465547', '833e-688f0766c3990.jpg?v=1754288860'
    ],
    fashionphile: [
      '6ad8b96a3a57414662a0980102ca64c1.jpg?v=1792265392', '5ae5471a0591936ba7e1e3a3b3136898.jpg?v=1792266841',
      'e7edea6b13592455a44ab33bfcb1ea06.jpg?v=1793730527', '61a6715870af6ef4c1f4e5eaf71f14f4.jpg?v=1791646908'
    ],
    madison: [
      'H-B-260415-10-01_grande.jpg?v=1777462662', 'H-B-260605-4-01_grande.jpg?v=1781126124',
      'C-FN-250325-8-01_grande.jpg?v=1743538123', 'D-FN-260325-1-01_grande.jpg?v=1775236153'
    ],
    collector: [
      '436346/00pp-g-hermes-birkin-handbag-25-cm-cargo-in-ecru-canvas-and-swift-gold-leather.jpg',
      '433452/00pp-g-loro-piana-l-27-handbag-in-wool-and-brown-leather.jpg',
      '436537/00pp-g-saint-laurent-solferino-shoulder-bag-in-beige-raffia-and-brown-leather.jpg',
      '432641/00pp-g-hermes-picotin-18-cm-handbag-in-gold-togo-leather.jpg',
      '435868/00pp-g-celine-anais-brown-leather-tote-bag.jpg',
      '434838/00pp-g-celine-triomphe-teen-handbag-in-natural-leather.jpg',
      '434910/00pp-g-hermes-birkin-40-cm-handbag-in-courchevel-gold-leather.jpg',
      '430625/00pp-g-hermes-kelly-32-cm-handbag-in-noisette-coloured-box-leather.jpg',
      '436189/00pp-g-gucci-handbag-in-brown-suede-effect-leather.jpg',
      '424933/00pp-g-hermes-kelly-32-cm-handbag-in-brown-courchevel-leather.jpg',
      '433484/00pp-g-bottega-veneta-jodie-xl-handbag-in-prune-coloured-intrecciato-leather.jpg',
      '436124/00pp-g-louis-vuitton-dauphine-soft-handbag-large-size-in-brown-monogram-canvas-and-natural-leather.jpg',
      '435898/00pp-g-gucci-shoulder-bag-mini-gg-bag-in-brown-logo-canvas-and-brown-leather.jpg',
      '412543/00pp-g-fendi-baguette-handbag-in-brown-monogram-patent-leather.jpg',
      '435796/00pp-g-hermes-travel-bag-haut-a-courroies-40-cm-cargo-bag-in-grey-canvas-and-black-everkcalf-leather.jpg',
      '435867/00pp-g-hermes-picotin-18-cm-cargo-handbag-in-bleu-marine-canvas-and-leather.jpg',
      '390739/00pp-g-chanel-31-shoulder-bag-in-navy-blue-quilted-jersey-and-navy-blue-leather.jpg',
      '429103/00pp-g-hermes-kelly-sport-small-model-shoulder-bag-in-sapphire-blue-box-leather.jpg',
      '413124/00pp-rolex-gmt-master-ii-in-stainless-steel-ref-rolex-16710-circa-1991.jpg',
      '416954/00pp-g-rolex-daytona-automatic-steel-watch-ref-rolex-116520-circa-2005.jpg',
      '435713/00pp-g-patek-philippe-nautilus-steel-watch-ref-patek-philippe-5726-circa-2019.jpg',
      '435474/00pp-g-audemars-piguet-royal-oak-steel-watch-ref-audemars-piguet-15510st.jpg',
      '387799/00pp-g-patek-philippe-annual-calendar-watch-in-white-gold-ref-patek-philippe-5205g-010-circa-2014.jpg',
      '435196/00pp-g-breguet-classic-complication-watch-in-white-gold-ref-breguet-3130-circa-1990.jpg',
      '394003/00pp-g-patek-philippe-world-time-in-platinium-ref-5110p-circa-2000.jpg',
      '412095/00pp-g-patek-philippe-annual-calendar-in-white-gold-ref-patek-philippe-5396-circa-2011.jpg'
    ]
  };
  var items = groups.flatMap(function (group) {
    var store = stores.find(function (entry) { return entry.id === group.store; });
    var base = store.id === 'collector' ? 'https://www.collectorsquare.com/en/' : new URL('/products/', store.url).href;
    return group.rows.map(function (row, index) {
      var photo = group.imageBase ? group.imageBase + row[6] + '&width=720' : store.id === 'collector' ? 'https://medias.collectorsquare.com/images/products/' + photos[group.store][index] :
        new URL('/cdn/shop/files/' + photos[group.store][index] + '&width=720', store.url).href;
      return { id: store.id + ':' + row[4], storeId: store.id, brand: row[0], title: row[1], category: row[2],
        price: row[3], currency: store.currency, url: base + row[4], observed: row[5] || group.observed, evidence: group.evidence,
        image: photo, imageReviewed: '2026-11-10', madeIn: group.madeIn || null,
        originEvidence: group.madeIn ? group.originEvidence || base + row[4] : null };
    });
  });
  function filterItems(filters) {
    var query = (filters.query || '').trim().toLocaleLowerCase();
    var result = items.filter(function (item) {
      var store = stores.find(function (entry) { return entry.id === item.storeId; });
      return (!query || [item.brand, item.title, item.category, store.name, item.madeIn ? 'Made in ' + item.madeIn : ''].join(' ').toLocaleLowerCase().includes(query)) &&
        (!filters.category || item.category === filters.category) && (!filters.brand || item.brand === filters.brand) &&
        (!filters.store || item.storeId === filters.store) && (!filters.region || store.region === filters.region) &&
        (!filters.madeIn || item.madeIn === filters.madeIn) && (!filters.currency || item.currency === filters.currency) &&
        (filters.maxPrice === '' || filters.maxPrice === undefined ||
          (filters.currency && item.price !== null && item.price <= Number(filters.maxPrice)));
    });
    if (filters.sort === 'title') result.sort(function (a, b) { return (a.brand + a.title).localeCompare(b.brand + b.title); });
    if (filters.currency && ['price-low', 'price-high'].includes(filters.sort)) result.sort(function (a, b) {
      if (a.price === null) return b.price === null ? 0 : 1;
      if (b.price === null) return -1;
      return filters.sort === 'price-low' ? a.price - b.price : b.price - a.price;
    });
    return result;
  }
  function selectSpotlight(sample) {
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new RangeError('Spotlight sample must be between 0 (inclusive) and 1 (exclusive)');
    if (sample < 0.5) return stores.find(function (store) { return store.id === 'gentry'; });
    var others = stores.filter(function (store) {
      return store.id !== 'gentry' && items.some(function (item) { return item.storeId === store.id; });
    });
    return others[Math.floor((sample - 0.5) * 2 * others.length)];
  }
  OPULE.discovery = { stores: stores, items: items, filterItems: filterItems, selectSpotlight: selectSpotlight, reviewed: '2026-11-10' };
})();
