// Resource-driven loading. Progress is based on decoded images and downloaded
// audio bytes, never a fake timer; each call creates a separate loading session.
export async function loadResources(tasks,onProgress,signal){
 if(!tasks.length){onProgress(100);return;}
 const fractions=tasks.map(()=>0);
 const report=()=>{
  const percent=Math.min(100,Math.max(0,Math.floor(fractions.reduce((s,v)=>s+v,0)/fractions.length*100)));
  onProgress(percent);
 };
 report();
 await Promise.all(tasks.map(async(task,index)=>{
  const progress=value=>{
   fractions[index]=Math.max(fractions[index],Math.max(0,Math.min(1,Number(value)||0)));
   report();
  };
  await task(progress,signal);
  progress(1);
 }));
 onProgress(100);
}
export function waitForImage(image,signal){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(Error('Chargement annulé'));
  const cleanup=()=>{
   image.removeEventListener('load',loaded);
   image.removeEventListener('error',failed);
   signal?.removeEventListener('abort',aborted);
  };
  const done=()=>{
   cleanup();
   if(!image.naturalWidth)return reject(Error('Image illisible : '+image.src));
   if(typeof image.decode==='function')image.decode().then(resolve,reject);
   else resolve();
  };
  const loaded=()=>done();
  const failed=()=>{cleanup();reject(Error('Image indisponible : '+image.src));};
  const aborted=()=>{cleanup();reject(Error('Chargement annulé'));};
  image.addEventListener('load',loaded,{once:true});
  image.addEventListener('error',failed,{once:true});
  signal?.addEventListener('abort',aborted,{once:true});
  if(image.complete)(image.naturalWidth?done():failed());
 });
}
export function waitForAudio(audio,signal){
 if(!audio)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(Error('Chargement annulé'));
  const cleanup=()=>{
   for(const event of ['loadeddata','canplay','canplaythrough'])audio.removeEventListener(event,ready);
   audio.removeEventListener('error',failed);
   signal?.removeEventListener('abort',aborted);
  };
  const ready=()=>{
   // HAVE_CURRENT_DATA is sufficient once fetchEntire has received every byte.
   if(audio.readyState>=2){cleanup();resolve();}
  };
  const failed=()=>{cleanup();reject(Error('Son indisponible : '+audio.src));};
  const aborted=()=>{cleanup();reject(Error('Chargement annulé'));};
  for(const event of ['loadeddata','canplay','canplaythrough'])audio.addEventListener(event,ready);
  audio.addEventListener('error',failed,{once:true});
  signal?.addEventListener('abort',aborted,{once:true});
  ready();
  if(audio.error)failed();
 });
}
export async function fetchEntire(url,progress=()=>{},signal,fetchImpl=fetch){
 const response=await fetchImpl(url,{signal,cache:'force-cache'});
 if(!response.ok)throw Error('Ressource indisponible ('+response.status+') : '+url);
 const size=Number(response.headers.get('Content-Length'))||0;
 if(!response.body?.getReader){
  await response.arrayBuffer();progress(1);return;
 }
 const reader=response.body.getReader();
 let received=0;
 try{
  for(;;){
   const {value,done}=await reader.read();
   if(done)break;
   received+=value?.byteLength??0;
   if(size)progress(Math.min(.99,received/size));
  }
 }finally{reader.releaseLock();}
 progress(1);
}
