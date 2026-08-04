# Nodos del agente de CV — Moonie

 checklist de implementación. Marcá con `[x]` los que ya terminaste.

- [ ] `subtractOneMessageLimit`
- [ ] `generatePresentationResponse`
- [ ] `extractVisitorInfo`
- [ ] `classifyIntent`
- [ ] `loadContext`
- [ ] `answerCVQuestion`
- [ ] `offerCVDownload`
- [ ] `resolveDownloadLanguage`
- [ ] `sendCVLink`
- [ ] `handleOther`
- [ ] `handleUnknown`

## Notas de seguridad por nodo

Cuando marques un nodo como terminado, revisá que hayas considerado:

- [ ] El prompt no expone información sensible del sistema.
- [ ] El prompt incluye instrucciones contra prompt injection.
- [ ] La salida del LLM no se devuelve cruda al frontend sin validar.
- [ ] El nodo no ejecuta ni expone datos que no correspondan a su responsabilidad.

## Estado actual

- Ningún nodo implementado todavía.

## Diseño del flujo de presentación

El nodo original `presentationAndLanguageDetection` se dividió en dos nodos siguiendo el patrón **Generation + Extraction**:

1. **`generatePresentationResponse`**: LLM de respuesta natural (`gemini-2.5-flash`, temperature 0). Presenta a Moonie y pide los datos al usuario.
2. **`extractVisitorInfo`**: LLM de extracción estructurada (`gemini-3.1-flash-lite-001` o `gemini-2.5-flash` si se prefiere un solo modelo). Extrae `name`, `email` y `reason` del último mensaje del usuario, permitiendo campos nulos.

La transición entre nodos se controla con una `conditionalEdge` que verifica si `visitorInfo` está completo antes de pasar a `classifyIntent`.
