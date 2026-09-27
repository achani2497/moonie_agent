import MoonieGraph from '@agent/graph.js';
import { moonieState } from '@agent/state.js';
import { Clients } from '@classes/clients.js';
import { AllModelsUnavailableError, CustomError } from '@classes/customError.js';
import { ENV } from '@constants/config.js';
import { NoAvailableModelMessage } from '@constants/messages.js';
import { HumanMessage } from '@langchain/core/messages';
import { runChatStream } from '@services/stream/chatStream.js';
import { isUserLocked, lockUser, unlockUser } from '@services/userLock.js';
import { Request, Response } from 'express';

const clients = new Clients();
const langfuseHandler = clients.handler;

export const handleNewMessage = async (req: Request, res: Response) => {
  const { userId, message } = req.body;

  try {
    if (!userId || !message) throw new CustomError('Invalid body', 400);

    if (isUserLocked(userId)) {
      // Respuesta JSON ya que es un error a nivel HTTP, no un evento SSE.
      return res.status(409).json({
        message: 'Esperá un cachito, todavía estoy procesando el último mensaje!',
      });
    }
    lockUser(userId);

    const userWantsStreamedResponse = req.headers.accept?.includes('text/event-stream');

    const config = {
      configurable: { thread_id: userId },
      callbacks: [langfuseHandler],
      runName: 'moonie_agent_ReAct',
      tags: [ENV.CONFIG.VERSION, 'tools_agent', 'ReAct'],
    };

    // --- Stream (SSE) response ---
    if (userWantsStreamedResponse) {
      await runChatStream(MoonieGraph, res, { messages: [new HumanMessage(message)] }, config);
      return;
    }

    // --- JSON response ---
    const result: typeof moonieState.State = await MoonieGraph.invoke({ messages: [new HumanMessage(message)] }, config);

    const finalMessage = result.messages[result.messages.length - 1];

    return res.status(200).json({ message: finalMessage.content, messageLimit: result.messageLimit });
  } catch (e) {
    // Si todos los modelos gratuitos se quedan sin cuota disponible, tiro este error genérico
    if (e instanceof AllModelsUnavailableError) {
      return res.status(503).json({
        message: NoAvailableModelMessage,
      });
    }

    const message = e instanceof Error ? e.message : 'Unknown error';
    const code = e instanceof CustomError ? e.code : 500;

    console.error(message);

    return res.status(code).json({ message });
  } finally {
    if (userId) unlockUser(userId);
  }
};
