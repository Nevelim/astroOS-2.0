"""Pytest configuration shared across all AstroOS services.

Disables OpenTelemetry span export during test runs — spans in test stdout
are noise, and the BatchSpanProcessor can race with pytest's stdout capture
on shutdown. Live server runs keep telemetry active (configured per-service
via setup_telemetry). The OTel instrumentation itself is still exercised by
the observability unit tests, which re-enable it explicitly.
"""
import os

# Must be set before any service create_app() imports the OTel SDK.
os.environ.setdefault("OTEL_SDK_DISABLED", "true")
