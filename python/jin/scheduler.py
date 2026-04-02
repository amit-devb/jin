from __future__ import annotations

import asyncio
import contextvars
from datetime import datetime, timezone
import inspect
import re
from collections.abc import Awaitable, Callable
from datetime import timedelta

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
except ImportError:  # pragma: no cover
    class AsyncIOScheduler:  # type: ignore[override]
        def __init__(self) -> None:
            self.running = False

        def start(self) -> None:
            self.running = True

        def shutdown(self, wait: bool = False) -> None:
            self.running = False


class JinScheduler:
    def __init__(
        self,
        failure_threshold: int = 3,
        history_limit: int = 10,
        retry_backoff_seconds: int = 0,
        retry_backoff_cap_seconds: int = 3600,
    ) -> None:
        self.scheduler = AsyncIOScheduler()
        self.failure_threshold = failure_threshold
        self.history_limit = history_limit
        self.retry_backoff_seconds = retry_backoff_seconds
        self.retry_backoff_cap_seconds = retry_backoff_cap_seconds
        self.failures: dict[str, int] = {}
        self.running = False
        self.jobs: set[str] = set()
        self.paused_jobs: set[str] = set()
        self.job_meta: dict[str, dict[str, object | None]] = {}
        self.skipped_jobs: dict[str, dict[str, object | None]] = {}
        self._run_trigger: contextvars.ContextVar[str] = contextvars.ContextVar(
            "jin_scheduler_run_trigger",
            default="scheduler",
        )

    def start(self) -> None:
        if not self.running:  # pragma: no branch
            try:
                self.scheduler.start()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                self.scheduler._eventloop = loop
                self.scheduler.start()
            self.running = True

    def shutdown(self) -> None:
        if self.running:  # pragma: no branch
            self.scheduler.shutdown(wait=False)
            self.running = False

    def register(
        self,
        job_id: str,
        schedule: str | None,
        func: Callable[[], Awaitable[None] | None],
    ) -> bool:
        if not schedule or job_id in self.jobs:
            return False
        schedule_spec = self._parse_schedule(schedule)
        if schedule_spec is None:
            return False

        async def runner() -> None:
            metadata = self.job_meta.setdefault(job_id, self._default_job_meta())
            if self._backoff_active(metadata):
                metadata["last_status"] = "backoff"
                metadata["last_error"] = metadata.get("last_error") or "waiting_for_retry_window"
                self._append_run_event(
                    metadata,
                    {
                        "started_at": None,
                        "finished_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" "),
                        "status": "backoff",
                        "error": metadata["last_error"],
                        "duration_ms": None,
                    },
                )
                return
            metadata["last_started_at"] = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
            started = datetime.now(timezone.utc)
            try:
                result = func()
                if inspect.isawaitable(result):
                    await result
                self.failures[job_id] = 0
                metadata["last_status"] = "success"
                metadata["last_error"] = None
                metadata["paused_reason"] = None
                metadata["next_retry_at"] = None
                metadata["consecutive_successes"] = int(metadata.get("consecutive_successes") or 0) + 1
            except Exception as exc:
                self.failures[job_id] = self.failures.get(job_id, 0) + 1
                metadata["last_status"] = "error"
                metadata["last_error"] = str(exc) or "job failed"
                metadata["consecutive_successes"] = 0
                if self.failures[job_id] < self.failure_threshold:
                    metadata["next_retry_at"] = self._next_retry_at_value(self.failures[job_id])
                if self.failures[job_id] >= self.failure_threshold:
                    try:
                        self.scheduler.pause_job(job_id)
                        self.paused_jobs.add(job_id)
                        metadata["paused_reason"] = "failure_threshold"
                    except Exception:
                        pass
                    metadata["next_retry_at"] = None
            finally:
                finished = datetime.now(timezone.utc)
                metadata["last_finished_at"] = finished.replace(tzinfo=None).isoformat(sep=" ")
                metadata["last_duration_ms"] = int((finished - started).total_seconds() * 1000)
                self._append_run_event(
                    metadata,
                    {
                        "started_at": metadata["last_started_at"],
                        "finished_at": metadata["last_finished_at"],
                        "status": metadata["last_status"],
                        "error": metadata["last_error"],
                        "duration_ms": metadata["last_duration_ms"],
                    },
                )

        trigger = schedule_spec["trigger"]
        trigger_kwargs = schedule_spec["kwargs"]
        self.scheduler.add_job(runner, trigger, id=job_id, replace_existing=True, **trigger_kwargs)
        self.jobs.add(job_id)
        metadata = self.job_meta.setdefault(job_id, self._default_job_meta())
        metadata["runner"] = runner
        metadata["schedule"] = schedule_spec["normalized"]
        self.skipped_jobs.pop(job_id, None)
        return True

    def record_skipped(self, job_id: str, schedule: str | None, reason: str) -> None:
        self.skipped_jobs[job_id] = {
            "job_id": job_id,
            "schedule": schedule,
            "failures": 0,
            "paused": False,
            "running": self.running,
            "last_started_at": None,
            "last_finished_at": None,
            "last_status": "skipped",
            "last_error": None,
            "next_run_at": None,
            "last_duration_ms": None,
            "paused_reason": None,
            "consecutive_successes": 0,
            "skip_reason": reason,
            "next_retry_at": None,
            "recent_runs": [
                {
                    "started_at": None,
                    "finished_at": None,
                    "status": "skipped",
                    "error": None,
                    "duration_ms": None,
                }
            ],
        }

    def pause(self, job_id: str) -> bool:
        if job_id not in self.jobs:
            return False
        try:
            self.scheduler.pause_job(job_id)
        except Exception:
            return False
        self.paused_jobs.add(job_id)
        metadata = self.job_meta.setdefault(job_id, self._default_job_meta())
        metadata["paused_reason"] = "manual"
        metadata["next_retry_at"] = None
        return True

    def resume(self, job_id: str) -> bool:
        if job_id not in self.jobs:
            return False
        try:
            self.scheduler.resume_job(job_id)
        except Exception:
            return False
        self.paused_jobs.discard(job_id)
        metadata = self.job_meta.setdefault(job_id, self._default_job_meta())
        metadata["paused_reason"] = None
        metadata["next_retry_at"] = None
        return True

    def remove(self, job_id: str) -> bool:
        removed = False
        if job_id in self.jobs:
            remove_job = getattr(self.scheduler, "remove_job", None)
            if remove_job is not None:
                try:
                    remove_job(job_id)
                except Exception:
                    pass
            self.jobs.discard(job_id)
            self.paused_jobs.discard(job_id)
            self.failures.pop(job_id, None)
            self.job_meta.pop(job_id, None)
            removed = True
        if job_id in self.skipped_jobs:
            self.skipped_jobs.pop(job_id, None)
            removed = True
        return removed

    async def run_now(self, job_id: str, trigger: str = "manual") -> bool:
        metadata = self.job_meta.get(job_id)
        runner = metadata.get("runner") if metadata else None
        if job_id not in self.jobs or runner is None:
            return False
        metadata["next_retry_at"] = None
        token = self._run_trigger.set(str(trigger or "manual"))
        try:
            await runner()
        finally:
            self._run_trigger.reset(token)
        return True

    def current_trigger(self) -> str:
        value = self._run_trigger.get()
        return str(value or "scheduler")

    def job_status(self) -> list[dict[str, object]]:
        jobs = []
        for job in sorted(self.jobs):
            metadata = self.job_meta.get(job, {})
            jobs.append(
                {
                    "job_id": job,
                    "failures": self.failures.get(job, 0),
                    "paused": job in self.paused_jobs,
                    "running": self.running,
                    "last_started_at": metadata.get("last_started_at"),
                    "last_finished_at": metadata.get("last_finished_at"),
                    "last_status": metadata.get("last_status", "never"),
                    "last_error": metadata.get("last_error"),
                    "next_run_at": self._next_run_at(job),
                    "last_duration_ms": metadata.get("last_duration_ms"),
                    "paused_reason": metadata.get("paused_reason"),
                    "consecutive_successes": metadata.get("consecutive_successes", 0),
                    "next_retry_at": metadata.get("next_retry_at"),
                    "backoff_active": self._backoff_active(metadata),
                    "recent_runs": metadata.get("recent_runs", []),
                    "skip_reason": None,
                }
            )
        jobs.extend(self.skipped_jobs.values())
        jobs.sort(key=lambda item: str(item["job_id"]))
        return jobs

    def _next_run_at(self, job_id: str) -> str | None:
        get_job = getattr(self.scheduler, "get_job", None)
        if get_job is None:
            return None
        job = get_job(job_id)
        next_run = getattr(job, "next_run_time", None)
        return str(next_run) if next_run is not None else None

    @staticmethod
    def _default_job_meta() -> dict[str, object | None]:
        return {
            "last_started_at": None,
            "last_finished_at": None,
            "last_status": "never",
            "last_error": None,
            "last_duration_ms": None,
            "paused_reason": None,
            "consecutive_successes": 0,
            "next_retry_at": None,
            "recent_runs": [],
            "runner": None,
            "schedule": None,
        }

    def _append_run_event(self, metadata: dict[str, object | None], event: dict[str, object | None]) -> None:
        history = list(metadata.get("recent_runs") or [])
        history.insert(0, event)
        metadata["recent_runs"] = history[: self.history_limit]

    def _next_retry_at_value(self, failures: int) -> str:
        seconds = min(self.retry_backoff_seconds * max(failures, 1), self.retry_backoff_cap_seconds)
        return (datetime.now(timezone.utc) + timedelta(seconds=seconds)).replace(tzinfo=None).isoformat(sep=" ")

    @staticmethod
    def _backoff_active(metadata: dict[str, object | None]) -> bool:
        next_retry_at = metadata.get("next_retry_at")
        if not next_retry_at:
            return False
        if not isinstance(next_retry_at, str) or not next_retry_at:
            return False
        try:
            retry_at = datetime.fromisoformat(next_retry_at)
        except ValueError:
            return False
        return datetime.now(timezone.utc).replace(tzinfo=None) < retry_at

    @staticmethod
    def _interval_hours(schedule: str) -> int | None:
        match = re.fullmatch(r"every\s+(\d+)h", schedule.strip())
        if not match:
            return None
        return int(match.group(1))

    @staticmethod
    def is_supported_schedule(schedule: str | None) -> bool:
        if not schedule:
            return False
        return JinScheduler._parse_schedule(schedule) is not None

    @staticmethod
    def _parse_schedule(schedule: str) -> dict[str, object] | None:
        raw = schedule.strip().lower()
        every_match = re.fullmatch(r"every\s+(\d+)h", raw)
        if every_match:
            hours = int(every_match.group(1))
            if hours <= 0:
                return None
            return {
                "trigger": "interval",
                "kwargs": {"hours": hours},
                "normalized": f"every {hours}h",
            }

        daily_match = re.fullmatch(r"daily\s+([01]\d|2[0-3]):([0-5]\d)", raw)
        if daily_match:
            hour = int(daily_match.group(1))
            minute = int(daily_match.group(2))
            return {
                "trigger": "cron",
                "kwargs": {"hour": hour, "minute": minute},
                "normalized": f"daily {hour:02d}:{minute:02d}",
            }

        weekly_match = re.fullmatch(
            r"weekly\s+([a-z]{3}(?:,[a-z]{3})*)\s+([01]\d|2[0-3]):([0-5]\d)",
            raw,
        )
        if not weekly_match:
            return None

        normalized_days: list[str] = []
        seen: set[str] = set()
        day_aliases = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
        for token in weekly_match.group(1).split(","):
            day = token.strip()
            if day not in day_aliases:
                return None
            if day not in seen:
                seen.add(day)
                normalized_days.append(day)
        if not normalized_days:
            return None

        hour = int(weekly_match.group(2))
        minute = int(weekly_match.group(3))
        day_of_week = ",".join(normalized_days)
        return {
            "trigger": "cron",
            "kwargs": {"day_of_week": day_of_week, "hour": hour, "minute": minute},
            "normalized": f"weekly {day_of_week} {hour:02d}:{minute:02d}",
        }
