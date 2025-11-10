
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
//exportPlayerProgressToCSV(true); //Trenger ikke nedlasting under test. 
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


// SJEKKER OG LAGRER BRUKERENS LØSNING (med Google Sheets-integrasjon) 
function verifySolution() {
  // Nullstill tidligere resultater
  testResults = [];
  let results = [];

  // Hent korrekt løsning fra modellen
  let correctSolution = model.ScenarioLevels[model.game.currentScenario].ScenarioSolution;

  // Sammenlign brukerens løsning med fasiten
  let isCorrect = JSON.stringify(currentUserSolution) === JSON.stringify(correctSolution);

  // Lagre 1 (riktig) eller 0 (feil)
  results.push(isCorrect ? 1 : 0);

  // Oppdater spillerens kunnskapsnivå (Bayesian Knowledge Tracing)
  if (typeof learner !== "undefined") {
    player.knowledge = learner.update(isCorrect);
    console.log(`Oppdatert kunnskapsnivå: ${player.knowledge.toFixed(2)}`);
  }

  // Lagre resultatdata
  const data = {
    id: player.id,
    scenario: model.game.currentScenario + 1, // Scenario-nummer
    knowledge: player.knowledge,
    result: isCorrect ? 1 : 0,
    timestamp: new Date().toLocaleString()
  };

  // LAGRER LOKALT I NETTLESER 
  localStorage.setItem(`learning_${player.id}_scenario${data.scenario}`, JSON.stringify(data));
  console.log("Læringsdata lagret lokalt:", data);

  // SENDER TIL GOOGLE SHEETS 
  // Bytt ut lenken nedenfor med din egen "Web App URL" fra Google Apps Script
  const scriptURL = "https://script.google.com/macros/s/AKfycbx7CqDQsiNZVBDWAxEFP4Y_Z9AaDW1GIs7xWCRwCheq_cDFYs_gUavNV-HTdsXsYMvW/exec";

  fetch(scriptURL, {
    method: "POST",
    mode: "no-cors", // Hindrer CORS-feil
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  .then(() => console.log("Resultat sendt til Google Sheet:", data))
  .catch(err => console.error("Feil ved sending til Google Sheet:", err));

  // Oppdater visningen
  setTaskDescription([isCorrect ? "PASS" : "FAIL"]);
  updateLearningDisplay();
}



