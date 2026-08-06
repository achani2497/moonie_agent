import MoonieGraph from '@agent/graph.js';
import { Clients } from '@classes/clients.js';
import { AllModelsUnavailableError, CustomError } from '@classes/customError.js';
import { ENV } from '@constants/config.js';
import { HumanMessage } from '@langchain/core/messages';
import { Request, Response } from 'express';

const clients = new Clients();
const langfuseHandler = clients.handler;

export const handleNewMessage = async (req: Request, res: Response) => {
  const { userId, message } = req.body;

  try {
    if (!userId || !message) throw new CustomError('Invalid body', 400);

    const config = {
      configurable: { thread_id: userId },
      callbacks: [langfuseHandler],
      runName: 'moonie_agent_ReAct',
      tags: [ENV.CONFIG.VERSION, 'tools_agent', 'ReAct'],
    };

    const result = await MoonieGraph.invoke({ messages: [new HumanMessage(message)] }, config);

    const finalMessage = result.messages[result.messages.length - 1];

    return res.status(200).json({ message: finalMessage.content });
  } catch (e) {
    // Quota exhaustion across the whole model chain: graph.invoke aborts BEFORE
    // subtractOneMessageLimit runs, so the user's messageLimit is NOT decremented.
    if (e instanceof AllModelsUnavailableError) {
      return res.status(503).json({
        message:
          'Uy, Moonie está teniendo problemas técnicos en este momento. Volvé a intentar en un ratito!',
      });
    }

    const message = e instanceof Error ? e.message : 'Unknown error';
    const code = e instanceof CustomError ? e.code : 500;

    console.error(message);

    return res.status(code).json({ message });
  }
};
