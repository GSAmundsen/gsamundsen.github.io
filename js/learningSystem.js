
//  LEARNING SYSTEM (BKT + QUIZZES + GOOGLE SHEETS)




//  PLAYER OBJECT

// Holds the player ID and all learning-related values
let player = {
  id: "",
  preQuizScore: null,
  postQuizScore: null,
  knowledge: 0.0      // This changes during gameplay via BKT
};




//  BAYESIAN KNOWLEDGE TRACING (BKT)

// Simple model: increases if correct, decreases slightly if wrong
class BKT {
  constructor(start = 0.3, learn = 0.2) {
    this.P = start;      // starting mastery probability
    this.learn = learn;  // learning rate
  }

  update(isCorrect) {
    this.P = isCorrect
      ? this.P + (1 - this.P) * this.learn     // Correct answer → increases
      : this.P * (1 - this.learn / 2);         // Wrong answer → decreases slightly

    return this.P;
  }
}

// Current learner instance
let learner = new BKT();




//  PRE-QUIZ RESULT HANDLER

// Called once after the pre-quiz scenario finishes
function recordPreQuizScore(correct, total) {
  const score = correct / total;
  player.preQuizScore = score;

  // Pre-quiz defines starting BKT knowledge
  learner = new BKT(score);
  player.knowledge = score;

  console.log("Pre-quiz score:", score);

  sendToGoogleSheet("PRE", score, null);
  updateLearningDisplay();
}




//  POST-QUIZ RESULT HANDLER

// Called once after the final scenario (post-quiz)
function recordPostQuizScore(correct, total) {
  const score = correct / total;
  player.postQuizScore = score;

  console.log("Post-quiz score:", score);

  sendToGoogleSheet("POST", score, null);
}




//  DURING GAME: UPDATE BKT LEARNING

function updateLearning(isCorrect) {
  // Apply BKT update
  player.knowledge = learner.update(isCorrect);

  console.log("Updated BKT knowledge:", player.knowledge.toFixed(2));

  // Save gameplay learning event
  sendToGoogleSheet("GAME", player.knowledge, isCorrect ? 1 : 0);

  // Update UI
  updateLearningDisplay();
}




//  UPDATE KNOWLEDGE IN UI

function updateLearningDisplay() {
  const el = document.getElementById("knowledgeValue");
  if (el) {
    el.textContent = player.knowledge.toFixed(2);
  }
}




//  GOOGLE SHEET EXPORT


const scriptURL =
  "https://script.google.com/macros/s/AKfycbxS6wRIW1IAvgFjhtsthHJDKNC4PMqlFoR1TQuxhZTjp5S993_tSfBFD_gbQ684fuWp/exec";

function sendToGoogleSheet(type, score, resultBinary) {

  const data = {
    playerId: player.id,
    recordType: type,      // "PRE", "GAME", "POST"
    score: score,
    result: resultBinary,  // null for quizzes, 1/0 for gameplay
    timestamp: new Date().toLocaleString()
  };

  console.log("SENDING DATA:", data);

  fetch(scriptURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
    .then(() => console.log("Sent to Google Sheets:", data))
    .catch(err => console.error("Error sending to Google Sheets:", err));
}

