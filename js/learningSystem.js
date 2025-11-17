
//  LEARNING SYSTEM (BKT + QUIZ + GOOGLE SHEETS)



// Player object for identification + tracking learning
let player = {
  id: "",
  preQuizScore: null,
  postQuizScore: null,
  knowledge: 0.0        // This is the BKT running value during gameplay
};


//  Bayesian Knowledge Tracing 

class BKT {
  constructor(start = 0.3, learn = 0.2) {
    this.P = start;     // starting probability of mastery
    this.learn = learn; // learning rate
  }

  update(isCorrect) {
    // If correct → increase mastery
    // If wrong → decrease a little
    this.P = isCorrect
      ? this.P + (1 - this.P) * this.learn
      : this.P * (1 - this.learn / 2);

    return this.P;
  }
}

// Global BKT instance (gets overwritten when pre-quiz is done)
let learner = new BKT();



//  PRE-QUIZ LOGIC (

function recordPreQuizScore(correctAnswers, totalQuestions) {

  const score = correctAnswers / totalQuestions;
  player.preQuizScore = score;

  // Initialize BKT with pre-quiz score
  learner = new BKT(score);
  player.knowledge = score;

  console.log("Pre-quiz score:", score);

  sendToGoogleSheet("PRE", score, null);
}



//  POST-QUIZ LOGIC (for comparison; does NOT touch game learning)
function recordPostQuizScore(correctAnswers, totalQuestions) {

  const score = correctAnswers / totalQuestions;
  player.postQuizScore = score;

  console.log("Post-quiz score:", score);

  sendToGoogleSheet("POST", score, null);
}



//  GAME LEARNING 

function updateLearning(isCorrect) {
  // Update BKT
  player.knowledge = learner.update(isCorrect);

  console.log("Updated BKT knowledge:", player.knowledge.toFixed(2));

  // Send gameplay result to Google Sheets
  sendToGoogleSheet("GAME", player.knowledge, isCorrect ? 1 : 0);

}



//  GOOGLE SHEETS EXPORT

const scriptURL =
  "https://script.google.com/macros/s/AKfycbyAOKFvJ9ZGfjLVHUnfEvrZ6DrMX2AxE2Dt2lmDr11KSRbgfR-XCrJDntpSdxPFUxEy/exec";

function sendToGoogleSheet(type, score, resultBinary) {
  const data = {
    playerId: player.id,
    recordType: type,      // "PRE", "GAME", "POST"
    score: score,
    result: resultBinary,  // only for GAME; null for quizzes
    timestamp: new Date().toLocaleString()
  };
  console.log("📤 DATA BEING SENT:", JSON.stringify(data));

  fetch(scriptURL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
})

    .then(() => console.log("Sent to Google Sheets:", data))
    .catch(err => console.error("Error sending to Google Sheets:", err));
}


