(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const money = (cents, currency) => new Intl.NumberFormat(undefined, {
    style: "currency", currency: String(currency || "usd").toUpperCase()
  }).format(Number(cents || 0) / 100);
  const bytes = (value) => {
    const n = Number(value || 0);
    if (n < 1024) return n + " B";
    const units = ["KB", "MB", "GB", "TB"];
    let size = n, index = -1;
    do { size /= 1024; index++; } while (size >= 1024 && index < units.length - 1);
    return size.toFixed(1) + " " + units[index];
  };
  async function api(url, options) {
    const response = await fetch(url, Object.assign({
      credentials: "include", cache: "no-store"
    }, options || {}));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Request failed.");
      error.status = response.status;
      error.code = data.code;
      throw error;
    }
    return data;
  }
  function status(id, message, error) {
    const node = $(id);
    if (!node) return;
    node.textContent = message || "";
    node.classList.toggle("is-error", !!error);
  }
  function renderInvoices(invoices) {
    const node = $("customer-invoice-list");
    if (!node) return;
    if (!invoices || !invoices.length) {
      node.textContent = "No invoices yet.";
      return;
    }
    node.innerHTML = invoices.map((invoice) => {
      const date = new Date(invoice.created_at).toLocaleDateString();
      const link = invoice.hosted_invoice_url || invoice.invoice_pdf;
      return '<div class="customer-row"><div><strong>' + date + '</strong><span>' +
        String(invoice.status || "unknown").replace(/</g, "&lt;") + ' · ' +
        money(invoice.amount_paid_cents, invoice.currency) +
        '</span></div>' + (link ? '<a href="' + link + '" target="_blank" rel="noopener noreferrer">View invoice ↗</a>' : '') + '</div>';
    }).join("");
  }
  function renderServers(data) {
    const select = $("customer-server-select");
    const list = $("customer-server-list");
    const connect = $("customer-connect-server");
    const link = $("customer-link-discord");
    if (!select || !list) return;
    select.innerHTML = '<option value="">Choose a server you manage…</option>';
    (data.availableServers || []).forEach((server) => {
      const option = document.createElement("option");
      option.value = server.id;
      option.textContent = server.name;
      select.appendChild(option);
    });
    const connected = data.servers || [];
    list.innerHTML = connected.length ? connected.map((server) =>
      '<div class="customer-row"><div><strong>' + escapeHtml(server.guild_name) +
      '</strong><span>' + escapeHtml(server.access_level) + ' · ' +
      (server.permissionValid ? "Verified" : "Discord permission needs re-check") +
      '</span></div><button class="button secondary customer-control" data-disconnect-server="' +
      escapeHtml(server.guild_id) + '" type="button">Disconnect</button></div>'
    ).join("") : '<p class="form-hint">No Discord servers connected yet.</p>';
    if (link) link.hidden = !!data.discordConnected;
    if (connect) connect.disabled = !data.discordConnected || !(data.availableServers || []).length;
    if (!data.discordConnected) status("customer-discord-status", "Connect Discord to verify which servers you can manage.");
    else status("customer-discord-status", connected.length + " connected · " + (data.availableServers || []).length + " available to connect.");
    list.querySelectorAll("[data-disconnect-server]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Disconnect this server from your account?")) return;
        try {
          await api("/api/user?resource=customer-servers&guildId=" + encodeURIComponent(button.dataset.disconnectServer), { method: "DELETE" });
          await loadServers();
        } catch (error) { status("customer-discord-status", error.message, true); }
      });
    });
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
  function renderPlans(plans, currentPlan) {
    const node = $("customer-plan-list");
    if (!node) return;
    if (!plans || !plans.length) {
      node.textContent = "Subscription plans have not been published yet.";
      return;
    }
    node.innerHTML = plans.map((plan) => {
      const monthly = Number(plan.monthly_price_cents || 0);
      const discount = Number(plan.annual_discount_percent ?? 15);
      const annual = Math.round(monthly * 12 * (1 - discount / 100));
      const active = currentPlan && currentPlan.id === plan.id;
      return '<article class="customer-plan-card' + (active ? ' is-current' : '') + '">' +
        '<div class="customer-plan-top"><strong>' + escapeHtml(plan.name) + '</strong>' +
        (active ? '<span class="customer-current-tag">Current plan</span>' : '') + '</div>' +
        '<p>' + escapeHtml(plan.description || '') + '</p>' +
        '<div class="customer-plan-price">' + (monthly === 0 ? 'Free' : money(monthly, plan.currency) + '<small> / month</small>') + '</div>' +
        '<div class="customer-plan-meta">' + (plan.storage_limit_bytes == null ? 'Storage limit not set' : bytes(plan.storage_limit_bytes) + ' storage') +
        ' · ' + (plan.server_limit == null ? 'Server limit not set' : plan.server_limit + ' server(s)') + '</div>' +
        (plan.entitlements && plan.entitlements.ai ? '<span class="customer-feature">AI included</span>' : '<span class="customer-feature muted">No AI features</span>') +
        (monthly > 0 ? '<div class="customer-plan-actions">' +
          '<button class="button customer-control" data-plan-id="' + escapeHtml(plan.id) + '" data-interval="month" ' + (active ? 'disabled' : '') + '>Monthly</button>' +
          (plan.annual_enabled ? '<button class="button secondary customer-control" data-plan-id="' + escapeHtml(plan.id) + '" data-interval="year" ' + (active ? 'disabled' : '') + '>Annual · ' + money(annual, plan.currency) + '/yr (' + discount + '% off)</button>' : '') +
        '</div>' : '') +
      '</article>';
    }).join("");
    node.querySelectorAll("[data-plan-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const billing = button.dataset.interval;
        const activeSub = window.__customerSubscription;
        try {
          status("customer-billing-status", "Preparing secure Stripe checkout…");
          const action = activeSub && ["active", "trialing", "past_due"].includes(activeSub.status) ? "change-plan" : "checkout";
          const result = await api("/api/user?resource=billing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, planId: button.dataset.planId, interval: billing })
          });
          if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
          else {
            status("customer-billing-status", "Plan change submitted. Subscription details will refresh after Stripe confirms it.");
            await loadAccount();
          }
        } catch (error) { status("customer-billing-status", error.message, true); }
      });
    });
  }
  async function loadServers() {
    try {
      const data = await api("/api/user?resource=customer-servers");
      renderServers(data);
    } catch (error) {
      status("customer-discord-status", error.message, true);
      if (error.code === "DISCORD_NOT_LINKED" && $("customer-link-discord")) $("customer-link-discord").hidden = false;
    }
  }
  async function loadOwner() {
    const nav = $("nav-owner-billing");
    if (nav) {
      nav.dataset.ownerAvailable = "true";
      if (typeof window.applyDashboardTabs === "function") window.applyDashboardTabs();
      else nav.hidden = false;
    }
    try {
      const [plans, customers] = await Promise.all([
        api("/api/user?resource=owner-plans"),
        api("/api/user?resource=owner-customers")
      ]);
      const planList = $("owner-plan-list");
      if (planList) {
        planList.innerHTML = plans.plans.map((plan) =>
          '<div class="customer-row"><div><strong>' + escapeHtml(plan.name) + ' (' + escapeHtml(plan.id) + ')</strong><span>' +
          money(plan.monthly_price_cents, plan.currency) + '/mo · ' + money(plan.annual_price_cents, plan.currency) +
          '/yr · ' + (plan.is_active ? "Active" : "Inactive") + '</span></div>' +
          '<button class="button secondary" data-edit-plan="' + escapeHtml(plan.id) + '" type="button">Edit</button></div>'
        ).join("") || "No plans configured.";
        planList.querySelectorAll("[data-edit-plan]").forEach((button) => {
          button.addEventListener("click", () => {
            const plan = plans.plans.find((item) => item.id === button.dataset.editPlan);
            if (!plan) return;
            $("owner-plan-id").value = plan.id;
            $("owner-plan-name").value = plan.name;
            $("owner-plan-price").value = (Number(plan.monthly_price_cents) / 100).toFixed(2);
            $("owner-plan-discount").value = plan.annual_discount_percent;
            $("owner-plan-storage").value = plan.storage_limit_bytes == null ? "" : Math.round(Number(plan.storage_limit_bytes) / 1048576);
            $("owner-plan-servers").value = plan.server_limit == null ? "" : plan.server_limit;
            $("owner-plan-ai").checked = plan.entitlements && plan.entitlements.ai === true;
            $("owner-plan-annual").checked = plan.annual_enabled;
            $("owner-plan-public").checked = plan.is_public;
          });
        });
      }
      const customerList = $("owner-customer-list");
      if (customerList) {
        customerList.innerHTML = customers.customers.map((customer) =>
          '<div class="customer-row"><div><strong>' + escapeHtml(customer.global_name || customer.username || customer.email || customer.account_id) +
          '</strong><span>' + escapeHtml(customer.email || "No email") + ' · ' +
          escapeHtml(customer.plan_id || "Free (not assigned)") + ' · ' +
          escapeHtml(customer.subscription_status || "No paid subscription") + ' · ' +
          bytes(customer.used_bytes) + ' used</span></div></div>'
        ).join("") || "No customer accounts yet.";
      }
    } catch (error) { status("owner-plan-status", error.message, true); }
  }
  async function loadAccount() {
    try {
      const data = await api("/api/user?resource=customer-account");
      const plan = data.plan;
      window.__customerSubscription = data.subscription;
      status("customer-account-status", "Signed in as " + (data.account.email || data.account.username || "your account") + ".");
      if ($("customer-profile-name")) $("customer-profile-name").textContent = data.account.username || "Not set";
      if ($("customer-profile-email")) $("customer-profile-email").textContent = data.account.email || "No email on this sign-in";
      if ($("customer-profile-discord")) $("customer-profile-discord").textContent = data.account.discordId ? "Connected" : "Not connected";
      if ($("customer-plan-name")) $("customer-plan-name").textContent = plan.name;
      if ($("customer-subscription-status")) {
        const subscription = data.subscription;
        let subscriptionLabel = subscription ? String(subscription.status || "Unknown") : "Free plan";
        if (subscription && subscription.billing_interval) subscriptionLabel += " · billed " + subscription.billing_interval;
        if (subscription && subscription.current_period_end) {
          subscriptionLabel += " · period ends " + new Date(subscription.current_period_end).toLocaleDateString();
        }
        if (subscription && subscription.cancel_at_period_end) subscriptionLabel += " · will not renew";
        $("customer-subscription-status").textContent = subscriptionLabel;
      }
      const used = Number(data.storage.usedBytes || 0);
      const limit = data.storage.limitBytes == null ? null : Number(data.storage.limitBytes);
      if ($("customer-storage-used")) $("customer-storage-used").textContent = bytes(used);
      if ($("customer-storage-remaining")) $("customer-storage-remaining").textContent = limit == null ? "Not configured" : bytes(Math.max(0, limit - used));
      if ($("customer-storage-bar")) $("customer-storage-bar").style.width = limit > 0 ? Math.min(100, used / limit * 100) + "%" : "0%";
      if ($("customer-storage-caption")) $("customer-storage-caption").textContent = limit == null ? "The website owner has not set a storage allowance for this plan." : bytes(used) + " of " + bytes(limit) + " used.";
      renderInvoices(data.invoices);
      if ($("customer-cancel-subscription")) $("customer-cancel-subscription").hidden = !(data.subscription && !data.subscription.cancel_at_period_end && ["active", "trialing"].includes(data.subscription.status));
      if ($("customer-resume-subscription")) $("customer-resume-subscription").hidden = !(data.subscription && data.subscription.cancel_at_period_end);
      try {
        const billing = await api("/api/user?resource=billing");
        renderPlans(billing.plans, plan);
      } catch (error) { status("customer-billing-status", error.message, true); }
    } catch (error) {
      status("customer-account-status", error.message, true);
    }
    await loadServers();
  }
  function bind() {
    if (window.__customerPlatformBound) return;
    window.__customerPlatformBound = true;
    $("open-account-profile")?.addEventListener("click", () => {
      if (typeof window.showSection === "function") window.showSection("account");
      else document.querySelector('.nav-item[data-tab="account"]')?.click();
    });
    $("customer-link-discord")?.addEventListener("click", () => { window.location.href = "/api/login?action=link"; });
    $("customer-connect-server")?.addEventListener("click", async () => {
      const guildId = $("customer-server-select")?.value;
      if (!guildId) return status("customer-discord-status", "Choose a server first.", true);
      try {
        await api("/api/user?resource=customer-servers", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guildId })
        });
        status("customer-discord-status", "Server connected and Discord permissions verified.");
        await loadServers();
      } catch (error) { status("customer-discord-status", error.message, true); }
    });
    $("customer-billing-portal")?.addEventListener("click", async () => {
      try {
        const result = await api("/api/user?resource=billing", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "portal" })
        });
        if (result.portalUrl) window.location.assign(result.portalUrl);
      } catch (error) { status("customer-billing-status", error.message, true); }
    });
    $("customer-cancel-subscription")?.addEventListener("click", async () => {
      if (!confirm("Cancel renewal at the end of the current billing period?")) return;
      try {
        await api("/api/user?resource=billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
        await loadAccount();
      } catch (error) { status("customer-billing-status", error.message, true); }
    });
    $("customer-resume-subscription")?.addEventListener("click", async () => {
      try {
        await api("/api/user?resource=billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resume" }) });
        await loadAccount();
      } catch (error) { status("customer-billing-status", error.message, true); }
    });
    $("owner-save-plan")?.addEventListener("click", async () => {
      try {
        const priceCents = Math.round(Number($("owner-plan-price").value || 0) * 100);
        const storageBytes = $("owner-plan-storage").value === "" ? null : Math.round(Number($("owner-plan-storage").value) * 1048576);
        const serverLimit = $("owner-plan-servers").value === "" ? null : Number($("owner-plan-servers").value);
        const result = await api("/api/user?resource=owner-plans", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: $("owner-plan-id").value, name: $("owner-plan-name").value,
            monthlyPriceCents: priceCents, annualDiscountPercent: Number($("owner-plan-discount").value || 15),
            storageLimitBytes: storageBytes, serverLimit,
            entitlements: { ai: $("owner-plan-ai").checked },
            annualEnabled: $("owner-plan-annual").checked, public: $("owner-plan-public").checked
          })
        });
        status("owner-plan-status", "Saved " + result.plan.name + ". Annual price: " + money(result.annualPriceCents, result.plan.currency) + ".");
        await loadOwner();
      } catch (error) { status("owner-plan-status", error.message, true); }
    });
  }
  async function init() {
    bind();
    await loadAccount();
    try {
      const user = await api("/api/user");
      if (user.user && user.user.website_owner) await loadOwner();
    } catch {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
  window.refreshCustomerPlatform = init;
})();