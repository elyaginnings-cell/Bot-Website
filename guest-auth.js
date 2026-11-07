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
  function showGuest(){
    document.body.classList.add("guest-preview");
    $("guest-auth-bar").hidden=false;
    var app=$("app");if(app)app.hidden=false;
    var login=$("login-screen");if(login)login.remove();
    var username=$("username");if(username)username.textContent="Guest";
    var welcome=$("welcome-name");if(welcome)welcome.textContent="Guest";
    var account=document.querySelector(".account-info span");if(account)account.textContent="Preview mode";
    var title=document.querySelector(".server-current strong");if(title)title.textContent="No server selected";
    document.querySelectorAll(".stat-card strong,.stat-card .stat-value,[data-guest-value]").forEach(function(el){el.textContent="—";el.classList.add("guest-preview-value");});
    document.querySelectorAll(".stat-card").forEach(function(card){card.querySelectorAll("strong").forEach(function(el){el.textContent="—";});});
    var status=document.querySelector(".connection-status span:last-child");if(status)status.textContent="Guest preview";
    document.querySelectorAll(".page-section").forEach(function(section){
      section.querySelectorAll("button,input,select,textarea").forEach(function(control){control.disabled=true;control.setAttribute("aria-disabled","true");});
      section.querySelectorAll("form").forEach(function(form){form.addEventListener("submit",function(e){e.preventDefault();e.stopImmediatePropagation();},{capture:true});});
    });
    document.querySelectorAll(".header-actions button,.server-bar button,.quick-card,.quick-grid button").forEach(function(el){
      if(el.matches(".nav-item"))return;
      el.setAttribute("aria-disabled","true");
      if("disabled" in el)el.disabled=true;
      el.addEventListener("click",function(e){e.preventDefault();e.stopImmediatePropagation();},{capture:true});
    });
    document.querySelectorAll(".page-section [data-value],.page-section .stat-number").forEach(function(el){el.textContent="—";});
    document.querySelectorAll(".page-section button:not(.nav-item),.page-section input,.page-section select,.page-section textarea").forEach(function(el){el.disabled=true;});
    if(!window.__guestLockObserver){window.__guestLockObserver=new MutationObserver(function(){if(document.body.classList.contains("guest-preview")){document.querySelectorAll(".page-section button:not(.nav-item),.page-section input,.page-section select,.page-section textarea").forEach(function(el){el.disabled=true;el.setAttribute("aria-disabled","true");});document.querySelectorAll(".stat-card strong").forEach(function(el){el.textContent="—";});}});window.__guestLockObserver.observe(document.getElementById("app"),{childList:true,subtree:true});}
  }
  function showMember(user){
    isLoggedIn=true;isStaff=user&&user.role==="staff";
    if(isStaff){document.body.classList.remove("guest-preview");$("guest-auth-bar").hidden=true;return;}
    showGuest();
    $("guest-auth-bar").hidden=false;
    var copy=document.querySelector(".guest-auth-copy");
    if(copy){copy.querySelector("strong").textContent="You're signed in";copy.querySelector("span").textContent="Your account is saved. Server controls remain locked until access is granted.";}
    $("guest-login-open").hidden=true;$("guest-signup-open").hidden=true;
    var name=user.global_name||user.username||user.email||"Account";
    if($("username"))$("username").textContent=name;
    if($("welcome-name"))$("welcome-name").textContent=name;
  }
  window.checkLogin=async function(){
    try{
      var response=await fetch("/api/user",{credentials:"include",cache:"no-store"});
      var data=await response.json().catch(function(){return {};});
      if(response.ok&&data.authenticated&&data.user){showMember(data.user);}
      else showGuest();
    }catch(_){showGuest();}
  };
  document.addEventListener("DOMContentLoaded",function(){
    $("guest-login-open").addEventListener("click",function(){openModal("login");});
    $("guest-signup-open").addEventListener("click",function(){openModal("signup");});
    $("guest-auth-switch").addEventListener("click",function(){setMode(authMode==="login"?"signup":"login");});
    document.querySelectorAll("[data-auth-close]").forEach(function(el){el.addEventListener("click",closeModal);});
    document.addEventListener("keydown",function(e){if(e.key==="Escape")closeModal();});
    $("guest-auth-form").addEventListener("submit",async function(e){
      e.preventDefault();setError("");
      var button=$("guest-auth-submit");button.disabled=true;
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
    window.checkLogin();
  });
})();