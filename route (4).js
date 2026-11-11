import {NextResponse} from 'next/server';
import crypto from 'node:crypto';
export async function GET(){
 const origin=process.env.NEXT_PUBLIC_APP_URL;const state=crypto.randomBytes(24).toString('hex');const nonce=crypto.randomBytes(24).toString('hex');
 const url=new URL('https://access.line.me/oauth2/v2.1/authorize');url.searchParams.set('response_type','code');url.searchParams.set('client_id',process.env.LINE_LOGIN_CHANNEL_ID);url.searchParams.set('redirect_uri',origin+'/api/auth/callback');url.searchParams.set('state',state);url.searchParams.set('scope','openid profile');url.searchParams.set('nonce',nonce);
 const r=NextResponse.redirect(url);for(const [k,v] of [['line_oauth_state',state],['line_oauth_nonce',nonce]])r.cookies.set(k,v,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:600,path:'/'});return r;
}
