"use strict";

// Is called by controller.js - startGame()
// Updates the Game Area in index.html with fields for information and buttons for user input
function updateGameArea() {
    
    document.getElementById('app').innerHTML = /*html*/`
    
    <div id="moduleTitleHeader" style="font-weight:bold;">Scenario title will appear here.</div>
    <div id="moduleTextHeader" style="font-style: italic; margin-bottom:20px;">Scenario description will appear here.</div>
    <div id="finishedTextHeader" style="font-weight: bold; font-size: 20px; margin-bottom:20px;"></div>
    <div id="taskText" style="margin-bottom:10px; margin-left: 20%; text-align: left; font-weight: bold;">Task description will appear here.</div>
    <div id="taskVerificationText" style="margin-bottom:10px;margin-left: 20%; text-align: left;">Task results will appear here.</div>


    <canvas id="BPMNcanvas" width="1000" height="500" style="border:1px solid #ccc;"></canvas>

    <div id="tutorialOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:1000; justify-content:center; align-items:center;">
      <div style="position:relative; max-width:80%; max-height:80%;">
        <button id="closeTutorial" style="position:absolute; top:10px; right:10px; background:white; border:none; font-size:24px; cursor:pointer; padding:5px 10px; border-radius:5px;">×</button>
        <img id="tutorialImg" src="" style="max-width:100%; max-height:80vh;">
      </div>
    </div>

    <div style="margin-top:15px;">
      <button id="verifyBtn" onclick="verifySolution()">✅ Verify Solution</button>
      <button onclick="nextScenario()">➡️ Next Scenario</button>
      <button onclick="resetConnections(true)">🗑️ Reset All Connections</button>
      <button id="showTutorial" style="display:none;">❓ Show Tutorial</button>
    </div>
    `; 
}


// Is called by controller.js - endScreen()
// Updates the End Screen with text and potentially a button for the next scenario
function updateEndScreen() {
  const endText = model.game.endScreenText;
  const hasNext = model.loadedScenarioData.aboutCampaign.nextCampaign
  
  let html = `
    <h2>Campaign Complete!</h2>
    <p>${endText}</p>
  `;
  
  if (hasNext) {
    html += `<button onclick="nextCampaign()">Next Campaign</button>`;
  }
  
  document.getElementById('end').innerHTML = html;
}