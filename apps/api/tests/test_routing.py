from unittest.mock import MagicMock, patch

from tasks.scraping_router import route_and_extract


@patch("tasks.scraping_router._get_scraper_for_domain")
@patch("tasks.llm_extractor.extract_with_llm")
def test_motor_a_se_usa_para_known_stores(mock_extract_llm, mock_get_scraper):
    """
    Test that route_and_extract routes a known store URL (e.g. Falabella)
    to the deterministic scraper (Motor A) and does not call the LLM extractor.
    """
    # Configure mock scraper
    mock_scraper = MagicMock()
    mock_scraper.parse.return_value = {
        "name": "Perfume Valentino 100ml",
        "price": 89990,
        "image_url": "https://images.com/pic.jpg",
        "in_stock": True
    }
    mock_get_scraper.return_value = mock_scraper

    url = "https://www.falabella.com/producto/12345/perfume"
    result = route_and_extract(url)

    # Assertions
    mock_get_scraper.assert_called_once_with("falabella.com", url)
    mock_scraper.parse.assert_called_once()
    mock_extract_llm.assert_not_called()

    assert result["name"] == "Perfume Valentino 100ml"
    assert result["price"] == 89990
    assert result["extraction_method"] == "parser"


@patch("tasks.scraping_router._get_scraper_for_domain")
@patch("tasks.llm_extractor.extract_with_llm")
def test_motor_b_se_usa_para_tienda_desconocida(mock_extract_llm, mock_get_scraper):
    """
    Test that route_and_extract routes an unknown store URL (not in KNOWN_STORES)
    directly to the LLM Universal Extractor (Motor B).
    """
    mock_extract_llm.return_value = {
        "name": "Generic Perfume 100ml",
        "price": 45000,
        "source": "Tienda",
        "extraction_method": "llm",
        "confidence_score": "high"
    }

    url = "https://www.tiendadesconocida.cl/producto/123"
    result = route_and_extract(url)

    # Assertions
    mock_get_scraper.assert_not_called()
    mock_extract_llm.assert_called_once_with(url, supabase_client=None)

    assert result["name"] == "Generic Perfume 100ml"
    assert result["price"] == 45000
    assert result["source"] == "Tiendadesconocida"  # Should capitalize the domain's root name if source is "Tienda"


@patch("tasks.scraping_router._get_scraper_for_domain")
@patch("tasks.llm_extractor.extract_with_llm")
def test_motor_b_como_fallback_si_motor_a_falla(mock_extract_llm, mock_get_scraper):
    """
    Test that route_and_extract falls back to Motor B (LLM) if Motor A (Scrapling)
    fails with a network block / anti-bot error.
    """
    # Configure scraper to raise RuntimeError indicating it was blocked
    mock_scraper = MagicMock()
    mock_scraper.parse.side_effect = RuntimeError("BOT_BLOCKED: Cloudflare challenge detected")
    mock_get_scraper.return_value = mock_scraper

    # Configure LLM fallback response
    mock_extract_llm.return_value = {
        "name": "Perfume Valentino 100ml",
        "price": 89990,
        "source": "Falabella",
        "extraction_method": "llm",
        "confidence_score": "medium"
    }

    url = "https://www.falabella.com/producto/12345/perfume"
    result = route_and_extract(url)

    # Assertions
    mock_get_scraper.assert_called_once_with("falabella.com", url)
    mock_scraper.parse.assert_called_once()
    mock_extract_llm.assert_called_once_with(url, supabase_client=None)

    assert result["name"] == "Perfume Valentino 100ml"
    assert result["price"] == 89990
    assert result["extraction_method"] == "llm"
