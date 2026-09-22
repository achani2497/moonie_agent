import { checkCalendarTool, setMeetingTool } from "@agent/tools/calendar.js";
import { sendTelegramMessage } from "@agent/tools/communication.js";

export const COMMUNICATION_TOOLS = [sendTelegramMessage]
export const CALENDAR_TOOLS = [checkCalendarTool, setMeetingTool]