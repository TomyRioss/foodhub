import assert from "node:assert/strict";
import { test } from "node:test";
import { scanOrderMessages } from "../lib/import-orders.ts";

const order = (id) => ({platform:"doordash",orderId:id,gmailMessageId:id,customer:"Customer",restaurant:"Local",receivedAt:new Date(1000).toISOString(),status:"pending",items:[],currency:"USD",subject:"Order"});
async function* messages(values) {
  for(const value of values) {
    if("readError" in value) { yield value; continue; }
    const headers=value.payload?.headers ?? [];
    const defaults=[];
    if(!headers.some(header=>header.name.toLowerCase()==="from")) defaults.push({name:"From",value:"DoorDash <orders@doordash.com>"});
    if(!headers.some(header=>header.name.toLowerCase()==="subject")) defaults.push({name:"Subject",value:`Delivery order from Customer for Local: Order # ${value.id}`});
    yield {...value,payload:{...value.payload,headers:[...headers,...defaults]}};
  }
}
async function collect(generator) {const events=[];for await(const event of generator)events.push(event);return events;}
test("scan applies exact millisecond cutoff and ignores drafts and future messages",async()=>{
  const parsed=[];let watermark;
  const events=await collect(scanOrderMessages({startedAt:2000,cutoff:1001,messages:messages([
    {id:"boundary-before",internalDate:"1000",payload:{}},
    {id:"boundary-in",internalDate:"1001",payload:{}},
    {id:"now",internalDate:"2000",payload:{}},
    {id:"future",internalDate:"2001",payload:{}},
    {id:"draft",internalDate:"1500",payload:{},labelIds:["DRAFT"]},
    {id:"malformed",internalDate:"unknown",payload:{}},
  ]),parse:async(message)=>{parsed.push(message.id);return null;},upsert:async()=>assert.fail("No orders expected"),completed:async(time)=>{watermark=time;}}));
  assert.deepEqual(parsed,["boundary-in","now"]);assert.equal(events.at(-1).scanned,6);assert.equal(watermark,2000);
});
test("repeat scan reports duplicate and exposes persisted preparation status",async()=>{
  const persisted={...order("same"),status:"preparing"};let creates=0;
  const events=await collect(scanOrderMessages({startedAt:2000,cutoff:0,messages:messages([{id:"a",internalDate:"1000",payload:{}},{id:"b",internalDate:"1000",payload:{}}]),parse:async()=>order("same"),upsert:async(input)=>{if(!creates++){return{created:true,order:input};}return{created:false,order:persisted};},completed:async()=>{}}));
  assert.equal(events.at(-1).created,1);assert.equal(events.at(-1).duplicates,1);assert.equal(events.at(-1).matched,2);
  assert.equal(events.filter((event)=>event.type==="order").at(-1).order.status,"preparing");
});
test("unreadable message and failed save do not stop remaining messages or advance watermark",async()=>{
  let completed=false;
  const events=await collect(scanOrderMessages({startedAt:2000,cutoff:0,messages:messages([{id:"unreadable",readError:"Read failed"},{id:"failed-save",internalDate:"1000",payload:{}},{id:"success",internalDate:"1000",payload:{}}]),parse:async(message)=>order(message.id),upsert:async(input)=>{if(input.orderId==="failed-save")throw new Error("Storage unavailable");return{created:true,order:input};},completed:async()=>{completed=true;}}));
  assert.equal(events.at(-1).scanned,3);assert.equal(events.at(-1).errors,2);assert.equal(events.at(-1).created,1);assert.equal(completed,false);assert.equal(events.filter((event)=>event.type==="error").length,2);
});
test("cancelled scan performs no further parsing or persistence",async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(async()=>collect(scanOrderMessages({startedAt:2000,cutoff:0,signal:controller.signal,messages:messages([{id:"a",internalDate:"1000",payload:{}}]),parse:async()=>assert.fail("Cancelled"),upsert:async()=>assert.fail("Cancelled"),completed:async()=>assert.fail("Cancelled")})),/cancelado/);
});
test("received-only scan skips account outgoing and processes archived or sent-labeled DoorDash mail",async()=>{
  const parsed=[];
  const mail=(id,labels,from)=>({id,internalDate:"1000",payload:{headers:[{name:"From",value:from}]},labelIds:labels});
  const events=await collect(scanOrderMessages({startedAt:2000,cutoff:0,accountEmail:"atuantojofl@gmail.com",messages:messages([
    mail("outgoing",["SENT"],"Local <atuantojofl@gmail.com>"),
    mail("self-inbox",["SENT","INBOX"],"atuantojofl@gmail.com"),
    mail("received-archive",[],"orders@doordash.com"),
    mail("received-sent-label",["SENT"],"orders@doordash.com"),
  ]),parse:async(message)=>{parsed.push(message.id);return null;},upsert:async()=>assert.fail("No orders expected"),completed:async()=>{}}));
  assert.deepEqual(parsed,["received-archive","received-sent-label"]);assert.equal(events.at(-1).scanned,4);
  assert.ok(events.some((event)=>event.type==="review"&&event.review?.reason==="Copia enviada desde esta cuenta"));
});
