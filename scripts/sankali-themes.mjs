// Vachanamrut Sankali (સાંકળી): themes ("વાત") and the patterns that find them in the cached
// Gujarati text. The text is split into sentences; a sentence counts for a theme when it matches
// `re` (and `with`, when given). A Vachanamrut is listed when at least `min` sentences match
// (default 1), unless it is in `exclude`. The first matching sentence is shown as the quote.
// `group` is one of GROUPS; `subject` links to a site subject (optional).
// Run `npm run build-sankali` after edits; `node scripts/sankali-find.mjs "<regex>"` to explore.
export const GROUPS = [
  { id: 'dosh', gu: 'દોષ ટાળવા', en: 'Overcoming faults' },
  { id: 'bhakt', gu: 'ભક્ત અને સંત', en: 'Devotees and the Sant' },
  { id: 'bhagwan', gu: 'ભગવાનનું સ્વરૂપ', en: 'The nature of Bhagwan' },
  { id: 'sadhan', gu: 'સાધન અને ભક્તિ', en: 'Endeavours and devotion' },
  { id: 'gnan', gu: 'જ્ઞાન અને વૈરાગ્ય', en: 'Knowledge and detachment' },
];

const W = '(^|[ ,;“‘(])'; // word start
const E = '(?=[ ,;.?!”’)]|$)'; // word end

export const THEMES = [
  // ---- દોષ ટાળવા ----
  {
    id: 'potana-avgun', group: 'dosh', subject: 'abhav',
    gu: 'પોતાના અવગુણ જોવા, બીજાના ગુણ જોવા', en: 'Seeing one’s own faults and others’ virtues',
    re: '(પોતાને વિષે|પોતામાં|પોતાના|પોતાનો|પોતાનાં|પોતાની).{0,25}(અવગુણ|દોષ)|(અવગુણ|દોષ).{0,15}પોતામાં',
  },
  {
    id: 'bhakt-avgun', group: 'dosh', subject: 'abhav',
    gu: 'ભગવાન અને ભક્તનો અવગુણ ન લેવો', en: 'Not seeing faults in Bhagwan and His devotees',
    re: 'અવગુણ|દોષ', with: '(ભક્ત|સંત|સાધુ|સત્સંગી|સત્પુરુષ|મોટાપુરુષ|ભગવાન|પરમેશ્વર)(નો|ના|ને|માં|થી)', min: 2,
  },
  { id: 'droh', group: 'dosh', subject: 'abhav', gu: 'ભગવાન-ભક્તનો દ્રોહ', en: 'Enmity towards Bhagwan and devotees', re: 'દ્રોહ' },
  { id: 'irsha', group: 'dosh', gu: 'ઈર્ષ્યા', en: 'Jealousy', re: 'ઈર્ષ્યા|ઈરખા' },
  {
    id: 'maan', group: 'dosh', gu: 'માન-અહંકાર', en: 'Ego and pride',
    re: `${W}(માન|માનને|માનનો|માનની|માનનું|માનમાં|માને કરીને|માનીપણું|નિર્માની|નિર્માન|નિર્માનીપણું|અભિમાન|અભિમાનને|અભિમાની|દેહાભિમાન)${E}|અહંકાર (રાખ|ન ગમે|બોલ|આવે|ન રાખ)|કોઈ વાતનો અહંકાર`,
  },
  { id: 'krodh', group: 'dosh', gu: 'ક્રોધ', en: 'Anger', re: 'ક્રોધ' },
  { id: 'kaam', group: 'dosh', subject: 'vasana', gu: 'કામ (કામવાસના)', en: 'Lust', re: 'નિષ્કામ|કામી|કામવાસના|કામ, ક્રોધ|કામ ને ક્રોધ|કામ-ક્રોધ|કામાદિક|કામનો વેગ|કામને' },
  { id: 'lobh', group: 'dosh', gu: 'લોભ', en: 'Greed', re: 'લોભ' },
  { id: 'swad', group: 'dosh', gu: 'સ્વાદ', en: 'Craving for taste', re: 'સ્વાદ' },
  { id: 'mamatva', group: 'dosh', gu: 'સગાંસંબંધીમાં સ્નેહ-મમત્વ', en: 'Attachment to relatives', re: 'નિઃસ્નેહ|સગાંસંબંધી|સગાંવહાલાં|સગાંવહાલાં|મમત્વ|મમતા|દેહનાં સંબંધી|દેહના સંબંધી' },
  { id: 'swabhav', group: 'dosh', gu: 'સ્વભાવ-પ્રકૃતિ ટાળવા', en: 'Overcoming one’s nature', re: 'સ્વભાવ', min: 2 },
  { id: 'kusang', group: 'dosh', subject: 'kusang', gu: 'કુસંગ', en: 'Bad company', re: 'કુસંગ' },
  { id: 'vasana', group: 'dosh', subject: 'vasana', gu: 'વાસના ટાળવી', en: 'Overcoming desires', re: 'વાસના' },
  { id: 'panchvishay', group: 'dosh', subject: 'vasana', gu: 'પંચવિષય', en: 'The five sense objects', re: 'પંચવિષય|પંચ વિષય|વિષયમાં|વિષયને|વિષયનો|વિષયની|વિષયસુખ|વિષયભોગ', min: 2 },
  {
    id: 'indriya', group: 'dosh', gu: 'ઇન્દ્રિયો, અંતઃકરણ અને મન જીતવાં', en: 'Conquering the senses and mind',
    re: '(ઇન્દ્રિય|ઇંદ્રિય|અંતઃકરણ|મન)[^ ]{0,4} .{0,25}(જીત|વશ|નિયમમાં|દમન|ખેંચ|ડોલ)',
  },
  { id: 'ghat', group: 'dosh', gu: 'મનના ઘાટ-સંકલ્પ', en: 'Thoughts and desires of the mind', re: `${W}ઘાટ|સંકલ્પ`, min: 2 },
  { id: 'moh', group: 'dosh', gu: 'મોહ', en: 'Delusion', re: `${W}(મોહ|મોહને|મોહનું|મોહનો|મોહે|મોહમાં)${E}` },
  { id: 'kathan-vachan', group: 'dosh', gu: 'કઠણ વચન-અપમાન સહન કરવાં', en: 'Bearing harsh words and insults', re: 'કઠણ વચન|કઠણ વેણ|આકરું વચન|કઠોર વચન|ઠપકો|ધોખો|અપમાન|તિરસ્કાર|સહન કર|ખમી ખા|તિતિક્ષા' },

  // ---- ભક્ત અને સંત ----
  { id: 'satpurush', group: 'bhakt', subject: 'satpurush', gu: 'સત્પુરુષ-એકાંતિક સંતનો મહિમા', en: 'The Satpurush / ekantik Sant', re: 'સત્પુરુષ|એકાંતિક સાધુ|એકાંતિક સંત|મોટા સાધુ|મોટા સંત|મોટાપુરુષ|ગુણાતીત સાધુ|ગુણાતીત સંત|સાચા સંત' },
  { id: 'samagam', group: 'bhakt', subject: 'katha', gu: 'સંતનો સમાગમ', en: 'Association with the Sant', re: 'સમાગમ' },
  { id: 'atmabuddhi', group: 'bhakt', gu: 'સંતમાં આત્મબુદ્ધિ', en: 'Profound attachment to the Sant', re: 'આત્મબુદ્ધિ|આત્મ બુદ્ધિ' },
  { id: 'paksh', group: 'bhakt', gu: 'ભગવાનના ભક્તનો પક્ષ', en: 'Siding with Bhagwan’s devotees', re: 'પક્ષ', with: 'ભક્ત|ભગવાન|સંત|સાધુ|સત્સંગ' },
  { id: 'seva', group: 'bhakt', subject: 'seva', gu: 'ભગવાન અને સંતની સેવા', en: 'Service of Bhagwan and the Sant', re: 'સેવા|ટહેલ|ચાકરી', with: 'ભગવાન|સંત|સાધુ|ભક્ત|મોટા|પુરુષ|મૂર્તિ|માબાપ|પરમેશ્વર' },
  { id: 'bhakt-lakshan', group: 'bhakt', subject: 'bhaktlakshan', gu: 'ઉત્તમ ભક્તનાં લક્ષણ', en: 'Qualities of the best devotee', re: '(ઉત્તમ|મોટો|પાકો|એકાંતિક|પરમ) (ભક્ત|હરિભક્ત|સત્સંગી)|ભક્તનાં લક્ષણ|ભક્તનું લક્ષણ|સાચો સત્સંગી|પાકો સત્સંગી' },
  { id: 'sant-lakshan', group: 'bhakt', subject: 'santlakshan', gu: 'સાચા સંતનાં લક્ષણ', en: 'Qualities of a true Sant', re: '(સંત|સાધુ)નાં લક્ષણ|(સંત|સાધુ)નું લક્ષણ|(સંત|સાધુ)ના ગુણ|સાચો સાધુ|સાચા સાધુ|સાચા સંત|ખરો સાધુ|એવા (જે )?(સંત|સાધુ)|સાધુનો ધર્મ|સાધુતા|સાધુ તો|સંત તો' },
  { id: 'das', group: 'bhakt', gu: 'દાસભાવ-નમ્રતા', en: 'Servitude and humility', re: 'દાસાનુદાસ|દાસનો દાસ|દાસભાવ|દાસપણ|નમ્રતા|નમ્ર|દીનતા|દીન થઈ|ગરીબ થઈ' },
  { id: 'satsang-dradh', group: 'bhakt', gu: 'સત્સંગમાંથી પડવું-વિમુખ થવું', en: 'Falling from satsang', re: 'સત્સંગમાંથી|સત્સંગથી (પાછો|વિમુખ)|પાછો પડ|વિમુખ થ' },
  {
    id: 'manushyabhav', group: 'bhakt', subject: 'manushyabhav', gu: 'ભગવાન-સંતમાં મનુષ્યભાવ ન લાવવો', en: 'Not seeing human traits in Bhagwan and the Sant',
    re: 'મનુષ્યભાવ|દિવ્યભાવ|દિવ્ય ભાવ|મનુષ્યચરિત્ર|મનુષ્ય જેવા|મનુષ્ય જેવી|મનુષ્યરૂપ|મનુષ્ય જેવું|માયિક ભાવ|માયિકભાવ',
  },
  { id: 'sambandh', group: 'bhakt', subject: 'sambandh', gu: 'ભગવાનના સંબંધનો મહિમા', en: 'Glory of association with Bhagwan', re: 'સંબંધ', with: 'ભગવાન|મૂર્તિ|પ્રસાદી|ભક્ત|સંત', min: 2 },

  {
    id: 'shriji', group: 'bhagwan', subject: 'shriji', gu: 'શ્રીજીમહારાજ પોતાની વાત કરે છે', en: 'Shriji Maharaj speaks about Himself',
    re: 'અમારી (પ્રકૃતિ|રીત|સમજણ|ઇચ્છા)|અમારો (સ્વભાવ|મત|સિદ્ધાંત)|અમારું (અંગ|વર્તન)|અમારા અંગ|અમારે તો|અમને તો .{0,40}(ગમે|ન ગમે|ભાસે)|અમારા હૃદયમાં|અમે તો .{0,30}(વર્તીએ|રહીએ|જોઈએ છીએ)|અમારે સ્વભાવે',
  },

  // ---- ભગવાનનું સ્વરૂપ ----
  { id: 'sarvopari', group: 'bhagwan', subject: 'sarvopari', gu: 'ભગવાન સર્વોપરી, સર્વ અવતારના અવતારી', en: 'Bhagwan is supreme, the cause of all avatars', re: 'સર્વોપરી|સર્વ અવતારના|અવતારના અવતારી|અવતારના કારણ|સર્વના કારણ|સર્વેના કારણ|કારણ સર્વના|સર્વના નિયંતા|સર્વેના નિયંતા|સર્વના સ્વામી|સર્વેના સ્વામી|સર્વ અવતારનું કારણ|સર્વે અવતારનું કારણ|અક્ષરાતીત|સર્વેથી પર|સર્વથી પર|સર્વ કરતાં (અધિક|મોટા)' },
  { id: 'sarvakarta', group: 'bhagwan', subject: 'sarvakarta', gu: 'ભગવાન જ સર્વકર્તા', en: 'Bhagwan alone is the all-doer', re: 'કર્તા|કર્તાહર્તા', with: 'ભગવાન|પુરુષોત્તમ|પરમેશ્વર|શ્રીકૃષ્ણ|પરબ્રહ્મ' },
  { id: 'kaal-karm', group: 'bhagwan', subject: 'sarvakarta', gu: 'કાળ, કર્મ, માયા ભગવાનને આધીન', en: 'Time, karma and maya are subservient to Bhagwan', re: 'કાળ, કર્મ|કાળ-કર્મ|કાળ ને કર્મ|કાળ, માયા|કાળ તથા કર્મ|કાળ, કર્મ ને માયા' },
  { id: 'sakar', group: 'bhagwan', subject: 'sakar', gu: 'ભગવાન સદા સાકાર, દિવ્ય મૂર્તિ', en: 'Bhagwan always has a divine form', re: 'સાકાર|નિરાકાર|દિવ્ય આકાર|દિવ્ય મૂર્તિ|દિવ્યમૂર્તિ|દિવ્ય સાકાર' },
  { id: 'akshardham', group: 'bhagwan', gu: 'અક્ષરધામ', en: 'Akshardham', re: 'અક્ષરધામ' },
  { id: 'akshar', group: 'bhagwan', subject: 'akshar', gu: 'અક્ષરબ્રહ્મ', en: 'Aksharbrahman', re: `અક્ષરબ્રહ્મ|અક્ષર બ્રહ્મ|${W}અક્ષર(ને|નું|ના|નો|થી|પર)?${E}|અક્ષરરૂપ|બ્રહ્મપુર|ચિદાકાશ` },
  { id: 'pragat', group: 'bhagwan', subject: 'pragat', gu: 'પ્રગટ-પ્રત્યક્ષ ભગવાન', en: 'Bhagwan manifest in person', re: '(પ્રત્યક્ષ|પ્રગટ)[^ ]{0,4} .{0,25}(ભગવાન|મૂર્તિ|પુરુષોત્તમ|શ્રીકૃષ્ણ|સંત|સાધુ)' },
  { id: 'avatar', group: 'bhagwan', gu: 'ભગવાનના અવતાર', en: 'The avatars of Bhagwan', re: 'અવતાર', min: 2 },
  { id: 'charitra', group: 'bhagwan', gu: 'ભગવાનનાં ચરિત્ર-લીલા', en: 'Bhagwan’s divine actions', re: 'ચરિત્ર|લીલા' },
  { id: 'antaryami', group: 'bhagwan', gu: 'ભગવાન અંતર્યામી', en: 'Bhagwan, the inner controller', re: 'અંતર્યામી|અંતરજામી' },
  { id: 'anvay', group: 'bhagwan', gu: 'અન્વય-વ્યતિરેક સ્વરૂપ', en: 'Bhagwan’s immanent and transcendent forms', re: 'અન્વય|વ્યતિરેક' },
  { id: 'maya', group: 'bhagwan', gu: 'માયા અને માયાને તરવું', en: 'Maya and transcending it', re: `${W}માયા|માયિક`, min: 2 },

  // ---- સાધન અને ભક્તિ ----
  { id: 'nishchay', group: 'sadhan', subject: 'nishchay', gu: 'ભગવાનનો દૃઢ નિશ્ચય', en: 'Firm conviction in Bhagwan', re: 'નિશ્ચય', min: 2 },
  { id: 'agna', group: 'sadhan', subject: 'agna', gu: 'આજ્ઞા પાળવી', en: 'Obeying commands', re: 'આજ્ઞા|વચન પ્રમાણે|વચનમાં', min: 2 },
  { id: 'niyam', group: 'sadhan', subject: 'niyam', gu: 'નિયમ-ધર્મ, સ્વધર્મ', en: 'Observances and dharma', re: 'સ્વધર્મ|નિયમ|વર્તમાન|પંચવર્તમાન|ધર્મમર્યાદા|ધર્મ-મર્યાદા', min: 2 },
  { id: 'dhyan', group: 'sadhan', gu: 'ભગવાનની મૂર્તિનું ધ્યાન', en: 'Meditating on Bhagwan’s murti', re: 'ધ્યાન|મૂર્તિ સંભાર|મૂર્તિને સંભાર|મૂર્તિ ધાર', min: 2 },
  { id: 'bhakti', group: 'sadhan', subject: 'bhakti', gu: 'ભક્તિ (નવધા, માહાત્મ્ય સહિત)', en: 'Devotion', re: 'ભક્તિ', min: 3 },
  { id: 'mahatmya', group: 'sadhan', subject: 'mahima', gu: 'ભગવાનનું માહાત્મ્ય-મહિમા', en: 'The glory of Bhagwan', re: 'માહાત્મ્ય|મહિમા', min: 2 },
  { id: 'priti', group: 'sadhan', subject: 'priti', gu: 'ભગવાનમાં પ્રીતિ-હેત', en: 'Love for Bhagwan', re: 'પ્રીતિ|હેત|સ્નેહ', with: 'ભગવાન|મૂર્તિ|શ્રીકૃષ્ણ|પરમેશ્વર|ભક્ત|સંત|સાધુ', min: 3 },
  { id: 'katha', group: 'sadhan', subject: 'katha', gu: 'કથા-કીર્તન, વાર્તા', en: 'Discourses and devotional singing', re: 'કથા|કીર્તન|વાર્તા', min: 3 },
  { id: 'shraddha', group: 'sadhan', gu: 'શ્રદ્ધા', en: 'Faith', re: 'શ્રદ્ધા' },
  { id: 'vishwas', group: 'sadhan', gu: 'વિશ્વાસ', en: 'Trust', re: 'વિશ્વાસ' },
  { id: 'aashro', group: 'sadhan', subject: 'nishchay', gu: 'ભગવાનનો આશરો-શરણ', en: 'Refuge in Bhagwan', re: 'આશરો|આશરે|આશરાને|આશરાનો|શરણ|શરણાગત' },
  { id: 'upasana', group: 'sadhan', gu: 'ઉપાસના', en: 'Upasana (worship with right understanding)', re: 'ઉપાસના' },
  { id: 'ekantik', group: 'sadhan', gu: 'એકાંતિક ધર્મ-એકાંતિક ભક્તિ', en: 'Ekantik dharma', re: 'એકાંતિક' },
  { id: 'deshkal', group: 'sadhan', subject: 'deshkal', gu: 'દેશ, કાળ, સંગ, ક્રિયાનો પ્રભાવ', en: 'Influence of place, time, company and actions', re: 'દેશ, કાળ|દેશકાળ|દેશ-કાળ|સંગ, ક્રિયા|દેશ ને કાળ' },
  { id: 'sanskar', group: 'sadhan', subject: 'deshkal', gu: 'પૂર્વ સંસ્કાર', en: 'Past impressions', re: 'સંસ્કાર|પૂર્વજન્મ|પૂર્વ જન્મ' },
  { id: 'bhajan', group: 'sadhan', gu: 'ભગવાનનું ભજન-સ્મરણ', en: 'Worship and remembrance of Bhagwan', re: 'ભજન|સ્મરણ|સંભારે|સંભારવા', min: 2 },
  { id: 'tap', group: 'sadhan', gu: 'તપ', en: 'Austerity', re: `${W}(તપ|તપે|તપને|તપનો|તપની|તપનું|તપમાં|તપસ્યા|તપશ્ચર્યા|તપસ્વી|તપ કરીને)${E}` },
  { id: 'prarabdh', group: 'sadhan', gu: 'પ્રારબ્ધ', en: 'Destiny', re: 'પ્રારબ્ધ' },
  { id: 'sukh', group: 'sadhan', subject: 'sukh', gu: 'ભગવાનના સુખ આગળ જગતનું સુખ તુચ્છ', en: 'The bliss of Bhagwan', re: '(ભગવાન|મૂર્તિ|પરમેશ્વર|ધામ)[^ ]{0,6} .{0,15}સુખ', min: 2 },

  // ---- જ્ઞાન અને વૈરાગ્ય ----
  { id: 'atma', group: 'gnan', subject: 'atmanishtha', gu: 'પોતાને દેહથી નોખો આત્મા માનવો', en: 'Believing oneself to be the atma, distinct from the body', re: 'દેહથી નોખો|દેહથી જુદો|દેહથી પૃથક્|દેહથી નિરાળો|આત્મનિષ્ઠા|આત્મારૂપ|આત્મસત્તા|પોતાને આત્મા|પોતાના આત્મા|દેહ-ઇન્દ્રિયોથી' },
  { id: 'brahmrup', group: 'gnan', subject: 'akshar', gu: 'બ્રહ્મરૂપ થઈને ભગવાનની ભક્તિ', en: 'Becoming brahmarup and offering devotion', re: 'બ્રહ્મરૂપ|અક્ષરરૂપ|બ્રહ્મસ્વરૂપ' },
  { id: 'vairagya', group: 'gnan', subject: 'vairagya', gu: 'વૈરાગ્ય', en: 'Detachment', re: 'વૈરાગ્ય|વૈરાગી', min: 2 },
  { id: 'nashvant', group: 'gnan', subject: 'vairagya', gu: 'જગત નાશવંત', en: 'The world is perishable', re: 'નાશવંત|નાશવાન|મિથ્યા|તુચ્છ|અસાર|નાશ પામ', with: 'જગત|પદાર્થ|વિષય|સુખ|નામરૂપ|માયિક|દેહ|સંસાર|લોક|બ્રહ્માંડ|સ્ત્રી|ધન' },
  { id: 'mrutyu', group: 'gnan', subject: 'vairagya', gu: 'મૃત્યુ અને દેહ મૂક્યા પછીની ગતિ', en: 'Death and what follows it', re: 'મરણ|મૃત્યુ|મરવું|દેહ પડી|દેહ મૂકી|દેહ પડે|દેહ મૂકે|દેહ છૂટ|દેહ મૂકીને|કાળ ખા|જમપુરી|યમપુરી|જમના' },
  { id: 'manushyadeh', group: 'gnan', gu: 'દુર્લભ મનુષ્યદેહ', en: 'The rare human birth', re: 'મનુષ્યદેહ|મનુષ્ય દેહ|મનુષ્યનો દેહ|મનુષ્યનું શરીર|દુર્લભ' },
  { id: 'vivek', group: 'gnan', gu: 'વિવેક', en: 'Discretion', re: 'વિવેક' },
  { id: 'antardrishti', group: 'gnan', subject: 'antardrishti', gu: 'અંતર્દૃષ્ટિ (પોતાનું અંતર તપાસવું)', en: 'Introspection', re: 'અંતર્દૃષ્ટિ|અંતરદૃષ્ટિ|અંતરવૃત્તિ|અંતર સામું|અંતર સામુ|અંતર તપાસ|પોતાના અંતરમાં|પોતાના હૈયામાં' },
  { id: 'shastra', group: 'gnan', gu: 'શાસ્ત્રનું રહસ્ય', en: 'The essence of the shastras', re: 'શાસ્ત્ર|વેદ|પુરાણ|ગીતા|ભાગવત', min: 3 },
  { id: 'sankhya-yog', group: 'gnan', gu: 'સાંખ્ય, યોગ અને જ્ઞાન', en: 'Sankhya, yoga and knowledge', re: 'સાંખ્ય|અષ્ટાંગ|યોગી|યોગકળા|જ્ઞાની|આત્મજ્ઞાન|બ્રહ્મજ્ઞાન', min: 2 },
  { id: 'kalyan', group: 'gnan', gu: 'જીવનું કલ્યાણ-મોક્ષ', en: 'Liberation of the jiva', re: 'કલ્યાણ|મોક્ષ|મુક્તિ', min: 3 },
];
