(function(){
  "use strict";
  var isStaff=false, isLoggedIn=false, authMode="login";
  function $(id){return document.getElementById(id);}
  function setError(message){var el=$("guest-auth-error");if(el){el.textContent=message||"";el.hidden=!message;}}
  function setMode(mode){
    authMode=mode==="signup"?"signup":"login";
    $("guest-auth-title").textContent=authMode==="signup"?"Create your account":"Welcome back";
    $("guest-auth-description").textContent=authMode==="signup"?"Create an account to save your profile and sign in later.":"Log in to your existing Coffee Shop account.";
    $("guest-auth-submit").textContent=authMode==="signup"?"Create account":"Log in";
    $("guest-auth-password").autocomplete=authMode==="signup"?"new-password":"current-password";
    $("guest-auth-switch").textContent=authMode==="signup"?"Already have an account? Log in":"Need an account? Create one";
    setError("");
  }
  function openModal(mode){
    setMode(mode);$("guest-auth-modal").hidden=false;
    setTimeout(function(){$("guest-auth-email").focus();},0);
  }
  function closeModal(){$("guest-auth-modal").hidden=true;setError("");}
  function lockGuestNode(root){
    if(!root||root.nodeType!==1)return;
    var controls=[];
    if(root.matches("button,input,select,textarea"))controls.push(root);
    root.querySelectorAll&&root.querySelectorAll("button,input,select,textarea").forEach(function(el){controls.push(el);});
    controls.forEach(function(control){
      if(control.closest("#guest-auth-modal")||control.closest("#guest-auth-bar"))return;
      if(!control.matches(".nav-item")&&"disabled" in control&&!control.disabled)control.disabled=true;
      if(!control.matches(".nav-item")&&control.getAttribute("aria-disabled")!=="true")control.setAttribute("aria-disabled","true");
    });
    root.querySelectorAll&&root.querySelectorAll(".stat-card strong,.stat-card .stat-value,[data-guest-value],.stat-number").forEach(function(el){
      if(el.textContent!=="—")el.textContent="—";
      el.classList.add("guest-preview-value");
    });
    if(root.matches(".stat-card strong,.stat-card .stat-value,[data-guest-value],.stat-number")&&root.textContent!=="—")root.textContent="—";
  }
  function showGuest(){
    isLoggedIn=false;
    isStaff=false;
    // Guest is a client-side preview only, never a registered or persisted account.
    window.__dashboardAuthState="guest";
    document.body.dataset.authState="guest";
    document.body.classList.remove("account-authenticated");
    document.body.classList.add("guest-preview");
    var bar=$("guest-auth-bar");
    if(bar){bar.hidden=false;var copy=bar.querySelector(".guest-auth-copy");if(copy){var heading=copy.querySelector("strong"),description=copy.querySelector("span");if(heading)heading.textContent="Guest preview mode";if(description)description.textContent="This is a temporary preview, not an account. Log in to connect your server and manage it.";}}
    var loginButton=$("guest-login-open"),signupButton=$("guest-signup-open");
    if(loginButton){loginButton.hidden=false;loginButton.textContent="Log in";}
    if(signupButton){signupButton.hidden=false;signupButton.textContent="Create account";}
    var app=$("app");if(app)app.hidden=false;
    var login=$("login-screen");if(login)login.remove();
    var username=$("username");if(username)username.textContent="Guest";
    var logout=$("logout-button");if(logout)logout.hidden=true;
    var avatar=$("user-avatar");if(avatar){avatar.src="/amazon-favicon.svg";avatar.alt="Guest preview";}
    var welcome=$("welcome-name");if(welcome)welcome.textContent="Guest";
    var account=document.querySelector(".account-info span");if(account)account.textContent="Preview mode";
    var title=document.querySelector(".server-current strong");if(title)title.textContent="No server selected";
    var status=document.querySelector(".connection-status span:last-child");if(status)status.textContent="Guest preview";
    document.querySelectorAll(".stat-card strong,.stat-card .stat-value,[data-guest-value],.stat-number").forEach(function(el){
      if(el.textContent!=="—")el.textContent="—";
      el.classList.add("guest-preview-value");
    });
    document.querySelectorAll(".page-section").forEach(function(section){
      section.querySelectorAll("button,input,select,textarea").forEach(function(control){
        if(!control.matches(".nav-item")&&"disabled" in control)control.disabled=true;
        if(!control.matches(".nav-item")&&control.getAttribute("aria-disabled")!=="true")control.setAttribute("aria-disabled","true");
      });
    });
    document.querySelectorAll(".header-actions button,.server-bar button,.quick-card,.quick-grid button").forEach(function(el){
      if(el.matches(".nav-item")||el.closest("#guest-auth-bar"))return;
      if("disabled" in el)el.disabled=true;
      if(el.getAttribute("aria-disabled")!=="true")el.setAttribute("aria-disabled","true");
    });
    if(app&&!window.__guestSubmitGuard){
      window.__guestSubmitGuard=true;
      app.addEventListener("submit",function(e){if(document.body.classList.contains("guest-preview")){e.preventDefault();e.stopImmediatePropagation();}},true);
    }
    if(app&&!window.__guestLockObserver){
      window.__guestLockObserver=new MutationObserver(function(records){
        if(!document.body.classList.contains("guest-preview"))return;
        records.forEach(function(record){record.addedNodes.forEach(function(node){lockGuestNode(node);});});
      });
      window.__guestLockObserver.observe(app,{childList:true,subtree:true});
    }
  }
  function showMember(user){
    // Do not call showGuest() here: that function deliberately disables
    // controls and hides Logout for unauthenticated visitors.
    isLoggedIn=true;
    isStaff=!!(user&&user.role==="staff");
    window.__dashboardAuthState=isStaff?"staff":"member";
    document.body.dataset.authState=window.__dashboardAuthState;
    document.body.classList.remove("guest-preview","account-authenticated");

    var name=user&&(user.global_name||user.username||user.email)||"Account";
    if($("username"))$("username").textContent=name;
    if($("welcome-name"))$("welcome-name").textContent=name;
    var avatar=$("user-avatar");
    if(avatar){
      var id=user&&(user.discord_id||user.id);
      avatar.src=user&&user.avatar&&id&&String(id).length>15
        ?"https://cdn.discordapp.com/avatars/"+id+"/"+user.avatar+".png?size=128"
        :"/amazon-favicon.svg";
      avatar.alt=name;
    }
    var accountLabel=document.querySelector(".account-info span");
    if(accountLabel)accountLabel.textContent=isStaff?"Administrator":"Signed in · limited access";

    // Authenticated accounts must always be able to sign out.
    var logout=$("logout-button");
    if(logout){logout.hidden=false;logout.removeAttribute("hidden");logout.disabled=false;logout.removeAttribute("aria-disabled");}

    var app=$("app");
    if(app)app.hidden=false;
    var login=$("login-screen");
    if(login)login.remove();

    var bar=$("guest-auth-bar");
    if(isStaff){
      if(bar)bar.hidden=true;
      // The staff dashboard is fully interactive.
      document.querySelectorAll("#app button,#app input,#app select,#app textarea").forEach(function(control){
        control.disabled=false;
        control.removeAttribute("aria-disabled");
      });
      return;
    }

    // A valid login without staff authorization is an account, not Guest.
    // Keep management controls restricted, but never hide or disable Logout.
    if(bar){
      bar.hidden=false;
      var copy=bar.querySelector(".guest-auth-copy");
      if(copy){
        var heading=copy.querySelector("strong"),description=copy.querySelector("span");
        if(heading)heading.textContent="You're signed in";
        if(description)description.textContent="Your account is valid, but it isn't on the dashboard administrator list yet. Contact the owner to enable management access.";
      }
    }
    var loginButton=$("guest-login-open"),signupButton=$("guest-signup-open");
    if(loginButton){loginButton.hidden=true;}
    if(signupButton){signupButton.hidden=true;}
    document.querySelectorAll("#app .page-section button,#app .page-section input,#app .page-section select,#app .page-section textarea,#server-button,#open-server-view,#nav-server-view").forEach(function(control){
      if(control.id==="logout-button")return;
      control.disabled=true;
      control.setAttribute("aria-disabled","true");
    });
  }
  window.checkLogin=async function(){
    try{
      var response=await fetch("/api/user",{credentials:"include",cache:"no-store"});
      var data=await response.json().catch(function(){return {};});
      if(response.ok&&data.authenticated&&data.user){showMember(data.user);}
      else showGuest();
    }catch(_){showGuest();}
  };
  function initGuestAuth(){
    var login=$("guest-login-open"),signup=$("guest-signup-open"),switcher=$("guest-auth-switch"),form=$("guest-auth-form"),discordLogin=$("guest-discord-login");
    if(discordLogin)discordLogin.addEventListener("click",function(){window.location.href="/api/login";});
    if(login)login.addEventListener("click",function(){openModal("login");});
    if(signup)signup.addEventListener("click",function(){openModal("signup");});
    if(switcher)switcher.addEventListener("click",function(){setMode(authMode==="login"?"signup":"login");});
    document.querySelectorAll("[data-auth-close]").forEach(function(el){el.addEventListener("click",closeModal);});
    document.addEventListener("keydown",function(e){if(e.key==="Escape")closeModal();});
    if(form)form.addEventListener("submit",async function(e){
      e.preventDefault();setError("");
      var button=$("guest-auth-submit");if(!button)return;button.disabled=true;
      try{
        var response=await fetch(authMode==="signup"?"/api/signup":"/api/auth-login",{
          method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({email:$("guest-auth-email").value.trim(),password:$("guest-auth-password").value})
        });
        var data=await response.json().catch(function(){return {};});
        if(!response.ok||!data.ok){setError(data.error||"We couldn't complete that request.");return;}
        var verify=await fetch("/api/user",{credentials:"include",cache:"no-store"});
        var session=await verify.json().catch(function(){return {};});
        if(!verify.ok||!session.authenticated||!session.user){setError(session.error||"Account created, but the session could not be verified. Please log in.");return;}
        closeModal();showMember(session.user);
      }catch(_){setError("The account service could not be reached. Please try again.");}
      finally{button.disabled=false;}
    });
    showGuest();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initGuestAuth,{once:true});
  else initGuestAuth();
})();