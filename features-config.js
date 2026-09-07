/**
 * Extra feature config panels: economy extras, bump, verification,
 * suggestions, tickets, QOTD. Hooks into existing saveConfig / applyConfig.
 */
(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function setVal(id, v) {
    var el = $(id);
    if (el && v !== undefined && v !== null) el.value = v;
  }
  function setCheck(id, v) {
    var el = $(id);
    if (el) el.checked = !!v;
  }
  function setStatus(id, text, ok) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || "";
    el.style.color = ok ? "#57F287" : "#f23f43";
  }

  function fillExtraSelects() {
    var channels = window.channelsCache || [];
    var roles = window.rolesCache || [];

    [
      "bump-enabled",
      // channels
      "verify-channel",
      "verify-log-channel",
      "suggest-channel",
      "suggest-staff-channel",
      "ticket-transcript-channel",
      "qotd-channel",
    ].forEach(function () {});

    var channelIds = [
      "verify-channel",
      "verify-log-channel",
      "suggest-channel",
      "suggest-staff-channel",
      "ticket-transcript-channel",
      "qotd-channel",
    ];
    channelIds.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var current = el.value;
      el.innerHTML = '<option value="">Select a channel...</option>';
      channels.forEach(function (ch) {
        var opt = document.createElement("option");
        opt.value = ch.id;
        opt.textContent = "#" + ch.name;
        el.appendChild(opt);
      });
      if (current) el.value = current;
    });

    var roleIds = [
      "verify-role",
      "qotd-manager-role",
      "ticket-staff-role",
    ];
    roleIds.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var current = el.value;
      el.innerHTML = '<option value="">Select a role...</option>';
      roles.forEach(function (role) {
        var opt = document.createElement("option");
        opt.value = role.id;
        opt.textContent = role.name;
        el.appendChild(opt);
      });
      if (current) el.value = current;
    });

    // Multi staff roles list display
    renderTicketStaffRoles();
  }

  function renderTicketStaffRoles() {
    var list = $("ticket-staff-list");
    if (!list) return;
    var cfg = (window.currentConfig && window.currentConfig.tickets) || {};
    var ids = cfg.staffRoleIds || [];
    var roles = window.rolesCache || [];
    if (!ids.length) {
      list.innerHTML = '<p class="form-hint">No staff roles yet.</p>';
      return;
    }
    list.innerHTML = ids
      .map(function (rid) {
        var role = roles.find(function (r) {
          return r.id === rid;
        });
        return (
          '<div class="level-role-row">' +
          (role ? role.name : rid) +
          ' <button type="button" data-remove-staff="' +
          rid +
          '">Remove</button></div>'
        );
      })
      .join("");
    list.querySelectorAll("[data-remove-staff]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        try {
          var rid = btn.getAttribute("data-remove-staff");
          var cur = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
          var next = cur.filter(function (x) {
            return String(x) !== String(rid);
          });
          await window.saveConfig({ tickets: { staffRoleIds: next } });
          if (typeof window.loadGuildData === "function") await window.loadGuildData();
          else applyExtraConfig();
        } catch (e) {
          alert(e.message || "Failed");
        }
      });
    });
  }

  function applyExtraConfig() {
    var c = window.currentConfig || {};
    var U = c.currency || {};
    setVal("cur-weekly-min", U.weeklyMin ?? 800);
    setVal("cur-weekly-max", U.weeklyMax ?? 1500);
    setVal("cur-beg-min", U.begMin ?? 5);
    setVal("cur-beg-max", U.begMax ?? 40);
    setVal("cur-beg-cd", U.begCooldownMinutes ?? 15);
    setVal("cur-beg-fail", U.begFailChance ?? 35);
    setCheck("cur-bank-enabled", U.bankEnabled !== false);

    var B = c.bump || {};
    setCheck("bump-enabled", B.enabled !== false);
    setVal("bump-reward-min", B.rewardMin ?? 50);
    setVal("bump-reward-max", B.rewardMax ?? 150);
    setVal("bump-cooldown", B.cooldownMinutes ?? 110);

    var V = c.verification || {};
    setCheck("verify-enabled", V.enabled !== false);
    setVal("verify-channel", V.channelId || "");
    setVal("verify-role", V.roleId || "");
    setVal("verify-log-channel", V.logChannelId || "");
    setVal("verify-btn-label", V.buttonLabel || "Verify");
    setVal("verify-title", V.embedTitle || "Verification");
    setVal(
      "verify-desc",
      V.embedDescription || "Press the button below to gain access to the server."
    );

    var S = c.suggestions || {};
    setCheck("suggest-enabled", S.enabled !== false);
    setVal("suggest-channel", S.channelId || "");
    setVal("suggest-staff-channel", S.staffChannelId || "");

    var T = c.tickets || {};
    setCheck("ticket-enabled", T.enabled !== false);
    setVal("ticket-category-id", T.categoryId || "");
    setVal("ticket-transcript-channel", T.transcriptChannelId || "");
    setVal(
      "ticket-welcome",
      T.welcomeMessage || "Staff will be with you shortly. Please describe your issue."
    );

    var Q = c.qotd || {};
    setCheck("qotd-enabled", Q.enabled !== false);
    setVal("qotd-channel", Q.channelId || "");
    setVal("qotd-manager-role", Q.managerRoleId || "");

    fillExtraSelects();
  }

  async function saveExtraCurrencyFields() {
    // Called after original saveCurrency — patch weekly/beg/bank into same object
    // We override saveCurrency by wrapping it
  }

  async function saveBump() {
    try {
      setStatus("bump-status", "Saving…", true);
      var data = await window.saveConfig({
        bump: {
          enabled: $("bump-enabled")?.checked,
          rewardMin: Number($("bump-reward-min")?.value) || 50,
          rewardMax: Number($("bump-reward-max")?.value) || 150,
          cooldownMinutes: Number($("bump-cooldown")?.value) || 110,
        },
      });
      var text = data?.savedToBot === false
        ? "Saved to website. Bot did not sync."
        : "✅ Bump rewards saved.";
      setStatus("bump-status", text, true);
    } catch (e) {
      setStatus("bump-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  async function saveVerification() {
    try {
      setStatus("verify-status", "Saving…", true);
      var data = await window.saveConfig({
        verification: {
          enabled: $("verify-enabled")?.checked,
          channelId: $("verify-channel")?.value || null,
          roleId: $("verify-role")?.value || null,
          logChannelId: $("verify-log-channel")?.value || null,
          buttonLabel: $("verify-btn-label")?.value || "Verify",
          embedTitle: $("verify-title")?.value || "Verification",
          embedDescription:
            $("verify-desc")?.value ||
            "Press the button below to gain access to the server.",
        },
      });
      var text = data?.savedToBot === false
        ? "Saved to website. Bot did not sync. Then run /verification-setup in Discord."
        : "✅ Verification saved. Run /verification-setup in Discord to post the button.";
      setStatus("verify-status", text, true);
    } catch (e) {
      setStatus("verify-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  async function saveSuggestions() {
    try {
      setStatus("suggest-status", "Saving…", true);
      var data = await window.saveConfig({
        suggestions: {
          enabled: $("suggest-enabled")?.checked,
          channelId: $("suggest-channel")?.value || null,
          staffChannelId: $("suggest-staff-channel")?.value || null,
        },
      });
      var text = data?.savedToBot === false
        ? "Saved to website. Bot did not sync."
        : "✅ Suggestions saved.";
      setStatus("suggest-status", text, true);
    } catch (e) {
      setStatus("suggest-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  async function saveTickets() {
    try {
      setStatus("ticket-status", "Saving…", true);
      var existing = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
      var data = await window.saveConfig({
        tickets: {
          enabled: $("ticket-enabled")?.checked,
          categoryId: $("ticket-category-id")?.value?.trim() || null,
          transcriptChannelId: $("ticket-transcript-channel")?.value || null,
          welcomeMessage:
            $("ticket-welcome")?.value ||
            "Staff will be with you shortly. Please describe your issue.",
          staffRoleIds: existing,
        },
      });
      var text = data?.savedToBot === false
        ? "Saved to website. Bot did not sync."
        : "✅ Tickets saved. Use /ticket-panel in Discord to post the panel.";
      setStatus("ticket-status", text, true);
    } catch (e) {
      setStatus("ticket-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  async function addTicketStaffRole() {
    var rid = $("ticket-staff-role")?.value;
    if (!rid) return alert("Pick a staff role");
    try {
      var cur = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
      if (cur.includes(rid)) return alert("Already added");
      await window.saveConfig({ tickets: { staffRoleIds: cur.concat([rid]) } });
      if (typeof window.loadGuildData === "function") await window.loadGuildData();
      else applyExtraConfig();
    } catch (e) {
      alert(e.message || "Failed");
    }
  }

  async function saveQotd() {
    try {
      setStatus("qotd-status", "Saving…", true);
      var data = await window.saveConfig({
        qotd: {
          enabled: $("qotd-enabled")?.checked,
          channelId: $("qotd-channel")?.value || null,
          managerRoleId: $("qotd-manager-role")?.value || null,
        },
      });
      var text = data?.savedToBot === false
        ? "Saved to website. Bot did not sync."
        : "✅ QOTD saved.";
      setStatus("qotd-status", text, true);
    } catch (e) {
      setStatus("qotd-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  // Wrap original saveCurrency to include weekly/beg/bank
  function patchSaveCurrency() {
    if (typeof window.saveCurrency !== "function" && typeof saveCurrency !== "function") {
      return;
    }
    var orig = window.saveCurrency || saveCurrency;
    window.saveCurrency = async function () {
      try {
        setStatus("currency-status", "Saving…", true);
        var data = await window.saveConfig({
          currencyEnabled: $("cur-enabled")?.checked,
          currency: {
            enabled: $("cur-enabled")?.checked,
            currencyName: $("cur-name")?.value || "Beans",
            currencyEmoji: $("cur-emoji")?.value || "☕",
            dailyMin: Number($("cur-daily-min")?.value) || 150,
            dailyMax: Number($("cur-daily-max")?.value) || 300,
            dailyStreakBonus: Number($("cur-streak-bonus")?.value) || 25,
            dailyMaxStreak: Number($("cur-max-streak")?.value) || 7,
            weeklyMin: Number($("cur-weekly-min")?.value) || 800,
            weeklyMax: Number($("cur-weekly-max")?.value) || 1500,
            workMin: Number($("cur-work-min")?.value) || 40,
            workMax: Number($("cur-work-max")?.value) || 120,
            workCooldownMinutes: Number($("cur-work-cd")?.value) || 30,
            begMin: Number($("cur-beg-min")?.value) || 5,
            begMax: Number($("cur-beg-max")?.value) || 40,
            begCooldownMinutes: Number($("cur-beg-cd")?.value) || 15,
            begFailChance: Number($("cur-beg-fail")?.value) || 35,
            bankEnabled: $("cur-bank-enabled")?.checked !== false,
            chatCoinsEnabled: $("cur-chat-enabled")?.checked,
            chatCoinChance: Number($("cur-chat-chance")?.value) || 8,
            chatCoinMin: Number($("cur-chat-min")?.value) || 5,
            chatCoinMax: Number($("cur-chat-max")?.value) || 20,
            chatCoinCooldownSeconds: Number($("cur-chat-cd")?.value) || 60,
            coinflipEnabled: $("cur-flip-enabled")?.checked,
            coinflipMaxBet: Number($("cur-flip-max")?.value) || 0,
          },
        });
        var text =
          data?.savedToBot === false
            ? "Saved to website. Bot did not sync."
            : "✅ Currency saved (incl. weekly / beg / bank).";
        setStatus("currency-status", text, true);
      } catch (e) {
        setStatus("currency-status", "❌ " + (e.message || "Failed"), false);
      }
    };
    // Re-bind button if needed
    var btn = $("save-currency");
    if (btn) {
      btn.onclick = function (e) {
        e.preventDefault();
        window.saveCurrency();
      };
    }
  }

  function patchApplyConfig() {
    var orig = window.applyConfigToForms;
    if (typeof orig === "function") {
      window.applyConfigToForms = function () {
        orig();
        applyExtraConfig();
      };
    } else if (typeof applyConfigToForms === "function") {
      var o2 = applyConfigToForms;
      window.applyConfigToForms = function () {
        o2();
        applyExtraConfig();
      };
    }
  }

  function patchFillSelects() {
    var origC = window.fillChannelSelects;
    var origR = window.fillRoleSelects;
    if (typeof origC === "function") {
      window.fillChannelSelects = function () {
        origC();
        fillExtraSelects();
      };
    }
    if (typeof origR === "function") {
      window.fillRoleSelects = function () {
        origR();
        fillExtraSelects();
      };
    }
  }

  function extendTitles() {
    // showSection titles are in script-part1 — we patch via event
  }

  function bindButtons() {
    $("save-bump")?.addEventListener("click", saveBump);
    $("save-verification")?.addEventListener("click", saveVerification);
    $("save-suggestions")?.addEventListener("click", saveSuggestions);
    $("save-tickets")?.addEventListener("click", saveTickets);
    $("add-ticket-staff")?.addEventListener("click", addTicketStaffRole);
    $("save-qotd")?.addEventListener("click", saveQotd);
  }

  function boot() {
    // Wait for main dashboard scripts
    var tries = 0;
    function tryPatch() {
      tries++;
      if (typeof window.saveConfig === "function" || typeof saveConfig === "function") {
        if (!window.saveConfig && typeof saveConfig === "function") {
          window.saveConfig = saveConfig;
        }
        if (!window.loadGuildData && typeof loadGuildData === "function") {
          window.loadGuildData = loadGuildData;
        }
        patchSaveCurrency();
        patchApplyConfig();
        patchFillSelects();
        bindButtons();
        applyExtraConfig();
        console.log("[features-config] panels ready");
        return;
      }
      if (tries < 40) setTimeout(tryPatch, 150);
    }
    tryPatch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
