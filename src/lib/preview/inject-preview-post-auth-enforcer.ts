/** After preview login, keep authed users off welcome/auth/admin gate routes. */

export function buildPreviewPostAuthEnforcerScript(appHomeRoute = "/home"): string {
  return `(function(){
  if(window.__VODEX_POST_AUTH_ENFORCER__)return;
  window.__VODEX_POST_AUTH_ENFORCER__=true;
  var APP_HOME=${JSON.stringify(appHomeRoute)};
  function authed(){try{return localStorage.getItem("sb-preview-auth")==="1";}catch(e){return false;}}
  function norm(p){
    if(!p)return"/";
    p=String(p).split("?")[0].split("#")[0];
    if(!p.startsWith("/"))p="/"+p;
    return p.replace(/\\/+$/, "")||"/";
  }
  function targetRoute(){
    var home=norm(window.__VODEX_PREVIEW_APP_HOME__||APP_HOME||"/home");
    try{
      var s=sessionStorage.getItem("vodex-preview-post-auth-route");
      if(s&&s.trim()&&!isGateRoute(norm(s)))return norm(s);
    }catch(e){}
    try{
      var p=new URLSearchParams(location.search).get("route");
      if(p&&p.trim()&&!isGateRoute(norm(p)))return norm(p);
    }catch(e){}
    return home;
  }
  function isWelcomeRoute(p){
    p=norm(p).toLowerCase();
    if(p==="/")return true;
    if(/\\/(welcome|splash|onboarding|intro|landing)(\\/|$)/.test(p))return true;
    return false;
  }
  function isGateRoute(p){
    p=norm(p).toLowerCase();
    if(/\\/(welcome|splash|onboarding|intro|landing)(\\/|$)/.test(p))return true;
    if(/\\/(login|signup|sign-up|register|auth|callback|forgot|reset)(\\/|$)/.test(p))return true;
    if(/admin|diagnostic|debug|test-auth|authdiagnost/.test(p))return true;
    return false;
  }
  function setVirtualRoute(route){
    route=norm(route);
    window.__VODEX_VIRTUAL_PATH__=route;
    try{
      history.replaceState({__vodex:route,vodexPreview:1},"",location.pathname+(location.search||""));
      window.dispatchEvent(new PopStateEvent("popstate",{state:{__vodex:route}}));
    }catch(e){}
    try{parent.postMessage({type:"vodex-preview-route",path:route},"*");}catch(e){}
  }
  function enforce(){
    if(!authed())return;
    var target=targetRoute();
    if(isGateRoute(target))target=norm(window.__VODEX_PREVIEW_APP_HOME__||APP_HOME||"/home");
    var cur=window.__VODEX_VIRTUAL_PATH__||norm(location.pathname)||"/";
    if(isWelcomeRoute(cur)&&!isWelcomeRoute(target)){
      setVirtualRoute(target);
      return;
    }
    if(isGateRoute(cur)||/admin|diagnostic|authdiagnost/i.test(cur)){
      setVirtualRoute(target);
    }
  }
  enforce();
  setTimeout(enforce,50);
  setTimeout(enforce,250);
  setTimeout(enforce,800);
  setTimeout(enforce,1800);
  setInterval(enforce,1200);
  window.addEventListener("popstate",function(){setTimeout(enforce,0);});
})();`;
}

export function injectPreviewPostAuthEnforcer(html: string, appHomeRoute = "/home"): string {
  if (html.includes('id="vodex-preview-post-auth-enforcer"')) return html;
  const script = `<script id="vodex-preview-post-auth-enforcer" data-vodex-preview-shim="true">${buildPreviewPostAuthEnforcerScript(appHomeRoute)}</script>`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${script}`);
  }
  return script + html;
}
