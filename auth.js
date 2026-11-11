import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const key=()=>new TextEncoder().encode(process.env.SESSION_SECRET);
export async function makeSession(lineUserId){return new SignJWT({sub:lineUserId}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('30d').sign(key());}
export async function viewer(){try{const token=(await cookies()).get('flowlist_session')?.value;if(!token)return null;const {payload}=await jwtVerify(token,key());return payload.sub || null;}catch{return null;}}
export function cookieOptions(){return {httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*30};}
