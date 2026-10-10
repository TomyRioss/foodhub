import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { doorDashSubject, parseDoorDashPdf, safePdfUrl, orderFromMessage, extractPdf } from "../lib/doordash.ts";
import { GmailClient, gmailQuery } from "../lib/gmail.ts";

const subject = "Delivery order from Jeremiah A. for SMASH GULA: Order # b0ff3158";
test("DoorDash identification rejects lookalike senders and unrelated messages", () => {
  assert.deepEqual(doorDashSubject("DoorDash <orders@doordash.com>", subject), {customer:"Jeremiah A.", restaurant:"SMASH GULA",orderId:"b0ff3158"});
  assert.deepEqual(doorDashSubject("DoorDash < orders@doordash.com >", subject), {customer:"Jeremiah A.", restaurant:"SMASH GULA",orderId:"b0ff3158"});
  for (const sender of ["orders@doordash.com.attacker.test", "attacker@test.com", "orders@sub.doordash.com"]) assert.equal(doorDashSubject(sender, subject), null);
  assert.equal(doorDashSubject("orders@doordash.com", "Your DoorDash receipt"), null);
});
test("PDF parser extracts only real items and distinguishes tax from order total", () => {
  const result = parseDoorDashPdf("Qty. Item Price Subtotal\n1x Bacon Smash (in )SMASH BURGERS\n• Recommended Sides Smash Loaded Fries (+ $10.49)\n$22.98 $22.98\n~ End of Order ~\n1x Total Items Subtotal: $22.98\n+ Tax (7.000%): $1.04\nTotal: $24.02\n1 items Today at 8:36 PM");
  assert.equal(result.items.length,1);
  assert.deepEqual(result.items[0], {quantity:1,name:"Bacon Smash",options:["Recommended Sides Smash Loaded Fries (+ $10.49)"],price:22.98});
  assert.equal(result.total,24.02);
  assert.equal(result.pickupTime,"8:36 PM");
  assert.equal(parseDoorDashPdf("unrecognized layout").total,undefined);
});
test("PDF links exclude confirmation actions, local addresses and external hosts", () => {
  assert.equal(safePdfUrl("https://orders.doordash.com/order.pdf")?.hostname,"orders.doordash.com");
  for (const url of ["http://orders.doordash.com/order.pdf","https://doordash.com/confirm?id=1","https://127.0.0.1/order.pdf","https://doordash.com.evil.test/a.pdf","https://evil.test@doordash.com/a.pdf","https://doordash.com:8094/a.pdf"]) assert.equal(safePdfUrl(url),null);
});
test("historical pickup dates remain calendar dates and Tomorrow crosses year boundary",()=>{
  assert.equal(parseDoorDashPdf("Local Placed on Thursday, December 31, 2026 at 8:24 PM\n1 items Tomorrow at 8:36 PM").pickupTime,"Jan 1, 2027 · 8:36 PM");
  assert.equal(parseDoorDashPdf("Local Placed on Monday, September 28, 2026 at 8:24 PM\n1 items Tomorrow at 8:36 PM\nOct 1, 2026\nPayment: Pre-Paid").pickupTime,"Oct 1, 2026 · 8:36 PM");
  assert.equal(parseDoorDashPdf("Local Placed on Monday, September 28, 2026 at 8:24 PM\n1 items Today at 8:36 PM").pickupTime,"Sep 28, 2026 · 8:36 PM");
});
test("missing PDF preserves truthful partial order and never fetches confirmation", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("Confirmation link must never be fetched"); };
  try {
    const result = await orderFromMessage({id:"mail-1",internalDate:"1770000000000",payload:{headers:[{name:"From",value:"orders@doordash.com"},{name:"Subject",value:subject}],mimeType:"text/html",body:{data:Buffer.from('<a href="https://doordash.com/confirm">Confirm</a>').toString("base64url")}}}, {attachment:async()=>{throw new Error("Unexpected attachment");}});
    assert.equal(result.orderId,"b0ff3158"); assert.equal(result.items.length,0); assert.match(result.warning,/PDF no disponible/);
  } finally { globalThis.fetch=original; }
});
test("Gmail traverses every result page including archive, spam and trash", async () => {
  const original = globalThis.fetch; const queries=[];
  globalThis.fetch=async(url)=>{
    const parsed=new URL(url); queries.push(parsed);
    if(parsed.pathname.endsWith("/messages")) return Response.json(parsed.searchParams.get("pageToken")?{messages:[{id:"b"}]}:{messages:[{id:"a"}],nextPageToken:"page2"});
    return Response.json({id:parsed.pathname.split("/").at(-1),internalDate:"1770000000000",payload:{}});
  };
  try {
    const client=new GmailClient({accessToken:"test",expiresAt:Date.now()+3600000,scope:"gmail.readonly"},async()=>{});
    const messages=[];for await(const message of client.messages(1770000000000))messages.push(message.id);
    const listQueries=queries.filter(query=>query.pathname.endsWith("/messages"));
    assert.deepEqual(messages,["a","b"]);
    assert.equal(listQueries.length,2);
    assert.ok(listQueries.every(query=>query.searchParams.get("includeSpamTrash")==="true"));
    assert.ok(listQueries.every(query=>query.searchParams.get("q")===gmailQuery(1770000000000)));
    assert.match(gmailQuery(1770000000000),/\bfrom:orders@doordash\.com\b/);
  } finally {globalThis.fetch=original;}
});
test("Gmail refreshes expired access token and persists rotated access", async () => {
  const original=globalThis.fetch;let saved;
  globalThis.fetch=async(url,options)=>{
    if(String(url).includes("oauth2.googleapis.com"))return Response.json({access_token:"renewed",expires_in:3600});
    assert.equal(options.headers.Authorization,"Bearer renewed");return Response.json({messages:[]});
  };
  try {const client=new GmailClient({accessToken:"expired",refreshToken:"refresh",expiresAt:0,scope:"gmail.readonly"},async(tokens)=>{saved=tokens;});for await(const message of client.messages(0))assert.fail(message);assert.equal(saved.accessToken,"renewed");assert.equal(saved.refreshToken,"refresh");}
  finally{globalThis.fetch=original;}
});
test("Gmail skips an inaccessible individual message and keeps traversing subsequent pages",async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async(url)=>{
    const parsed=new URL(url);
    if(parsed.pathname.endsWith("/messages"))return Response.json(parsed.searchParams.get("pageToken")?{messages:[{id:"good"}]}:{messages:[{id:"deleted"}],nextPageToken:"next"});
    if(parsed.pathname.endsWith("/deleted"))return Response.json({error:{}},{status:404});
    return Response.json({id:"good",internalDate:"1770000000000",payload:{}});
  };
  try {const client=new GmailClient({accessToken:"test",expiresAt:Date.now()+3600000,scope:"gmail.readonly"},async()=>{});const result=[];for await(const message of client.messages(0))result.push(message);assert.equal(result.length,2);assert.match(result[0].readError,/leer un correo/);assert.equal(result[1].id,"good");}
  finally{globalThis.fetch=original;}
});
test("Gmail retries transient failures with a bounded number of attempts",async()=>{
  const original=globalThis.fetch;let attempts=0;
  globalThis.fetch=async()=>{attempts++;return Response.json({error:{}},{status:503});};
  try{const client=new GmailClient({accessToken:"test",expiresAt:Date.now()+3600000,scope:"gmail.readonly"},async()=>{});await assert.rejects(async()=>{for await(const message of client.messages(0))assert.fail(message);},/503/);assert.equal(attempts,3);}
  finally{globalThis.fetch=original;}
});
test("Gmail retries quota 403 reasons and succeeds before the retry limit",async()=>{
  for (const reason of ["rateLimitExceeded","userRateLimitExceeded"]) {
    const original=globalThis.fetch;let attempts=0;
    globalThis.fetch=async()=>{attempts++;return attempts<3?Response.json({error:{errors:[{reason}]}},{status:403}):Response.json({messages:[]});};
    try{const client=new GmailClient({accessToken:"test",expiresAt:Date.now()+3600000,scope:"gmail.readonly"},async()=>{});for await(const message of client.messages(0))assert.fail(message);assert.equal(attempts,3);}
    finally{globalThis.fetch=original;}
  }
});
test("Gmail does not retry non-quota 403 responses",async()=>{
  const original=globalThis.fetch;let attempts=0;
  globalThis.fetch=async()=>{attempts++;return Response.json({error:{errors:[{reason:"insufficientPermissions"}]}},{status:403});};
  try{const client=new GmailClient({accessToken:"test",expiresAt:Date.now()+3600000,scope:"gmail.readonly"},async()=>{});await assert.rejects(async()=>{for await(const message of client.messages(0))assert.fail(message);},/insufficientPermissions/);assert.equal(attempts,1);}
  finally{globalThis.fetch=original;}
});
test("Gmail stops the scan when a per-message quota limit persists",async()=>{
  const original=globalThis.fetch;let listCalls=0,messageCalls=0;
  globalThis.fetch=async(url)=>{const parsed=new URL(url);if(parsed.pathname.endsWith("/messages")){listCalls++;return Response.json({messages:[{id:"limited"},{id:"must-not-read"}]});}messageCalls++;if(parsed.pathname.endsWith("/must-not-read"))assert.fail("The scan continued after exhausting quota retries");return Response.json({error:{errors:[{reason:"userRateLimitExceeded"}]}},{status:403});};
  try{const client=new GmailClient({accessToken:"test",expiresAt:Date.now()+3600000,scope:"gmail.readonly"},async()=>{});await assert.rejects(async()=>{for await(const message of client.messages(0))assert.fail(message);},/límite temporal de solicitudes/);assert.equal(listCalls,1);assert.equal(messageCalls,3);}
  finally{globalThis.fetch=original;}
});
test("Gmail cancellation interrupts a rate-limit retry delay",async()=>{
  const original=globalThis.fetch;const controller=new AbortController();let attempts=0;
  globalThis.fetch=async()=>{attempts++;setTimeout(()=>controller.abort(),20);return Response.json({error:{errors:[{reason:"rateLimitExceeded"}]}},{status:403});};
  try{const client=new GmailClient({accessToken:"test",expiresAt:Date.now()+3600000,scope:"gmail.readonly"},async()=>{},controller.signal);await assert.rejects(async()=>{for await(const message of client.messages(0))assert.fail(message);},{name:"AbortError"});assert.equal(attempts,1);}
  finally{globalThis.fetch=original;controller.abort();}
});
const sample="C:/Users/Pc/Downloads/delivery-b0ff3158.pdf";
test("provided DoorDash PDF parses actual customer items and total",{skip:!existsSync(sample)},async()=>{
  const result=parseDoorDashPdf(await extractPdf(readFileSync(sample)));
  assert.equal(result.items.length,1);assert.equal(result.items[0].name,"Bacon Smash");assert.equal(result.total,24.02);assert.equal(result.pickupTime,"Sep 28, 2026 · 8:36 PM");
});
