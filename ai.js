import OpenAI from 'openai';
import {z} from 'zod';
const Task=z.object({title:z.string().min(1).max(180),category:z.enum(['工作','私人']),project:z.string().max(80),priority:z.enum(['important','normal']),due_at:z.string().nullable(),needs_clarification:z.boolean(),question:z.string(),notes:z.string()});
const Result=z.object({tasks:z.array(Task).max(8)});
const schema={type:'object',additionalProperties:false,properties:{tasks:{type:'array',items:{type:'object',additionalProperties:false,properties:{title:{type:'string'},category:{type:'string',enum:['工作','私人']},project:{type:'string'},priority:{type:'string',enum:['important','normal']},due_at:{type:['string','null']},needs_clarification:{type:'boolean'},question:{type:'string'},notes:{type:'string'}},required:['title','category','project','priority','due_at','needs_clarification','question','notes']}}},required:['tasks']};
export async function extractTasks(text, now=new Date()) {
 const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
 const response=await openai.responses.create({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',input:[{role:'system',content:`你是台灣繁體中文個人待辦助理。現在台北時間 ${new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',dateStyle:'short',timeStyle:'medium'}).format(now)} (UTC+08:00)。解析使用者一則訊息為最多8項獨立待辦。明確事項自動建立，只有影響執行的重大資訊不明才 needs_clarification=true 並詢問一句具體問題。沒說期限就 due_at=null，不要亂猜；沒有期限本身不構成必須追問。相對日期按台灣時間解讀，due_at 若存在必須是有效的 ISO 8601 含 +08:00 時區；只說日期未說時間時，due_at=null 且將日期寫在 notes 並詢問具體截止時間嗎？但若日期明確、時間未明，可以將日期排為當天 23:59 +08:00 並在 notes 標註「未指定時間，預設當天結束」；優先採此規則。只說「聯絡講師」等不必追問就可建立無期限待辦。使用者明言緊急／重要／今天截止 → important，否則 normal。project 可以依語意猜測如活動籌備、行政、健康、家務，不能憑空補上來源不明的專案名稱。不要將非待辦語句新增。`},{role:'user',content:text}],text:{format:{type:'json_schema',name:'flowlist_task_extraction',strict:true,schema}}});
 const output=Result.parse(JSON.parse(response.output_text));
 for(const t of output.tasks){if(t.due_at){const d=new Date(t.due_at);if(Number.isNaN(d.getTime())||!/[+-]\d\d:\d\d$/.test(t.due_at)){t.needs_clarification=true;t.question='請確認這項任務的期限（例如：明天下午3點）';t.due_at=null;}else t.due_at=d.toISOString();}}
 return output.tasks;
}
