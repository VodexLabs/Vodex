import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  authEnabled,
  isAuthSystemRoute,
  type AppAuthSettings,
} from "@/lib/publish/default-auth-pages";
import { mergePreviewIframeEmbedHeaders } from "@/lib/preview/preview-iframe-embed-headers";

type AuthPageKind = "login" | "signup" | "forgot" | "callback";

function pageKind(route: string): AuthPageKind {
  const r = route.toLowerCase();
  if (r.includes("signup") || r.includes("sign-up") || r.includes("register")) return "signup";
  if (r.includes("forgot") || r.includes("reset")) return "forgot";
  if (r.includes("callback")) return "callback";
  return "login";
}

export function buildPreviewAuthPageHtml(input: {
  appName: string;
  iconUrl?: string | null;
  route: string;
  settings: AppAuthSettings;
  projectId?: string;
  artifactId?: string;
}): string {
  const kind = pageKind(input.route);
  const initialView =
    kind === "signup" ? "signup" : kind === "forgot" ? "forgot" : kind === "callback" ? "callback" : "login";

  const providers: string[] = [];
  if (input.settings.google_enabled) providers.push("google");
  if (input.settings.github_enabled) providers.push("github");
  if (input.settings.apple_enabled) providers.push("apple");
  if (input.settings.microsoft_enabled) providers.push("microsoft");
  if (input.settings.facebook_enabled) providers.push("facebook");

  const icon = input.iconUrl
    ? `<img src="${input.iconUrl}" alt="" class="brand-icon" />`
    : `<div class="brand-fallback">${input.appName.charAt(0).toUpperCase()}</div>`;

  const oauthProvidersJson = JSON.stringify(providers);
  const emailEnabled = input.settings.email_password_enabled;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Sign in · ${input.appName}</title>
<style>
*,*::before,*::after{box-sizing:border-box}
:root{
  --bg0:#0b0f1a;--bg1:#12182b;--card:rgba(255,255,255,.06);--card-border:rgba(255,255,255,.12);
  --text:#f8fafc;--muted:#94a3b8;--accent:#6366f1;--accent2:#8b5cf6;--accent-glow:rgba(99,102,241,.45);
  --danger:#f87171;--ok:#34d399;--input-bg:rgba(15,23,42,.65);--input-border:rgba(148,163,184,.22);
  --radius:18px;--font:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
}
html,body{margin:0;min-height:100%;font-family:var(--font);color:var(--text);background:var(--bg0)}
body{
  min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;
  background:
    radial-gradient(ellipse 80% 50% at 20% -10%,rgba(99,102,241,.35),transparent 55%),
    radial-gradient(ellipse 60% 45% at 100% 0%,rgba(139,92,246,.28),transparent 50%),
    linear-gradient(165deg,var(--bg0),var(--bg1));
}
.shell{width:100%;max-width:440px;position:relative}
.glow{position:absolute;inset:-40px -20px auto -20px;height:120px;background:radial-gradient(circle,rgba(99,102,241,.25),transparent 70%);filter:blur(24px);pointer-events:none}
.card{
  position:relative;border-radius:calc(var(--radius) + 4px);padding:32px 28px 28px;
  background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.03));
  border:1px solid var(--card-border);backdrop-filter:blur(18px);
  box-shadow:0 24px 80px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08);
}
.brand{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:24px}
.brand-icon,.brand-fallback{width:64px;height:64px;border-radius:18px}
.brand-icon{object-fit:cover;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.brand-fallback{
  display:flex;align-items:center;justify-content:center;font-weight:800;font-size:26px;
  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;
  box-shadow:0 8px 28px var(--accent-glow);
}
h1{font-size:1.55rem;font-weight:700;margin:14px 0 6px;letter-spacing:-.02em}
.sub{color:var(--muted);font-size:.9rem;margin:0;line-height:1.45}
.view{display:none;animation:fadeIn .28s ease}
.view.active{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.oauth-grid{display:flex;flex-direction:column;gap:10px;margin-top:20px}
.oauth{
  display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px 14px;
  border-radius:14px;border:1px solid var(--input-border);background:rgba(15,23,42,.55);
  color:var(--text);font-size:.9rem;font-weight:600;cursor:pointer;transition:transform .15s,border-color .15s,background .15s;
}
.oauth:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.28);background:rgba(30,41,59,.75)}
.oauth svg{width:18px;height:18px;flex-shrink:0}
.divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.08em}
.divider::before,.divider::after{content:"";flex:1;height:1px;background:var(--input-border)}
.field{margin-bottom:12px}
.field label{display:block;font-size:.78rem;font-weight:600;color:var(--muted);margin-bottom:6px}
.field input{
  width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--input-border);
  background:var(--input-bg);color:var(--text);font-size:.92rem;outline:none;transition:border-color .15s,box-shadow .15s;
}
.field input:focus{border-color:rgba(99,102,241,.65);box-shadow:0 0 0 3px rgba(99,102,241,.18)}
.btn-primary{
  width:100%;padding:13px;border:none;border-radius:14px;cursor:pointer;font-weight:700;font-size:.95rem;
  color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent2));
  box-shadow:0 10px 30px var(--accent-glow);transition:transform .15s,box-shadow .15s;
}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 14px 36px var(--accent-glow)}
.btn-primary:active{transform:translateY(0)}
.err{display:none;margin-bottom:12px;padding:11px 12px;border-radius:12px;background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.35);color:#fecaca;font-size:.82rem}
.err.show{display:block}
.links{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 16px;margin-top:18px;font-size:.82rem}
.links a,.links button.link{color:var(--muted);background:none;border:none;padding:0;cursor:pointer;font:inherit;text-decoration:none}
.links a:hover,.links button.link:hover{color:#e2e8f0;text-decoration:underline}
.footnote{margin-top:22px;text-align:center;font-size:.72rem;color:rgba(148,163,184,.75);line-height:1.5}
.success-icon{width:56px;height:56px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;background:rgba(52,211,153,.15);color:var(--ok);font-size:28px}
</style>
</head>
<body>
<div class="shell">
  <div class="glow"></div>
  <main class="card">
    <div class="brand">${icon}<h1 id="vx-title">Welcome back</h1><p class="sub" id="vx-sub">Sign in to continue to ${input.appName}</p></div>
    <div id="vx-error" class="err"></div>

    <section id="view-login" class="view ${initialView === "login" ? "active" : ""}">
      ${providers.length ? `<div class="oauth-grid" id="vx-oauth-login"></div>${emailEnabled ? '<div class="divider">or email</div>' : ""}` : ""}
      ${emailEnabled ? `<form id="form-login" novalidate>
        <div class="field"><label for="login-email">Email</label><input id="login-email" name="email" type="email" autocomplete="email" placeholder="you@company.com" required /></div>
        <div class="field"><label for="login-pass">Password</label><input id="login-pass" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required /></div>
        <button type="submit" class="btn-primary">Sign in</button>
      </form>` : `<button type="button" class="btn-primary" id="vx-guest-login">Continue to app</button>`}
      <div class="links">
        ${emailEnabled ? '<button type="button" class="link" data-go="forgot">Forgot password?</button>' : ""}
        <button type="button" class="link" data-go="signup">Create account</button>
      </div>
    </section>

    <section id="view-signup" class="view ${initialView === "signup" ? "active" : ""}">
      ${providers.length ? `<div class="oauth-grid" id="vx-oauth-signup"></div>${emailEnabled ? '<div class="divider">or email</div>' : ""}` : ""}
      ${emailEnabled ? `<form id="form-signup" novalidate>
        <div class="field"><label for="signup-name">Full name</label><input id="signup-name" name="name" type="text" autocomplete="name" placeholder="Alex Rivera" required /></div>
        <div class="field"><label for="signup-email">Email</label><input id="signup-email" name="email" type="email" autocomplete="email" placeholder="you@company.com" required /></div>
        <div class="field"><label for="signup-pass">Password</label><input id="signup-pass" name="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" minlength="8" required /></div>
        <button type="submit" class="btn-primary">Create account</button>
      </form>` : ""}
      <div class="links"><button type="button" class="link" data-go="login">Already have an account? Sign in</button></div>
    </section>

    <section id="view-forgot" class="view ${initialView === "forgot" ? "active" : ""}">
      <form id="form-forgot" novalidate>
        <div class="field"><label for="forgot-email">Email</label><input id="forgot-email" name="email" type="email" autocomplete="email" placeholder="you@company.com" required /></div>
        <button type="submit" class="btn-primary">Send reset link</button>
      </form>
      <div class="links"><button type="button" class="link" data-go="login">Back to sign in</button></div>
    </section>

    <section id="view-forgot-sent" class="view">
      <div class="success-icon">✓</div>
      <p class="sub" style="text-align:center">If an account exists for that email, we sent a reset link. Check your inbox.</p>
      <div class="links" style="margin-top:24px"><button type="button" class="link" data-go="login">Return to sign in</button></div>
    </section>

    <section id="view-callback" class="view ${initialView === "callback" ? "active" : ""}">
      <p class="sub" style="text-align:center">Completing sign-in…</p>
    </section>

    <p class="footnote">Preview mode — authentication is simulated. Configure real providers before publishing.</p>
  </main>
</div>
<script id="vodex-preview-auth-runtime">
(function(){
  var mockUser={id:"preview-user",email:"preview@vodex.dev",user_metadata:{full_name:"Preview User"}};
  var providers=${oauthProvidersJson};
  var titles={login:{h:"Welcome back",s:"Sign in to continue"},signup:{h:"Create your account",s:"Join in seconds"},forgot:{h:"Reset password",s:"We'll email you a secure link"},"forgot-sent":{h:"Check your email",s:"Reset link sent"},"callback":{h:"Signing in…",s:"One moment"}};
  function showErr(msg){var el=document.getElementById("vx-error");if(!el)return;el.textContent=msg;el.classList.add("show");setTimeout(function(){el.classList.remove("show");},5000);}
  function previewHomeUrl(){
    try{
      var m=window.location.pathname.match(/^(\\/preview-runtime\\/[^/]+\\/[^/]+)/);
      if(m)return m[1]+"/";
    }catch(e){}
    return "/";
  }
  function finish(user){
    var u=user||mockUser;
    try{localStorage.setItem("sb-preview-auth","1");localStorage.setItem("vodex-preview-session",JSON.stringify(u));}catch(e){}
    try{window.parent.postMessage({type:"vodex:navigate",path:"/"},"*");}catch(e){}
    try{window.__VODEX_VIRTUAL_PATH__="/";history.replaceState({__vodex:"/"},"","/");window.dispatchEvent(new PopStateEvent("popstate"));}catch(e){}
    window.location.replace(previewHomeUrl());
  }
  function setView(name){
    document.querySelectorAll(".view").forEach(function(v){v.classList.remove("active");});
    var el=document.getElementById("view-"+name);
    if(el)el.classList.add("active");
    var t=titles[name]||titles.login;
    var h=document.getElementById("vx-title");var s=document.getElementById("vx-sub");
    if(h)h.textContent=t.h;if(s)s.textContent=t.s;
  }
  document.querySelectorAll("[data-go]").forEach(function(btn){
    btn.addEventListener("click",function(){setView(btn.getAttribute("data-go"));});
  });
  function oauthBtn(p){
    var b=document.createElement("button");
    b.type="button";b.className="oauth";b.dataset.provider=p;
    b.innerHTML='Continue with '+p.charAt(0).toUpperCase()+p.slice(1);
    b.addEventListener("click",function(){finish();});
    return b;
  }
  ["vx-oauth-login","vx-oauth-signup"].forEach(function(id){
    var root=document.getElementById(id);
    if(!root)return;
    providers.forEach(function(p){root.appendChild(oauthBtn(p));});
  });
  var guest=document.getElementById("vx-guest-login");
  if(guest)guest.addEventListener("click",function(){finish();});
  function bindForm(id,handler){
    var f=document.getElementById(id);
    if(!f)return;
    f.addEventListener("submit",function(e){e.preventDefault();handler(new FormData(f));});
  }
  bindForm("form-login",function(fd){
    if(!fd.get("email")||!fd.get("password")){showErr("Enter email and password.");return;}
    finish({id:"preview-user",email:String(fd.get("email")),user_metadata:{full_name:"Preview User"}});
  });
  bindForm("form-signup",function(fd){
    if(!fd.get("email")||!fd.get("password")){showErr("Complete all fields.");return;}
    finish({id:"preview-user",email:String(fd.get("email")),user_metadata:{full_name:String(fd.get("name")||"Preview User")}});
  });
  bindForm("form-forgot",function(){
    setView("forgot-sent");
  });
  if(${JSON.stringify(initialView)}==="callback"){finish();}
  else{setView(${JSON.stringify(initialView)});}
})();
</script>
</body>
</html>`;
}

export async function resolvePreviewAuthPageHtml(
  admin: SupabaseClient,
  projectId: string,
  route: string,
  projectMeta?: Record<string, unknown>,
  projectName?: string | null,
): Promise<string | null> {
  if (!isAuthSystemRoute(route)) return null;

  const { data: authRow } = await admin
    .from("app_auth_provider_settings" as never)
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  const settings = (authRow ?? {
    email_password_enabled: true,
    google_enabled: true,
    github_enabled: false,
    apple_enabled: false,
    oauth_mode: "vodex_managed",
  }) as AppAuthSettings;

  if (!authEnabled(settings)) return null;

  const iconPath =
    projectMeta && typeof projectMeta.icon_path === "string" ? projectMeta.icon_path : null;

  return buildPreviewAuthPageHtml({
    appName: projectName ?? "App",
    iconUrl: iconPath,
    route,
    settings,
    projectId,
  });
}

export function previewAuthHtmlHeaders(): Record<string, string> {
  return mergePreviewIframeEmbedHeaders({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Preview-Renderable": "true",
  });
}
