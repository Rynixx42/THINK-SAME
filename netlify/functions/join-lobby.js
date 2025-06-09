exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { lobbyCode, playerName, playerId } = JSON.parse(event.body);
    
    if (!lobbyCode || !playerName || !playerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Alle Felder sind erforderlich' })
      };
    }

    const lobby = global.lobbys.get(lobbyCode.toUpperCase());
    
    if (!lobby) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Lobby nicht gefunden' })
      };
    }

    if (lobby.gameState.isActive) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Spiel bereits gestartet' })
      };
    }

    if (lobby.players.size >= 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Lobby ist voll (max. 8 Spieler)' })
      };
    }

    // Prüfe ob Spieler bereits in Lobby
    if (lobby.players.has(playerId)) {
      // Update last seen
      lobby.players.get(playerId).lastSeen = Date.now();
      lobby.players.get(playerId).connected = true;
    } else {
      // Füge neuen Spieler hinzu
      lobby.players.set(playerId, {
        id: playerId,
        name: playerName,
        isHost: false,
        team: null,
        connected: true,
        lastSeen: Date.now()
      });

      lobby.gameState.scores.set(playerId, 0);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        lobby: serializeLobby(lobby)
      })
    };

  } catch (error) {
    console.error('Error joining lobby:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

function serializeLobby(lobby) {
  return {
    code: lobby.code,
    hostId: lobby.hostId,
    players: Array.from(lobby.players.values()),
    settings: lobby.settings,
    gameState: {
      ...lobby.gameState,
      roundAnswers: Array.from(lobby.gameState.roundAnswers.entries()),
      scores: Array.from(lobby.gameState.scores.entries())
    }
  };
}

// ===============================
// netlify/functions/update-lobby.js
// ===============================

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    if (event.httpMethod === 'GET') {
      // Lobby-Status abrufen
      const lobbyCode = event.queryStringParameters?.code;
      const playerId = event.queryStringParameters?.playerId;
      
      if (!lobbyCode || !playerId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Code und PlayerId erforderlich' })
        };
      }

      const lobby = global.lobbys.get(lobbyCode.toUpperCase());
      
      if (!lobby || !lobby.players.has(playerId)) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Lobby oder Spieler nicht gefunden' })
        };
      }

      // Update last seen
      lobby.players.get(playerId).lastSeen = Date.now();
      lobby.players.get(playerId).connected = true;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          lobby: serializeLobby(lobby)
        })
      };
    }

    if (event.httpMethod === 'POST') {
      // Lobby-Einstellungen oder Teams aktualisieren
      const { lobbyCode, playerId, action, data } = JSON.parse(event.body);
      
      const lobby = global.lobbys.get(lobbyCode.toUpperCase());
      
      if (!lobby || !lobby.players.has(playerId)) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Lobby oder Spieler nicht gefunden' })
        };
      }

      const player = lobby.players.get(playerId);
      
      if (!player.isHost && action !== 'heartbeat') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Nur der Host kann Einstellungen ändern' })
        };
      }

      switch (action) {
        case 'updateSettings':
          lobby.settings = { ...lobby.settings, ...data };
          break;
          
        case 'assignTeam':
          if (lobby.players.has(data.targetPlayerId)) {
            lobby.players.get(data.targetPlayerId).team = data.team;
          }
          break;
          
        case 'heartbeat':
          player.lastSeen = Date.now();
          player.connected = true;
          break;

        case 'nextRound':
          if (lobby.gameState.isActive && player.isHost) {
            lobby.gameState.currentRound++;
            lobby.gameState.roundAnswers.clear();
            lobby.gameState.currentCategory = getRandomCategory();
            lobby.gameState.roundStartTime = Date.now();
          }
          break;
          
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Unbekannte Aktion' })
          };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          lobby: serializeLobby(lobby)
        })
      };
    }

  } catch (error) {
    console.error('Error updating lobby:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

function serializeLobby(lobby) {
  return {
    code: lobby.code,
    hostId: lobby.hostId,
    players: Array.from(lobby.players.values()),
    settings: lobby.settings,
    gameState: {
      ...lobby.gameState,
      roundAnswers: Array.from(lobby.gameState.roundAnswers.entries()),
      scores: Array.from(lobby.gameState.scores.entries())
    }
  };
}

function getRandomCategory() {
  const categories = [
    'Essen', 'Tiere', 'Farben', 'Länder', 'Berufe', 'Sport', 'Musik', 'Filme',
    'Kleidung', 'Wetter', 'Transport', 'Hobbys', 'Körperteile', 'Möbel',
    'Getränke', 'Früchte', 'Gemüse', 'Werkzeuge', 'Elektronik', 'Natur',
    'Schule', 'Küche', 'Badezimmer', 'Garten', 'Auto', 'Computer', 'Handy',
    'Büro', 'Restaurant', 'Supermarkt', 'Krankenhaus', 'Bank', 'Post'
  ];
  return categories[Math.floor(Math.random() * categories.length)];
}