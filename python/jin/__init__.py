from .watch import watch
from .metrics import Metric, Dimension, Sum, Avg, Count, override_metrics

try:
    from .middleware import JinMiddleware
except ModuleNotFoundError as exc:  # pragma: no cover
    _import_error = exc

    class JinMiddleware:  # type: ignore[no-redef]
        def __init__(self, *args, **kwargs):
            raise RuntimeError(
                "JinMiddleware requires FastAPI/Starlette and DuckDB dependencies to be installed"
            ) from _import_error


__all__ = ["JinMiddleware", "watch", "Metric", "Dimension", "Sum", "Avg", "Count", "override_metrics"]
