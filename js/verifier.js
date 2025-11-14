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

  console.log("✅ Verified:", verified.map(t => t.name));
  console.log("❌ Non-verified:", nonVerified.map(t => t.name));
  console.log("🔒 Non-finishers:", nonFinisher.map(t => t.name));
  console.log("⚠️ Verification failures:", verificationFailure);
  console.log("⚠️ Function failures:", functionFailure);

  return { verified, nonVerified, nonFinisher, verificationFailure, functionFailure };
}

function addOrMergeThread(threadMap, nodeId, visitedSet) {
  if (threadMap.has(nodeId)) {
    // Thread already waiting at this node - merge histories
    const existing = threadMap.get(nodeId);
    visitedSet.forEach(v => existing.visited.add(v));
  } else {
    // First thread to arrive at this node
    threadMap.set(nodeId, {visited: new Set(visitedSet)});
  }
}

window.verifier = verifier;