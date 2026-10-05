import { z } from 'zod';
import { defaultHosting, mergeHosting, hostingDocument, hostingReply } from '../public/hosting/plan.js';
import { validateDocument } from './protocol.ts';
export const hostingSchema=z.object({site:z.enum(['static','php']),database:z.boolean(),email:z.enum(['none','hosted','external']),launch:z.enum(['new','move'])}).strict();
const replySchema=z.object({patch:hostingSchema.partial(),unsupported:z.boolean().optional()}).strict();
export const hostingChatSystem=`Interpret a request for an InterServer DirectAdmin hosting setup plan. Return ONLY JSON: {"patch":{"site":"php","database":true,"email":"hosted"}}. Keys: site static|php, database boolean, email none|hosted|external, launch new|move. Input hosting is current state. Include ONLY changes requested this turn; keep unmentioned choices. A PHP database app means site php and database true. A database request implies PHP in this limited example. Static HTML means site static and database false. Business email/mailboxes here means email hosted. Keep Gmail/Microsoft/current email elsewhere means email external. Moving/migrating an existing site means launch move. Never claim to execute setup, inspect DNS, provision, deploy, or verify anything. This is a planning demo, not connected to a hosting account. For unsupported requests (WordPress, VPS, Node server, pricing, live status, real operations) set unsupported true; extract any supported preferences but never invent capabilities, facts, credentials or actions. No commands, URLs, domain names or prose. Example follow-up: 'keep email elsewhere' -> {"patch":{"email":"external"}}. /no_think`;
export function hostingChatDocument(raw:unknown,current=defaultHosting()){
  const {patch,unsupported}=replySchema.parse(raw);
  const before=hostingSchema.parse(current);
  const next=mergeHosting(before,patch);
  return validateDocument(hostingDocument(next,{},unsupported?'This demo plans static or PHP websites, databases, email and site moves. It cannot check or change a live account. Adjust those choices below.':hostingReply(before,next)));
}
