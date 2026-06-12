/** Shared inline JS — public welcome/landing routes vs authenticated app home. */

export const PREVIEW_WELCOME_ROUTE_SNIPPET = `function __vodexNormPreviewPath(p){
  if(typeof p==="undefined"||p===null)p=(window.__VODEX_VIRTUAL_PATH__||"/");
  p=String(p).split("?")[0].split("#")[0];
  if(!p.startsWith("/"))p="/"+p;
  return p.replace(/\\/+/g,"/").replace(/\\/+$/, "")||"/";
}
function __vodexIsWelcomeRoute(p){
  p=__vodexNormPreviewPath(p).toLowerCase();
  if(p==="/")return true;
  return /\\/(welcome|splash|onboarding|intro|landing|signin|sign-in|start|get-started)(\\/|$)/.test(p);
}
function __vodexPreviewAuthed(){
  try{return localStorage.getItem("sb-preview-auth")==="1";}catch(e){return false;}
}`;
