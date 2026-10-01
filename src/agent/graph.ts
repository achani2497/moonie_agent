import { answerCVQuestion, classifyIntent, confirmationActionResult, EXTRACT_visitorInfo, handleCalendarCheck, handleOther, handleSetMeeting, handleTelegramMessage, handleUnknown, loadContext, presentationAndLanguageDetection, sendMessageLimitExceeded, subtractOneMessageLimit } from '@agent/nodes.js';
import { moonieState } from '@agent/state.js';
import { moonieCheckpointer } from '@agent/checkpointer.js';
import { CHECK_CALENDAR_CAPABILITY, SET_MEETING_CAPABILITY, TELEGRAM_CAPABILITY } from '@constants/capabilities.js';
import { CALENDAR_TOOLS, COMMUNICATION_TOOLS } from '@constants/toolSets.js';
import { END, START, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { CHECK_afterToolCall, CHECK_messageLimit, CHECK_toolCallWasBinded, CHECK_visitorDataIsComplete, CHECK_visitorIntention } from './conditionalNodes.js';

const communicationTools = new ToolNode(COMMUNICATION_TOOLS)
const calendarTools = new ToolNode(CALENDAR_TOOLS)

const moonieGraph = new StateGraph(moonieState)
    // * Definicion de nodos
    .addNode("presentationAndLanguageDetection", presentationAndLanguageDetection)
    .addNode("EXTRACT_visitorInfo", EXTRACT_visitorInfo)
    .addNode("subtractOneMessageLimit", subtractOneMessageLimit)
    .addNode("classifyIntent", classifyIntent)
    .addNode("loadContext", loadContext)
    .addNode("answerCVQuestion", answerCVQuestion)
    .addNode("communicationTools", communicationTools)
    .addNode("calendarTools", calendarTools)
    .addNode("confirmationActionResult", confirmationActionResult)
    .addNode(CHECK_CALENDAR_CAPABILITY.handlerNode, handleCalendarCheck)
    // .addNode("offerCVDownload", offerCVDownload)
    // .addNode("resolveDownloadLanguage", resolveDownloadLanguage)
    // .addNode("sendCVLink", sendCVLink)
    .addNode(TELEGRAM_CAPABILITY.handlerNode, handleTelegramMessage)
    .addNode(SET_MEETING_CAPABILITY.handlerNode, handleSetMeeting)
    .addNode("handleOther", handleOther)
    .addNode("handleUnknown", handleUnknown)
    .addNode("sendMessageLimitExceeded", sendMessageLimitExceeded)
    // * Definicion de aristas
    .addConditionalEdges(START, CHECK_messageLimit)
    .addConditionalEdges("classifyIntent", CHECK_visitorIntention)
    .addConditionalEdges("EXTRACT_visitorInfo", CHECK_visitorDataIsComplete)
    // Guard de seguridad antes de ir a un ToolNode para garantizar que hay una tool call esperando a ser invocada por el ToolNode
    .addConditionalEdges(TELEGRAM_CAPABILITY.handlerNode, CHECK_toolCallWasBinded("communicationTools"))
    .addConditionalEdges("communicationTools", CHECK_afterToolCall)
    .addConditionalEdges(CHECK_CALENDAR_CAPABILITY.handlerNode, CHECK_toolCallWasBinded("calendarTools"))
    .addConditionalEdges(SET_MEETING_CAPABILITY.handlerNode, CHECK_toolCallWasBinded("calendarTools"))
    .addConditionalEdges("calendarTools", CHECK_afterToolCall)
    .addEdge("presentationAndLanguageDetection", "subtractOneMessageLimit")
    .addEdge("loadContext", "answerCVQuestion")
    // Aristas finales / Convergencia de Nodos
    .addEdge("confirmationActionResult", "subtractOneMessageLimit")
    .addEdge("handleOther", "subtractOneMessageLimit")
    .addEdge("handleUnknown", "subtractOneMessageLimit")
    .addEdge("answerCVQuestion", "subtractOneMessageLimit")
    .addEdge("sendMessageLimitExceeded", END)
    .addEdge("subtractOneMessageLimit", END)


export default moonieGraph.compile({ checkpointer: moonieCheckpointer })