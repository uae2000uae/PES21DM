"""Club-name matching shared by every data source (eFootball, Transfermarkt, TheSportsDB, Wikidata).

A looser rule ("one name's words are all inside the other's") matched "United FC" to Manchester United and "Al-Shabab" to
Shabab Al-Ahli, so a pull gave one club another club's squad. Now a partial match counts only when the shorter name is the
start of the longer one ("Tottenham" / "Tottenham Hotspur", "Shabab Al Ahli" / "Shabab Al Ahli Dubai") and carries a word
that names a club on its own, not just "United", "City", "Al" and the like.
"""

# words that never identify a club by themselves
GENERIC = {"united", "city", "town", "county", "athletic", "atletico", "athletico", "al", "el", "ahli", "rovers", "wanderers",
           "inter", "internacional", "olympic", "olympique", "dynamo", "dinamo", "racing", "union", "deportivo", "deportes",
           "esporte", "sport", "sporting", "real", "royal", "new", "st", "saint", "san", "santa", "young", "boys", "stars", "star",
           "national", "nacional", "academy", "fc", "sc", "club"}

STRONG = 0.85  # what a caller needs to accept a match


def score(a, b):
    """a, b: a name's core words, in order (stop words already removed). 1.0 same club, 0.85 one is the start of the
    other, below 0.6 otherwise (never enough to accept)."""
    a, b = list(a), list(b)
    if not a or not b:
        return 0.0
    if a == b or (len(a) == len(b) and set(a) == set(b)):
        return 1.0
    short, long_ = (a, b) if len(a) <= len(b) else (b, a)
    if long_[:len(short)] == short and any(w not in GENERIC for w in short):
        return STRONG
    sa, sb = set(a), set(b)
    return 0.6 * len(sa & sb) / len(sa | sb)
