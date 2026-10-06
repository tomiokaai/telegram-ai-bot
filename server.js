import http from "node:http";

const PORT=Number(process.env.PORT||3000);
const BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY=process.env.OPENAI_API_KEY;
const OPENAI_MODEL=process.env.OPENAI_MODEL;
const WEBHOOK_SECRET=process.env.WEBHOOK_SECRET;
const SYSTEM_PROMPT=process.env.BOT_SYSTEM_PROMPT||"You are a helpful Telegram AI assistant. Keep replies concise and natural.";

if(!BOT_TOKEN||!OPENAI_API_KEY||!OPENAI_MODEL||!WEBHOOK_SECRET){console.error("Missing required environment variables.");process.exit(1);}

const conversations=new Map();
const MAX_HISTORY=12;

async function telegram(method,body){
  const response=await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok||!data.ok) throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  return data.result;
}

async function askAI(chatId,text){
  const history=conversations.get(chatId)||[];
  const input=[...history,{role:"user",content:text}];
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${OPENAI_API_KEY}`},body:JSON.stringify({model:OPENAI_MODEL,instructions:SYSTEM_PROMPT,input})});
  const data=await response.json();
  if(!response.ok) throw new Error(`OpenAI API error: ${JSON.stringify(data)}`);
  const answer=typeof data.output_text==="string"&&data.output_text.trim()?data.output_text.trim():"Kechirasiz, hozir javob tayyorlay olmadim.";
  conversations.set(chatId,[...input,{role:"assistant",content:answer}].slice(-MAX_HISTORY));
  return answer;
}

async function handleUpdate(update){
  const message=update?.message;
  if(!message?.chat?.id||typeof message.text!=="string") return;
  const chatId=message.chat.id,text=message.text.trim();
  if(!text) return;
  try{
    await telegram("sendChatAction",{chat_id:chatId,action:"typing"});
    const answer=await askAI(chatId,text);
    for(let i=0;i<answer.length;i+=4000) await telegram("sendMessage",{chat_id:chatId,text:answer.slice(i,i+4000)});
  }catch(error){
    console.error(error);
    await telegram("sendMessage",{chat_id:chatId,text:"⚠️ Hozircha texnik muammo yuz berdi. Birozdan keyin yana urinib ko‘ring."});
  }
}

const server=http.createServer((req,res)=>{
  const url=new URL(req.url,`http://localhost:${PORT}`);
  const webhookPath=`/telegram/${WEBHOOK_SECRET}`;
  if(req.method==="GET"&&url.pathname==="/"){res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({ok:true,service:"telegram-ai-bot"}));return;}
  if(req.method==="POST"&&url.pathname===webhookPath){
    let body="";
    req.on("data",chunk=>{body+=chunk});
    req.on("end",async()=>{
      try{const update=JSON.parse(body);res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({ok:true}));await handleUpdate(update);}
      catch(error){console.error("Webhook error:",error);if(!res.headersSent){res.writeHead(400,{"content-type":"application/json"});res.end(JSON.stringify({ok:false}));}}
    });
    return;
  }
  res.writeHead(404,{"content-type":"application/json"});res.end(JSON.stringify({ok:false,error:"Not found"}));
});
server.listen(PORT,"0.0.0.0",()=>console.log(`Telegram AI bot listening on port ${PORT}`));
