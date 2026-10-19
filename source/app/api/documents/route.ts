import {env} from 'cloudflare:workers';
import {admin,employee,db,response,cors} from '@/lib/personnel-server';
import {MAX_DOCUMENT_BYTES,scannedMime} from '@/lib/documents';
export async function OPTIONS(){return new Response(null,{status:204,headers:cors});}
export async function POST(req:Request){try{
 if(!await admin(req))return response({error:'Solo administración puede cargar documentos.'},401);
 if(!env.BUCKET)return response({error:'Carga de documentos no disponible.'},503);
 if(Number(req.headers.get('Content-Length'))>MAX_DOCUMENT_BYTES+65536)return response({error:'El archivo supera 10 MB.'},413);
 const form=await req.formData(),personId=String(form.get('personId')||''),file=form.get('file');
 if(!/^[a-zA-Z0-9-]{8,80}$/.test(personId)||!await db().prepare('SELECT id FROM people WHERE id=?').bind(personId).first())return response({error:'Guarda y sincroniza primero la ficha del funcionario.'},400);
 if(!(file instanceof File)||!file.size||file.size>MAX_DOCUMENT_BYTES)return response({error:'Carga un archivo de hasta 10 MB.'},400);
 const bytes=new Uint8Array(await file.arrayBuffer()),mime=scannedMime(bytes);if(!mime)return response({error:'Usa un documento PDF o una imagen JPG, PNG o WebP.'},400);
 const fileId=crypto.randomUUID(),name=file.name.replace(/[\x00-\x1f\x7f]/g,'').slice(0,150)||'Documento';
 await env.BUCKET.put('personnel/'+personId+'/'+fileId,bytes,{httpMetadata:{contentType:mime},customMetadata:{personId,name}});
 return response({attachment:{id:crypto.randomUUID(),fileId,name}});
 }catch{return response({error:'No se pudo cargar el documento. Intenta de nuevo.'},503);}}
export async function GET(req:Request){try{
 const url=new URL(req.url),personId=url.searchParams.get('personId')||'',fileId=url.searchParams.get('fileId')||'';
 if(!/^[a-zA-Z0-9-]{8,80}$/.test(personId)||! /^[a-f0-9-]{36}$/.test(fileId))return response({error:'Documento inválido.'},400);
 const isAdmin=await admin(req);if(!isAdmin){const owner=await employee(req);if(!owner||owner.id!==personId||owner.role==='Preparación de alimentos')return response({error:'No tienes acceso a este documento.'},403);}
 if(!env.BUCKET)return response({error:'Documentos no disponibles.'},503);
 const object=await env.BUCKET.get('personnel/'+personId+'/'+fileId);if(!object)return response({error:'Documento no encontrado.'},404);
 return new Response(object.body,{headers:{...cors,'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(object.customMetadata?.name||'Documento'),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return response({error:'No se pudo abrir el documento.'},503);}}
