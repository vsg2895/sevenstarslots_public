/**
 * Frequently asked questions for this site.
 *
 * Rendered VISIBLY on the home page and emitted as FAQPage structured data from
 * this same array. Google requires the two to match; markup-only FAQ is a
 * guidelines violation, which is why the page maps over this constant rather
 * than duplicating the text.
 *
 * The wording is unique to this site: these answers are indexable page content,
 * and they are exactly the kind of text an answer engine quotes. Here they
 * explain the seven checks, because that is what this brand is.
 *
 * Nothing below claims a figure this site cannot show — including the one the
 * name invites. The checks are named and real; the score on a card is the
 * editorial rating out of five, and the answer about it says so rather than
 * implying a seven-point scale that no column holds.
 */
export const FAQ_ITEMS = [
  {
    question: 'What are the seven checks?',
    answer:
      'Licence, deposit terms, slot library, published RTP, mobile, live support and payout conditions. Every casino on this list goes through the same seven, in the same order, and what it does under them is what decides whether it is listed and where it places.',
  },
  {
    question: 'Does a seven-point check mean a seven-star score?',
    answer:
      'No, and it is worth being precise: the seven refers to the checks, not to a star count. The rating shown beside a casino is an editorial score out of five. The checks decide whether an operator belongs on the list at all; the score is how strongly we rate what we found.',
  },
  {
    question: 'Where do the bonus figures come from?',
    answer:
      "From the operator's own terms page, not from the promotional banner. The two disagree more often than you would expect, and when they do, the terms page is what a player is actually held to. The wagering multiplier, minimum deposit and withdrawal cap are reproduced on the offer's page wherever the operator states them.",
  },
  {
    question: 'Why do you check RTP?',
    answer:
      'Because the same slot can ship at several different return-to-player settings, and the operator chooses which one it runs. A casino that publishes the RTPs it uses is telling you something a casino that hides them is not.',
  },
  {
    question: 'Does a casino pay to rank higher?',
    answer:
      'No. We earn a commission when somebody signs up through a link here, and that arrangement has no bearing on the order of the list. An operator that stops coming through the checks drops regardless of what it pays.',
  },
  {
    question: 'Why is the list short?',
    answer:
      'Because it only holds operators that have actually been through the checks. A directory of every slot casino in existence tells you nothing, and padding this one out with unchecked entries would be the fastest way to make the rest of it worthless.',
  },
] as const
