
// Learning analytics (BKT)
// Player object - used to tie results to a user
let player = {
  id: "",          // ID (initials + date, ex. TS2607)
  knowledge: 0.0   // Knowledge level, updates through BKT
};

// Simplified version of Bayesian Knowledge Tracing (BKT)
class BKT {
  constructor(start = 0.3, learn = 0.2) {
    this.P = start;    // Startnivå (fra quiz eller antatt)
    this.learn = learn; // Hvor raskt spilleren lærer
  }

  // Oppdaterer sannsynligheten for læring basert på om spilleren gjør riktig eller feil
  update(isCorrect) {
    this.P = isCorrect
      ? this.P + (1 - this.P) * this.learn   // Øker hvis riktig
      : this.P * (1 - this.learn / 2);       // Minker litt hvis feil
    return this.P;
  }
}
// Opprett en standard BKT-instans
let learner = new BKT();

function loadQuizResult() {
  let quizScore = 0.6; // Eksempel: 60 % riktig
  player.knowledge = quizScore;
  learner = new BKT(quizScore);
  console.log("Startnivå fra quiz:", quizScore);
}



function updateLearning(isCorrect){

  // Updates the users learning level (BKT)
  if (typeof learner !== "undefined") {
    player.knowledge = learner.update(isCorrect);
    console.log(`Oppdatert kunnskapsnivå: ${player.knowledge.toFixed(2)}`);
  }

  // Logs the result to the console (for the developer)
  console.log(`Scenario ${model.game.currentScenario}: ${isCorrect ? "Riktig" : "Feil"}`);

 // Store learningdata locally in the browser
const data = {
  id: player.id,
  scenario: model.game.currentScenario + 1, // Adds scenario number
  knowledge: player.knowledge,
  result: isCorrect ? 1 : 0,
  timestamp: new Date().toLocaleString(),
};

// Stores the result in localStorage
localStorage.setItem(`learning_${player.id}_scenario${data.scenario}`, JSON.stringify(data));
console.log("Læringsdata lagret:", data);


// Eksporter automatisk til CSV etter hvert scenario
exportPlayerProgressToCSV(true); //Trenger ikke nedlasting under test. 
}


// OPPDATERER KUNNSKAPSNIVÅ I VISNINGEN 
function updateLearningDisplay() {
  const val = document.getElementById("knowledgeValue");
  if (val && player) val.textContent = player.knowledge.toFixed(2);
}

// OPPDATER VISNINGEN ETTER HVER VERIFISERING 
// Denne "wrapper" verifySolution slik at kunnskapsnivået oppdateres automatisk etter brukeren sjekker løsningen
const gammelVerify = verifySolution;
verifySolution = function () {
  gammelVerify();
  updateLearningDisplay();
};


// EKSPORTER ALLE RESULTATER TIL CSV 
// Denne funksjonen samler alle "learning_*"-elementer i localStorage
// og lagrer dem i en .csv-fil som lastes ned i nettleseren
function exportResultsToCSV() {
  // Samle alle nøkler som starter med "learning_"
  const keys = Object.keys(localStorage).filter(k => k.startsWith("learning_"));
  if (keys.length === 0) {
    alert("no learnigndata found!");
    return;
  }

  // Bygg CSV-header og rader
  let csvContent = "PlayerID,Knowledge,Result,Timestamp\n";

  keys.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    csvContent += `${data.id},${data.knowledge},${data.result},${data.timestamp}\n`;
  });

  // Lag en Blob (datafil) og last den ned som CSV
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "learning_results.csv");
  link.click();
}


// === EKSPORTER SPILLERFREMDRIFT TIL CSV ===
// Denne funksjonen samler all lagret læringsdata (fra localStorage)
// og laster det automatisk ned som en CSV-fil.
function exportPlayerProgressToCSV(autoDownload = false) {
  // Henter alle nøkler som starter med "learning_"
  const keys = Object.keys(localStorage).filter(k => k.startsWith("learning_"));
  if (keys.length === 0) {
    alert("Ingen lagrede spillerdata funnet!");
    return;
  }

  // Lager CSV-header (kolonnenavn)
  let csvContent = "PlayerID,Scenario,Knowledge,Result,Timestamp\n";

  // Legger til data for hver spiller
  keys.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    csvContent += `${data.id},${data.scenario},${data.knowledge},${data.result},${data.timestamp}\n`;
  });

  // Oppretter CSV-blob (filinnhold)
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Lagrer filen lokalt
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "spiller_fremdrift.csv");
  document.body.appendChild(link);

  // Hvis autoDownload = true → last ned automatisk etter scenario
  if (autoDownload) {
    link.click();
  }

  document.body.removeChild(link);
  console.log("💾 CSV-fil generert:", "spiller_fremdrift.csv");
}


