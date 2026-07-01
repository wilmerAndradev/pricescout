from dataclasses import dataclass
from enum import Enum

class SyncMethod(str, Enum):
    SHOPIFY_JSON = "shopify_json"
    SHOPIFY_JS = "shopify_js"
    HTML_PARSER = "html_parser"

@dataclass
class StoreConfig:
    slug: str
    name: str
    url: str
    sync_method: SyncMethod
    catalog_url: str | None = None   # Solo para html_parser, URL de inicio del catálogo
    active: bool = True

STORES: list[StoreConfig] = [
    # Shopify JSON (método fácil)
    StoreConfig(slug="alisha", name="Alisha Perfumes", url="https://alishaperfumes.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="cosmetic", name="Cosmetic", url="https://cosmetic.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="comprarenchile", name="ComprarenChile", url="https://comprarenchile.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="elite-perfumes", name="Elite Perfumes", url="https://www.eliteperfumes.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="lodoro", name="Lodoro", url="https://www.lodoro.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="multimarcas", name="MultiMarcas Perfumes", url="https://multimarcasperfumes.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="mundo-aromas", name="Mundo Aromas", url="https://mundoaromas.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="perfumisimo", name="Perfumisimo", url="https://www.perfumisimo.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="productos-de-lujo", name="Productos de Lujo", url="https://productosdelujo.cl", sync_method=SyncMethod.SHOPIFY_JSON),

    # Shopify JS (fallback)
    StoreConfig(slug="silk-perfumes", name="Silk Perfumes", url="https://silkperfumes.cl", sync_method=SyncMethod.SHOPIFY_JS),
    StoreConfig(slug="yauras", name="Yauras", url="https://yauras.cl", sync_method=SyncMethod.SHOPIFY_JS),

    # HTML Parser (tiendas custom)
    StoreConfig(slug="alarab", name="Alarab", url="https://www.alarab.cl", sync_method=SyncMethod.HTML_PARSER, catalog_url="https://www.alarab.cl/marcas"),
    StoreConfig(slug="paris-perfumes", name="ParisPerfumes", url="https://www.parisperfumes.cl", sync_method=SyncMethod.HTML_PARSER, catalog_url="https://www.parisperfumes.cl/perfumes-1,https://www.parisperfumes.cl/ofertas"),
    StoreConfig(slug="sairam", name="Sairam", url="https://sairam.cl", sync_method=SyncMethod.HTML_PARSER, catalog_url="https://sairam.cl/perfumes-de-hombre,https://sairam.cl/perfumes-de-mujer,https://sairam.cl/perfumes-unisex,https://sairam.cl/perfume/perfumes-arabes"),
    StoreConfig(slug="joy-perfumes", name="JoyPerfumes", url="https://joyperfumes.cl", sync_method=SyncMethod.HTML_PARSER, catalog_url="https://joyperfumes.cl/all"),
]

def get_store_by_slug(slug: str) -> StoreConfig | None:
    return next((s for s in STORES if s.slug == slug), None)

def get_active_stores() -> list[StoreConfig]:
    return [s for s in STORES if s.active]
