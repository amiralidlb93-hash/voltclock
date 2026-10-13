(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem("vc") || "{}"); }
    catch { return {}; }
  })();

  const st = {
    h24: true,
    shamsi: true,
    sec: true,
    theme: 0,
    lang: (navigator.language || "").startsWith("fa") ? "fa" : "en",
    ...stored
  };
  if (!["fa", "en"].includes(st.lang)) st.lang = "en";
  if (!Number.isInteger(st.theme) || st.theme < 0) st.theme = 0;
  st.theme %= 4;
  st.h24 = Boolean(st.h24);
  st.shamsi = Boolean(st.shamsi);
  st.sec = Boolean(st.sec);

  const save = () => {
    try { localStorage.setItem("vc", JSON.stringify(st)); } catch {}
  };

  const L = {
    fa: {
      h24: "۲۴ ساعته", h12: "۱۲ ساعته", shamsi: "تقویم شمسی",
      greg: "تقویم میلادی", sec: "ثانیه‌شمار", theme: "تغییر رنگ",
      full: "تمام‌صفحه", world: "ساعت جهانی", sw: "کرونومتر",
      tm: "تایمر معکوس", al: "آلارم", lap: "ثبت دور", reset: "صفر",
      start: "شروع", stop: "توقف", resume: "ادامه", set: "تنظیم", cancel: "لغو",
      off: "خاموش", min: "دقیقه", altime: "زمان آلارم",
      tmDone: "تایمر تمام شد", alMsg: "زمان آلارم رسیده: ",
      z: ["تهران", "استانبول", "لندن", "نیویورک", "توکیو", "دبی"],
      today: "امروز", tomorrow: "فردا", yesterday: "دیروز", daytime: "روز", nighttime: "شب",
      live: "ساعت زنده", heroCaption: "زمان محلی شما، همیشه در جریان",
      dashboard: "ابزارهای زمان", toolsTitle: "همه‌چیز سرِ وقت",
      toolsSub: "ابزارهای ساده برای مدیریت زمان روزانه.",
      worldSub: "ساعت شهرهای مختلف دنیا", swSub: "زمان‌گیری با دقت صدم ثانیه",
      tmSub: "برای تمرکز یا استراحت", alSub: "یادآور روزانه",
      timerHint: "مدت را برحسب دقیقه وارد کن.", alarmHint: "برای زنگ خوردن، صفحه باید باز باشد.",
      footer: "ساخته‌شده برای هر ثانیه‌ی تو", lapNo: "دور"
    },
    en: {
      h24: "24-hour", h12: "12-hour", shamsi: "Persian calendar",
      greg: "Gregorian calendar", sec: "Seconds", theme: "Change color",
      full: "Fullscreen", world: "World clock", sw: "Stopwatch",
      tm: "Countdown timer", al: "Alarm", lap: "Lap", reset: "Reset",
      start: "Start", stop: "Stop", resume: "Resume", set: "Set", cancel: "Cancel",
      off: "Off", min: "Minutes", altime: "Alarm time",
      tmDone: "Timer finished", alMsg: "Alarm: ",
      z: ["Tehran", "Istanbul", "London", "New York", "Tokyo", "Dubai"],
      today: "Today", tomorrow: "Tomorrow", yesterday: "Yesterday", daytime: "Daytime", nighttime: "Night",
      live: "Live clock", heroCaption: "Your local time, always in motion",
      dashboard: "TIME TOOLS", toolsTitle: "Make every second count",
      toolsSub: "Simple tools to help manage your day.",
      worldSub: "Current time around the world", swSub: "Track time to the hundredth",
      tmSub: "For focus, breaks, and everything between", alSub: "A daily reminder",
      timerHint: "Enter a duration in minutes.", alarmHint: "Keep this page open for the alarm to ring.",
      footer: "Made for every second of you", lapNo: "Lap"
    }
  };

  const t = key => L[st.lang][key];
  const themes = ["cyan", "pink", "green", "amber"];
  const pad = n => String(n).padStart(2, "0");
  const zones = [
    { zone: "Asia/Tehran", flag: "🇮🇷" },
    { zone: "Europe/Istanbul", flag: "🇹🇷" },
    { zone: "Europe/London", flag: "🇬🇧" },
    { zone: "America/New_York", flag: "🇺🇸" },
    { zone: "Asia/Tokyo", flag: "🇯🇵" },
    { zone: "Asia/Dubai", flag: "🇦🇪" }
  ];
  let swK = "start", tmK = "start";
  let alarm = typeof st.alarm === "string" ? st.alarm : "";
  let alFired = "";
  let swT = 0, swS = 0, swOn = false, laps = [];
  let tmEnd = 0, tmLeft = 0, tmOn = false;
  let ac, toastTimer;

  const A = $("analog");
  let face = `
    <defs>
      <radialGradient id="dial"><stop offset="0" stop-color="var(--panel-2)"/><stop offset="1" stop-color="var(--panel)"/></radialGradient>
      <linearGradient id="dial-ring" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--neon)"/><stop offset="1" stop-color="var(--neon2)"/></linearGradient>
    </defs>
    <circle r="97" fill="url(#dial)" stroke="url(#dial-ring)" stroke-width="1.4"/>
    <circle r="90" fill="none" stroke="var(--line)" stroke-width=".7"/>
  `;
  for (let i = 0; i < 60; i++) {
    const a = i * 6 * Math.PI / 180;
    const len = i % 5 ? 3 : 8;
    const r = 87;
    face += `<line x1="${Math.sin(a)*r}" y1="${-Math.cos(a)*r}" x2="${Math.sin(a)*(r-len)}" y2="${-Math.cos(a)*(r-len)}" stroke="${i%5 ? "var(--dim)" : "var(--fg)"}" stroke-width="${i%5 ? 1 : 2}" stroke-linecap="round"/>`;
  }
  face += `
    <line id="hh" y2="-48" stroke="var(--fg)" stroke-width="5" stroke-linecap="round"/>
    <line id="hm" y2="-70" stroke="var(--neon)" stroke-width="3.5" stroke-linecap="round"/>
    <line id="hs" y1="13" y2="-79" stroke="var(--neon2)" stroke-width="1.5" stroke-linecap="round"/>
    <circle r="4" fill="var(--neon2)"/><circle r="1.5" fill="var(--fg)"/>
  `;
  A.innerHTML = face;

  $("tz").textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";

  function showToast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function alShow() { $("ald").textContent = alarm || t("off"); }

  function i18n() {
    document.documentElement.lang = st.lang;
    document.documentElement.dir = st.lang === "fa" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i]").forEach(e => {
      const key = e.dataset.i;
      if (t(key)) e.textContent = t(key);
    });
    $("fmt").textContent = st.h24 ? t("h24") : t("h12");
    $("cal").textContent = st.shamsi ? t("shamsi") : t("greg");
    $("lang").textContent = st.lang === "fa" ? "English" : "فارسی";
    $("sws").textContent = t(swK);
    $("tms").textContent = t(tmK);
    $("als").textContent = alarm ? t("cancel") : t("set");
    $("tmin").setAttribute("aria-label", t("min"));
    $("alt").setAttribute("aria-label", t("altime"));
    $("world").innerHTML = zones.map((city, i) => `
      <article class="world-row">
        <div class="city-topline">
          <span class="city-identity"><span class="city-flag" aria-hidden="true">${city.flag}</span><span class="city-name">${t("z")[i]}</span></span>
          <span class="city-period" data-period="${city.zone}"><span class="period-dot"></span><span class="period-label">—</span></span>
        </div>
        <time class="city-time" data-z="${city.zone}">--:--</time>
        <div class="city-bottomline"><span class="city-zone" data-zone="${city.zone}">UTC</span><span class="city-day" data-day="${city.zone}">${t("today")}</span></div>
      </article>`
    ).join("");
    $("sec").classList.toggle("is-active", st.sec);
    $("sec").setAttribute("aria-pressed", String(st.sec));
    $("date").dir = document.documentElement.dir;
    alShow();
  }

  function render() {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes(), s = d.getSeconds();
    let suffix = "";
    if (!st.h24) {
      suffix = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
    }
    const timeText = `${pad(h)}:${pad(m)}${st.sec ? ":" + pad(s) : ""}`;
    const localizedTime = st.lang === "fa"
      ? timeText.replace(/\\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)])
      : timeText;
    $("time").innerHTML = `${localizedTime}${suffix ? `<small>${suffix}</small>` : ""}`;

    const locale = (st.lang === "fa" ? "fa-IR" : "en-US") + "-u-ca-" + (st.shamsi ? "persian" : "gregory");
    try {
      $("date").textContent = new Intl.DateTimeFormat(locale, {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      }).format(d);
    } catch {
      $("date").textContent = d.toLocaleDateString();
    }

    $("hs").setAttribute("transform", `rotate(${(s + d.getMilliseconds() / 1000) * 6})`);
    $("hm").setAttribute("transform", `rotate(${(m + s / 60) * 6})`);
    $("hh").setAttribute("transform", `rotate(${((d.getHours() % 12) + m / 60) * 30})`);

    const dateKey = (date, zone) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(date);
      const part = type => parts.find(item => item.type === type)?.value || "00";
      return `${part("year")}-${part("month")}-${part("day")}`;
    };
    const baseMidnight = new Date(`${dateKey(d, Intl.DateTimeFormat().resolvedOptions().timeZone)}T00:00:00Z`);
    document.querySelectorAll("[data-z]").forEach(e => {
      const zone = e.dataset.z;
      try {
        e.textContent = new Intl.DateTimeFormat(st.lang === "fa" ? "fa-IR" : "en-GB", {
          timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: !st.h24
        }).format(d);
        const cityMidnight = new Date(`${dateKey(d, zone)}T00:00:00Z`);
        const dayDelta = Math.round((cityMidnight - baseMidnight) / 86400000);
        const dayText = dayDelta === 1 ? t("tomorrow") : dayDelta === -1 ? t("yesterday") : t("today");
        const dayEl = document.querySelector(`[data-day="${zone}"]`);
        if (dayEl) dayEl.textContent = dayText;
        const zoneLabel = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" }).formatToParts(d).find(part => part.type === "timeZoneName")?.value || "UTC";
        const zoneEl = document.querySelector(`[data-zone="${zone}"]`);
        if (zoneEl) zoneEl.textContent = zoneLabel.replace("GMT", "UTC");
        const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", hourCycle: "h23" }).format(d));
        const isDay = hour >= 6 && hour < 18;
        const period = document.querySelector(`[data-period="${zone}"]`);
        if (period) {
          period.classList.toggle("is-night", !isDay);
          period.querySelector(".period-dot").textContent = isDay ? "☀" : "☾";
          period.querySelector(".period-label").textContent = isDay ? t("daytime") : t("nighttime");
        }
      } catch { e.textContent = "--:--"; }
    });
    document.title = `${pad(d.getHours())}:${pad(m)} · VOLTCLOCK`;
  }

  function apply() {
    document.documentElement.dataset.theme = themes[st.theme % themes.length];
    i18n();
    save();
    render();
  }

  $("lang").addEventListener("click", () => { st.lang = st.lang === "fa" ? "en" : "fa"; apply(); });
  $("fmt").addEventListener("click", () => { st.h24 = !st.h24; apply(); });
  $("cal").addEventListener("click", () => { st.shamsi = !st.shamsi; apply(); });
  $("sec").addEventListener("click", () => { st.sec = !st.sec; apply(); });
  $("theme").addEventListener("click", () => { st.theme = (st.theme + 1) % themes.length; apply(); });
  $("full").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch { showToast(st.lang === "fa" ? "تمام‌صفحه در این مرورگر پشتیبانی نمی‌شود." : "Fullscreen isn't available in this browser."); }
  });

  function beep(count = 4) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      for (let i = 0; i < count; i++) {
        const oscillator = ac.createOscillator(), gain = ac.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = i % 2 ? 740 : 880;
        oscillator.connect(gain);
        gain.connect(ac.destination);
        const startAt = ac.currentTime + i * 0.38;
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.28);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.31);
      }
    } catch {}
  }

  async function requestNotifications() {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {}
  }

  function notify(message) {
    beep();
    showToast(message);
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("VOLTCLOCK", { body: message });
      }
    } catch {}
  }

  const fmtSW = milliseconds => {
    const centiseconds = Math.floor(milliseconds / 10) % 100;
    const seconds = Math.floor(milliseconds / 1000) % 60;
    const minutes = Math.floor(milliseconds / 60000);
    return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
  };
  const swNow = () => swT + (swOn ? performance.now() - swS : 0);

  $("sws").addEventListener("click", () => {
    if (swOn) {
      swT += performance.now() - swS;
      swOn = false;
      swK = "resume";
    } else {
      swS = performance.now();
      swOn = true;
      swK = "stop";
    }
    $("sws").textContent = t(swK);
  });

  $("swl").addEventListener("click", () => {
    if (!swOn) return;
    laps.unshift({ time: fmtSW(swNow()), raw: swNow() });
    $("laps").innerHTML = laps.map((lap, i) =>
      `<div class="lap-row"><span>${t("lapNo")} ${laps.length - i}</span><strong>${lap.time}</strong></div>`
    ).join("");
  });

  $("swr").addEventListener("click", () => {
    swT = 0; swOn = false; laps = [];
    $("laps").innerHTML = "";
    swK = "start";
    $("sws").textContent = t(swK);
    $("swd").textContent = fmtSW(0);
  });

  const fmtT = seconds => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
  const timerMinutes = () => Math.min(999, Math.max(1, Math.floor(Number($("tmin").value) || 1)));
  $("tmin").addEventListener("input", () => {
    const n = timerMinutes();
    if (!tmOn && !tmLeft) $("tmd").textContent = fmtT(n * 60);
  });
  $("tmin").addEventListener("change", () => { $("tmin").value = timerMinutes(); });

  $("tms").addEventListener("click", async () => {
    await requestNotifications();
    if (tmOn) {
      tmLeft = Math.max(0, tmEnd - Date.now());
      tmOn = false;
      tmK = "resume";
    } else {
      if (!tmLeft) tmLeft = timerMinutes() * 60000;
      tmEnd = Date.now() + tmLeft;
      tmOn = true;
      tmK = "stop";
      $("tmd").classList.remove("ring");
    }
    $("tms").textContent = t(tmK);
  });

  $("tmr").addEventListener("click", () => {
    tmOn = false; tmLeft = 0; tmK = "start";
    $("tms").textContent = t(tmK);
    $("tmd").classList.remove("ring");
    $("tmd").textContent = fmtT(timerMinutes() * 60);
  });

  $("alt").value = alarm;
  $("als").addEventListener("click", async () => {
    if (alarm) {
      alarm = "";
      showToast(st.lang === "fa" ? "آلارم لغو شد." : "Alarm cancelled.");
    } else if ($("alt").value) {
      alarm = $("alt").value;
      await requestNotifications();
      try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch {}
      showToast(st.lang === "fa" ? `آلارم برای ${alarm} تنظیم شد.` : `Alarm set for ${alarm}.`);
    } else {
      showToast(st.lang === "fa" ? "اول یک زمان انتخاب کن." : "Choose a time first.");
      return;
    }
    st.alarm = alarm;
    alFired = "";
    $("als").textContent = alarm ? t("cancel") : t("set");
    alShow();
    $("ald").classList.remove("ring");
    save();
  });

  function tick() {
    render();
    $("swd").textContent = fmtSW(swNow());

    if (tmOn) {
      const remaining = tmEnd - Date.now();
      if (remaining <= 0) {
        tmOn = false; tmLeft = 0;
        $("tmd").textContent = "00:00";
        $("tmd").classList.add("ring");
        tmK = "start";
        $("tms").textContent = t(tmK);
        notify(t("tmDone"));
      } else {
        $("tmd").textContent = fmtT(Math.ceil(remaining / 1000));
      }
    } else if (tmLeft) {
      $("tmd").textContent = fmtT(Math.ceil(tmLeft / 1000));
    }

    const d = new Date();
    const minuteKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const currentTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (alarm && currentTime === alarm && alFired !== minuteKey) {
      alFired = minuteKey;
      $("ald").classList.add("ring");
      notify(t("alMsg") + currentTime);
    }
    requestAnimationFrame(tick);
  }

  apply();
  $("tmd").textContent = fmtT(timerMinutes() * 60);
  tick();
})();
