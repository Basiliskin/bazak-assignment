# Glossary

**Shopper** — the person using the app. There are no accounts: everyone on one machine is the same anonymous Shopper.

**Assistant** — the AI shopping copilot that answers the Shopper in the chat.

**Conversation** — one chat thread between the Shopper and the Assistant, made of an ordered list of Messages. It can be started, listed, and continued later.

**Conversation Title** — the short name of a Conversation shown in the list: its first Shopper message, cut to about 40 characters.

**Message** — one turn in a Conversation, written either by the Shopper or by the Assistant. An Assistant Message has text and may contain Product Groups.

**Catalog** — the set of products the shop sells (the DummyJSON product list). Nothing outside it can be offered.

**Product** — one item from the Catalog.

**Product Card** — the visual tile for one Product inside an Assistant Message: image, title, short description, price, rating and discount.

**Product Group** — a labelled set of Product Cards answering one Search Intent (e.g. "Phones under $500"), with a count of further matches.

**Search Intent** — one thing the Shopper is looking for, with optional constraints (category, price limit, sort order). A single Message can contain several.

**Ambiguous Request** — a Shopper message whose Search Intent is too vague to search directly (e.g. "something cheap and cool"). The Assistant searches on a stated Assumption and asks one follow-up question.

**Assumption** — what the Assistant decided a vague request means, said out loud in its reply (e.g. "I took 'cool' as trendy accessories under $30").

**Off-catalog Request** — a request for something the shop does not sell (e.g. "a flight to Tokyo"). The Assistant says so and may suggest related Catalog Products.

**Multi-intent Request** — a Shopper message containing more than one Search Intent (e.g. "a phone under $500 and a lipstick"). Each intent gets its own Product Group.

**Follow-up** — a Shopper message that only makes sense with earlier Messages (e.g. "show me cheaper ones").

**Recommended Group** — a Product Group of similar Products shown below the matches of one Search Intent ("You might also like"). It never repeats a Product shown in the matches and respects the same price limit.
