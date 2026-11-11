import {viewer} from '@/lib/auth';import Dashboard from './dashboard';
export default async function Page(){const uid=await viewer();return <Dashboard loggedIn={!!uid}/>}
