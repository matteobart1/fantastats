const API_URL =
  'https://script.google.com/macros/s/AKfycbzuDy-H0CMkaET-DgVVSRkDTDnJhTQPIhXoLhYSMJaxAqxYTHZ9DezAF-ltoRdC7M6x/exec';

const statusElement = document.querySelector('[data-status]');
const medalsStatusElement = document.querySelector('#medals-status');
const tableBody = document.querySelector('#rankings tbody');
const medalsPodium = document.querySelector('#medals-podium');
const updatedAtContainer = document.querySelector('#updated-at');
const updatedAtTime = updatedAtContainer?.querySelector('time');

const KEY_MAP = {
  season: ['Stagione', 'Season', 'Anno', 'Year'],
  position: ['Posizione', 'Placement', 'Position', 'Rank'],
  coach: ['Allenatore', 'Allenatore 1', 'Manager', 'Coach'],
  team: ['Squadra', 'Team', 'Club'],
};

const MEDAL_BADGES = {
  gold: 'https://res.cloudinary.com/dp44j757l/image/upload/v1758922471/gold_badge_v2_Background_Removed_olh442.png',
  silver: 'https://res.cloudinary.com/dp44j757l/image/upload/v1758922470/silver_badge_Background_Removed_baz4ne.png',
  bronze: 'https://res.cloudinary.com/dp44j757l/image/upload/v1758922471/bronze_badge_Background_Removed_jkmeq6.png',
  white: 'https://res.cloudinary.com/dp44j757l/image/upload/v1758922470/badge_white_Background_Removed_xuaj3b.png',
};

function resolveKey(record, candidates) {
  return candidates.find((key) => Object.prototype.hasOwnProperty.call(record, key));
}

function normalizeValue(value) {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return value;
}

function normalizeCoachName(value) {
  const normalized = normalizeValue(value);
  if (!normalized) return '';

  return normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPositionBadge(positionRaw) {
  const position = normalizeValue(positionRaw);
  if (!position && position !== 0) {
    return '';
  }

  const wrapper = document.createElement('span');
  wrapper.className = 'badge';

  const medal =
    position === 1 || position === '1' || position === '1°'
      ? '🥇'
      : position === 2 || position === '2' || position === '2°'
      ? '🥈'
      : position === 3 || position === '3' || position === '3°'
      ? '🥉'
      : '🏅';

  const label = typeof position === 'number' ? `${position}°` : position;
  wrapper.textContent = `${medal} ${label}`;
  return wrapper.outerHTML;
}

function renderRow(record, keyNames) {
  const seasonValue = normalizeValue(record[keyNames.season]);
  const positionValue = normalizeValue(record[keyNames.position]);
  const coachValue = normalizeValue(record[keyNames.coach]);
  const teamValue = normalizeValue(record[keyNames.team]);

  const row = document.createElement('tr');

  const columns = [
    { label: 'Stagione', value: seasonValue },
    { label: 'Posizione', value: buildPositionBadge(positionValue) },
    {
      label: 'Allenatore',
      value: coachValue,
      emptyText: 'Allenatore da definire',
    },
    { label: 'Squadra', value: teamValue, emptyText: 'Squadra non registrata' },
  ];

  columns.forEach(({ label, value, emptyText }) => {
    const cell = document.createElement('td');
    cell.dataset.label = label;
    if (value) {
      cell.innerHTML = value;
    } else {
      cell.dataset.empty = 'true';
      cell.textContent = emptyText ?? 'Dato mancante';
    }
    row.append(cell);
  });

  return row;
}

function parseYear(value) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return Number.NEGATIVE_INFINITY;
  }

  if (typeof normalized === 'number') {
    return normalized;
  }

  const matches = normalized.match(/\d{4}/g);
  if (!matches) {
    return Number.NEGATIVE_INFINITY;
  }

  return parseInt(matches[0], 10);
}

function calculateMedals(payload, keyNames) {
  const coachStats = new Map();

  payload.forEach((record) => {
    const coach = normalizeValue(record[keyNames.coach]);
    const position = normalizeValue(record[keyNames.position]);
    
    if (!coach || !position) return;

    const pos = parseInt(position, 10);
    if (pos < 1 || pos > 3) return;

    if (!coachStats.has(coach)) {
      coachStats.set(coach, { gold: 0, silver: 0, bronze: 0, total: 0 });
    }

    const stats = coachStats.get(coach);
    if (pos === 1) stats.gold++;
    else if (pos === 2) stats.silver++;
    else if (pos === 3) stats.bronze++;
    
    stats.total = stats.gold + stats.silver + stats.bronze;
  });

  return Array.from(coachStats.entries())
    .map(([coach, stats]) => ({ coach, ...stats }))
    .sort((a, b) => {
      // Ordina per: oro, argento, bronzo, totale
      if (a.gold !== b.gold) return b.gold - a.gold;
      if (a.silver !== b.silver) return b.silver - a.silver;
      if (a.bronze !== b.bronze) return b.bronze - a.bronze;
      return b.total - a.total;
    });
}

function renderMedalsPodium(topCoaches) {
  medalsPodium.innerHTML = '';

  const positions = [
    { type: 'gold', label: 'Oro', class: 'podium-item--gold' },
    { type: 'silver', label: 'Argento', class: 'podium-item--silver' },
    { type: 'bronze', label: 'Bronzo', class: 'podium-item--bronze' },
  ];

  positions.forEach(({ type, label, class: itemClass }, index) => {
    const coach = topCoaches[index];
    if (!coach) return;

    // Solo il badge, senza contenitore esterno
    const card = document.createElement('div');
    card.className = 'podium-card';

    const badgeBg = document.createElement('img');
    badgeBg.className = 'badge-bg';
    badgeBg.src = MEDAL_BADGES[type];
    badgeBg.alt = `Badge ${label}`;

    // Foto allenatore nella parte alta del badge
    const coachImg = document.createElement('img');
    coachImg.className = 'coach-photo';
    if (coach.image) {
      coachImg.src = coach.image;
      coachImg.alt = `Foto di ${coach.coach}`;
    } else {
      coachImg.style.display = 'none';
    }

    // Nome e statistiche nella parte bassa del badge
    const badgeContent = document.createElement('div');
    badgeContent.className = 'badge-content';

    const coachName = document.createElement('div');
    coachName.className = 'badge-coach-name';
    coachName.textContent = coach.coach;

    const stats = document.createElement('div');
    stats.className = 'badge-stats';

    const goldStat = document.createElement('div');
    goldStat.className = 'badge-stat';
    goldStat.innerHTML = `
      <div class="badge-stat-value">${coach.gold}</div>
      <div class="badge-stat-label">ORO</div>
    `;

    const silverStat = document.createElement('div');
    silverStat.className = 'badge-stat';
    silverStat.innerHTML = `
      <div class="badge-stat-value">${coach.silver}</div>
      <div class="badge-stat-label">ARG</div>
    `;

    const bronzeStat = document.createElement('div');
    bronzeStat.className = 'badge-stat';
    bronzeStat.innerHTML = `
      <div class="badge-stat-value">${coach.bronze}</div>
      <div class="badge-stat-label">BRON</div>
    `;

    const totalStat = document.createElement('div');
    totalStat.className = 'badge-stat';
    totalStat.innerHTML = `
      <div class="badge-stat-value">${coach.total}</div>
      <div class="badge-stat-label">TOT</div>
    `;

    stats.append(goldStat, silverStat, bronzeStat, totalStat);
    badgeContent.append(coachName, stats);
    card.append(badgeBg, coachImg, badgeContent);
    medalsPodium.append(card);
  });
}

async function loadCoachImages() {
  try {
    const response = await fetch(`${API_URL}?action=images`);
    if (!response.ok) {
      console.warn('Impossibile caricare le immagini dei coach');
      return new Map();
    }
    const data = await response.json();
    return Object.entries(data ?? {}).reduce((map, [name, url]) => {
      const key = normalizeCoachName(name);
      if (key) {
        map.set(key, url);
      }
      return map;
    }, new Map());
  } catch (error) {
    console.warn('Errore nel caricamento delle immagini:', error);
    return new Map();
  }
}

async function loadRankings() {
  try {
    statusElement.textContent = 'Caricamento in corso…';
    medalsStatusElement.textContent = 'Caricamento in corso…';
    
    // Carica i dati del podio e le immagini in parallelo
    const [podioResponse, coachImages] = await Promise.all([
      fetch(API_URL),
      loadCoachImages()
    ]);

    if (!podioResponse.ok) {
      throw new Error(`Richiesta fallita (${podioResponse.status})`);
    }

    const payload = await podioResponse.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      statusElement.textContent = 'Nessun dato disponibile al momento.';
      medalsStatusElement.textContent = 'Nessun dato disponibile al momento.';
      return;
    }

    const sample = payload[0];
    const keyNames = {
      season: resolveKey(sample, KEY_MAP.season),
      position: resolveKey(sample, KEY_MAP.position),
      coach: resolveKey(sample, KEY_MAP.coach),
      team: resolveKey(sample, KEY_MAP.team),
    };

    if (!keyNames.season || !keyNames.position || !keyNames.coach || !keyNames.team) {
      const errorMsg = 'Formato dati inatteso: controlla le intestazioni del foglio.';
      statusElement.textContent = errorMsg;
      medalsStatusElement.textContent = errorMsg;
      return;
    }

    // Calcola e mostra la classifica medaglie
    const medalsRanking = calculateMedals(payload, keyNames);

    const medalsRankingWithImages = medalsRanking.map((entry) => {
      const normalizedName = normalizeCoachName(entry.coach);
      const image = normalizedName ? coachImages.get(normalizedName) ?? null : null;
      return {
        ...entry,
        image,
      };
    });

    renderMedalsPodium(medalsRankingWithImages);
    medalsStatusElement.textContent = `Classifica aggiornata: ${medalsRanking.length} allenatori`;

    // Mostra la tabella delle classifiche recenti
    const sorted = [...payload].sort((a, b) =>
      parseYear(b[keyNames.season]) - parseYear(a[keyNames.season]) ||
      parseInt(a[keyNames.position], 10) - parseInt(b[keyNames.position], 10)
    );

    tableBody.replaceChildren(...sorted.map((record) => renderRow(record, keyNames)));
    statusElement.textContent = `Totale stagioni registrate: ${new Set(
      sorted.map((record) => normalizeValue(record[keyNames.season]))
    ).size}`;

    if (updatedAtTime) {
      const now = new Date();
      updatedAtTime.dateTime = now.toISOString();
      updatedAtTime.textContent = new Intl.DateTimeFormat('it-IT', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(now);
      updatedAtContainer.hidden = false;
    }
  } catch (error) {
    console.error(error);
    const errorMsg = 'Impossibile recuperare i dati. Riprova tra qualche minuto.';
    statusElement.textContent = errorMsg;
    medalsStatusElement.textContent = errorMsg;
  }
}

loadRankings();
