import {NextResponse} from 'next/server';import {db,checked} from '@/lib/db';import {pushLine} from '@/lib/line';
export const runtime='nodejs';export const maxDuration=60;
const fmt=d=>new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(d));
function taipeiDate(date){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function taipeiTime(date){return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);}
export async function GET(req){
 const auth=req.headers.get('authorization');if(!process.env.CRON_SECRET||auth!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'unauthorized'},{status:401});
 const client=db(),now=new Date(),today=taipeiDate(now),time=taipeiTime(now);let sent=0,failed=0;
 // 每 5 分鐘執行；重要事項於到期前 60 分鐘內第一次偵測時提醒，過期不補發。
 const future=new Date(now.getTime()+60*60*1000).toISOString();
 const important=checked(await client.from('tasks').select('id,user_id,title,due_at').eq('priority','important').is('completed_at',null).is('reminded_at',null).gte('due_at',now.toISOString()).lte('due_at',future).limit(200));
 for(const t of important){try{await pushLine(t.user_id,`⏰ 重要待辦提醒\n${t.title}\n期限：${fmt(t.due_at)}\n完成後請到 FlowList 勾選。`);checked(await client.from('tasks').update({reminded_at:new Date().toISOString()}).eq('id',t.id).is('reminded_at',null));sent++;}catch(e){console.error('reminder',e);failed++;}}
 // 每日 09:00 - 09:04（台北時間）執行；daily_digest_logs 避免重複。
 if(time>='09:00'&&time<'09:05'){
  const profiles=checked(await client.from('profiles').select('id').limit(200));
  for(const p of profiles){try{
    const exists=checked(await client.from('daily_digest_logs').select('user_id').eq('user_id',p.id).eq('date',today).maybeSingle());if(exists)continue;
    const tasks=checked(await client.from('tasks').select('title,due_at,priority').eq('user_id',p.id).is('completed_at',null).limit(100));
    const todayTasks=tasks.filter(t=>t.due_at&&taipeiDate(new Date(t.due_at))===today);const overdue=tasks.filter(t=>t.due_at&&new Date(t.due_at)<now && taipeiDate(new Date(t.due_at))!==today);
    const body=`FlowList｜${today} 今日摘要\n今日到期 ${todayTasks.length} 項｜逾期 ${overdue.length} 項｜待辦共 ${tasks.length} 項\n`+(todayTasks.slice(0,8).map(t=>`• ${t.title}（${fmt(t.due_at)}）`).join('\n')||'今天沒有到期待辦')+(overdue.length?'\n\n逾期：'+overdue.slice(0,5).map(t=>t.title).join('、'):'');
    await pushLine(p.id,body);checked(await client.from('daily_digest_logs').insert({user_id:p.id,date:today}));sent++;
   }catch(e){console.error('digest',e);failed++;}}
 }
 return NextResponse.json({ok:true,sent,failed,date:today,time});
}
