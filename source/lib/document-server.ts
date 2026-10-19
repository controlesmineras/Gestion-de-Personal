import {env} from 'cloudflare:workers';
import {documentLinks,type Attachment} from './documents';
export async function verifyPersonFiles(person:any){const refs:Attachment[]=[...documentLinks(person.documents).other,...(person.qualifications||[]).flatMap((q:any)=>q.documents||[])];for(const fileId of new Set(refs.map(a=>a.fileId).filter(Boolean))){if(!env.BUCKET||!await env.BUCKET.head('personnel/'+person.id+'/'+fileId))throw Error('Un documento cargado no pertenece a este funcionario o no está disponible.');}}
