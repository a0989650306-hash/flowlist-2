import {NextResponse} from 'next/server';
export async function POST(req){const r=NextResponse.redirect(new URL('/',req.url),303);r.cookies.delete('flowlist_session');return r;}
