from __future__ import annotations

import hashlib
import secrets


def build_password_hash(password: str, *, iterations: int, salt: str) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()
    return f"pbkdf2_sha256${iterations}${salt}${digest}"


def generate_auth_lines(password: str | None = None, *, iterations: int = 120000) -> tuple[str, list[str]]:
    generated_password = password or secrets.token_urlsafe(18)
    salt = secrets.token_hex(8)
    password_hash = build_password_hash(generated_password, iterations=iterations, salt=salt)
    session_secret = secrets.token_urlsafe(32)
    lines = [
        "# Copy these into your .env file",
        f"# Plaintext password (store safely): {generated_password}",
        f"JIN_PASSWORD_HASH={password_hash}",
        f"JIN_SESSION_SECRET={session_secret}",
        "JIN_SESSION_TTL_MINUTES=480",
    ]
    return generated_password, lines
