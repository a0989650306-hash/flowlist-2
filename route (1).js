import {NextResponse} from 'next/server';
import {verifyLine,replyLine,voiceToText} from '@/lib/line';
import {db,checked} from '@/lib/db';import {extractTasks} from '@/lib/ai';
export const runtime='nodejs';export const maxDuration=60;
async function handle(ev){
 if(ev.type!=='message'||ev.source?.type!=='user'||!ev.source?.userId)return;
 const user=ev.source.userId;const client=db();
 const eid=ev.webhookEventId||ev.message?.id;
 if(eid){const {error}=await client.from('processed_events').insert({id:eid});if(error?.code==='23505')return;if(error)throw error;}
 const say=async s=>{if(ev.replyToken)await replyLine(ev.replyToken,s);};
 try{
  if(!['text','audio'].includes(ev.message?.type)){await say('請傳送文字或語音來新增待辦。');return;}
  const incoming=ev.message.type==='audio'?await voiceToText(ev.message.id):ev.message.text.trim();
  checked(await client.from('profiles').upsert({id:user},{onConflict:'id'}));
  let text=incoming;
  const pending=checked(await client.from('pending_clarifications').select('*').eq('user_id',user).maybeSingle());
  if(pending){text=`原先事項：${pending.original_text}\n補充說明：${incoming}`;checked(await client.from('pending_clarifications').delete().eq('user_id',user));}
  const tasks=await extractTasks(text);
  const clear=tasks.filter(t=>!t.needs_clarification),unclear=tasks.filter(t=>t.needs_clarification);
  if(clear.length){checked(await client.from('tasks').insert(clear.map(t=>({user_id:user,title:t.title,category:t.category,project:t.project,priority:t.priority,due_at:t.due_at,notes:t.notes,source:'line'}))));}
  if(unclear.length){checked(await client.from('pending_clarifications').upsert({user_id:user,original_text:unclear.map(t=>t.title+' '+t.notes).join('；'),question:unclear[0].question||'可以補充一下這件事嗎？',updated_at:new Date().toISOString()},{onConflict:'user_id'}));}
  const lines=[];if(clear.length)lines.push(`✅ 已新增 ${clear.length} 項待辦：\n`+clear.map((t,i)=>`${i+1}. ${t.title}${t.due_at?'（'+new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(t.due_at))+'）':''}`).join('\n'));
  if(unclear.length)lines.push('❓ '+(unclear[0].question||'可以補充一下這項待辦嗎？'));
  await say(lines.join('\n\n')||'我沒有辨識出待辦事項，請再描述一次。');
 }catch(e){console.error('webhook process error',e);try{await say('目前處理失敗，請稍後再試。');}catch{}}
}
export async function POST(req){const raw=await req.text();if(!verifyLine(raw,req.headers.get('x-line-signature')))return NextResponse.json({error:'signature invalid'},{status:401});let payload;try{payload=JSON.parse(raw);}catch{return NextResponse.json({error:'invalid JSON'},{status:400});}for(const ev of payload.events||[])await handle(ev);return NextResponse.json({ok:true});}
