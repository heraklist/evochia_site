# Evochia Copy Review Report

Ημερομηνία: 2026-03-07

## Σκοπός

Αυτό το report συγκεντρώνει τις παρατηρήσεις και τις προτάσεις για τα παρακάτω αρχεία:

- `docs/files/evochia-copy-homepage.md`
- `docs/files/evochia-copy-about.md`
- `docs/files/evochia-copy-catering.md`
- `docs/files/evochia-copy-private-chef.md`
- `docs/files (1)/evochia-copy-homepage-gr.md`
- `docs/files (1)/evochia-copy-about-gr.md`
- `docs/files (1)/evochia-copy-catering-gr.md`
- `docs/files (1)/evochia-copy-private-chef-gr.md`

Το report καλύπτει:

- ποιότητα positioning
- tone of voice
- καθαρότητα μηνύματος
- εμπορική αποτελεσματικότητα
- γλωσσική ποιότητα
- localization quality
- σημεία που θέλουν rewrite πριν από live χρήση

## Executive Summary

- Το English set είναι ισχυρό και μπορεί να λειτουργήσει ως master copy με στοχευμένες διορθώσεις.
- Το Greek set είναι καλή βάση, αλλά δεν βρίσκεται ακόμη στο ίδιο editorial επίπεδο με το English. Θέλει πραγματική επιμέλεια και localization pass, όχι μόνο proofreading.
- Όταν υπάρχει απόκλιση ανάμεσα στο `docx` brief και στα `.md`, το `docx` πρέπει να θεωρηθεί το master strategic source.
- Πριν από δημοσίευση, χρειάζεται ένα τελικό pass για:
- αφαίρεση internal SEO notes από το live content
- επιβεβαίωση factual claims όπως `12+ years`, `Most bookings are confirmed within 48 hours`, γεωγραφική διαθεσιμότητα
- προσαρμογή του κειμένου στο πραγματικό layout κάθε σελίδας

## Κύρια Συμπεράσματα

### Τι λειτουργεί πολύ καλά

- Το brand direction είναι σαφές: premium, chef-led, bespoke, όχι corporate catering.
- Το homepage και το private chef copy έχουν ισχυρή εμπορική πρόθεση.
- Το about copy είναι το πιο ώριμο editorial κομμάτι του πακέτου.
- Το catering copy διορθώνει ένα βασικό πρόβλημα του τωρινού site: δίνει operational trust και όχι μόνο ωραίες λέξεις.

### Τα βασικά ρίσκα

- Σε μερικά English σημεία, το ύφος ακουμπάει το luxury boilerplate ή γίνεται λίγο πιο casual απ' όσο σηκώνει το brand.
- Σε αρκετά Greek σημεία, ο λόγος ακούγεται μεταφρασμένος, όχι native branded copy.
- Υπάρχει ασυνέπεια στη χρήση αγγλικών όρων μέσα στα ελληνικά κείμενα.
- Ορισμένες εκφράσεις στα Greek αρχεία είναι κυριολεκτικές μεταφράσεις που ρίχνουν το επίπεδο του brand.

## Global Recommendations

### Για το English set

- Χρησιμοποίησε το English set ως implementation baseline.
- Κράτησε το luxury tone, αλλά κόψε όπου το copy γίνεται αμυντικό, υπερβολικά λογοτεχνικό ή πολύ colloquial.
- Μην αφήσεις internal notes, keywords ή SEO instructions μέσα στο live content.
- Όπου γίνεται claim σχετικό με υπηρεσία ή SLA, επιβεβαίωσέ το operationally πριν κλειδώσει.

### Για το Greek set

- Μην το αντιμετωπίσεις ως "μετάφραση προς διόρθωση". Αντιμετώπισέ το ως Greek adaptation που πρέπει να ξαναδουλευτεί με βάση το English master.
- Μείωσε το code-switching. Κράτησε μόνο τους όρους που έχουν πραγματική εμπορική ή SEO αξία, όπως `private chef`, `Nikkei`, `mise en place`.
- Στο Greek brand copy προτίμησε sentence case και φυσικότερο ρυθμό, όχι αγγλοποιημένο title case παντού.
- Αντικατάστησε κυριολεκτικές αποδόσεις όπως `εκκαθάριση`, `κτυπά σωστά`, `Όλα Αντιμετωπισμένα`, `service on location`.

## English Markdown Review

## `docs/files/evochia-copy-homepage.md`

### Τι κρατάω

- Το hero headline `Crafting Extraordinary Culinary Moments`.
- Το subheadline `Where every detail is deliberate — and every plate, unforgettable.`
- Το service split `Event Catering` / `Private Chef`.
- Το section `One Kitchen. Eight Worlds.`
- Το founder quote.
- Το locations framing `Your Space. Our Stage.`

### Τι με προβληματίζει

- Το about paragraph είναι καλό, αλλά χάνει τον founder angle και την εμπειρία `12+ years`.
- Το `We don't do generic. We don't do average.` είναι punchy, αλλά χρειάζεται ένα πιο concrete sentence δίπλα του για να μη μοιάζει slogan for slogan's sake.
- Το homepage είναι αρκετά δυνατό σε mood, αλλά όχι όσο θα μπορούσε σε proof.

### Τι θα άλλαζα

- Στο about body θα έφερνα πίσω τον founder:
- `Evochia was founded by Executive Chef Heraklis, with 12 years of luxury hospitality across Greece’s finest venues, distilled into a single uncompromising service.`
- Θα κρατούσα το `The standard doesn't.`
- Θα άφηνα το CTA όπως είναι, γιατί είναι σαφές και usable.

### Συνολική αξιολόγηση

- Ισχυρό αρχείο.
- Κοντά σε publishable.
- Θέλει μόνο μικρό strengthening στο credibility layer.

## `docs/files/evochia-copy-about.md`

### Τι κρατάω

- Τη συνολική δομή της σελίδας.
- Το headline `Empowered by Craft, Driven by Taste`.
- Το `The Name. The Idea. The Table.`
- Το paragraph `Because the food, when it's done properly, isn't the end of the experience. It's the architecture of it.`
- Ολόκληρο το `What You Can Count On`.

### Τι με προβληματίζει

- Το `Premium Catering House in Greece` λειτουργεί, αλλά δεν είναι η πιο natural native-English φράση.
- Το philosophy section είναι πολύ καλό, αλλά σε δύο σημεία πλησιάζει λίγο περισσότερο τη λογοτεχνία απ' όσο χρειάζεται το web.

### Τι θα άλλαζα

- Θα δοκίμαζα έναν ελαφρώς ισχυρότερο SEO title:
- `About Evochia — Executive Chef & Premium Catering House in Greece`
- Θα έσφιγγα λίγο τη δεύτερη παράγραφο του philosophy section.
- Θα κρατούσα το `What You Can Count On` σχεδόν αυτούσιο.

### Συνολική αξιολόγηση

- Το καλύτερο English αρχείο του συνόλου.
- Πολύ καλή ισορροπία ανάμεσα σε brand depth και premium clarity.

## `docs/files/evochia-copy-catering.md`

### Τι κρατάω

- Τη γενική δομή.
- Τους τέσσερις βασικούς τύπους εκδηλώσεων.
- Το `What's Included`.
- Το `From First Message to Final Course`.

### Τι με προβληματίζει

- Το `Full-Service Catering That Actually Delivers` ακούγεται ελαφρώς αμυντικό.
- Το `first tasting call` ίσως δεν είναι operationally true για όλους τους τύπους εκδηλώσεων.
- Το `Children's Parties` ανοίγει το scope της σελίδας και ρίχνει λίγο το premium focus, αν δεν είναι core υπηρεσία.
- Το CTA `Planning an Event?` είναι functional αλλά όχι premium enough.

### Τι θα άλλαζα

- `Full-Service Catering That Delivers`
- `From the first consultation to the final clean-up`
- Αν τα παιδικά πάρτι δεν είναι βασικός revenue driver, να φύγουν από τον βασικό κορμό της σελίδας ή να μπουν χαμηλότερα.
- Το CTA να γίνει:
- `Planning an Event in Greece?`
- ή
- `Tell Us About Your Event`

### Συνολική αξιολόγηση

- Πολύ χρήσιμο αρχείο.
- Είναι σαφώς καλύτερο από generic catering copy.
- Θέλει tightening σε headline hierarchy και service focus.

## `docs/files/evochia-copy-private-chef.md`

### Τι κρατάω

- Το hero `Your Private Chef in Greece`.
- Το `How the Private Chef Experience Works`.
- Το specs table.
- Τη βασική λογική των cuisine sections.
- Το themed experiences section.

### Τι με προβληματίζει

- Το SEO note περιέχει typo ή stray Greek fragment: `"oριοθετεί"`.
- Το `Not Tex-Mex. Real Mexican` είναι δυνατό, αλλά ακουμπά λίγο σε confrontational tone.
- Το `wok-fried rice that hits properly` είναι υπερβολικά casual για premium hospitality brand.
- Το `Most bookings are confirmed within 48 hours` πρέπει να είναι απολύτως αληθινό.

### Τι θα άλλαζα

- Να καθαριστεί το SEO note πριν από implementation.
- `Authentic Mexican cooking` αντί για `Real Mexican`, αν θέλεις πιο elegant tone.
- `wok-fried rice with proper depth and heat` αντί για `hits properly`.
- Το destination line να μείνει μόνο αν αντανακλά πραγματική availability.

### Συνολική αξιολόγηση

- Εμπορικά ισχυρό.
- Σχεδόν έτοιμο.
- Θέλει μικρό tone control σε 2-3 σημεία.

## Greek Markdown Review

## `docs/files (1)/evochia-copy-homepage-gr.md`

### Τι κρατάω

- Τη βασική δομή.
- Το hero direction.
- Το about concept.
- Το service split.
- Το founder quote.

### Τι με προβληματίζει

- Το overall tone είναι καλό, αλλά ακούγεται μεταφρασμένο σε αρκετά σημεία.
- Το `Με Κινητήρια Δύναμη την Τέχνη, με Οδηγό τη Γεύση` είναι σωστό νοηματικά, αλλά ελαφρώς βαρύ και αγγλοποιημένο.
- Το `Πάντα Bespoke` δεν στέκεται κομψά.
- Το `Exclusive Venues` έχει μείνει αμετάφραστο.
- Το `ingredient-led` έχει μείνει αμετάφραστο στο body του `Asian Fusion`.

### Τι θα άλλαζα

- `Με κινητήρια δύναμη την τέχνη, με οδηγό τη γεύση`
- ή
- `Με οδηγό τη γεύση και κινητήρια δύναμη την τέχνη`
- `Πάντα εξατομικευμένο` αντί για `Πάντα Bespoke`
- `Αποκλειστικοί χώροι` αντί για `Exclusive Venues`
- `με οδηγό το υλικό` αντί για `ingredient-led`

### Συνολική αξιολόγηση

- Καλό foundation.
- Χρειάζεται stylistic polish για να ακούγεται native Greek premium brand copy.

## `docs/files (1)/evochia-copy-about-gr.md`

### Τι κρατάω

- Το narrative γύρω από την `Ευωχία`.
- Το philosophy section.
- Τη λογική των 4 pillars.
- Το CTA.

### Τι με προβληματίζει

- Το `premium catering house` εμφανίζεται αυτούσιο σε τίτλο, meta description και hero.
- Η φράση `την είδους που συνήθως ανήκει` είναι γραμματικά λανθασμένη.
- Το Greek διατηρεί πολλά αγγλικά σημεία χωρίς να τα αφομοιώνει πλήρως.
- Υπάρχει γενικά σωστό ύφος, αλλά όχι ακόμη η φυσικότητα ενός κειμένου γραμμένου εξαρχής στα ελληνικά.

### Τι θα άλλαζα

- `premium οίκος catering` αν το SEO χρειάζεται τη λέξη `catering`
- ή
- `premium οίκος γαστρονομικής φιλοξενίας` αν θέλεις καθαρότερο ελληνικό ύφος
- `του είδους εμπειρίας που συνήθως συναντά κανείς στα καλύτερα εστιατόρια`
- `service` μπορεί να μείνει, αλλά ιδανικά με πιο σταθερή χρήση σε όλο το corpus

### Συνολική αξιολόγηση

- Η καλύτερη ελληνική απόδοση από τις τέσσερις.
- Θέλει γλωσσική επιμέλεια, όχι εννοιολογική ανακατασκευή.

## `docs/files (1)/evochia-copy-catering-gr.md`

### Τι κρατάω

- Τη δομή της σελίδας.
- Το operational framing.
- Το section `Πώς Συνεργαζόμαστε`.

### Τι με προβληματίζει

- Το `Catering Πλήρους Υπηρεσίας που Αποδίδει Πραγματικά` είναι κυριολεκτική απόδοση και ακούγεται λίγο άκαμπτο.
- Το `τελευταία εκκαθάριση` είναι λάθος register για hospitality copy.
- Το `Όλα Αντιμετωπισμένα` δεν στέκεται ελληνικά.
- Το `service on location` είναι μισομεταφρασμένο.
- Το `Εκκαθάριση μετά την εκδήλωση` επίσης δεν δουλεύει.
- Το συνολικό αρχείο έχει περισσότερα translation marks από τα υπόλοιπα.

### Τι θα άλλαζα

- `Catering πλήρους υπηρεσίας που ανταποκρίνεται`
- ή καλύτερα
- `Πλήρες catering με άψογη εκτέλεση`
- `Από την πρώτη συνομιλία έως το τελικό καθάρισμα`
- `Όλα καλυμμένα` ή `Τα αναλαμβάνουμε όλα`
- `Πλήρης παραγωγή: προετοιμασία, μαγείρεμα, plating και service στον χώρο σας`
- `Καθαρισμός μετά την εκδήλωση`
- Στο βήμα 4:
- αντί για `Μπορείτε να αποσυρθείτε`
- προτίμησε `Εσείς χαλαρώνετε και εστιάζετε στους καλεσμένους σας`

### Συνολική αξιολόγηση

- Χρήσιμο ως βάση δομής.
- Θέλει το μεγαλύτερο localization rewrite από όλα τα Greek αρχεία.

## `docs/files (1)/evochia-copy-private-chef-gr.md`

### Τι κρατάω

- Το hero.
- Το section `Πώς Λειτουργεί η Εμπειρία Private Chef`.
- Το overall architecture.
- Το CTA.

### Τι με προβληματίζει

- Το `3–8 Πορείες` δεν είναι φυσικό για web copy σε αυτή τη χρήση.
- Το `σεβρίτσι λαβράκι` είναι σαφές λάθος.
- Το `Αληθινό Μεξικό` είναι λίγο απότομο ως phrasing.
- Το `ingredient-led` έχει μείνει αμετάφραστο.
- Το `wok-fried ρύζι που κτυπά σωστά` είναι από τα πιο αδύναμα σημεία όλου του Greek set.
- Το `fine dining service μας` θέλει καλύτερη ενσωμάτωση.
- Το `Διαθέσιμοι σε Αθήνα...` δεν ταιριάζει συντακτικά με το υποκείμενο.

### Τι θα άλλαζα

- `3–8 πιάτα` ή `3–8 στάδια δείπνου`
- `λαβράκι με χόρτα` ή `λαβράκι σωτέ με χόρτα` αντί για `σεβρίτσι λαβράκι`
- `Αυθεντικό μεξικάνικο φαγητό` αντί για `Αληθινό Μεξικό`
- `με οδηγό το υλικό` αντί για `ingredient-led`
- `τηγανητό ρύζι στο wok με σωστή ένταση και βάθος` αντί για `κτυπά σωστά`
- `τις υπηρεσίες fine dining μας` αντί για `fine dining service μας`
- `Διαθέσιμο στην Αθήνα, στη Μύκονο...`

### Συνολική αξιολόγηση

- Δυνατό ως concept.
- Θέλει κανονική επιμέλεια σε wording και register πριν από live χρήση.

## Προτεινόμενη Προτεραιοποίηση

### Must Fix πριν από live

- Καθάρισμα όλων των internal SEO notes από το τελικό published content.
- Διόρθωση του typo/fragment στο English private chef note.
- Rewrite των πιο αδύναμων Greek phrases:
- `Όλα Αντιμετωπισμένα`
- `τελευταία εκκαθάριση`
- `Εκκαθάριση μετά την εκδήλωση`
- `σεβρίτσι λαβράκι`
- `κτυπά σωστά`
- `Πάντα Bespoke`
- Ενοποίηση terminology στα Greek αρχεία.

### Should Fix

- Επανεισαγωγή founder credibility στο English homepage about block.
- Ήπιο tightening στο English about philosophy.
- Επανεξέταση του `Children's Parties` ως core section στο English και Greek catering.
- Επιβεβαίωση claims γύρω από χρόνους απόκρισης, booking confirmation και destinations.

### Nice to Have

- Εξομάλυνση τίτλων στο Greek σε πιο φυσικό sentence case.
- Μικρή ενοποίηση του vocabulary ανάμεσα σε homepage, about, catering, private chef.
- Τελικό proofreading pass με γνώμονα όχι μόνο τη γραμματική αλλά και τον ρυθμό ανάγνωσης.

## Προτεινόμενη Στρατηγική Υλοποίησης

### Recommended Workflow

1. Κλείδωσε το English set ως master copy.
2. Εφάρμοσε στο English set μόνο τις στοχευμένες διορθώσεις που αναφέρονται εδώ.
3. Ξαναγράψε το Greek set πάνω στο τελικό English, όχι πάνω στα σημερινά Greek κείμενα.
4. Κάνε ξεχωριστό final pass για SEO, factual claims και on-page scanning.
5. Μόνο τότε ξεκίνα implementation μέσα στα HTML αρχεία.

## Τελική Ετυμηγορία

- Το English set είναι καλό και αρκετά ώριμο για production use μετά από μικρό refinement.
- Το Greek set είναι αξιοπρεπές ως draft, αλλά δεν είναι ακόμη ισότιμο με το English.
- Αν ο στόχος είναι premium bilingual site, η κρίσιμη δουλειά πλέον δεν είναι να γραφτεί νέο English copy. Είναι να γίνει σωστό Greek adaptation σε premium register.

## Προτεινόμενες Συγκεκριμένες Αλλαγές στα Κείμενα

Αυτή η ενότητα λειτουργεί ως prescriptive συνέχεια του review. Περιλαμβάνει έτοιμες ή σχεδόν έτοιμες διατυπώσεις για τα βασικά σημεία που προτείνεται να αλλάξουν.

Σημείωση:

- Τα English rewrites μπορούν να χρησιμοποιηθούν σχεδόν αυτούσια.
- Τα Greek rewrites πρέπει να θεωρηθούν προτεινόμενη premium adaptation baseline.
- Αν κάποιο section δεν χωράει στο πραγματικό layout, να κοπεί σε μήκος χωρίς να χαθεί η βασική ιδέα.

## English Proposed Rewrites

## `docs/files/evochia-copy-homepage.md`

### About Section

Current:

`Evochia was founded on the belief that the finest dining experiences don't happen in restaurants — they happen in the right place, with the right people, at exactly the right moment. We don't do generic. We don't do average. We build menus around your occasion, your guests, and the ingredients that are at their best that week.`

Recommended:

`Evochia was founded by Executive Chef Heraklis, with 12 years of luxury hospitality across Greece’s finest venues, distilled into a single uncompromising service. We build every menu around the occasion, the guests, and the ingredients at their best that week. From Mediterranean tradition to Nikkei precision and French finesse, the cuisine changes. The standard doesn’t.`

### Optional CTA refinement

Current:

`Whether it's a 6-person tasting dinner on a yacht or a 200-guest wedding reception, we'd love to hear what you're planning. We respond within 24 hours — with questions, ideas, and the beginning of a proposal.`

Recommended:

`Whether it’s a 6-person tasting dinner on a yacht or a 200-guest wedding reception, tell us what you’re planning. We respond within 24 hours with questions, ideas, and the beginning of a tailored proposal.`

## `docs/files/evochia-copy-about.md`

### SEO Title

Current:

`About Evochia — Premium Catering House in Greece`

Recommended:

`About Evochia — Executive Chef & Premium Catering House in Greece`

### Hero Subheadline

Current:

`A premium catering house built on the belief that the best meals aren't served in restaurants — they're the ones that happen in the right place, with the right people, at exactly the right moment.`

Recommended:

`A premium catering house built on the belief that the best meals aren’t served in restaurants. They happen in the right place, with the right people, at exactly the right moment.`

### Philosophy tightening

Current direction is strong, but this is a tighter version that scans better on web:

`Taste is the most archaic of the senses. It bypasses analysis and goes straight to feeling. A single bite can return someone to a table, a season, a person. That is why we take this work seriously.`

`Every meal we create is, in some small way, a contribution to memory. Our job is to start with the best ingredient available, treat it with the technique it deserves, and place it in the context of the occasion.`

## `docs/files/evochia-copy-catering.md`

### Hero Headline

Current:

`Full-Service Catering That Actually Delivers`

Recommended:

`Full-Service Catering That Delivers`

### Hero Subheadline

Current:

`From the first tasting call to the final clean-up — we handle the food, the logistics, and the execution. You focus on your guests.`

Recommended:

`From the first consultation to the final clean-up, we handle the food, the logistics, and the execution. You focus on your guests.`

### Weddings paragraph tightening

Recommended:

`A wedding menu should feel like it was designed for this couple, this setting, and this evening, because it was. We work with you from early planning to final course, shaping a service format that fits the venue, the guest experience, and the rhythm of the day.`

### CTA

Current:

`Planning an Event?`

Recommended:

`Planning an Event in Greece?`

Alternative:

`Tell Us About Your Event`

### Optional scope reduction

If `Children's Parties` is not a core service, move it below the main commercial sections or remove it from the primary page structure.

## `docs/files/evochia-copy-private-chef.md`

### SEO Note Cleanup

Current:

`...to avoid the "oριοθετεί" problem.`

Recommended:

`...to avoid making the brand feel geographically restricted.`

### Mexican Section

Current:

`Not Tex-Mex. Real Mexican — slow-braised meats, corn-based masa, fresh-made salsas with real heat, and aguachile that arrives cold and leaves an impression.`

Recommended:

`Authentic Mexican cooking — slow-braised meats, corn-based masa, fresh-made salsas with real heat, and aguachile that arrives cold and leaves an impression.`

### Asian Fusion Section

Current:

`...wok-fried rice that hits properly...`

Recommended:

`...wok-fried rice with proper depth and heat...`

### CTA claim check

Current:

`Most bookings are confirmed within 48 hours.`

Recommended only if true:

`Most bookings are confirmed within 48 hours.`

If not operationally stable, replace with:

`We respond quickly with a tailored menu proposal and a clear quote.`

## Greek Proposed Rewrites

## `docs/files (1)/evochia-copy-homepage-gr.md`

### Hero Headline

Current:

`Δημιουργώντας Εξαιρετικές Γαστρονομικές Στιγμές`

Recommended:

`Δημιουργούμε εξαιρετικές γαστρονομικές στιγμές`

Alternative if you want a more elevated tone:

`Δημιουργώντας στιγμές γαστρονομίας που μένουν`

### About Headline

Current:

`Με Κινητήρια Δύναμη την Τέχνη, με Οδηγό τη Γεύση`

Recommended:

`Με κινητήρια δύναμη την τέχνη, με οδηγό τη γεύση`

### About Body

Recommended rewrite:

`Η Evochia δημιουργήθηκε με την πεποίθηση ότι οι καλύτερες γαστρονομικές εμπειρίες δεν συμβαίνουν σε εστιατόρια. Συμβαίνουν στον σωστό τόπο, με τους σωστούς ανθρώπους, την κατάλληλη στιγμή. Κάθε μενού χτίζεται γύρω από την περίσταση, τους καλεσμένους και τα υλικά που βρίσκονται στο καλύτερό τους εκείνη την εβδομάδα.`

### Stats Bar

Current:

`12+ Χρόνια σε Luxury Hospitality · 8+ Στυλ Κουζίνας · Πάντα Bespoke · 100% Εποχιακό & Τοπικό · Φτιαγμένο κατά παραγγελία`

Recommended:

`12+ χρόνια στη luxury hospitality · 8+ στυλ κουζίνας · Πάντα εξατομικευμένο · 100% εποχιακό και τοπικό · Φτιαγμένο κατόπιν παραγγελίας`

### Locations card label

Current:

`Exclusive Venues`

Recommended:

`Αποκλειστικοί χώροι`

## `docs/files (1)/evochia-copy-about-gr.md`

### SEO Title

Current:

`Evochia — Premium Catering House στην Ελλάδα`

Recommended:

`Evochia — Premium οίκος catering στην Ελλάδα`

Alternative:

`Evochia — Premium οίκος γαστρονομικής φιλοξενίας στην Ελλάδα`

### Meta Description

Current:

`Η Evochia είναι ένας premium catering house χτισμένος πάνω στον βαθύ σεβασμό για το φαγητό...`

Recommended:

`Η Evochia είναι ένας premium οίκος catering, χτισμένος πάνω στον βαθύ σεβασμό για το φαγητό, τη φιλοξενία και τις στιγμές που έχουν σημασία.`

### Hero Subheadline

Current:

`Ένας premium catering house που χτίστηκε με την πεποίθηση...`

Recommended:

`Ένας premium οίκος catering, χτισμένος με την πεποίθηση ότι τα καλύτερα γεύματα δεν σερβίρονται σε εστιατόρια, αλλά συμβαίνουν στον σωστό τόπο, με τους σωστούς ανθρώπους, την κατάλληλη στιγμή.`

### Story paragraph fix

Current issue:

`την είδους που συνήθως ανήκει`

Recommended:

`του είδους εμπειρίας που συνήθως συναντά κανείς στα καλύτερα εστιατόρια`

### CTA

Recommended refined version:

`Πείτε μας για την εκδήλωσή σας — την ημερομηνία, τον χώρο και την περίσταση. Θα σας απαντήσουμε εντός 24 ωρών με μια προσεγμένη, δομημένη πρόταση χτισμένη γύρω από το όραμά σας.`

## `docs/files (1)/evochia-copy-catering-gr.md`

### Hero Headline

Current:

`Catering Πλήρους Υπηρεσίας που Αποδίδει Πραγματικά`

Recommended:

`Πλήρες catering με άψογη εκτέλεση`

Alternative:

`Catering πλήρους υπηρεσίας που ανταποκρίνεται`

### Hero Subheadline

Current:

`Από την πρώτη συνομιλία έως την τελευταία εκκαθάριση...`

Recommended:

`Από την πρώτη συνομιλία έως το τελικό καθάρισμα, αναλαμβάνουμε το φαγητό, τα logistics και την εκτέλεση. Εσείς εστιάζετε στους καλεσμένους σας.`

### What's Included Headline

Current:

`Όλα Αντιμετωπισμένα`

Recommended:

`Τα αναλαμβάνουμε όλα`

Alternative:

`Όλα καλυμμένα`

### List item fixes

Current:

`Πλήρης παραγωγή: προετοιμασία, μαγείρεμα, πλατεάρισμα και service on location`

Recommended:

`Πλήρης παραγωγή: προετοιμασία, μαγείρεμα, plating και service στον χώρο σας`

Current:

`Εκκαθάριση μετά την εκδήλωση`

Recommended:

`Καθαρισμός μετά την εκδήλωση`

### Step 4 in process

Current sense:

`Μπορείτε να αποσυρθείτε και να εστιάσετε στους καλεσμένους σας.`

Recommended:

`Από εκεί και πέρα αναλαμβάνουμε εμείς τα πάντα, ώστε εσείς να χαλαρώσετε και να εστιάσετε στους καλεσμένους σας.`

### CTA

Recommended:

`Πείτε μας την ημερομηνία, τον χώρο και το μέγεθος της εκδήλωσης. Θα επανέλθουμε εντός 24 ωρών με μια δομημένη, αναλυτική πρόταση, χωρίς ασάφειες και χωρίς υποχρέωση.`

## `docs/files (1)/evochia-copy-private-chef-gr.md`

### Specs label

Current:

`3–8 Πορείες`

Recommended:

`3–8 πιάτα`

Alternative:

`3–8 στάδια δείπνου`

### Mediterranean paragraph

Current issue:

`σεβρίτσι λαβράκι`

Recommended full rewrite:

`Η βάση κάθε τι που μαγειρεύουμε. Ριζωμένη στην ελληνική παράδοση και εξευγενισμένη με τη ματιά μιας σύγχρονης κουζίνας. Σκεφτείτε ψητό χταπόδι, χειροποίητα ντολμαδάκια, λαβράκι με χόρτα και επιδόρπια βασισμένα στο αιγαιοπελαγίτικο μέλι και τα εποχιακά εσπεριδοειδή.`

### Mexican paragraph

Current:

`Όχι Tex-Mex. Αληθινό Μεξικό...`

Recommended:

`Αυθεντικό μεξικάνικο φαγητό — αργομαγειρεμένα κρέατα, masa από καλαμπόκι, φρεσκοφτιαγμένες salsas με πραγματική ένταση και aguachile που φτάνει κρύο και αφήνει εντύπωση.`

### Asian Fusion paragraph

Current:

`Ένα ρευστό, ingredient-led ταξίδι... wok-fried ρύζι που κτυπά σωστά...`

Recommended:

`Ένα ρευστό ταξίδι με οδηγό το υλικό, μέσα από τις κουζίνες της Ανατολικής και Νοτιοανατολικής Ασίας. Thai-inspired larbs, επιρροές από Korean BBQ, τηγανητό ρύζι στο wok με σωστή ένταση και βάθος, και φρέσκα spring rolls με σπιτικό nuoc cham.`

### Themed Experiences body

Current sense:

`...όπως τα fine dining service μας...`

Recommended:

`Χτίζουμε θεματικές γαστρονομικές εμπειρίες με την ίδια προσοχή στη λεπτομέρεια που χαρακτηρίζει τις υπηρεσίες fine dining μας, απλώς με διαφορετική ενέργεια και πιο χαλαρό ρυθμό.`

### CTA ending

Current:

`Διαθέσιμοι σε Αθήνα, Μύκονο...`

Recommended:

`Διαθέσιμο στην Αθήνα, στη Μύκονο, στη Σαντορίνη, στην Κέρκυρα, στην Κρήτη, στη Ρόδο και σε όλο το νησιωτικό δίκτυο της Ελλάδας.`

## Προτεινόμενη Χρήση των Rewrites

- Χρησιμοποίησε τα English rewrites ως production-ready baseline.
- Στα Greek κείμενα, μην περιοριστείς σε word-by-word διόρθωση. Πέρασε τα rewritten sections αυτούσια όπου είναι καλύτερα από το υπάρχον draft.
- Πριν από implementation στα HTML, κάνε ένα τελευταίο pass για μήκος section και visual fit.
