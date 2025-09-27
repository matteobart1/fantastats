const API_URL =
  'https://script.google.com/macros/s/AKfycbyHO0wtuSv8sjG_zASC1scEy5WnBDFtig3yh6vE3eOrlsMgMpDSNfdWrE66_qlB5xZs/exec';

const statusElement = document.querySelector('#status');
const medalsStatusElement = document.querySelector('#medals-status');
const rankingsTable = document.querySelector('#rankings');
const tableBody = rankingsTable?.querySelector('tbody') ?? null;
const medalsTable = document.querySelector('#medals-table');
const medalsTableBody = medalsTable?.querySelector('tbody') ?? null;
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
    const coachRaw = record[keyNames.coach];
    const coach = normalizeValue(coachRaw);
    const normalizedCoach = normalizeCoachName(coachRaw);
    const position = normalizeValue(record[keyNames.position]);

    if (!normalizedCoach || !position) return;

    const pos = parseInt(position, 10);
    if (!Number.isInteger(pos) || pos < 1 || pos > 3) return;

    if (!coachStats.has(normalizedCoach)) {
      coachStats.set(normalizedCoach, {
        coach,
        gold: 0,
        silver: 0,
        bronze: 0,
        total: 0,
      });
    }

    const stats = coachStats.get(normalizedCoach);

    // Aggiorna il nome visualizzato privilegiando la variante più lunga,
    // così da mantenere eventuali soprannomi o formattazioni utili.
    if (coach && (!stats.coach || coach.length > stats.coach.length)) {
      stats.coach = coach;
    }

    if (pos === 1) stats.gold++;
    else if (pos === 2) stats.silver++;
    else if (pos === 3) stats.bronze++;

    stats.total = stats.gold + stats.silver + stats.bronze;
  });

  return Array.from(coachStats.values()).sort((a, b) => {
      // Ordina per: oro, argento, bronzo, totale
      if (a.gold !== b.gold) return b.gold - a.gold;
      if (a.silver !== b.silver) return b.silver - a.silver;
      if (a.bronze !== b.bronze) return b.bronze - a.bronze;
      return b.total - a.total;
    });
}

function renderMedalsPodium(topCoaches) {
  if (!medalsPodium) return;

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

function renderMedalsTable(entries) {
  if (!medalsTableBody) return;

  if (!entries.length) {
    const emptyRow = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.dataset.empty = 'true';
    cell.textContent = 'Nessun dato disponibile al momento.';
    emptyRow.append(cell);
    medalsTableBody.replaceChildren(emptyRow);
    return;
  }

  const rows = entries.map((coach) => {
    const row = document.createElement('tr');

    const cells = [
      {
        label: 'Allenatore',
        value: normalizeValue(coach.coach) || 'Allenatore da definire',
      },
      { label: 'Oro', value: coach.gold },
      { label: 'Argento', value: coach.silver },
      { label: 'Bronzo', value: coach.bronze },
      { label: 'Totali', value: coach.total },
    ];

    cells.forEach(({ label, value }) => {
      const cell = document.createElement('td');
      cell.dataset.label = label;
      cell.textContent = `${value}`;
      row.append(cell);
    });

    return row;
  });

  medalsTableBody.replaceChildren(...rows);
}

async function loadCoachImages() {
  try {
    const response = await fetch(`${API_URL}?action=images`);
    if (!response.ok) {
      console.warn('Impossibile caricare le immagini dei coach');
      return new Map();
    }
    const data = await response.json();
    const map = new Map();

    const registerImage = (nameCandidate, urlCandidate) => {
      const key = normalizeCoachName(nameCandidate);
      const url = normalizeValue(urlCandidate);
      if (key && url) {
        map.set(key, url);
      }
    };

    if (Array.isArray(data)) {
      data.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const nameCandidate =
          item.coach ??
          item.Coach ??
          item.allenatore ??
          item.Allenatore ??
          item['Allenatore'] ??
          item['Allenatore 1'] ??
          item['Nome'] ??
          item['Name'];

        const urlCandidate =
          item.image ??
          item.Image ??
          item.immagine ??
          item.Immagine ??
          item.foto ??
          item.Foto ??
          item.photo ??
          item.Photo ??
          item.url ??
          item.URL ??
          item.link ??
          item.Link;

        registerImage(nameCandidate, urlCandidate);
      });
    } else if (data && typeof data === 'object') {
      Object.entries(data).forEach(([name, value]) => {
        if (typeof value === 'string') {
          registerImage(name, value);
          return;
        }

        if (value && typeof value === 'object') {
          const urlCandidate =
            value.url ??
            value.URL ??
            value.image ??
            value.Image ??
            value.immagine ??
            value.Immagine ??
            value.link ??
            value.Link;
          registerImage(name, urlCandidate);
        }
      });
    }

    return map;
  } catch (error) {
    console.warn('Errore nel caricamento delle immagini:', error);
    return new Map();
  }
}

async function loadRankings() {
  try {
    if (statusElement) {
      statusElement.textContent = 'Caricamento in corso…';
    }
    if (medalsStatusElement) {
      medalsStatusElement.textContent = 'Caricamento in corso…';
    }

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
      if (statusElement) {
        statusElement.textContent = 'Nessun dato disponibile al momento.';
      }
      if (medalsStatusElement) {
        medalsStatusElement.textContent = 'Nessun dato disponibile al momento.';
      }
      renderMedalsTable([]);
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
      if (statusElement) {
        statusElement.textContent = errorMsg;
      }
      if (medalsStatusElement) {
        medalsStatusElement.textContent = errorMsg;
      }
      renderMedalsTable([]);
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
    renderMedalsTable(medalsRanking);
    if (medalsStatusElement) {
      medalsStatusElement.textContent = `Classifica aggiornata: ${medalsRanking.length} allenatori`;
    }

    // Mostra la tabella delle classifiche recenti
    if (tableBody) {
      const sorted = [...payload].sort((a, b) =>
        parseYear(b[keyNames.season]) - parseYear(a[keyNames.season]) ||
        parseInt(a[keyNames.position], 10) - parseInt(b[keyNames.position], 10)
      );

      tableBody.replaceChildren(...sorted.map((record) => renderRow(record, keyNames)));
      if (statusElement) {
        statusElement.textContent = `Totale stagioni registrate: ${new Set(
          sorted.map((record) => normalizeValue(record[keyNames.season]))
        ).size}`;
      }
    } else if (statusElement) {
      statusElement.textContent = `Allenatori con almeno una medaglia: ${medalsRanking.length}`;
    }

    if (updatedAtTime && updatedAtContainer) {
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
    if (statusElement) {
      statusElement.textContent = errorMsg;
    }
    if (medalsStatusElement) {
      medalsStatusElement.textContent = errorMsg;
    }
    renderMedalsTable([]);
  }
}

const shouldLoadData = Boolean(medalsPodium || medalsTableBody || tableBody);

if (shouldLoadData) {
  loadRankings();
}
