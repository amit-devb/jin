from __future__ import annotations

from typing import Any, Callable


def watch(
    schedule: str | None = None,
    threshold: int | None = None,
    default_params: dict[str, Any] | None = None,
    baseline_mode: str | None = None,
) -> Callable:
    def decorator(func: Callable) -> Callable:
        setattr(
            func,
            "_jin_watch",
            {
                "schedule": schedule,
                "threshold": threshold,
                "default_params": default_params or {},
                "baseline_mode": baseline_mode or "fixed",
            },
        )
        return func

    return decorator
