from scrapers.matcher import SCORE_DISCARD, SCORE_EXACT, SCORE_RELATED, score_match
from scrapers.normalizer import (
    fuzzy_match_tokens,
    is_dupe_product,
    normalize_product_title,
)


def test_exact_match_scores_high():
    assert score_match("Ralph Lauren Big Pony No 2", "Ralph Lauren Big Pony No. 2 EDT 100ml") >= SCORE_EXACT

def test_unrelated_scores_zero():
    assert score_match("Ralph Lauren Big Pony No 2", "Tester Fresh 100ML EDT") <= SCORE_DISCARD

def test_same_brand_different_product_scores_low():
    assert score_match("Ralph Lauren Big Pony No 2", "Ralph Lauren Polo Blue EDT 100ml") <= SCORE_DISCARD

def test_fuzzy_typo_tolerance():
    assert score_match("Chanel N5", "Chanell N°5 EDP 100ml") >= SCORE_RELATED

def test_numbers_must_match_exactly():
    assert score_match("212 Men", "221 Men EDT") <= SCORE_DISCARD

def test_dupe_never_in_exact_results():
    s = score_match("Chanel N5", "Inspirado en Chanel N5 Attar 12ml")
    assert s < SCORE_EXACT

def test_dupe_separated_from_exact():
    s_exact = score_match("Chanel N5", "Chanel N°5 EDP 100ml")
    s_dupe  = score_match("Chanel N5", "Inspirado en Chanel N5 Attar 12ml")
    assert s_exact >= SCORE_EXACT
    assert s_dupe < SCORE_EXACT
    assert s_exact - s_dupe >= 0.40

def test_volume_normalization_consistent():
    n1 = normalize_product_title("Dior Sauvage EDP 100ml")
    n2 = normalize_product_title("Dior Sauvage EDP 100 ML")
    n3 = normalize_product_title("Dior Sauvage EDP 100ML")
    assert n1 == n2 == n3

def test_edp_edt_normalization():
    n1 = normalize_product_title("Dior Sauvage Eau de Parfum")
    n2 = normalize_product_title("Dior Sauvage EDP")
    assert n1 == n2

def test_tester_word_removed_from_normalization():
    n = normalize_product_title("Ralph Lauren Polo Blue Tester 100ml EDT")
    assert "tester" not in n

def test_dupe_detection():
    assert is_dupe_product("Inspirado en Chanel N5 — Attar 12ml") == True
    assert is_dupe_product("Dupe Sauvage Dior 60ml") == True
    assert is_dupe_product("Chanel N°5 EDP 100ml") == False

def test_numeric_tokens_exact_only():
    assert fuzzy_match_tokens("212", "212") == 1.0
    assert fuzzy_match_tokens("212", "21")  == 0.0
    assert fuzzy_match_tokens("212", "213") == 0.0

def test_short_tokens_exact_only():
    assert fuzzy_match_tokens("n5", "n5") == 1.0
    assert fuzzy_match_tokens("n5", "n6") == 0.0

def test_long_token_typo_tolerance():
    assert fuzzy_match_tokens("chanel", "chanell") > 0.85
    assert fuzzy_match_tokens("sauvage", "savage")  > 0.80

def test_number_format_unification():
    # Verify that different formats of series numbers normalize to the same number
    assert normalize_product_title("Ralph Lauren Big Pony No. 2") == normalize_product_title("Ralph Lauren Big Pony 2")
    assert normalize_product_title("Ralph Lauren Big Pony #2") == normalize_product_title("Ralph Lauren Big Pony 2")
    assert normalize_product_title("Ralph Lauren Big Pony N2") == normalize_product_title("Ralph Lauren Big Pony 2")

def test_number_mismatch_scores_low():
    # Big Pony 2 vs Big Pony 1 must not match
    assert score_match("Ralph Lauren Big Pony No. 2", "Ralph Lauren Big Pony #1") <= SCORE_DISCARD

def test_different_model_names_score_low():
    # Searching for Lattafa Mayar but getting Mahasin Crystal must not match
    assert score_match("Lattafa Mayar EDP 100 ml", "Mahasin Crystal EDP 100 ML + Perfume Spray 75 ML - Lattafa") <= SCORE_DISCARD

def test_specific_edition_mismatch():
    # Sauvage Elixir vs Sauvage
    assert score_match("Dior Sauvage Elixir", "Dior Sauvage EDT 100ml") <= SCORE_DISCARD

def test_flanker_is_related_not_exact():
    # Searching for Lattafa Mayar should list Lattafa Mayar Intense as related, not exact
    s = score_match("Lattafa Mayar EDP 100 ml", "Lattafa Mayar Intense EDP 100 Ml")
    assert s >= SCORE_RELATED
    assert s < SCORE_EXACT


