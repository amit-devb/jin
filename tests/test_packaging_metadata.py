from __future__ import annotations

import tomllib
from pathlib import Path


def load_pyproject() -> dict:
    pyproject_path = Path(__file__).resolve().parents[1] / "pyproject.toml"
    return tomllib.loads(pyproject_path.read_text(encoding="utf-8"))


def test_pyproject_keeps_cli_entrypoint() -> None:
    pyproject = load_pyproject()
    scripts = pyproject["project"]["scripts"]
    assert scripts["jin"] == "jin.cli:main"


def test_pyproject_uses_unique_pypi_distribution_name() -> None:
    pyproject = load_pyproject()
    assert pyproject["project"]["name"] == "jin-monitor"


def test_pyproject_includes_python_packages_for_maturin() -> None:
    pyproject = load_pyproject()
    maturin = pyproject["tool"]["maturin"]
    python_packages = set(maturin["python-packages"])
    assert {"jin", "jin_core"}.issubset(python_packages)
