/**
 * Detects when an imported Next.js app renders its own 404 for the preview proxy path
 * and notifies the parent Vodex shell via postMessage.
 */
export function buildPreviewInnerWatchdogScript(): string {
  return `(function(){
  var SENT=false;
  function haystack(){
    var t=document.title||"";
    var b="";
    try{b=document.body?(document.body.innerText||document.body.textContent||""):"";}catch(e){}
    return (t+" "+b);
  }
  function extractBadPath(text){
    var m=text.match(/api\\/projects\\/[a-f0-9-]{36}\\/preview-html[^\\s"'<>]*/i);
    if(m)return m[0];
    m=text.match(/"([^"]*api\\/projects\\/[^"]*preview-html[^"]*)"/i);
    if(m)return m[1];
    m=text.match(/(api\\/projects\\/[a-f0-9-]{36}\\/preview-html)/i);
    return m?m[1]:null;
  }
  function looksLikeInnerNext404(text){
    var lower=text.toLowerCase();
    var has404=lower.indexOf("page not found")>=0||lower.indexOf("could not be found in this application")>=0;
    if(!has404)return false;
    return lower.indexOf("api/projects/")>=0||lower.indexOf("preview-html")>=0;
  }
  function report(){
    if(SENT||window.__VODEX_INNER_ERROR_SENT__)return;
    var text=haystack();
    if(!looksLikeInnerNext404(text))return;
    SENT=true;
    window.__VODEX_INNER_ERROR_SENT__=true;
    var bad=extractBadPath(text)||"api/projects/.../preview-html";
    try{
      parent.postMessage({
        type:"vodex-preview-inner-error",
        kind:"inner_next_route_404",
        path:bad,
        details:{
          title:document.title||"",
          bodySnippet:text.slice(0,500),
          detectedAt:new Date().toISOString()
        }
      },"*");
    }catch(e){}
  }
  function schedule(){
    report();
    setTimeout(report,120);
    setTimeout(report,400);
    setTimeout(report,900);
    setTimeout(report,1800);
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",schedule);
  }else{schedule();}
  var n=0;
  var iv=setInterval(function(){
    report();
    if(SENT||++n>48)clearInterval(iv);
  },300);
})();`;
}

export function injectPreviewInnerWatchdog(html: string): string {
  if (html.includes('id="vodex-preview-inner-watchdog"')) return html;
  const script = `<script id="vodex-preview-inner-watchdog">${buildPreviewInnerWatchdogScript()}</script>`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${script}</body>`);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${script}`);
  }
  return html + script;
}
