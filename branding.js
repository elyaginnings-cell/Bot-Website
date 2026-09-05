/**
 * Site branding — name, tagline, tab icon
 * Editable in Settings. Defaults match Amazon branding.
 */
(function () {
  var DEFAULT_ICON =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAkUlEQVR4nO2WQQ6AIAwE+f+n8WY0kVJoS424c9KEbndgCy0iIiL/RGu9A9gBaw1V9Yg9gAWwnbPWek3MBBfgBJyAczEBTsAJOP8TwPZxN6A5M3M1k9baS2JmdgFuN+ACzMyX1lpjZmb2ANzMwMzMzMzsAZiZmdkDMDsBM7MHMDsBM7sAMzMzMzMzMzMzswdgZg/AzMzMzMzM7AGY2QMwMzMzMzMzMzMz+wf8AOzrH6E7G1l5AAAAAElFUkSuQmCC";

  var DEFAULTS = {
    siteName: "Amazon.com. Spend Less. Smile More.",
    shortName: "Amazon",
    tagline: "Spend Less. Smile More.",
    iconUrl: DEFAULT_ICON
  };

  function load() {
    try {
      var raw = localStorage.getItem("siteBranding");
      if (!raw) return Object.assign({}, DEFAULTS);
      var parsed = JSON.parse(raw);
      return {
        siteName: (parsed.siteName && String(parsed.siteName).trim()) || DEFAULTS.siteName,
        shortName: (parsed.shortName && String(parsed.shortName).trim()) || DEFAULTS.shortName,
        tagline: (parsed.tagline && String(parsed.tagline).trim()) || DEFAULTS.tagline,
        iconUrl: (parsed.iconUrl && String(parsed.iconUrl).trim()) || DEFAULTS.iconUrl
      };
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(data) {
    var next = {
      siteName: (data.siteName && String(data.siteName).trim()) || DEFAULTS.siteName,
      shortName: (data.shortName && String(data.shortName).trim()) || DEFAULTS.shortName,
      tagline: (data.tagline && String(data.tagline).trim()) || DEFAULTS.tagline,
      iconUrl: (data.iconUrl && String(data.iconUrl).trim()) || DEFAULTS.iconUrl
    };
    localStorage.setItem("siteBranding", JSON.stringify(next));
    return next;
  }

  function ensureFavicon(url) {
    var links = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    if (!links.length) {
      var link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
      links = [link];
    }
    Array.prototype.forEach.call(links, function (link) {
      link.href = url;
    });
  }

  function apply(brand) {
    brand = brand || load();
    document.title = brand.siteName;
    ensureFavicon(brand.iconUrl);

    var brandStrong = document.querySelector(".sidebar-brand strong");
    if (brandStrong) brandStrong.textContent = brand.shortName;

    var brandSpan = document.querySelector(".sidebar-brand span");
    if (brandSpan) brandSpan.textContent = brand.tagline;

    var brandIcon = document.querySelector(".brand-icon");
    if (brandIcon) {
      brandIcon.innerHTML = "";
      var img = document.createElement("img");
      img.src = brand.iconUrl;
      img.alt = brand.shortName;
      img.style.cssText = "width:100%;height:100%;object-fit:contain;border-radius:8px";
      brandIcon.appendChild(img);
    }

    var loginH1 = document.querySelector(".login-card h1");
    if (loginH1) loginH1.textContent = brand.shortName;

    var loginP = document.querySelector(".login-card > p");
    if (loginP) loginP.textContent = brand.tagline;

    var loginIcon = document.querySelector(".login-icon");
    if (loginIcon) {
      loginIcon.innerHTML = "";
      var limg = document.createElement("img");
      limg.src = brand.iconUrl;
      limg.alt = brand.shortName;
      limg.style.cssText = "width:64px;height:64px;object-fit:contain";
      loginIcon.appendChild(limg);
    }

    var nameEl = document.getElementById("site-name");
    var shortEl = document.getElementById("site-short-name");
    var tagEl = document.getElementById("site-tagline");
    var iconEl = document.getElementById("site-icon-url");
    if (nameEl) nameEl.value = brand.siteName;
    if (shortEl) shortEl.value = brand.shortName;
    if (tagEl) tagEl.value = brand.tagline;
    if (iconEl) iconEl.value = brand.iconUrl.indexOf("data:") === 0 ? "" : brand.iconUrl;

    var preview = document.getElementById("site-icon-preview");
    if (preview) {
      preview.src = brand.iconUrl;
      preview.hidden = false;
    }

    window.__siteBranding = brand;
  }

  function resetDefaults() {
    localStorage.removeItem("siteBranding");
    apply(Object.assign({}, DEFAULTS));
    return Object.assign({}, DEFAULTS);
  }

  function bindSettings() {
    var saveBtn = document.getElementById("save-branding");
    if (saveBtn && !saveBtn.__bound) {
      saveBtn.__bound = true;
      saveBtn.addEventListener("click", function () {
        var iconVal =
          (document.getElementById("site-icon-url") &&
            document.getElementById("site-icon-url").value.trim()) ||
          "";
        var current = load();
        var data = {
          siteName: document.getElementById("site-name") && document.getElementById("site-name").value,
          shortName:
            document.getElementById("site-short-name") &&
            document.getElementById("site-short-name").value,
          tagline: document.getElementById("site-tagline") && document.getElementById("site-tagline").value,
          iconUrl: iconVal || current.iconUrl || DEFAULTS.iconUrl
        };
        var saved = save(data);
        apply(saved);
        var status = document.getElementById("branding-status");
        if (status) {
          status.textContent = "Saved. Tab title and icon updated.";
          status.style.color = "#57F287";
        }
      });
    }
    var resetBtn = document.getElementById("reset-branding");
    if (resetBtn && !resetBtn.__bound) {
      resetBtn.__bound = true;
      resetBtn.addEventListener("click", function () {
        resetDefaults();
        var status = document.getElementById("branding-status");
        if (status) {
          status.textContent = "Reset to Amazon defaults.";
          status.style.color = "#57F287";
        }
      });
    }
    var fileInput = document.getElementById("site-icon-file");
    if (fileInput && !fileInput.__bound) {
      fileInput.__bound = true;
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        if (file.size > 500000) {
          alert("Icon must be under 500KB");
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          var current = load();
          current.iconUrl = String(reader.result);
          save(current);
          apply(current);
          var status = document.getElementById("branding-status");
          if (status) {
            status.textContent = "Icon uploaded.";
            status.style.color = "#57F287";
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }

  function boot() {
    apply(load());
    bindSettings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-tab="settings"]');
    if (t) setTimeout(bindSettings, 0);
  });

  window.__applySiteBranding = apply;
  window.__loadSiteBranding = load;
  window.__resetSiteBranding = resetDefaults;
})();
