from __future__ import annotations

import json

from jin.auth_utils import build_password_hash, generate_auth_lines
from jin.cli import main


def test_generate_auth_lines_include_expected_env_keys() -> None:
    password, lines = generate_auth_lines(password="demo-pass", iterations=120000)
    assert password == "demo-pass"
    assert any(line.startswith("JIN_PASSWORD_HASH=pbkdf2_sha256$120000$") for line in lines)
    assert any(line.startswith("JIN_SESSION_SECRET=") for line in lines)
    assert "JIN_SESSION_TTL_MINUTES=480" in lines


def test_build_password_hash_has_expected_format() -> None:
    hashed = build_password_hash("demo-pass", iterations=120000, salt="abc12345")
    assert hashed.startswith("pbkdf2_sha256$120000$abc12345$")


def test_cli_rotate_command_outputs_env_lines(capsys) -> None:
    exit_code = main(["auth", "rotate", "--password", "chosen-pass"])
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "chosen-pass" in captured.out
    assert "JIN_PASSWORD_HASH=" in captured.out
    assert "JIN_SESSION_SECRET=" in captured.out


def test_cli_rotate_command_can_write_env_file(tmp_path, capsys) -> None:
    env_path = tmp_path / ".env"
    env_path.write_text("JIN_PASSWORD=change-me\nJIN_PROJECT_NAME=demo\n")
    exit_code = main(
        [
            "auth",
            "rotate",
            "--password",
            "chosen-pass",
            "--env-file",
            str(env_path),
            "--write-env",
        ]
    )
    captured = capsys.readouterr()
    contents = env_path.read_text()
    assert exit_code == 0
    assert f"Updated {env_path}" in captured.out
    assert "Password: chosen-pass" in captured.out
    assert "JIN_PASSWORD_HASH=" in contents
    assert "JIN_SESSION_SECRET=" in contents
    assert "JIN_AUTH_ENABLED=true" in contents
    assert "JIN_USERNAME=operator" in contents
    assert "JIN_PASSWORD=" not in contents


def test_cli_auth_status_warns_for_default_plaintext(monkeypatch, capsys) -> None:
    monkeypatch.setenv("JIN_AUTH_ENABLED", "true")
    monkeypatch.setenv("JIN_USERNAME", "operator")
    monkeypatch.setenv("JIN_PASSWORD", "change-me")
    monkeypatch.delenv("JIN_PASSWORD_HASH", raising=False)
    monkeypatch.delenv("JIN_SESSION_SECRET", raising=False)
    exit_code = main(["auth", "status"])
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "auth_enabled" in captured.out
    assert "Warnings:" in captured.out
    assert "Plaintext JIN_PASSWORD is set." in captured.out
    assert "Default login is still in use." in captured.out
    assert "Run: jin auth rotate" in captured.out


def test_cli_auth_status_reports_ready_when_hashed(monkeypatch, capsys) -> None:
    monkeypatch.setenv("JIN_AUTH_ENABLED", "true")
    monkeypatch.setenv("JIN_USERNAME", "operator")
    monkeypatch.delenv("JIN_PASSWORD", raising=False)
    monkeypatch.setenv(
        "JIN_PASSWORD_HASH",
        build_password_hash("demo-pass", iterations=120000, salt="abc12345"),
    )
    monkeypatch.setenv("JIN_SESSION_SECRET", "secret-value")
    monkeypatch.setenv("JIN_SESSION_TTL_MINUTES", "240")
    exit_code = main(["auth", "status"])
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "password_hash" in captured.out
    assert "configured" in captured.out
    assert "Auth looks ready." in captured.out


def test_cli_auth_status_json(monkeypatch, capsys) -> None:
    monkeypatch.setenv("JIN_AUTH_ENABLED", "true")
    monkeypatch.setenv("JIN_USERNAME", "operator")
    monkeypatch.delenv("JIN_PASSWORD", raising=False)
    monkeypatch.setenv(
        "JIN_PASSWORD_HASH",
        build_password_hash("demo-pass", iterations=120000, salt="abc12345"),
    )
    monkeypatch.setenv("JIN_SESSION_SECRET", "secret-value")
    exit_code = main(["auth", "status", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["auth_enabled"] is True
    assert payload["password_hash"] is True
    assert payload["ready"] is True


def test_cli_env_check_reports_missing_and_present_values(tmp_path, monkeypatch, capsys) -> None:
    env_path = tmp_path / ".env"
    monkeypatch.setenv("JIN_PROJECT_NAME", "demo-project")
    monkeypatch.setenv("JIN_DB_PATH", str(tmp_path / "demo.duckdb"))
    monkeypatch.setenv("JIN_AUTH_ENABLED", "true")
    monkeypatch.setenv("JIN_USERNAME", "operator")
    monkeypatch.setenv("JIN_PASSWORD", "change-me")
    monkeypatch.delenv("JIN_PASSWORD_HASH", raising=False)
    monkeypatch.delenv("JIN_SESSION_SECRET", raising=False)
    exit_code = main(["env", "check", "--env-file", str(env_path)])
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "env_exists" in captured.out
    assert "db_exists" in captured.out
    assert "Warnings:" in captured.out
    assert f"{env_path} does not exist yet." in captured.out
    assert "Plaintext JIN_PASSWORD is set." in captured.out


def test_cli_env_check_json(tmp_path, monkeypatch, capsys) -> None:
    env_path = tmp_path / ".env"
    env_path.write_text("JIN_PROJECT_NAME=demo\n")
    db_path = tmp_path / "demo.duckdb"
    db_path.write_text("")
    monkeypatch.setenv("JIN_PROJECT_NAME", "demo-project")
    monkeypatch.setenv("JIN_DB_PATH", str(db_path))
    monkeypatch.setenv("JIN_AUTH_ENABLED", "false")
    exit_code = main(["env", "check", "--env-file", str(env_path), "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["env_exists"] is True
    assert payload["db_exists"] is True
    assert payload["ready"] is True


def test_cli_urls_prints_expected_local_links(capsys) -> None:
    exit_code = main(["urls", "--host", "127.0.0.1", "--port", "9001"])
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "jin_console" in captured.out
    assert "http://127.0.0.1:9001/jin" in captured.out
    assert "http://127.0.0.1:9001/api/revenue/amazon/YTD" in captured.out


def test_cli_urls_json(capsys) -> None:
    exit_code = main(["urls", "--host", "127.0.0.1", "--port", "9001", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["jin_console"] == "http://127.0.0.1:9001/jin"


def test_cli_urls_can_launch_console(monkeypatch, capsys) -> None:
    launched: list[str] = []
    monkeypatch.setattr("jin.cli_support.webbrowser.open", lambda url: launched.append(url) or True)
    exit_code = main(["urls", "--host", "127.0.0.1", "--port", "9001", "--launch", "console"])
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "http://127.0.0.1:9001/jin" in captured.out
    assert launched == ["http://127.0.0.1:9001/jin"]


def test_cli_open_and_completion(monkeypatch, capsys) -> None:
    assert main(["open", "--port", "9001"]) == 0
    open_output = capsys.readouterr().out
    assert "http://127.0.0.1:9001/jin" in open_output

    launched: list[str] = []
    monkeypatch.setattr("jin.cli_support.webbrowser.open", lambda url: launched.append(url) or True)
    assert main(["open", "--port", "9001", "--launch"]) == 0
    assert launched == ["http://127.0.0.1:9001/jin"]

    assert main(["completion", "zsh"]) == 0
    completion_output = capsys.readouterr().out
    assert "compdef _jin jin" in completion_output
    assert "rotate status" in completion_output
    assert "--write-env" in completion_output

    assert main(["completion", "bash"]) == 0
    bash_output = capsys.readouterr().out
    assert 'auth) COMPREPLY=( $(compgen -W "rotate status"' in bash_output
    assert '--launch' in bash_output
