"""OpenTelemetry setup — shared across all AstroOS services (CC-3.1).

One entry point, `setup_telemetry(service_name)`, configures:
  - A TracerProvider with a Resource identifying the service (service.name,
    service.version, deployment.environment).
  - A span exporter chosen by env:
      OTEL_EXPORTER_OTLP_ENDPOINT set → OTLP gRPC exporter (prod collector).
      otherwise                       → ConsoleSpanExporter (dev/test, stdout).
  - Idempotent: safe to call once per process; re-calls are no-ops.

FastAPIInstrumentor is applied in each service's create_app via
`instrument_app(app)`, which adds automatic HTTP request spans (method, route,
status, duration) + the service.name resource.

Design notes:
  - OTel is OPTIONAL at runtime: if the opentelemetry packages are not
    installed, setup_telemetry + instrument_app degrade to no-ops (the service
    still runs). This keeps dev environments without the SDK functional.
  - Console exporter lets us validate spans without a collector — the smoke
    test asserts a span appears in stdout after a request.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

log = logging.getLogger(__name__)

_PROVIDER_CONFIGURED = False


def setup_telemetry(service_name: str,
                    service_version: str = "1.0.0") -> Optional[object]:
    """Configure the global TracerProvider. Idempotent.

    Returns the TracerProvider (or None if OTel unavailable/disabled).
    Set OTEL_SDK_DISABLED=true to turn telemetry off entirely.
    """
    global _PROVIDER_CONFIGURED
    if _PROVIDER_CONFIGURED:
        return None
    if os.environ.get("OTEL_SDK_DISABLED", "").lower() in ("true", "1", "yes"):
        log.info("OpenTelemetry disabled via OTEL_SDK_DISABLED")
        return None

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError:
        log.debug("opentelemetry-sdk not installed; telemetry disabled")
        return None

    resource = Resource.create({
        "service.name": service_name,
        "service.version": service_version,
        "deployment.environment": os.environ.get("DEPLOY_ENV", "dev"),
    })
    provider = TracerProvider(resource=resource)

    exporter = _make_exporter()
    if exporter is not None:
        provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)
    _PROVIDER_CONFIGURED = True
    log.info("OpenTelemetry configured for '%s' (exporter=%s)",
             service_name, type(exporter).__name__ if exporter else "none")
    return provider


def _make_exporter():
    """OTLP exporter when OTEL_EXPORTER_OTLP_ENDPOINT is set, else Console."""
    otlp_endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")
    if otlp_endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
                OTLPSpanExporter,
            )
            return OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
        except ImportError:
            log.warning("OTLP endpoint set but exporter unavailable; falling back to console")
    # Dev/test default: print spans to stdout.
    from opentelemetry.sdk.trace.export import ConsoleSpanExporter
    return ConsoleSpanExporter()


def instrument_app(app) -> None:
    """Attach FastAPI auto-instrumentation to an app. No-op if unavailable."""
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)
    except ImportError:
        log.debug("FastAPI instrumentor unavailable; skipping")
    except Exception:
        log.exception("failed to instrument FastAPI app")


def get_tracer(name: str = __name__):
    """Return a tracer for manual span creation (no-op if OTel unavailable)."""
    try:
        from opentelemetry import trace
        return trace.get_tracer(name)
    except ImportError:
        return None
