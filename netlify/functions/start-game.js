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
    const { lobbyCode, playerId } = JSON.parse(event.body);
    
    const lobby = global.lobbys.get(lobbyCode.toUpperCase());
    
    if (!lobby || !lobby.players.has(playerId)) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Lobby oder Spieler nicht gefunden' })
      };
    }

    const player = lobby.players.get(playerId);
    
    if (!player.isHost) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Nur der Host kann das Spiel starten' })
      };
    }

    if (lobby.players.size < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Mindestens 2 Spieler erforderlich' })
      };
    }

    // Starte das Spiel
    lobby.gameState.isActive = true;
    lobby.gameState.currentRound = 1;
    lobby.gameState.currentCategory = getRandomCategory();
    lobby.gameState.roundAnswers.clear();
    lobby.gameState.streak = 0;
    lobby.gameState.roundStartTime = Date.now();

    // Reset scores
    lobby.players.forEach((player, playerId) => {
      lobby.gameState.scores.set(playerId, 0);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        lobby: serializeLobby(lobby)
      })
    };

  } catch (error) {
    console.error('Error starting game:', error);
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
        'Bücher',  
        'Musikalben',  
        'Songtexte',  
        'Reimwörter',  
        'Lügen',  
        'Träume',  
        'Peinliche Situationen',  
        'Kinderserien',  
        'Tanzarten',  
        'Uhrenmarken',  
        'Parfümmarken',  
        'Fast-Food-Ketten',  
        'Spielzeug',  
        'Haarschnitte',  
        'Süßspeisen',  
        'Gewürze',  
        'Kulturen',  
        'Religionen',  
        'Bücherfiguren',  
        'Gefährliche Orte',  
        'Filmwaffen',  
        'Detektive',  
        'Tatorte',  
        'Kriminalfälle',  
        'Modeaccessoires',  
        'Verkehrsunfälle',  
        'Bewegungsverben',  
        'Feste & Feiertage',  
        'Typisch deutsch',  
        'Typisch amerikanisch',  
        'Typisch asiatisch',  
        'Typisch französisch',  
        'Schulnoten-Gründe',  
        'Sprüche von Eltern',  
        'Berühmte Paare',  
        'Lügengeschichten',  
        'Wahrheiten, die wehtun',  
        'Versicherungen',  
        'Küchengeräte',  
        'Wörter aus der Werbung',  
        'TV-Werbeslogans',  
        'Pseudonyme',  
        'Hackernamen',  
        'Slangbegriffe',  
        'Jugendwörter',  
        'Spitznamen',  
        'Kosename für Partner',  
        'Letzte Worte',  
        'Szenarien bei Apokalypse',  
        'Bösewichtnamen',  
        'Wissenschaftler*innen',  
        'Historische Figuren',  
        'Wichtige Jahreszahlen',  
        'Sprengstoffe',  
        'Todesursachen',  
        'Seltsame Hobbys',  
        'Wünsche',  
        'Ängste',  
        'Künstlernamen',  
        'Götter & Göttinnen',  
        'Fantasy-Rassen',  
        'Magische Gegenstände',  
        'Krankenkassen',  
        'Verkehrsregeln',  
        'Sinnlose Dinge',  
        'Berühmte Reden',  
        'Böse Berufe',  
        'Alienspezies',  
        'Lustige Orte',  
        'Nervige Dinge',  
        'Berühmte Brücken',  
        'Flüsse',  
        'Seen',  
        'Extremtemperaturen',  
        'TV-Wettermoderatoren',  
        'Sachen, die man nicht vergisst',  
        'Unnützes Wissen',  
        'Sachen, die man im Internet findet',  
        'Typische Fragen im Bewerbungsgespräch',  
        'Dinge, die Lehrer sagen',  
        'Unerklärliche Dinge',  
        'Kuriose Berufe',  
        'Berühmte Redensarten'  
    ];
  return categories[Math.floor(Math.random() * categories.length)];
}