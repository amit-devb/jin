from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Callable, Literal

@dataclass
class Dimension:
    name: str
    field: str | None = None
    
@dataclass
class Aggregation:
    field: str
    type: Literal["sum", "avg", "count", "min", "max"]

@dataclass
class Sum(Aggregation):
    def __init__(self, field: str):  # pragma: no cover
        super().__init__(field=field, type="sum")

@dataclass
class Avg(Aggregation):
    def __init__(self, field: str):  # pragma: no cover
        super().__init__(field=field, type="avg")
        
@dataclass
class Count(Aggregation):
    def __init__(self, field: str="*"):  # pragma: no cover
        super().__init__(field=field, type="count")

@dataclass
class Metric:
    name: str
    calculation: Aggregation
    dimensions: list[Dimension] = field(default_factory=list)
    time_dimension: str | None = None

def override_metrics(metrics: list[Metric]) -> Callable[[Any], Any]:
    def decorator(func: Any) -> Any:  # pragma: no cover
        func._jin_metrics = metrics
        return func
    return decorator

