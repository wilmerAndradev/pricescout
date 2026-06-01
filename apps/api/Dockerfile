FROM python:3.11-slim

WORKDIR /app

# Scrapling usa Playwright internamente. El path estándar para los browsers.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# ── System dependencies para Chromium (DynamicFetcher) y anti-fingerprint ─────
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl gnupg ca-certificates \
    libglib2.0-0 libnss3 libnspr4 libdbus-1-3 \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    fonts-liberation libappindicator3-1 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# ── Instalación en orden correcto ──────────────────────────────────────────────
# 1. Paquetes Python (scrapling>=0.4 incluye playwright como dependencia)
# 2. playwright install: descarga Chromium con sus dependencias del sistema
#    Scrapling usa Playwright internamente (DynamicFetcher + StealthyFetcher)
#    NO usar "python -m scrapling install" — scrapling no tiene __main__.py
# 3. Permisos para el directorio de browsers (necesario para usuario no-root)
RUN pip install --no-cache-dir -r requirements.txt && \
    playwright install --with-deps chromium && \
    chmod -R 777 /ms-playwright || true

COPY . .

# ── Seguridad: ejecutar como usuario no-root ───────────────────────────────────
RUN useradd -m appuser && chown -R appuser /app
USER appuser
