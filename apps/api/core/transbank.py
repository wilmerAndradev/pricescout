import logging
import os
from typing import Any, Dict

import httpx

logger = logging.getLogger(__name__)

# Sandbox configuration defaults
SANDBOX_COMMERCE_CODE = "597055555532"
SANDBOX_API_KEY = "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C"
SANDBOX_BASE_URL = "https://webpay3gint.transbank.cl"

class TransbankWebpayClient:
    """
    Async client for Transbank Webpay Plus REST API.
    Does not depend on the blocking python SDK, making it ideal for FastAPI.
    """
    def __init__(self):
        self.environment = os.environ.get("TRANSBANK_ENVIRONMENT", "integration").lower()

        if self.environment == "production":
            self.commerce_code = os.environ.get("TRANSBANK_COMMERCE_CODE")
            self.api_key = os.environ.get("TRANSBANK_API_KEY")
            self.base_url = "https://webpay3g.transbank.cl"
            if not self.commerce_code or not self.api_key:
                logger.error("Production mode active but commerce code or API key are missing.")
                raise ValueError("Production environment requires TRANSBANK_COMMERCE_CODE and TRANSBANK_API_KEY")
        else:
            self.commerce_code = os.environ.get("TRANSBANK_COMMERCE_CODE") or SANDBOX_COMMERCE_CODE
            self.api_key = os.environ.get("TRANSBANK_API_KEY") or SANDBOX_API_KEY
            self.base_url = SANDBOX_BASE_URL

        self.headers = {
            "Tbk-Api-Key-Id": self.commerce_code,
            "Tbk-Api-Key-Secret": self.api_key,
            "Content-Type": "application/json"
        }

    async def initiate_transaction(self, buy_order: str, session_id: str, amount: int, return_url: str) -> Dict[str, Any]:
        """
        Creates a transaction in Webpay Plus.
        Returns a dictionary containing 'token' and 'url'.
        """
        url = f"{self.base_url}/rswebpaytransaction/api/webpay/v1.2/transactions"
        payload = {
            "buy_order": buy_order,
            "session_id": session_id,
            "amount": amount,
            "return_url": return_url
        }

        logger.info(f"Initiating Transbank transaction. Buy Order: {buy_order}, Amount: {amount}")

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                data = response.json()
                logger.info(f"Transbank transaction initiated successfully. Token: {data.get('token')}")
                return data
            except httpx.HTTPStatusError as e:
                logger.error(f"Transbank HTTP error {e.response.status_code}: {e.response.text}")
                raise Exception(f"Transbank API error: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to connect to Transbank: {e}")
                raise Exception(f"Connection to Transbank failed: {str(e)}")

    async def commit_transaction(self, token: str) -> Dict[str, Any]:
        """
        Confirms a transaction with Webpay Plus.
        This must be called within 3 hours of transaction initiation.
        """
        url = f"{self.base_url}/rswebpaytransaction/api/webpay/v1.2/transactions/{token}"

        logger.info(f"Committing Transbank transaction. Token: {token}")

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                # Webpay Plus REST requires a PUT request with empty body to commit/confirm
                response = await client.put(url, json={}, headers=self.headers)
                response.raise_for_status()
                data = response.json()
                logger.info(f"Transbank transaction committed. Status: {data.get('status')}, Response Code: {data.get('response_code')}")
                return data
            except httpx.HTTPStatusError as e:
                logger.error(f"Transbank HTTP error {e.response.status_code}: {e.response.text}")
                raise Exception(f"Transbank API error: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to commit Transbank transaction: {e}")
                raise Exception(f"Connection to Transbank failed: {str(e)}")

    async def get_transaction_status(self, token: str) -> Dict[str, Any]:
        """
        Retrieves the status of a transaction.
        Useful for checking status before/after callback.
        """
        url = f"{self.base_url}/rswebpaytransaction/api/webpay/v1.2/transactions/{token}"

        logger.info(f"Fetching Transbank transaction status. Token: {token}")

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                data = response.json()
                return data
            except httpx.HTTPStatusError as e:
                logger.error(f"Transbank HTTP error {e.response.status_code}: {e.response.text}")
                raise Exception(f"Transbank API error: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to get Transbank status: {e}")
                raise Exception(f"Connection to Transbank failed: {str(e)}")
