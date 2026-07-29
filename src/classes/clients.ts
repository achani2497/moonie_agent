import { ENV } from "@constants/config.js";
import { LangfuseClient } from "@langfuse/client";
import { CallbackHandler } from "@langfuse/langchain";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

export class Clients {
    readonly langfuse: LangfuseClient;
    readonly handler: CallbackHandler;
    readonly spanProcessor: LangfuseSpanProcessor;
    private static instance: Clients | null = null;

    constructor() {
        const resolved = {
            publicKey: ENV.CONFIG.LANGFUSE_PUBLIC_KEY!,
            secretKey: ENV.CONFIG.LANGFUSE_SECRET_KEY!,
            baseUrl: ENV.CONFIG.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
        };

        this.langfuse = new LangfuseClient(resolved);

        this.spanProcessor = new LangfuseSpanProcessor({
            ...resolved,
            exportMode: "immediate",
        });
        const sdk = new NodeSDK({ spanProcessors: [this.spanProcessor] });
        sdk.start();

        this.handler = new CallbackHandler();
    }

    static getInstance(): Clients {
        if (!Clients.instance) Clients.instance = new Clients();
        return Clients.instance;
    }
}
