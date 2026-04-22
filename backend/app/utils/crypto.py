"""
Token encryption/decryption utilities for storing OAuth tokens at rest.
Uses Fernet symmetric encryption.
"""

from cryptography.fernet import Fernet
from app.config import get_settings
import base64
import hashlib

_fernet = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        settings = get_settings()
        # Derive a valid 32-byte key from the configured ENCRYPTION_KEY
        key_bytes = hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()
        _fernet = Fernet(base64.urlsafe_b64encode(key_bytes))
    return _fernet


def encrypt_token(token: str) -> str:
    """Encrypt a token string for safe storage."""
    if not token:
        return ""
    return _get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    """Decrypt a stored token."""
    if not encrypted:
        return ""
    return _get_fernet().decrypt(encrypted.encode()).decode()
