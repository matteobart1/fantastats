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
  gold: 'https://res.cloudinary.com/dp44j757l/image/upload/v1758752144/gold_badge_v2_Large_kbz3h4.jpg',
  silver: 'https://res.cloudinary.com/dp44j757l/image/upload/v1758752145/silver_badge_Large_ei0nyu.jpg',
  bronze: 'https://res.cloudinary.com/dp44j757l/image/upload/v1758752145/bronze_badge_Large_fbr6un.jpg',
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

    const item = document.createElement('div');
    item.className = `podium-item ${itemClass}`;

    const badge = document.createElement('img');
    badge.className = 'podium-badge';
    badge.src = MEDAL_BADGES[type];
    badge.alt = `Badge ${label}`;

    const position = document.createElement('div');
    position.className = `podium-position podium-position--${type}`;
    position.textContent = label;

    const coachName = document.createElement('div');
    coachName.className = 'podium-coach';
    coachName.textContent = coach.coach;

    const stats = document.createElement('div');
    stats.className = 'podium-stats';

    const goldStat = document.createElement('div');
    goldStat.className = 'podium-stat';
    goldStat.innerHTML = `
      <div class="podium-stat-value">${coach.gold}</div>
      <div class="podium-stat-label">Oro</div>
    `;

    const silverStat = document.createElement('div');
    silverStat.className = 'podium-stat';
    silverStat.innerHTML = `
      <div class="podium-stat-value">${coach.silver}</div>
      <div class="podium-stat-label">Argento</div>
    `;

    const bronzeStat = document.createElement('div');
    bronzeStat.className = 'podium-stat';
    bronzeStat.innerHTML = `
      <div class="podium-stat-value">${coach.bronze}</div>
      <div class="podium-stat-label">Bronzo</div>
    `;

    const totalStat = document.createElement('div');
    totalStat.className = 'podium-stat';
    totalStat.innerHTML = `
      <div class="podium-stat-value">${coach.total}</div>
      <div class="podium-stat-label">Totale</div>
    `;

    stats.append(goldStat, silverStat, bronzeStat, totalStat);
    item.append(badge, position, coachName, stats);
    medalsPodium.append(item);
  });
}

async function loadRankings() {
  try {
    statusElement.textContent = 'Caricamento in corso…';
    medalsStatusElement.textContent = 'Caricamento in corso…';
    
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Richiesta fallita (${response.status})`);
    }

    const payload = await response.json();
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
    renderMedalsPodium(medalsRanking);
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
