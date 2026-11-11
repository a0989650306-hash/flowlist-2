import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {makeSession,cookieOptions} from '@/lib/auth';
import {db,checked} from '@/lib/db';
export async function GET(req){
 const u=new URL(req.url);const c=await cookies();const state=u.searchParams.get('state');const code=u.searchParams.get('code');if(!state || state!==c.get('line_oauth_state')?.value||!code)return NextResponse.redirect(new URL('/?error=login',req.url));
 try{
 const form=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:process.env.NEXT_PUBLIC_APP_URL+'/api/auth/callback',client_id:process.env.LINE_LOGIN_CHANNEL_ID,client_secret:process.env.LINE_LOGIN_CHANNEL_SECRET});
 const tokenResp=await fetch('https://api.line.me/oauth2/v2.1/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});if(!tokenResp.ok)throw new Error('LINE token failed');const token=await tokenResp.json();
 const v=new URLSearchParams({id_token:token.id_token,client_id:process.env.LINE_LOGIN_CHANNEL_ID,nonce:c.get('line_oauth_nonce')?.value||''});
 const verifiedResp=await fetch('https://api.line.me/oauth2/v2.1/verify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:v});if(!verifiedResp.ok)throw new Error('LINE token verification failed');const profile=await verifiedResp.json();if(!profile.sub)throw new Error('missing sub');
 checked(await db().from('profiles').upsert({id:profile.sub,display_name:profile.name||'我的待辦'},{onConflict:'id'}));
 const r=NextResponse.redirect(new URL('/',req.url));r.cookies.set('flowlist_session',await makeSession(profile.sub),cookieOptions());r.cookies.delete('line_oauth_state');r.cookies.delete('line_oauth_nonce');return r;
 }catch(err){console.error(err);return NextResponse.redirect(new URL('/?error=login',req.url));}
}
