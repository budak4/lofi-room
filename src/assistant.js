// assistant.js — on-device local assistant (privacy-first, no server).
// Intent matching + rule-based replies + actions that main.js can execute.
// Extend later with a real model API by plugging a fetch() into `askRemote`.

const QUOTES = [
  '“little by little, one travels far.”',
  '“you don’t have to see the whole staircase, just the first step.”',
  '“focus is the new luxury.”',
  '“the room glows; so does your progress.”',
  '“soft music, warm light, steady mind.”',
  '“deep work, quiet mind, calm heart.”',
  '“progress is built one pomodoro at a time.”',
];

const TIPS = [
  'Guna teknik Pomodoro 25/5: fokus 25 minit, rehat 5 minit. Ulang 4× sekali, kemudian rehat panjang 15–30 minit.',
  'Matikan telefon & tutup tab yang tak perlu — maklumat lain tunggu selepas sesi fokus.',
  'Listkan 1–3 tugasan utama sahaja; sisa biar jadi bonus bila masa berlebihan.',
  'Jaga postur: skrin setaraf mata, cahaya hangat lampu, dan rehat mata setiap 20 minit.',
  'Untuk tugasan besar, pecahkan kepada langkah kecil yang boleh siap dalam 25 minit.',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function assistant(input, ctx) {
  const raw = String(input || '').trim();
  const q = raw.toLowerCase().replace(/[.!?,;:]/g, ' ').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  const hasTime = /\b(\d{1,3})\b/.exec(q);
  const setFocus = /(?:set(?:ing)?|atur|mula(?:kan)?|pasang|buat|fokus|pomodoro|study|belajar|gentle)\s*(\d{1,3})/.exec(q);
  const actions = [];

  // ---- timer / focus intent
  if (/(fokus|pomodoro|study|belajar|timer|masa|jadual|focsu|time)/.test(q) && setFocus) {
    const min = Math.min(180, Math.max(1, Number(setFocus[1])));
    let turn = Math.round(min / 25) || 1;
    actions.push({ type: 'timer:set', value: min });
    actions.push({ type: 'view', value: 'pomodoro' });
    return { text: `Oke! Saya set timer fokus ${min} minit (lebih kurang ${turn} sesi pomodoro). Tekan ▶ bila sedia — saya tunggu.`, actions };
  }
  if (/(fokus|pomodoro|study|belajar|jadual|jadwalkan|tips?)/.test(q) && hasTime) {
    const min = Math.min(180, Math.max(1, Number(hasTime[1])));
    actions.push({ type: 'timer:set', value: min });
    actions.push({ type: 'view', value: 'pomodoro' });
    return { text: `Baik, saya siapkan timer ${min} minit untuk kamu. Tinggal tekan ▶.`, actions };
  }
  if (/(fokus|pomodoro|study|belajar|jadual|mulakan|start)/.test(q) && /(dingin|ready|mula|start|terus|ada)/.test(q) === false) {
    actions.push({ type: 'view', value: 'pomodoro' });
    return { text: pick(TIPS) + ' 🍅 Nak saya setkan timer? Cuba: "fokus 50 minit".', actions };
  }
  if (/(mulakan|start|teruskan|ready|jeda|pause|berhenti|stop)/.test(q)) {
    if (/jeda|pause|berhenti|stop/.test(q)) {
      actions.push({ type: 'timer:pause' });
      return { text: 'Timer saya jeda. Ambil nafas, kemudian sambung bila siap.', actions };
    }
    actions.push({ type: 'timer:toggle' });
    return { text: 'Baik — timer sudah saya hidupkan. Selamat fokus! 🍅', actions };
  }

  // ---- music intent
  if (/(lagu|musik|musik|audio|playlist|dengar|putar|mainkan|berhenti musik|mute)/.test(q)) {
    if (/pause|berhenti|padam|stop|mute/.test(q) && !/mainkan/.test(q)) {
      actions.push({ type: 'audio:pause' });
      return { text: 'Muzik saya hentikan sebentar. Lo-fi menunggu kamu kembali. 🎧', actions };
    }
    actions.push({ type: 'audio:play' });
    actions.push({ type: 'view', value: 'playlist' });
    return { text: `Sudah dipasang “${ctx.trackTitle || 'midnight drive'}” — aliran lo-fi generatif. Selamat belajar. 🎵`, actions };
  }

  // ---- lamp / mood intent
  if (/(lampu|lamp|hangat|warm|terang|redup|padamkan lampu)/.test(q)) {
    if (/padam|off|matikan|matikan|redup/.test(q) && !/nyala/.test(q)) {
      if (ctx.lampOn) { actions.push({ type: 'lamp:off' }); return { text: 'Lampu katil saya padamkan. Suasana kembali tenang ✨', actions }; }
      return { text: 'Lampu memang sudah padam — bilik tenang sekarang.', actions };
    }
    actions.push({ type: 'lamp:on' });
    return { text: 'Lampu hangat dinyalakan. Cahaya kuning bagus untuk fokus malam 🌙', actions };
  }

  // ---- weather intent
  if (/(hujan|rain|cuaca|weather|tingkap)/.test(q)) {
    if (/cerah|berhenti|hentikan|stop|clear/.test(q) && !/hujan turun/.test(q)) {
      actions.push({ type: 'weather', value: 'clear' });
      return { text: 'Langit saya cerahkan — bintang kelihatan pulang. ☁️', actions };
    }
    actions.push({ type: 'weather', value: 'rain' });
    return { text: 'Hujan renyai mula turun di luar tingkap. Bunyinya bagus untuk belajar 🌧', actions };
  }

  // ---- quote / motivation intent
  if (/(quote|petik|motivasi|semangat|kata|inspirasi|afirmasi|affirm)/.test(q)) {
    return { text: `${pick(QUOTES)}\n\n( cikgu kecil kamu, 24/7 💛 )` };
  }

  // ---- todo intent
  if (/(tugasan|to-do|todo|list|kerja|tugas|senarai)/.test(q)) {
    const all = ctx.todoCount || 0;
    const done = ctx.todoDone || 0;
    if (all === 0) {
      actions.push({ type: 'view', value: 'todo' });
      return { text: 'Tiada tugasan lagi. Taip tugas pertama dan saya bantu awak susun. 📝', actions };
    }
    let s = `Kamu ada ${all} tugasan (${done} siap). `;
    const left = all - done;
    if (left > 0) s += `Cuba fokus 25 minit pada satu tugasan — mulakan dengan yang paling kecil dulu.`;
    else s += `Semua sudah selesai! Boleh rehat panjang — kamu memang terbaik 🏆`;
    actions.push({ type: 'view', value: 'todo' });
    return { text: s, actions };
  }

  // ---- time intent
  if (/(pukul|jam|masa kini|waktu|jam berapa|time|o'clock)/.test(q)) {
    const now = new Date();
    const hm = now.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
    return { text: `Sekarang pukul ${hm}. Kalau malam, jaga mata — lampu + lo-fi sedia memanaskan suasana.` };
  }

  // ---- greeting intent
  if (/^(halo|hai|hei|yo|selamat pagi|selamat petang|selamat malam|assalamualaikum|apa khabar|macam mana|hello|hi)\b/.test(q)) {
    const hour = new Date().getHours();
    const part = hour < 5 ? 'malam yang sunyi' : hour < 12 ? 'pagi yang tenang' : hour < 18 ? 'petang santai' : 'malam yang tenang';
    return { text: `Hai amir! Selamat ${part}. 🤖 Aku sedia bantu — fokus, muzik, lampu, hujan, atau sekadar quote motivasi.` };
  }

  // ---- who are you
  if (/(siapa kau|siapa kamu|what are you|kamu apa|bot apa)/.test(q)) {
    return { text: `Aku pembantu kecil di dalam bilik lo-fi kamu — dijalankan sepenuhnya pada peranti (tiada server, privasi terjamin). Aku boleh set timer, mainkan muzik, kawal lampu & cuaca, dan bagi nasihat fokus. ✨` };
  }

  // ---- thanks
  if (/(terima kasih|thanks|thank you|tq|makasih)/.test(q)) {
    return { text: 'Sama-sama! Tinggal lama-lama di sini, dunia luar tak ke mana pun. 🌙' };
  }

  // ---- can you / questions about features
  if (/(boleh|kemampuan|fitur|feat|apa sahaja|cara guna|fungsi)/.test(q)) {
    return { text: `Aku boleh: set timer fokus ("fokus 50 minit"), mainkan/jedakan muzik lo-fi, nyalakan lampu, turunkan hujan, senaraikan to-do, beri quote & tips. Cuba je!` };
  }

  // ---- fallback
  return {
    text: `Hmm, saya belum faham "«${raw}»" sepenuhnya. 🤔 Cuba salah satu ini:\n• "fokus 50 minit"\n• "mainkan muzik"\n• "hidupkan lampu"\n• "turunkan hujan"\n• "quote motivasi"`,
  };
}

// Optional: wire a real model later without touching UI.
export async function askRemote(_input, _ctx) {
  return null;
}