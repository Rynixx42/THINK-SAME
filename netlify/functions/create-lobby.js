const { v4: uuidv4 } = require('uuid');

// In-memory storage (für Produktion: echte Datenbank verwenden)
global.lobbys = global.lobbys || new Map();

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
    const { playerName, playerId } = JSON.parse(event.body);
    
    if (!playerName || !playerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'PlayerName und PlayerId sind erforderlich' })
      };
    }

    // Generiere eindeutigen Lobby-Code
    const lobbyCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Erstelle neue Lobby
    const lobby = {
      code: lobbyCode,
      hostId: playerId,
      players: new Map([[playerId, {
        id: playerId,
        name: playerName,
        isHost: true,
        team: null,
        connected: true,
        lastSeen: Date.now()
      }]]),
      settings: {
        roundTime: 30,
        totalRounds: 5,
        matchThreshold: 90,
        gameMode: 'all'
      },
      gameState: {
        isActive: false,
        currentRound: 0,
        currentCategory: null,
        roundAnswers: new Map(),
        scores: new Map([[playerId, 0]]),
        streak: 0,
        roundStartTime: null
      },
      createdAt: Date.now()
    };

    // Speichere Lobby
    global.lobbys.set(lobbyCode, lobby);

    // Clean up alte Lobbys (älter als 6 Stunden)
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    for (const [code, lobbyData] of global.lobbys.entries()) {
      if (lobbyData.createdAt < sixHoursAgo) {
        global.lobbys.delete(code);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        lobbyCode,
        lobby: serializeLobby(lobby)
      })
    };

  } catch (error) {
    console.error('Error creating lobby:', error);
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