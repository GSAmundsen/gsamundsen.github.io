"use strict";

// Updates the entire UI layout inside #app
function updateView() {
  document.getElementById('app').innerHTML = `
    <div id="moduleTitleHeader" style="font-weight:bold;">Scenario title will appear here.</div>
    <div id="moduleTextHeader" style="font-style: italic; margin-bottom:20px;">Scenario description will appear here.</div>
    <div id="finishedTextHeader" style="font-weight: bold; font-size: 20px; margin-bottom:20px;"></div>
    <div id="taskText" style="margin-bottom:10px; margin-left: 20%; text-align: left; font-weight: bold;">Task description will appear here.</div>
    <div id="taskVerificationText" style="margin-bottom:10px; margin-left: 20%; text-align: left;">Task results will appear here.</div>

    <canvas id="BPMNcanvas" width="1000" height="500" style="border:1px solid #ccc;"></canvas>

    <div style="margin-top:15px;">
      <button onclick="verifySolution()">✅ Verify Solution</button>
      <button onclick="nextScenario()">➡️ Next Scenario</button>
      <button onclick="resetConnections(true)">🗑️ Reset All Connections</button>
    </div>

    <div id="learningStatus" style="margin-top:15px; font-weight:bold;">
      Knowledge Level: <span id="knowledgeValue">0.00</span>
    </div>
  `;
}

// Renders a single quiz question
function showQuizUI(title, questionObj, index, total, onSubmit) {
  // Replace the entire app area with quiz UI
  document.getElementById('app').innerHTML = `
    <h2>${title}</h2>
    <p><b>${index + 1} / ${total}</b></p>
    <p>${questionObj.q}</p>

    <div id="quizOptions"></div>

    <button id="quizNext" style="margin-top:15px;">Next</button>
  `;

  // Load answer options dynamically
  const optionsDiv = document.getElementById("quizOptions");

  questionObj.a.forEach((opt, i) => {
    optionsDiv.innerHTML += `
      <label style="display:block; margin:6px 0;">
        <input type="radio" name="quizOpt" value="${i}">
        ${opt}
      </label>
    `;
  });

  // The Next button handles submission
  document.getElementById("quizNext").onclick = () => {
    const selected = document.querySelector('input[name="quizOpt"]:checked');

    if (!selected) {
      alert("Please select an answer.");
      return;
    }

    onSubmit(parseInt(selected.value));
  };
}
