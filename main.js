const API_URL =
  'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLgOBXDvnu7qLY88z22P3W3x2d9EieIsBcx5hQihk5a7j1cenYJgDbP-7PQOFV9nC7X0ex6n34ssEQLnuApVc8Kt_TM9sRZEUWXxrn4qKIx7_XlUGJQfB-WmnYy_8oLlOwsnMrrbT6hZxTSVm8YWYvw9SWyA_bkxjWZy0z_N_e9JuFm-i_kxEfFKK8figoWdK0yt7Go9rVKug9CyfutNEViIW7LzLqrTgM3RaC8E-7qZdUXTVkrTIhFt7Y2TwA&lib=Me_TdFWiyl3TASNz2Bx8Jo7Bo4TGvA1H8';

const statusElement = document.querySelector('[data-status]');
const tableBody = document.querySelector('#rankings tbody');
const updatedAtContainer = document.querySelector('#updated-at');
const updatedAtTime = updatedAtContainer?.querySelector('time');

const KEY_MAP = {
  season: ['Stagione', 'Season', 'Anno', 'Year'],
  position: ['Posizione', 'Placement', 'Position', 'Rank'],
  coach: ['Allenatore', 'Manager', 'Coach'],
  team: ['Squadra', 'Team', 'Club'],
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

async function loadRankings() {
  try {
    statusElement.textContent = 'Caricamento in corso…';
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Richiesta fallita (${response.status})`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      statusElement.textContent = 'Nessun dato disponibile al momento.';
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
      statusElement.textContent =
        'Formato dati inatteso: controlla le intestazioni del foglio.';
      return;
    }

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
    statusElement.textContent =
      'Impossibile recuperare i dati. Riprova tra qualche minuto.';
  }
}

loadRankings();
