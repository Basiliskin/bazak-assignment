/**
 * What the LLM sees of earlier Messages — provider-neutral (the adapter maps it to SDK messages).
 * `note` = context written by the system (e.g. which Products a reply showed), never by the model itself.
 */
export interface HistoryMessage {
  role: 'user' | 'assistant' | 'note';
  text: string;
}
