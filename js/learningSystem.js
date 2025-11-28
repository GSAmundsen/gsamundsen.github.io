
// Used by verifier.js - verifysolution() and controller.js - startGame(), loadGameData()
// Stores player session data
let player = {
  id: "",
  totalKnowledgeScore: 0.0,
  currentCampaignKnowledgeScore: 0.0,
  results: [],
};



// Bayesian knowledge tracing class
// Tracks progression of how users knowledge is going
// Instances are created here and in controller.js - startGame() and nextCampaign()
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
let totalLearnerScore = new BKT();
let campaignLearner; 


// Is called by controller.js - nextScenario()
// Updates knowledges scores and then formats data to be sent to google endpoint
function computeKnowledgeScore() {

  const currentCampaign = player.results.find(r => r.moduleTitle === model.game.moduleTitle);
  const scenarioId = model.loadedScenarioData.scenarios[model.game.currentScenario].scenarioId;
  const result = currentCampaign.scenarios[scenarioId];
  player.currentCampaignKnowledgeScore = campaignLearner.update(result === 1);
  player.totalKnowledgeScore = totalLearnerScore.update(result === 1);

  const data = {
    timestamp: new Date().toLocaleString(),
    id: player.id,
    moduleTitle: model.game.moduleTitle,
    scenarioId: scenarioId,
    result: result,
    totalKnowledgeScore: player.totalKnowledgeScore,
    currentCampaignKnowledgeScore: player.currentCampaignKnowledgeScore
  };
  sendToGoogleSheet(data);
}


// Is called by computeKnowledgeScore()
// Sends results to google sheets
function sendToGoogleSheet(payload) {

  // Add upload endpoint
  const scriptURL = null;

  if (!scriptURL) {
    console.log("No upload endpoint configured. Data not sent:", payload);
    return;
  }
  fetch(scriptURL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    //.then(() => console.log("Sent to Google Sheet:", payload))
    .catch(err => console.error("Sheet send error:", err));
}