import crypto from 'node:crypto';
export function verifyLine(body,signature) {
  if (!signature || !process.env.LINE_MESSAGING_CHANNEL_SECRET) return false;
  const sig=crypto.createHmac('sha256',process.env.LINE_MESSAGING_CHANNEL_SECRET).update(body,'utf8').digest('base64');
  const a=Buffer.from(sig),b=Buffer.from(signature);return a.length===b.length && crypto.timingSafeEqual(a,b);
}
async function callLine(path,payload){const r=await fetch('https://api.line.me/v2/bot/message/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN}`},body:JSON.stringify(payload)});if(!r.ok)throw new Error('LINE API '+r.status+': '+(await r.text()).slice(0,300));}
export const replyLine=(replyToken,text)=>callLine('reply',{replyToken,messages:[{type:'text',text:text.slice(0,4900)}]});
export const pushLine=(to,text)=>callLine('push',{to,messages:[{type:'text',text:text.slice(0,4900)}]});
export async function voiceToText(messageId){
 const r=await fetch(`https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`,{headers:{Authorization:`Bearer ${process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN}`}});if(!r.ok)throw new Error('語音下載失敗');
 const type=r.headers.get('content-type')||'audio/mp4';const raw=await r.arrayBuffer();const ext=type.includes('wav')?'wav':type.includes('mpeg')?'mp3':'m4a';
 const form=new FormData();form.set('file',new File([raw],`voice.${ext}`,{type}));form.set('model','gpt-4o-mini-transcribe');
 const out=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:form});if(!out.ok)throw new Error('語音轉文字失敗 '+out.status);return (await out.json()).text||'';
}
