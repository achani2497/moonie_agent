import { AllModelsUnavailableError } from '@classes/customError.js';
import { PROVIDERS } from '@classes/providers.js';
import { CHAT_POOL, EXTRACT_POOL } from '@constants/models.js';
import { BaseMessage } from '@langchain/core/messages';
import type { ModelDescriptor, StructuredPayload, Task } from '@moonie-types/models.js';

const isQuotaError = (err: unknown): boolean => {
  if (!(err instanceof Error)) {
    // Some LangChain/SDK errors are thrown as plain objects with a status field.
    const status = (err as { status?: unknown }).status;
    return status === 429;
  }

  const anyErr = err as Error & { status?: unknown; code?: unknown };
  if (anyErr.status === 429 || anyErr.code === 429) return true;

  const msg = (err.message || '').toUpperCase();
  return (
    msg.includes('RATE_LIMIT_EXCEEDED') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('QUOTA')
  );
};

export class ModelPlanner {
  // Index of the last model with quota per task.
  private lastFunctioningModelIndex: Record<Task, number> = { chat: 0, extraction: 0 };

  // Build the candidate chain: primary pool first, then the other pool as cross-pool fallback.
  private getChainOfModels(task: Task): ModelDescriptor[] {
    return task === 'chat' ? [...CHAT_POOL, ...EXTRACT_POOL] : [...EXTRACT_POOL, ...CHAT_POOL];
  }

  // Generic so each facade keeps its concrete return type:
  // invoke → BaseMessage, invokeStructured → the schema's object.
  private async resolveModel<T>(
    task: Task,
    run: (descriptor: ModelDescriptor) => Promise<T> | T,
  ): Promise<T> {
    const chain = this.getChainOfModels(task);
    const start = this.lastFunctioningModelIndex[task] % chain.length;
    const failures: Error[] = [];

    for (let offset = 0; offset < chain.length; offset++) {
      const i = (start + offset) % chain.length;
      const modelDescriptor = chain[i];

      try {
        const result = await run(modelDescriptor);
        this.lastFunctioningModelIndex[task] = i;
        return result;
      } catch (err) {
        if (isQuotaError(err)) {
          failures.push(err instanceof Error ? err : new Error(String(err)));
          // Round-Robin to seek the next model with available quota.
          continue;
        }
        // Non-quota error.
        throw err;
      }
    }

    throw new AllModelsUnavailableError();
  }

  public async invoke(
    task: Task,
    messages: (BaseMessage | { role: string; content: string })[],
    temperature = 0,
  ) {
    return this.resolveModel(task, async (descriptor) => {
      const llm = PROVIDERS[descriptor.provider](descriptor, temperature);
      return llm.invoke(messages);
    });
  }

  public async invokeStructured(
    task: Task,
    structuredPayload: StructuredPayload,
    messages: (BaseMessage | { role: string; content: string })[],
    temperature = 0,
  ) {
    return this.resolveModel(task, async (descriptor) => {
      const llm = PROVIDERS[descriptor.provider](descriptor, temperature);
      const structuredLlm = llm.withStructuredOutput(structuredPayload.schema, {
        name: structuredPayload.name,
        ...(descriptor.provider === 'ollama' ? { method: 'jsonMode' as const } : {}),
      });
      return structuredLlm.invoke(messages);
    });
  }
}

export const modelPlanner = new ModelPlanner();
