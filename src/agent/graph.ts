import { answerCVQuestion, classifyIntent, EXTRACT_visitorInfo, handleOther, handleUnknown, loadContext, presentationAndLanguageDetection, sendMessageLimitExceeded, subtractOneMessageLimit } from '@agent/nodes.js';
import { moonieState } from '@agent/state.js';
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { messageLimitCheck, visitorDataIsCompleteCheck, visitorIntentionCheck } from './conditionalNodes.js';

const moonieGraph = new StateGraph(moonieState)
    // * Definicion de nodos
    .addNode("presentationAndLanguageDetection", presentationAndLanguageDetection)
    .addNode("EXTRACT_visitorInfo", EXTRACT_visitorInfo)
    .addNode("subtractOneMessageLimit", subtractOneMessageLimit)
    .addNode("classifyIntent", classifyIntent)
    .addNode("loadContext", loadContext)
    .addNode("answerCVQuestion", answerCVQuestion)
    // .addNode("offerCVDownload", offerCVDownload)
    // .addNode("resolveDownloadLanguage", resolveDownloadLanguage)
    // .addNode("sendCVLink", sendCVLink)
    .addNode("handleOther", handleOther)
    .addNode("handleUnknown", handleUnknown)
    .addNode("sendMessageLimitExceeded", sendMessageLimitExceeded)
    // * Definicion de aristas
    .addConditionalEdges(START, messageLimitCheck)
    .addConditionalEdges("classifyIntent", visitorIntentionCheck)
    .addConditionalEdges("EXTRACT_visitorInfo", visitorDataIsCompleteCheck)
    .addEdge("presentationAndLanguageDetection", "subtractOneMessageLimit")
    .addEdge("loadContext", "answerCVQuestion")
    // Aristas finales / Convergencia de Nodos
    .addEdge("handleOther", "subtractOneMessageLimit")
    .addEdge("handleUnknown", "subtractOneMessageLimit")
    .addEdge("answerCVQuestion", "subtractOneMessageLimit")
    .addEdge("sendMessageLimitExceeded", END)
    .addEdge("subtractOneMessageLimit", END)


const memorySaver = new MemorySaver()
export default moonieGraph.compile({ checkpointer: memorySaver })