
// Is called by button "Verify" and controller.js - nextScenario()
// Calls the verifier and updates player session storage and id="taskVerificationText"
function verifySolution() {
  const results = verifier();

  const totalTokens = model.currentScenario.tokens.length;
  const allCorrect =
    results.verified.length === totalTokens &&
    results.nonVerified.length === 0 &&
    results.nonFinisher.length === 0;


  const currentCampaign = player.results.find(r => r.moduleTitle === model.game.moduleTitle);
  const scenarioId = model.loadedScenarioData.scenarios[model.game.currentScenario].scenarioId;
  if (currentCampaign) {
    currentCampaign.scenarios[scenarioId] = allCorrect ? 1 : 0;
  }

  if (allCorrect){
    displaySuccess();
  } else {
    displayVerificationResults(results);
  }
}


// Is called by verifySolution()
// Updates id="taskVerificationText" with success message
function displaySuccess() {
  const html = "<span style='color: green;'>✓ All tokens passed!</span>";
  document.getElementById("taskVerificationText").innerHTML = html;
}


// Is called by verifySolution()
// Updates id="taskVerificationText" with 3 hints for the player
function displayVerificationResults(results) {
  let html = "";

  let messageCount = 0;
  const MAX_MESSAGES = 3;

  // Shows max 1 non-finisher
  if (results.nonFinisher.length > 0) {
    const defaultMsg = model.currentScenario.nonFinisherDescription || "didn't make it to the end.";
    const token = results.nonFinisher[0]; // ← Just get first one
    html += `<span style='color: red;'>${token.name} ${defaultMsg}</span><br>`;
    messageCount++;
  }

  // Shows up to 3 tokens that failed verification
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
          html += `<span style='color: red;'>${tokenName} ${msg}<br>`;
        } else {
          html += `<span style='color: red;'>${tokenName} failed check at End Event.<br>`;
        }
      } else {
        html += failure + "<br>";
      }
      
      messageCount++;
    }
  }

  document.getElementById("taskVerificationText").innerHTML = html;
}


// Is called by verifySolution()
// Takes the tokens through the model created by the user
// Checks if (1) alle the nodes make it through and (2) if they are in the right state once they finish
function verifier() {
  const allNodes = model.currentScenario.nodes;
  const allConnectors = model.currentScenario.connectors;
  
  let startNode = allNodes.find(n => n.type === "startEvent");
  if (!startNode) {
    console.error("No startEvent found in scenario");
    return { verified: [], nonVerified: [], nonFinisher: [], verificationFailure: ["No startEvent in scenario"], functionFailure: [] };
  }
  
  let verified = [];
  let nonVerified = [];
  let nonFinisher = [];
  let verificationFailure = [];
  let functionFailure = [];

  for (const token of model.currentScenario.tokens) {
    Object.assign(token, token.variables);
    
    let activeThreads = new Map();
    activeThreads.set(startNode.nodeId, {visited: new Set()});
    let reachedEnd = false;
    
    while (activeThreads.size > 0) {
      const [nodeId, thread] = activeThreads.entries().next().value;
      activeThreads.delete(nodeId);
      
      const currentNode = allNodes.find(n => n.nodeId === nodeId);
      if (!currentNode || thread.visited.has(nodeId)) continue;
      thread.visited.add(nodeId);

      // Execute activity functions
      if (currentNode.type === "activity") {
        for (const fn of currentNode.functions || []) {
          try {
            new Function("token", fn.code)(token);
          } catch (e) {
            functionFailure.push(`${token.name} failed in ${currentNode.name}: ${e.message}`);
          }
        }
      }

      // XOR Gateway
      if (currentNode.type === "xorGateway") {
        const fn = currentNode.functions?.[0];
        let result = false;
        try {
          result = new Function("token", `return (${fn.code});`)(token);
        } catch (e) {
          functionFailure.push(`${token.name} XOR failed: ${e.message}`);
        }
        
        const nextInfo = currentNode.nodeConnections?.find(c => c.condition === result);
        if (nextInfo) {
          const nextConn = allConnectors.find(c => c.connectorId === nextInfo.connectorId);
          if (nextConn) {
            addOrMergeThread(activeThreads, nextConn.toNodeId, thread.visited);
          }
        }
        continue;
      }

      // AND Gateway
      if (currentNode.type === "andGateway") {
        for (const conn of currentNode.nodeConnections || []) {
          const nextConn = allConnectors.find(c => c.connectorId === conn.connectorId);
          if (nextConn) {
            addOrMergeThread(activeThreads, nextConn.toNodeId, thread.visited);
          }
        }
        continue;
      }

      // OR Gateway
      if (currentNode.type === "orGateway") {
        let activated = false;
        for (const conn of currentNode.nodeConnections || []) {
          const fn = currentNode.functions?.[conn.functionIndex];
          if (!fn) continue;
          
          try {
            const result = new Function("token", `return (${fn.code});`)(token);
            if (result) {
              activated = true;
              const nextConn = allConnectors.find(c => c.connectorId === conn.connectorId);
              if (nextConn) {
                addOrMergeThread(activeThreads, nextConn.toNodeId, thread.visited);
              }
            }
          } catch (e) {
            functionFailure.push(`${token.name} OR failed: ${e.message}`);
          }
        }
        if (!activated) {
          continue; // Thread dies if no path activates
        }
        continue;
      }

      // End Event
      if (currentNode.type === "endEvent") {
        reachedEnd = true;
        continue;
      }

      // Move to next node(s) - for activities and startEvent
      const outgoing = allConnectors.filter(c => c.fromNodeId === currentNode.nodeId);
      for (const conn of outgoing) {
        addOrMergeThread(activeThreads, conn.toNodeId, thread.visited);
      }
    }

    // Verify token state once after all threads complete
    if (reachedEnd) {
      const endNode = allNodes.find(n => n.type === "endEvent");
      let passed = true;
      for (const fn of endNode.functions || []) {
        try {
          const result = new Function("token", `return (${fn.code});`)(token);
          if (!result) {
            passed = false;
            verificationFailure.push(`${token.name} failed: ${fn.code}`);
          }
        } catch (e) {
          passed = false;
          functionFailure.push(`${token.name} error: ${e.message}`);
        }
      }
      if (passed) verified.push(token);
      else nonVerified.push(token);
    } else {
      nonFinisher.push(token);
    }
  }

  // For problemshooting the verifier
  // console.log("✅ Verified:", verified.map(t => t.name));
  // console.log("❌ Non-verified:", nonVerified.map(t => t.name));
  // console.log("🔒 Non-finishers:", nonFinisher.map(t => t.name));
  // console.log("⚠️ Verification failures:", verificationFailure);
  // console.log("⚠️ Function failures:", functionFailure);

  return { verified, nonVerified, nonFinisher, verificationFailure, functionFailure };
}


// Is called by verifier()
// Merges seperate threads
function addOrMergeThread(threadMap, nodeId, visitedSet) {
  if (threadMap.has(nodeId)) {
    const existing = threadMap.get(nodeId);
    visitedSet.forEach(v => existing.visited.add(v));
  } else {
    threadMap.set(nodeId, {visited: new Set(visitedSet)});
  }
}


window.verifier = verifier;