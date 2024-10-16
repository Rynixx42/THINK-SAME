document.getElementById("classicModeBtn").addEventListener("click", function() {
    const settings = document.getElementById("classicSettings");
    settings.style.display = settings.style.display === "none" ? "block" : "none";
});

document.getElementById("createLobbyBtn").addEventListener("click", function() {
    const players = document.getElementById("players").value;
    const timeLimit = document.getElementById("timeLimit").value;
    const rounds = document.getElementById("rounds").value;

    // Generiere eine zufällige Lobby-ID
    const lobbyId = Math.random().toString(36).substring(2, 9);

    // Generiere den Lobby-Link
    const lobbyLink = `${window.location.origin}/lobby/${lobbyId}`;
    
    // Zeige den Lobby-Link an oder leite die Benutzer weiter
    alert(`Lobby erstellt! Teilen Sie diesen Link mit Ihren Freunden: ${lobbyLink}`);
    
    // Optional: Weiterleiten zur Lobby-Seite
    // window.location.href = lobbyLink;
});





