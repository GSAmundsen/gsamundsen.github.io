
// LEARNING SYSTEM (BKT + PRE/POST QUIZ TRACKING)


// Player session data
let player = {
  id: "",
  knowledge: 0.0,
  preQuizScore: null,
  postQuizScore: null
};


// BAYESIAN KNOWLEDGE TRACING

class BKT {
  constructor(start = 0.3, learn = 0.2) {
    this.P = start;
    this.learn = learn;
  }

  update(isCorrect) {
    this.P = isCorrect
      ? this.P + (1 - this.P) * this.learn
      : this.P * (1 - this.learn / 2);

    return this.P;
  }
}

let learner = new BKT();




// UPDATE KNOWLEDGE AFTER VERIFY

function updateLearning(isCorrect) {

  if (typeof learner !== "undefined") {
    player.knowledge = learner.update(isCorrect);
  }

  const data = {
    type: "SCENARIO",
    id: player.id,
    scenario: model.game.currentScenario + 1,
    result: isCorrect ? 1 : 0,
    knowledge: player.knowledge,
    preQuizScore: player.preQuizScore,
    postQuizScore: player.postQuizScore,
    timestamp: new Date().toLocaleString()
  };

  localStorage.setItem(
    `learning_${player.id}_scenario${data.scenario}`,
    JSON.stringify(data)
  );

  sendToGoogleSheet(data);
  updateLearningDisplay();
}




// PRE QUIZ SCORE

function storePreQuizScore(score, total) {
  const startLevel = score / total;   // 0–1

  // Save player starting knowledge
  player.preQuizScore = startLevel;
  player.knowledge = startLevel;

  // Reset BKT model starting at pre-quiz level
  learner = new BKT(startLevel);

  // Update bar UI (if visible)
  updateLearningDisplay();

  // Save to localStorage
  localStorage.setItem(`preQuiz_${player.id}`, player.preQuizScore);

  // Send clean row to sheet
  const data = {
    type: "PRE_QUIZ",
    id: player.id,
    scenario: "",
    result: "",
    knowledge: startLevel,
    preQuizScore: startLevel,
    postQuizScore: "",
    timestamp: new Date().toLocaleString()
  };

  sendToGoogleSheet(data);

  console.log("Pre-quiz starting knowledge set:", startLevel);
}






// POST QUIZ SCORE

function storePostQuizScore(score, total) {
  const value = score / total;

  player.postQuizScore = value;

  localStorage.setItem(`postQuiz_${player.id}`, value);

  const data = {
    type: "POST_QUIZ",
    id: player.id,
    scenario: "",
    result: "",
    knowledge: "",
    preQuizScore: player.preQuizScore,
    postQuizScore: value,
    timestamp: new Date().toLocaleString()
  };

  sendToGoogleSheet(data);
}




// UPDATE KNOWLEDGE UI

function updateLearningDisplay() {
  const el = document.getElementById("knowledgeValue");
  if (el) el.textContent = player.knowledge.toFixed(2);
}




// SEND TO GOOGLE SHEETS

function sendToGoogleSheet(payload) {
  const scriptURL =
    "https://script.google.com/macros/s/AKfycbzJOxQwZ4QgWNTBxPAw_x-_1Vc9k-yG-Mqzz62SWjGnRyjpSeSTpdBxE8_JjtmmYqlN/exec";

  fetch(scriptURL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(() => console.log("Sent to Google Sheet:", payload))
    .catch(err => console.error("Sheet send error:", err));
}




// VERIFY SOLUTION WRAPPER

const _oldVerifySolution = verifySolution;

function verifySolution() {
  const results = verifier();

  const totalTokens = model.currentScenario.tokens.length;

  const allCorrect =
    results.verified.length === totalTokens &&
    results.nonVerified.length === 0 &&
    results.nonFinisher.length === 0;

  // Update learning level (BKT model)
  updateLearning(allCorrect);

  // Show the messages under the canvas
  displayVerificationResults(results);

  // Update visible UI bar
  updateLearningDisplay();
}





// DISPLAY FAILURE MESSAGES

function displayVerificationResults(results) {
  let html = "";

  // If absolutely everything passed
  if (
    results.verified.length > 0 &&
    results.verified.length === model.currentScenario.tokens.length
  ) {
    html = `<span style='color: green;'>✓ All tokens passed!</span>`;
  }

  // Otherwise show failures (max 3 total)
  else {
    let messageCount = 0;
    const MAX_MESSAGES = 3;

    // PRIORITY 1: NON-FINISHERS
    if (results.nonFinisher.length > 0) {
      const messages = [
        "didn't make it to the plane."
      ];
      
      for (const token of results.nonFinisher) {
        if (messageCount >= MAX_MESSAGES) break;
        
        const msg = messages[Math.floor(Math.random() * messages.length)];
        html += `<span style='color: orange;'>${token.name} ${msg}</span><br>`;
        messageCount++;
      }
    }

    if (messageCount < MAX_MESSAGES) {
      for (const failure of results.verificationFailure) {
        if (messageCount >= MAX_MESSAGES) break;

        const variableMatch = failure.match(/token\.(\w+)/);
        const tokenName = failure.split(" ")[0];

        if (variableMatch) {
          const variable = variableMatch[1];
          const descList = model.currentScenario.failureDescriptions?.[variable];

          if (descList?.length > 0) {
            const msg = descList[Math.floor(Math.random() * descList.length)];
            html += `${tokenName} ${msg}<br>`;
          } else {
            html += `${tokenName} failed<br>`;
          }
        } else {
          html += failure + "<br>";
        }
        
        messageCount++;
      }
    }
  }

  document.getElementById("taskVerificationText").innerHTML = html;
}

