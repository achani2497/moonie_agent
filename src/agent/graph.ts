import { presentationAndLanguageDetection } from '@agent/nodes.js';
import { moonieState } from '@agent/state.js';
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";

const moonieGraph = new StateGraph(moonieState)
    .addNode("presentationAndLanguageDetection", presentationAndLanguageDetection)
    // .addNode("checkMessageLimit", checkMessageLimit)
    // .addNode("classifyIntent", classifyIntent)
    // .addNode("loadContext", loadContext)
    // .addNode("answerCVQuestion", answerCVQuestion)
    // .addNode("offerCVDownload", offerCVDownload)
    // .addNode("resolveDownloadLanguage", resolveDownloadLanguage)
    // .addNode("sendCVLink", sendCVLink)
    // .addNode("handleOther", handleOther)
    // .addNode("handleUnknown", handleUnknown)
    // Aristas
    .addEdge(START, "presentationAndLanguageDetection")
    .addEdge("presentationAndLanguageDetection", END)

const memorySaver = new MemorySaver()
export default moonieGraph.compile({ checkpointer: memorySaver })