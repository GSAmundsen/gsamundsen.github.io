// Learning analytics (BKT)
// Player object - used to tie results to a user
let player = {
  id: "",          // ID (initials + date, ex. TS2607)
  knowledge: 0.0,  // Knowledge level, updates through BKT

  // ➕ NEW: Store pre-quiz and post-quiz learning scores
  preQuizScore: null,
  postQuizScore: null
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
      ? this.P + (1 - this.P) * this.learn
      : this.P * (1 - this.learn / 2);
    return this.P;
  }
}

// Opprett en standard BKT-instans
let learner = new BKT();


function updateLearning(isCorrect){

  // Updates the users learning level (BKT)
  if (typeof learner !== "undefined") {
    player.knowledge = learner.update(isCorrect);
    console.log(`Oppdatert kunnskapsnivå: ${player.knowledge.toFixed(2)}`);
  }

  console.log(`Scenario ${model.game.currentScenario}: ${isCorrect ? "Riktig" : "Feil"}`);

  // Store learningdata locally in the browser
  const data = {
    id: player.id,
    scenario: model.game.currentScenario + 1,
    knowledge: player.knowledge,
    result: isCorrect ? 1 : 0,
    timestamp: new Date().toLocaleString(),
    
    // ➕ NEW: store pre/post quiz in same record
    preQuizScore: player.preQuizScore,
    postQuizScore: player.postQuizScore
  };

  localStorage.setItem(`learning_${player.id}_scenario${data.scenario}`, JSON.stringify(data));
  console.log("Læringsdata lagret:", data);

  //exportPlayerProgressToCSV(true);
}


// OPPDATERER KUNNSKAPSNIVÅ I VISNINGEN 
function updateLearningDisplay() {
  const val = document.getElementById("knowledgeValue");
  if (val && player) val.textContent = player.knowledge.toFixed(2);
}


// Store pre-quiz score
function storePreQuizScore(score, total) {
  player.preQuizScore = score / total;
  localStorage.setItem(`preQuiz_${player.id}`, player.preQuizScore);
  console.log("PreQuiz score saved:", player.preQuizScore);
}

// Store post-quiz score
function storePostQuizScore(score, total) {
  player.postQuizScore = score / total;
  localStorage.setItem(`postQuiz_${player.id}`, player.postQuizScore);
  console.log("PostQuiz score saved:", player.postQuizScore);
}


const gammelVerify = verifySolution;

function verifySolution() {
  const results = verifier();
  
  const totalTokens = model.currentScenario.tokens.length;
  const allTokensCorrect =
    results.verified.length === totalTokens &&
    results.nonVerified.length === 0 &&
    results.nonFinisher.length === 0;
  
  updateLearning(allTokensCorrect);
  displayVerificationResults(results);

  // Send to Google Sheets
  const data = {
    id: player.id,
    scenario: model.game.currentScenario + 1,
    knowledge: player.knowledge,
    result: allTokensCorrect ? 1 : 0,
    timestamp: new Date().toLocaleString(),
    
    // ➕ NEW: Append quiz scores to Google Sheets
    preQuizScore: player.preQuizScore,
    postQuizScore: player.postQuizScore
  };

  const scriptURL = "https://script.google.com/macros/s/AKfycbx7CqDQsiNZVBDWAxEFP4Y_Z9AaDW1GIs7xWCRwCheq_cDFYs_gUavNV-HTdsXsYMvW/exec";

  fetch(scriptURL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  .then(() => console.log("Result sent to Google Sheet:", data))
  .catch(err => console.error("Error sending to Google Sheet:", err));
}


function displayVerificationResults(results) {
  let html = "";
  
  if (results.verified.length === model.currentScenario.tokens.length) {
    html = `<span style='color: green;'>✓ All tokens passed!</span>`;
  } else {
    const failuresToShow = results.verificationFailure.slice(0, 3);
    
    for (const failure of failuresToShow) {
      const match = failure.match(/token\.(\w+)/);
      if (match) {
        const variableName = match[1];
        const tokenName = failure.split(' ')[0];
        
        const descriptions = model.currentScenario.failureDescriptions?.[variableName];
        if (descriptions && descriptions.length > 0) {
          const randomDesc = descriptions[Math.floor(Math.random() * descriptions.length)];
          html += `${tokenName} ${randomDesc}<br>`;
        } else {
          html += `${tokenName} failed check<br>`;
        }
      }
    }
  }
  
  document.getElementById('taskVerificationText').innerHTML = html;
}
