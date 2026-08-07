# Diagramas de Moonie

## Diagrama 1 — Arquitectura de componentes

```
┌────────────────────────────────────────────────────────────────────┐
│                          MOONIE (backend)                          │
│                                                                    │
│  ┌────────────────────────────────────────────┐  ┌───────────────┐ │
│  │                   API                      │  │ Clients       │ │
│  │               /new-message                 │  │ (Langfuse)    │ │
│  └───────┬───────────────────────────┬────────┘  └───────────────┘ │
│          │ graph.invoke              │ callbacks                   │
│          ▼                           ▼                             │
│  ┌────────────────────────────────────────────┐                    │
│  │               MOONIE GRAPH                 │                    │
│  │  ┌──────────────┐     ┌──────────────┐     │                    │
│  │  │    Nodos     │     │ Condicionales│     │                    │
│  │  └──────┬───────┘     └──────────────┘     │                    │
│  └─────────┼──────────────────────────────────┘                    │
│            │ modelPlanner.invoke / invokeStructured                │
│            ▼                                                       │
│  ┌────────────────────────────────────────────┐                    │
│  │               ModelPlanner                 │                    │
│  └───────┬───────────────────────────┬────────┘                    │
│          │ PROVIDERS[...]            │ lee pools                   │
│          ▼                           ▼                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐          │
│  │        Providers        │  │    Pools de modelos     │          │
│  └─────────────────────────┘  └─────────────────────────┘          │
│                                                                    │
│  ┌─────────────────────────┐                                       │
│  │  CustomError /          │  ← lanzado por ModelPlanner           │
│  │  AllModelsUnavailable   │                                       │
│  └─────────────────────────┘                                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Relaciones:**

1. **API → Grafo**: invoca con input + config
2. **Grafo → ModelPlanner**: los nodos llaman al router
3. **ModelPlanner → Providers**: construye el LLM
4. **ModelPlanner → Pools**: lee los descriptores
5. **API → Clients**: callbacks de Langfuse viajan en el config del graph
6. **ModelPlanner → CustomError**: lanza `AllModelsUnavailableError` → el API traduce a 503



## Diagrama 2 — Flujo de request `/new-message`

```
POST /api/v1/new-message {userId, message}
         │
         ▼
  ┌──────────────┐
  │     API      │
  └──────┬───────┘
         │ graph.invoke({messages:[HumanMessage]}, {thread_id: userId})
         ▼
  ┌──────────────────────┐
  │ messageLimitCheck    │  Condicional
  └──────┬───────────────┘
         │
         ├── messageLimit <= 0? ────────────► ┌──────────────────────┐
         │                                    │ sendMessageLimit     │
         │                                    │ Exceeded (Nodo)      │
         │                                    └──────────┬───────────┘
         │                                               │
         │                                               ▼
         │                                          ┌─────────┐
         │                                          │   END   │
         │                                          └─────────┘
         │
         ├── ¿visitorInfo incompleto?  (caso normal: primer contacto)
         ▼
  ┌────────────────────────────────────────┐
  │ presentationAndLanguageDetection       │  Nodo generador
  └──────┬─────────────────────────────────┘
         │ modelPlanner.invoke('chat', prompt + messages)
         ▼
  ┌──────────────┐
  │ ModelPlanner │
  └──────┬───────┘
         │ PROVIDERS[descriptor] → ChatGoogleGenerativeAI
         ▼
  ┌─────────────┐        ┌──────────────┐
  │  Providers  │───────►│  Gemini API  │  (429 → ModelPlanner hace round-robin)
  └─────────────┘        └──────┬───────┘
                                │ AIMessage
                                ▼
  ┌────────────────────────────────────────┐
  │ presentationAndLanguageDetection       │
  │ devuelve { messages: [AIMessage] }     │
  └──────┬─────────────────────────────────┘
         │
         ▼
  ┌────────────────────────────────────────┐
  │ EXTRACT_visitorInfo                    │  Nodo extractor
  └──────┬─────────────────────────────────┘
         │ modelPlanner.invokeStructured('extraction', presentationSchema, ...)
         ▼
  ┌──────────────┐
  │ ModelPlanner │
  └──────┬───────┘
         │ withStructuredOutput (jsonMode para ollama)
         ▼
  ┌─────────────┐        ┌──────────────┐
  │  Providers  │───────►│  Gemini API  │
  └─────────────┘        └──────┬───────┘
                                │ {name, email, reason, language}
                                ▼
  ┌────────────────────────────────────────┐
  │ EXTRACT_visitorInfo                    │
  │ actualiza visitorInfo y language       │
  └──────┬─────────────────────────────────┘
         │
         ▼
  ┌──────────────────────┐
  │ visitorDataIsComplete│  Condicional
  │ Check                │
  └──────┬───────────────┘
         │
         ├── ¿incompleto? ────────────────► ┌──────────────────────┐
         │                                  │ subtractOneMessage   │
         │                                  │ Limit (Nodo)         │
         │                                  └──────────┬───────────┘
         │                                             │ messageLimit - 1
         │                                             ▼
         │                                        ┌─────────┐
         │                                        │   END   │
         │                                        └─────────┘
         │
         ├── ¿completo?
         ▼
  ┌────────────────────────────────────────┐
  │ classifyIntent                         │  Nodo extractor
  └──────┬─────────────────────────────────┘
         │ modelPlanner.invokeStructured('extraction', intentSchema, ...)
         ▼
  ┌──────────────┐
  │ ModelPlanner │
  └──────┬───────┘
         │
         ▼
  ┌─────────────┐        ┌──────────────┐
  │  Providers  │───────►│  Gemini API  │
  └─────────────┘        └──────┬───────┘
                                │ {intent}
                                ▼
  ┌────────────────────────────────────────┐
  │ classifyIntent                         │
  │ lastIntent = intent                    │
  └──────┬─────────────────────────────────┘
         │
         ▼
  ┌──────────────────────┐
  │ subtractOneMessage   │  Nodo
  │ Limit                │
  └──────┬───────────────┘
         │ messageLimit - 1
         ▼
  ┌─────────┐
  │   END   │
  └────┬────┘
       │ graph.invoke devuelve state final
       ▼
  ┌──────────────┐
  │     API      │
  │ res.json({   │
  │  message:    │
  │  content })  │
  └──────────────┘
```

**Detalles del flujo:**

- El camino a `sendMessageLimitExceeded` solo se activa si `messageLimit <= 0`
- El camino "incompleto" de `visitorDataIsCompleteCheck` termina sin clasificar intento (solo descontó mensaje)
- Cada `invoke` del ModelPlanner puede disparar el fallback: si Gemini responde 429, el router prueba el siguiente descriptor del pool (y cross-pool al agotar el primario)
- `AllModelsUnavailableError` corta `graph.invoke` → el API responde 503 y `messageLimit` NO se descuenta

