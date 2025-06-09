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
    const { lobbyCode, playerId, answer } = JSON.parse(event.body);
    
    const lobby = global.lobbys.get(lobbyCode.toUpperCase());
    
    if (!lobby || !lobby.players.has(playerId)) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Lobby oder Spieler nicht gefunden' })
      };
    }

    if (!lobby.gameState.isActive) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Spiel ist nicht aktiv' })
      };
    }

    // Prüfe Zeitlimit
    const timeElapsed = (Date.now() - lobby.gameState.roundStartTime) / 1000;
    if (timeElapsed > lobby.settings.roundTime) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Zeit abgelaufen' })
      };
    }

    // Speichere Antwort
    lobby.gameState.roundAnswers.set(playerId, (answer || '').toLowerCase().trim());

    // Prüfe ob alle Spieler geantwortet haben
    const activePlayers = Array.from(lobby.players.values()).filter(p => p.connected);
    const allAnswered = activePlayers.every(player => 
      lobby.gameState.roundAnswers.has(player.id)
    );

    let roundComplete = false;
    let results = null;

    if (allAnswered || timeElapsed >= lobby.settings.roundTime) {
      // Runde beenden und Ergebnisse berechnen
      results = calculateRoundResults(lobby);
      roundComplete = true;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        lobby: serializeLobby(lobby),
        roundComplete,
        results
      })
    };

  } catch (error) {
    console.error('Error submitting answer:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

function calculateRoundResults(lobby) {
  const answers = Array.from(lobby.gameState.roundAnswers.values()).filter(answer => answer.length > 0);
  const answerCounts = new Map();
  
  // Zähle identische Antworten
  answers.forEach(answer => {
    answerCounts.set(answer, (answerCounts.get(answer) || 0) + 1);
  });
  
  // Finde häufigste Antwort
  let mostCommonAnswer = '';
  let maxCount = 0;
  
  answerCounts.forEach((count, answer) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonAnswer = answer;
    }
  });
  
  // Berechne Übereinstimmungsrate
  const totalPlayers = Array.from(lobby.players.values()).filter(p => p.connected).length;
  const matchPercentage = Math.round((maxCount / totalPlayers) * 100);
  
  // Aktualisiere Scores und Streak
  const roundSuccess = matchPercentage >= lobby.settings.matchThreshold;
  
  if (roundSuccess) {
    lobby.gameState.streak++;
    // Vergebe Punkte an Spieler mit passender Antwort
    lobby.gameState.roundAnswers.forEach((answer, playerId) => {
      if (answer === mostCommonAnswer) {
        const currentScore = lobby.gameState.scores.get(playerId) || 0;
        const points = 10 * lobby.gameState.streak;
        lobby.gameState.scores.set(playerId, currentScore + points);
      }
    });
  } else {
    lobby.gameState.streak = 0;
  }

  return {
    mostCommonAnswer,
    matchCount: maxCount,
    matchPercentage,
    roundSuccess,
    streak: lobby.gameState.streak,
    allAnswers: Array.from(lobby.gameState.roundAnswers.entries())
  };
}

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