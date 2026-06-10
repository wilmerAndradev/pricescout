from scrapers.normalizer import normalize_product_title, extract_volume_ml

test_cases = [
    ("Chanel N°5 Eau de Parfum 100ml Mujer", "chanel n5 100", 100),
    ("DIOR SAUVAGE EDP 60ML HOMBRE", "dior sauvage edp 60", 60),
    ("Carolina Herrera 212 Men EDT 200 ml", "carolina herrera 212 200", 200)
]

print("=== NORMALIZER TESTS ===")
all_pass = True
for raw, expected_norm, expected_vol in test_cases:
    norm = normalize_product_title(raw)
    vol = extract_volume_ml(raw)
    
    norm_pass = (norm == expected_norm)
    vol_pass = (vol == expected_vol)
    
    print(f"Original: {raw!r}")
    print(f"  Normalized: {norm!r} (Expected: {expected_norm!r}) -> {'PASS' if norm_pass else 'FAIL'}")
    print(f"  Volume    : {vol!r} (Expected: {expected_vol!r}) -> {'PASS' if vol_pass else 'FAIL'}")
    
    if not norm_pass or not vol_pass:
        all_pass = False

if all_pass:
    print("\n✅ ALL TESTS PASSED!")
else:
    print("\n❌ SOME TESTS FAILED!")
