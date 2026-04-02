from __future__ import annotations

import argparse

from jin.auth_utils import generate_auth_lines


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate local Jin auth credentials for .env files.")
    parser.add_argument("--password", help="Use a specific plaintext password instead of generating one.")
    parser.add_argument(
        "--iterations",
        type=int,
        default=120000,
        help="PBKDF2 iteration count. Default: 120000",
    )
    args = parser.parse_args()

    _, lines = generate_auth_lines(password=args.password, iterations=args.iterations)
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
