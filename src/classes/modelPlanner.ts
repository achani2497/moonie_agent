import { AllModelsUnavailableError } from '@classes/customError.js';
import { CHAT_POOL, EXTRACT_POOL } from '@constants/models.js';
import { BaseMessage } from '@langchain/core/messages';
import type { ModelDescriptor, StructuredPayload, Task } from '@moonie-types/models.js';
import { PROVIDERS } from './llmFactory.js';

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
    const modelsChain = this.getChainOfModels(task);
    const start = this.lastFunctioningModelIndex[task] % modelsChain.length;
    const failures: Error[] = [];

    for (let offset = 0; offset < modelsChain.length; offset++) {
      const i = (start + offset) % modelsChain.length;
      const modelDescriptor = modelsChain[i];

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

  // Produce los tokens de la respuesta de forma continua: por cada token que
  // genera, llama a `onGeneratedToken`.
  public async generateTokens(
    task: Task,
    messages: (BaseMessage | { role: string; content: string })[],
    temperature = 0,
    onGeneratedToken: (token: string) => void,
  ): Promise<string> {
    const modelChains = this.getChainOfModels(task);
    const startIndex = this.lastFunctioningModelIndex[task] % modelChains.length;
    let fullContent = '';

    for (let offset = 0; offset < modelChains.length; offset++) {
      const modelIndex = (startIndex + offset) % modelChains.length;
      const descriptor = modelChains[modelIndex];

      try {
        const llm = PROVIDERS[descriptor.provider](descriptor, temperature);
        const llmStream = await llm.stream(messages);

        let firstChunkReceived = false;
        for await (const chunk of llmStream) {
          if (!firstChunkReceived) {
            // El sticky se mueve recién cuando sabemos que este modelo sí tiene
            // cuota (el primer chunk llegó). Igual que resolveModel.
            this.lastFunctioningModelIndex[task] = modelIndex;
            console.info(`Utilizando el modelo: ${descriptor.model}`)
            firstChunkReceived = true;
          }
          const messageChunk = typeof chunk.content === 'string' ? (chunk.content as string) : '';
          if (messageChunk) {
            fullContent += messageChunk;
            onGeneratedToken(messageChunk);
          }
        }
        return fullContent;
      } catch (error) {
        // El 429 aparece antes de emitir tokens visibles.
        if (isQuotaError(error)) continue;
        // Cualquier otro tipo de error se propaga
        throw error;
      }
    }

    throw new AllModelsUnavailableError();
  }
}

export const modelPlanner = new ModelPlanner();
