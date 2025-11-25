"use strict";


   //QUIZ UI

// Shows quiz question UI (called from controller.js)
function showQuizUI(title, qObj, index, total, callback) {
  document.getElementById("app").innerHTML = `
    <h1>${title}</h1>
    <p><b>Question ${index + 1} of ${total}</b></p>
    <p>${qObj.q}</p>

    <button class="quizBtn" id="opt0">${qObj.a[0]}</button><br><br>
    <button class="quizBtn" id="opt1">${qObj.a[1]}</button><br><br>
    <button class="quizBtn" id="opt2">${qObj.a[2]}</button><br><br>

    <button class="quizBtn" id="opt3" style="background:#ddd;">
      I don't know
    </button>
  `;

  document.getElementById("opt0").onclick = () => callback(0);
  document.getElementById("opt1").onclick = () => callback(1);
  document.getElementById("opt2").onclick = () => callback(2);
  document.getElementById("opt3").onclick = () => callback(3);  // neutral option
}






   //MAIN GAME UI
   

function updateView() {

  
  model.currentScenario = {
    nodes: [],
    connectors: [],
    pools: [],
    lanes: [],
    tokens: [],
    failureDescriptions: {}
  };

  document.getElementById('app').innerHTML = `
    <div id="moduleTitleHeader" style="font-weight:bold;">Scenario title will appear here.</div>
    <div id="moduleTextHeader" style="font-style: italic; margin-bottom:20px;">Scenario description will appear here.</div>

    <div id="finishedTextHeader" style="font-weight: bold; font-size: 20px; margin-bottom:20px;"></div>

    <div id="taskText" 
         style="margin-bottom:10px; margin-left: 20%; text-align: left; font-weight: bold;">
         Task description will appear here.
    </div>

    <div id="taskVerificationText" 
         style="margin-bottom:10px;margin-left: 20%; text-align: left;">
         Task results will appear here.
    </div>

    <canvas id="BPMNcanvas" width="1000" height="500" style="border:1px solid #ccc;"></canvas>

    <div style="margin-top:15px;">
      <button onclick="verifySolution()">✅ Verify Solution</button>
      <button onclick="nextScenario()">➡️ Next Scenario</button>
      <button onclick="resetConnections(true)">🗑️ Reset All</button>
    </div>

    <div id="learningStatus" style="margin-top:15px; font-weight:bold;">
      Knowledge Level: <span id="knowledgeValue">0.00</span>
    </div>
  `;
}


