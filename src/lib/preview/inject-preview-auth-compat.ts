/** Preview-only auth compat — Base44 / Supabase clients missing redirectToLogin in iframe. */

export function buildPreviewAuthCompatScript(): string {
  return `(function(){
  if(window.__VODEX_AUTH_COMPAT__)return;
  window.__VODEX_AUTH_COMPAT__=true;
  var warn=function(m){try{console.warn("[Vodex preview]",m);}catch(e){}};
  var mockUser={id:"preview-user",email:"preview@vodex.dev",user_metadata:{full_name:"Preview User"}};
  function navLogin(){
    warn("auth.redirectToLogin -> virtual /login");
    try{
      if(window.__VODEX_VIRTUAL_PATH__!==undefined){
        window.__VODEX_VIRTUAL_PATH__="/login";
        history.replaceState({__vodex:"/login"},"","/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }else{
        window.postMessage({type:"vodex:navigate",path:"/login"},"*");
      }
    }catch(e){}
    return Promise.resolve({ok:true});
  }
  function enrichAuth(auth){
    if(!auth||typeof auth!=="object")return auth;
    var names=["redirectToLogin","redirectToSignup","login","signIn","signUp","requireAuth"];
    for(var i=0;i<names.length;i++){
      if(typeof auth[names[i]]!=="function")auth[names[i]]=navLogin;
    }
    if(typeof auth.me!=="function")auth.me=function(){return Promise.resolve(mockUser);};
    if(typeof auth.logout!=="function")auth.logout=function(){return Promise.resolve();};
    if(typeof auth.getUser!=="function")auth.getUser=function(){return Promise.resolve({data:{user:mockUser},error:null});};
    if(typeof auth.getSession!=="function")auth.getSession=function(){return Promise.resolve({data:{session:{user:mockUser}},error:null});};
    if(typeof auth.onAuthStateChange!=="function")auth.onAuthStateChange=function(cb){try{if(cb)cb("SIGNED_IN",{user:mockUser});}catch(e){}return {data:{subscription:{unsubscribe:function(){}}}};};
    if(typeof auth.signOut!=="function")auth.signOut=function(){return Promise.resolve({error:null});};
  }
  window.__vodexEnrichAuth=enrichAuth;
  function wrapClient(client){
    if(!client||client.__vodexAuthWrapped)return client;
    if(client.auth)enrichAuth(client.auth);
    client.__vodexAuthWrapped=true;
    return client;
  }
  function patchCreateClient(name,factory){
    if(typeof factory!=="function")return;
    window[name]=function(){
      return wrapClient(factory.apply(this,arguments));
    };
  }
  patchCreateClient("createClient",window.createClient);
  patchCreateClient("createBase44Client",window.createBase44Client);
  try{
    var _assign=Object.assign;
    Object.assign=function(target){
      var out=_assign.apply(Object,arguments);
      for(var i=1;i<arguments.length;i++){
        var src=arguments[i];
        if(src&&src.auth)enrichAuth(src.auth);
      }
      if(target&&target.auth)enrichAuth(target.auth);
      return out;
    };
  }catch(e){}
})();`;
}

/** Prepend auth compat to served JS bundles (Vite chunks with inlined Base44 client). */
export function prependPreviewAuthCompatToJs(bundle: string): string {
  if (bundle.includes("__VODEX_AUTH_COMPAT__")) return bundle;
  return `${buildPreviewAuthCompatScript()}\n${patchMinifiedAuthObjectsInJs(bundle)}`;
}

const PREVIEW_AUTH_NAV_FN =
  'async function(){try{window.__VODEX_VIRTUAL_PATH__="/login";history.replaceState({},"","/");window.dispatchEvent(new PopStateEvent("popstate"));}catch(e){}return Promise.resolve()}';

/** Patch sanitized Base44 auth literals baked into built chunks (missing redirectToLogin). */
export function patchMinifiedAuthObjectsInJs(text: string): string {
  return text.replace(
    /auth:\{(?![^}]{0,500}redirectToLogin)(getUser|getSession|onAuthStateChange)/g,
    `auth:{redirectToLogin:${PREVIEW_AUTH_NAV_FN},$1`,
  );
}

export function injectPreviewAuthCompat(html: string): string {
  if (html.includes("vodex-preview-auth-compat")) return html;
  const script = `<script id="vodex-preview-auth-compat" data-vodex-preview-shim="true">${buildPreviewAuthCompatScript()}</script>`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${script}`);
  }
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (m) => `${m}${script}`);
  }
  return script + html;
}
