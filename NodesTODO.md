# Nodos del agente de CV — Moonie

 checklist de implementación. Marcá con `[x]` los que ya terminaste.

- [ ] `checkMessageLimit`
- [ ] `presentationAndLanguageDetection`
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
