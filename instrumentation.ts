import { OpenTelemetry } from "@ai-sdk/otel";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PostHogSpanProcessor } from "@posthog/ai/otel";
import { registerTelemetry } from "ai";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!projectToken && process.env.NODE_ENV === "development") {
  throw new Error(
    "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
  );
}

if (!host && process.env.NODE_ENV === "development") {
  throw new Error(
    "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
  );
}

export const posthogSpanProcessor =
  projectToken && host
    ? new PostHogSpanProcessor({
        projectToken,
        host,
      })
    : undefined;

export const posthogLoggerProvider =
  projectToken && host
    ? new LoggerProvider({
        resource: resourceFromAttributes({
          "service.name": "truth-news",
        }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: new URL("/i/v1/logs", host).toString(),
              headers: {
                Authorization: `Bearer ${projectToken}`,
                "Content-Type": "application/json",
              },
            }),
          }),
        ],
      })
    : undefined;

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (!posthogSpanProcessor) {
    return;
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": "truth-news",
    }),
    spanProcessors: [posthogSpanProcessor],
  });

  sdk.start();

  registerTelemetry(new OpenTelemetry());
}
