import { classifyIntent, EXTRACT_visitorInfo, presentationAndLanguageDetection, sendMessageLimitExceeded, subtractOneMessageLimit } from '@agent/nodes.js';
import { moonieState } from '@agent/state.js';
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { messageLimitCheck, visitorDataIsCompleteCheck } from './conditionalNodes.js';

const moonieGraph = new StateGraph(moonieState)
    .addNode("presentationAndLanguageDetection", presentationAndLanguageDetection)
    .addNode("EXTRACT_visitorInfo", EXTRACT_visitorInfo)
    .addNode("subtractOneMessageLimit", subtractOneMessageLimit)
    .addNode("classifyIntent", classifyIntent)
    // .addNode("loadContext", loadContext)
    // .addNode("answerCVQuestion", answerCVQuestion)
    // .addNode("offerCVDownload", offerCVDownload)
    // .addNode("resolveDownloadLanguage", resolveDownloadLanguage)
    // .addNode("sendCVLink", sendCVLink)
    // .addNode("handleOther", handleOther)
    // .addNode("handleUnknown", handleUnknown)
    .addNode("sendMessageLimitExceeded", sendMessageLimitExceeded)
    // Aristas
    .addConditionalEdges(START, messageLimitCheck)
    // .addConditionalEdges("subtractOneMessageLimit", messageLimitCheck)
    .addEdge("presentationAndLanguageDetection", "EXTRACT_visitorInfo")
    .addConditionalEdges("EXTRACT_visitorInfo", visitorDataIsCompleteCheck)
    // Aristas finales / Convergencia de Nodos
    .addEdge("classifyIntent", "subtractOneMessageLimit")
    .addEdge("sendMessageLimitExceeded", END)
    .addEdge("subtractOneMessageLimit", END)


const memorySaver = new MemorySaver()
export default moonieGraph.compile({ checkpointer: memorySaver })