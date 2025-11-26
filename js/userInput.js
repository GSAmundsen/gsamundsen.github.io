
// All of these are triggerd by user input on canvas

// Triggerd by user pressing down mouse button
function mouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  model.nodeRef.currentSelectedBox = null;
  const allNodes = model.currentScenario.nodes
  
  // User right clicks to start drawing a connector
  if (e.button === 2) {
    for (let i = allNodes.length - 1; i >= 0; i--) {
      const node = allNodes[i];
      if (
        mouseX > node.coordinates.x && mouseX < node.coordinates.x + node.width &&
        mouseY > node.coordinates.y && mouseY < node.coordinates.y + node.height
      ) {
        model.connectorRef.connecting = true;
        model.connectorRef.startNode = node;
        model.connectorRef.tempLineEnd = { x: mouseX, y: mouseY };
        return;
      }
    }
  } else {
    // User left clicks to select and move a box
    for (let node of allNodes) {
      if (
        node.static !== true && mouseX > node.coordinates.x && mouseX < node.coordinates.x + node.width &&
        mouseY > node.coordinates.y && mouseY < node.coordinates.y + node.height
      ) {
        model.nodeRef.draggingBox = node;
        model.nodeRef.currentSelectedBox = node;
        model.nodeRef.offsetX = mouseX - node.coordinates.x;
        model.nodeRef.offsetY = mouseY - node.coordinates.y;
        break;
      }
    }
  }
  draw();
}


// Triggerd by user pressing moving mouse while button is pressed
function mouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // User is creating a connector
  if (model.connectorRef.connecting && model.connectorRef.startNode) {
    model.connectorRef.tempLineEnd = { x: mouseX, y: mouseY };
    draw();
    return;
  }

  // User is moving boxes
  if (!model.nodeRef.draggingBox) return;
  model.nodeRef.draggingBox.coordinates.x = mouseX - model.nodeRef.offsetX;
  model.nodeRef.draggingBox.coordinates.y = mouseY - model.nodeRef.offsetY;
  draw();
}


// Triggerd by user releasing mouse button
function mouseUp(e) {
  if (model.connectorRef.connecting && model.connectorRef.startNode) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // If user releases mouse over a node
    for (let node of model.currentScenario.nodes) {
      if (
        mouseX > node.coordinates.x && mouseX < node.coordinates.x + node.width &&
        mouseY > node.coordinates.y && mouseY < node.coordinates.y + node.height &&
        node !== model.connectorRef.startNode
      ) {
        // Create connector
        const connector_id = `connector_${model.connectorRef.connectorCounter++}`;
        const newConn = {
          connectorId: connector_id,
          fromNodeId: model.connectorRef.startNode.nodeId,
          toNodeId: node.nodeId
        };

        // Check if connection already exists
        if (!model.currentScenario.connectors.some(c => 
          (c.fromNodeId === newConn.fromNodeId && c.toNodeId === newConn.toNodeId) ||
          (c.fromNodeId === newConn.toNodeId && c.toNodeId === newConn.fromNodeId)
        )) {
          
          // Gateway-specific logic branches
          switch (model.connectorRef.startNode.type) {

            case "xorGateway": {
              model.connectorRef.startNode.nodeConnections = model.connectorRef.startNode.nodeConnections || [];
              if (model.connectorRef.startNode.nodeConnections.length >= 2) {
                break; // XOR max 2 connections
              }
              const hasTrueConnection = model.connectorRef.startNode.nodeConnections.some(nc => nc.condition === true);
              model.connectorRef.startNode.nodeConnections.push({
                connectorId: connector_id,
                condition: !hasTrueConnection,
              });
              model.currentScenario.connectors.push(newConn);
              break;
            }
            
            case "andGateway": {
              model.connectorRef.startNode.nodeConnections = model.connectorRef.startNode.nodeConnections || [];
              model.connectorRef.startNode.nodeConnections.push({ connectorId: connector_id });
              model.currentScenario.connectors.push(newConn);
              break;
            }
            
            case "inclusiveGateway": {
              model.connectorRef.startNode.nodeConnections = model.connectorRef.startNode.nodeConnections || [];
              model.connectorRef.startNode.functions = model.connectorRef.startNode.functions || [];
              const index = model.connectorRef.startNode.nodeConnections.length;
              if (index >= model.connectorRef.startNode.functions.length) {
                break;
              }
              
              model.connectorRef.startNode.nodeConnections.push({
                connectorId: connector_id,
                functionIndex: index
              });
              
              model.currentScenario.connectors.push(newConn);
              break;
            }
            
            default: {
              // Regular nodes - just add connector
              model.currentScenario.connectors.push(newConn);
            }
          }
        }
        break;
      }
    }
    
    model.connectorRef.connecting = false;
    model.connectorRef.startNode = null;
    draw();
  }
  model.nodeRef.draggingBox = null;
}


// Triggerd by user pressing the delete button on keyboard or "Reset All Connections" in menu
function resetConnections(resetAll = false) {

  // Triggered by user pressing "Reset All Connections" in menu
  // Deletes all connectors
  if (resetAll) {
    model.currentScenario.connectors = [];
    for (const node of model.currentScenario.nodes) {
      if (node.type.includes("Gateway")) {
        node.nodeConnections = [];
      }
    }
    draw();
    return;
  }

  if (model.currentScenario.connectors.length === 0) return;

  let deletedIds = [];

  // Deletes connectors connected to the selected box
  if (model.nodeRef.currentSelectedBox != null) {
    deletedIds = model.currentScenario.connectors
      .filter(c => c.fromNodeId === model.nodeRef.currentSelectedBox.nodeId || c.toNodeId === model.nodeRef.currentSelectedBox.nodeId)
      .map(c => c.connectorId);
    model.currentScenario.connectors = model.currentScenario.connectors.filter(conn => 
      conn.fromNodeId !== model.nodeRef.currentSelectedBox.nodeId && 
      conn.toNodeId !== model.nodeRef.currentSelectedBox.nodeId
    );
  } else {
    // Deletes last connection made 
    const deleted = model.currentScenario.connectors.pop();
    deletedIds = [deleted.connectorId];
  }

  // Cleans gateway nodeConnections
  for (const node of model.currentScenario.nodes) {
    if (node.type.includes("Gateway") && node.nodeConnections) {
      node.nodeConnections = node.nodeConnections.filter(nc => 
        !deletedIds.includes(nc.connectorId)
      );
    }
  }
  draw();
}
