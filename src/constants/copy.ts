/**
 * All user-facing and SEO-facing wording for this site.
 *
 * The KEY STRUCTURE is identical across every site in the network — same
 * groups, same keys, same order — so the apps stay interchangeable and a
 * component written for one works on all of them.
 *
 * The WORDS are deliberately unique to this site. That is not decoration: the
 * ten brands are separate domains serving the same catalogue, and if they
 * shipped the same titles, descriptions and headings, Google would treat them
 * as duplicate content and suppress all but one. Every string that reaches a
 * <title>, a meta description, an <h1>/<h2> or a JSON-LD field must therefore
 * read differently here than on the sibling sites.
 *
 * sevenstarslots' angle: the checklist. A casino is put through seven named
 * checks — licence, deposit, slot library, RTP, mobile, support, payout — and
 * what it does under them decides whether it is listed at all. Taken from the
 * brief in sites/sevenstarslots.html.
 *
 * ── The line this file does not cross ───────────────────────────────────────
 * The mockup renders SEVEN stars per casino and a "7/7" score. There is no
 * seven-point column behind that: `casinos.rating` is a tinyint 0–5, and the
 * live data only uses 4 and 5. Inventing a seventh and sixth point — or
 * rescaling 5 into 7 — would fabricate precision the editorial process never
 * produced, on the single number a reader uses to choose.
 *
 * So "seven" here ALWAYS refers to the CHECKS, never to a star count. The
 * checks are the method and they are real; the rating shown on a card is the
 * editorial score out of five, and it is labelled as such. If you want a true
 * seven-point score, it needs a column of its own and an editor to fill it —
 * say so and it can be added properly.
 */
export const COPY = {
  // SEO identity. These three reach the <title>, the meta description and the
  // keywords tag on EVERY page that does not set its own — which is most of
  // them — so they are the strings most likely to be read as duplicate content
  // if a sibling domain ships the same words.
  site: {
    titleTail: 'Slot Casinos, Seven Checks Deep',
    description:
      'puts every slot casino through the same seven checks — licence, deposit, library, RTP, mobile, support and payout — and lists only the ones that come through them.',
    keywords: [
      'slot casino checks',
      'slot casino payout test',
      'rtp checked slot casinos',
      'slot casino bonus wagering',
      'mobile slot casinos reviewed',
    ],
  },
  nav: {
    casinos: 'Casinos',
    specialOffers: 'Bonuses',
    categories: 'Categories',
    // First row inside the header and footer dropdowns: the parent's own page.
    allCasinos: 'All Casinos',
    allOffers: 'All Offers',
  },
  home: {
    /**
     * The VISIBLE heading over the bonus-type row.
     *
     * The row used to carry no heading at all — the chips were taken to
     * speak for themselves. They do not: arriving mid-page at a band of
     * unlabelled buttons between the hero and the casino list, there is
     * nothing saying what the set IS, and nothing a screen reader can
     * announce for the landmark beyond a generic label nobody wrote for
     * this page.
     *
     * Worded differently on every domain, like every other <h2> here:
     * eleven sites serve one catalogue, and a shared heading is
     * duplicate content.
     */
    bonusTypesTitle: 'Bonus Types On The Board',
    heroEyebrow: 'Seven checks · one verdict',
    // Split in two so the JSX keeps its emphasised highlight while the words
    // change. "Seven checks" is the brand's phrase — not "seven stars", which
    // would promise a score this site does not hold. See the note above.
    heroHeadline: 'Slot casinos put through',
    heroHighlight: 'seven checks',
    heroSubtitle:
      'Licence, deposit, slot library, published RTP, mobile, live support and payout — the same seven, in the same order, for every casino on this list. What a casino does under them is what puts it here.',
    topCasinosTitle: 'Top Slot Casinos',
    topCasinosSubtitle: 'Ordered by how they came through the checks. Narrow them down by category.',
    featuredCasinos: 'Browse rankings',
    specialOffers: 'See bonus offers',
    viewAll: 'View all',
    // Leads the home <title>; the year and brand are appended in page.tsx.
    homeTitle: 'Slot Casinos Rated On Seven Checks',
    faqTitle: 'About The Seven Checks',
    metaDescription:
      'Slot casinos put through seven named checks — licence, deposit, library, RTP, mobile, support and payout — with the bonus terms stated in full.',
    // ── The "How a casino earns its place" band ───────────────────────────
    // Numbered because these ARE a sequence: each stage runs on what the one
    // before it produced. Numbering a set that is not ordered is decoration;
    // numbering this one is information.
    methodTitle: 'How a casino earns its place',
    methodSubtitle: 'The seven checks, grouped into the three stages they happen in.',
    methodSteps: [
      {
        kicker: '01 — Checks 1–2',
        title: 'Licence & deposit',
        body:
          'Who holds the licence and where, then what the welcome offer actually asks of a new player: minimum deposit, wagering multiplier and what it applies to.',
      },
      {
        kicker: '02 — Checks 3–5',
        title: 'Slots, RTP & mobile',
        body:
          'The slot library and who supplies it, the RTPs the operator publishes, and whether the same games and the same terms survive on a phone.',
      },
      {
        kicker: '03 — Checks 6–7',
        title: 'Support & payout',
        body:
          'Whether live support answers at peak hours, and what the withdrawal conditions are — caps, verification and the methods actually offered.',
      },
    ],
  },
  casinos: {
    pageTitle: 'Every Slot Casino On The List',
    pageDescription:
      'The full list, with what each operator is offering and where it places in its category after the seven checks.',
    offersHeading: 'Bonuses At This Casino',
    // Tail of the summary-panel H2: `{casino.name} at a glance`.
    glanceHeadingTail: 'at a glance',
    reviewTitleTail: 'Seven-Check Review',
    reviewSignature: 'Put through the seven checks, with its bonus terms stated in full.',
    reviewSummary: 'put through the same seven checks as every other casino on this list.',
    visitCasino: 'Play Now',
    readReview: 'Read Review',
    // Labels the glance row. "Star rating" and NOT "seven-star rating": the
    // value beside it is the editorial score out of five.
    rating: 'Star rating',
    noResults: 'No casinos match this filter yet. Try another category.',
  },
  /**
   * The page behind one bonus type (/bonuses/[slug]).
   *
   * `metaSuffix` is appended to the type's name when the admin wrote no
   * description, so the meta line is still specific to the page rather than
   * boilerplate shared by eight of them.
   */
  bonusCategory: {
    metaSuffix: 'every bonus of this kind on the board, with the terms that come attached.',
    countOne: 'bonus',
    countMany: 'bonuses',
  },

  specialOffers: {
    pageTitle: 'Slot Bonuses & Free Spins',
    pageDescription:
      'Every bonus currently listed here, with the wagering requirement, the minimum deposit and the withdrawal cap stated wherever the operator states them.',
    offerMetaSuffix: 'Terms read from the operator’s own page before it went on the list.',
    claim: 'Claim Bonus',
    noResults: 'No bonuses are listed right now.',
  },
  categories: {
    pageTitle: 'Slot Casino Categories',
    pageDescription: 'The same seven checks behind every list — pick the category you came for.',
    categoryMetaSuffix: 'ordered by how they came through the seven checks.',
    noResults: 'Nothing listed here yet.',
  },
  newsletter: {
    title: 'New star ratings, every Friday.',
    subtitle: 'Fresh slot casinos, free-spin drops, and who gained or lost ground this week.',
    placeholder: 'Email address',
    button: 'Subscribe',
    checking: 'Checking…',
    // The spam line is NOT optional wording. This is a double opt-in list: an
    // unconfirmed subscriber never receives anything again, and the verify mail
    // is the single most likely message to be filtered — new sender, one link,
    // no history. Telling people where to look is the difference between a
    // signup and a dead row.
    success:
      'Nearly there — check your inbox and confirm your address to finish. '
      + 'If nothing arrives, it may be sitting in spam or junk.',
    // Shown when the API reports email_sent=false — the site is still
    // collecting addresses but its sending is switched off in the admin.
    successNoEmail:
      'You’re on the list. We are not sending confirmation emails from this site at the moment.',
    error: 'That did not send. Please try again.',
  },
  footer: {
    tagline:
      'Independent slot casino ratings, seven checks deep. We may earn a commission from links on this site; it never changes a placement.',
    // Registered postal address, shown beside the copyright line. A physical
    // address in the footer is what mailbox providers and the gambling
    // affiliate compliance checks both look for, and it must match the address
    // used in the email templates.
    postalAddress: '27 Ashgrove Road, Leeds, LS6 3AB, United Kingdom',
    disclaimer:
      'Gambling is for adults aged 18 or over and carries real financial risk. Set deposit limits, never chase losses, and only stake what you can afford to lose.',
  },
  errors: {
    notFound: 'That page is not on the board.',
    apiError: 'Could not load this content. Please try again in a moment.',
  },
  reviews: {
    heading: 'Player Verdicts',
    empty: 'No verdicts yet — be the first to say how this one played.',
    formTitle: 'Add Your Verdict',
    formIntro: 'Your verdict appears on this page as soon as you post it.',
    nameLabel: 'Your name',
    emailLabel: 'Email (optional, never published)',
    ratingLabel: 'Rating',
    titleLabel: 'Headline (optional)',
    bodyLabel: 'Your verdict',
    bodyPlaceholder: 'How did it actually go — spins, wagering, withdrawal, support?',
    submit: 'Post Verdict',
    success: 'Thanks — your verdict is now live. Scroll up to see it.',
    successPending: 'Thanks — your verdict has been submitted and will appear once approved.',
    error: 'That did not send. Please check the form and try again.',
    ratingSummary: (avg: number, total: number) =>
      `${avg.toFixed(1)} out of 5 from ${total} ${total === 1 ? 'verdict' : 'verdicts'}`,
  },
  // Labels on the phone-only hide / show toggle above each chip list.
  collapse: {
    casinoCategories: 'Casino categories',
    bonusTypes: 'Bonus types',
  },
} as const
