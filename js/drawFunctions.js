
// Unless stated differently these functions are called by controller.js - draw()
// They are organised according to order they are called in

// Draws pools from model.currentScenario.pools
function drawPools(pools = []){
  context.strokeStyle = "rgba(99, 99, 99, 1)";
  context.lineWidth = 2;
  context.fillStyle = "black";
  context.font = "16px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  
  for (const pool of pools){
    context.strokeRect(pool.coordinates.x, pool.coordinates.y, pool.size.width, pool.size.height); 
    context.save();
    context.translate(pool.coordinates.x + 15, pool.coordinates.y + pool.size.height / 2);
    context.rotate(-Math.PI / 2);
    context.fillText(pool.name, 0, 0);
    context.restore();
  }
}


// Draws lanes from model.currentScenario.lanes
function drawLanes(lanes = [])
{
    context.strokeStyle = "rgba(99, 99, 99, 1)";
    context.fillStyle = "black";
    context.lineWidth = 1;
    context.font = "14px Arial";
    context.textAlign = "left";
    context.textBaseline = "top";

    for (const lane of lanes){
        context.strokeRect(lane.coordinates.x, lane.coordinates.y, lane.size.width, lane.size.height);        
        context.fillText(lane.name, lane.coordinates.x+5, lane.coordinates.y+5);       
    }
}


// Prepares connector information for drawing and then draws them
function drawConnectors(connectors = []) {
  const allNodes = model.currentScenario.nodes;

  // Finds connector coordinates
  for (const connector of connectors) {
    const fromNode = allNodes.find(n => n.nodeId === connector.fromNodeId);
    const toNode = allNodes.find(n => n.nodeId === connector.toNodeId);
    if (!fromNode || !toNode) continue;
    const fromX = fromNode.coordinates.x + fromNode.width / 2;
    const fromY = fromNode.coordinates.y + fromNode.height / 2;
    const toX = toNode.coordinates.x + toNode.width / 2;
    const toY = toNode.coordinates.y + toNode.height / 2;
    const middleX = (fromX + toX) / 2;
    const middleY = (fromY + toY) / 2;

    // Sets connctor colour and potentially its label
    let lineColor = "blue";
    let labelText = null;

    // For XOR gateway
    if (fromNode.type === "xorGateway" && Array.isArray(fromNode.nodeConnections)) {
      const connData = fromNode.nodeConnections.find(c => c.connectorId === connector.connectorId);
      if (connData) {
        if (connData.condition === true) {
          lineColor = "green";
          labelText = "True Path";
        } else if (connData.condition === false) {
          lineColor = "red";
          labelText = "False Path";
        }
      }
    }

    // For OR gateway
    if (fromNode.type === "inclusiveGateway" && Array.isArray(fromNode.nodeConnections)) {
      const connData = fromNode.nodeConnections.find(c => c.connectorId === connector.connectorId);
      if (connData && typeof connData.functionIndex === "number") {
        const fn = fromNode.functions?.[connData.functionIndex];
        if (fn?.name) labelText = fn.name;
      }
    }

    // Draws connector line + arrow + labelText
    const headlen = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    drawLine(fromX, fromY, toX, toY, lineColor);
    drawArrow(middleX, middleY, headlen, angle, lineColor);
    drawArrow(toX, toY, headlen, angle, lineColor);
    if (labelText) drawConnectorLabel(labelText, middleX, middleY, angle, lineColor);
  }
}


// Is called by drawConnectors() and drawTemporaryArrow()
// Draws connector line
function drawLine(fromX, fromY, toX, toY, lineColor) {
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.strokeStyle = lineColor;
  context.lineWidth = 2;
  context.stroke();
}


// Is called by drawConnectors() and drawTemporaryArrow()
// Draws connector arrow
function drawArrow(x, y, headlen, angle, lineColor) {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
  context.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fillStyle = lineColor;
  context.fill();
}


// Is called by drawConnectors()
// Draws connector label in a way where it stays oriented in relation to the line and in readable fashion
function drawConnectorLabel(text, x, y, angle, color = "black") {
  context.save();

  context.translate(x, y);
  let textAngle = angle % (2 * Math.PI);
  if (textAngle < 0) textAngle += 2 * Math.PI;

  if (textAngle > Math.PI / 2 && textAngle < 3 * Math.PI / 2) {
    textAngle += Math.PI;
  }
  context.rotate(textAngle);

  context.font = "12px Arial";
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "top";
  const offset = 10;
  context.fillText(text, 0, offset);

  context.restore();
}


// Sets style settings for nodes before splitting them of into seperate draw functions
function drawNodes(nodes = []) {
  context.strokeStyle = "black";
  context.lineWidth = 2;
  context.font = "14px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";

  let selectedNode = null;
  
  for (const node of nodes){
    if (model.nodeRef.currentSelectedBox != null && model.nodeRef.currentSelectedBox.nodeId === node.nodeId) {
      selectedNode = node;
      continue;
    }
    context.fillStyle = model.settings.standardBoxColor
    
    if(node.type === "activity"){
      drawActivity(node);
    } else if (node.type.includes('Gateway')) {
      drawGateway(node);
    } else if (node.type.includes('Event')) {
      drawEvent(node)
    }
  }

  // Draws the selected box after the others so it's layered on top
  if (selectedNode !== null) {
    context.fillStyle = model.settings.selectedBoxColor;
    if(selectedNode.type === "activity"){
      drawActivity(selectedNode);
    } else if (selectedNode.type.includes('Gateway')) {
      drawGateway(selectedNode);
    } else if (selectedNode.type.includes('Event')) {
      drawEvent(selectedNode)
    }
  }
}


// Is called by drawNodes()
// Draws activites
function drawActivity(node) {
  context.fillRect(node.coordinates.x, node.coordinates.y, node.width, node.height);
  context.strokeRect(node.coordinates.x, node.coordinates.y, node.width, node.height);
  
  context.fillStyle = 'black';
  context.font = "14px Arial";
  
  const lines = wrapText(node.name, node.width - 10);
  const lineHeight = 16;
  const startY = node.coordinates.y + (node.height - lines.length * lineHeight) / 2 + lineHeight / 2;
  
  lines.forEach((line, i) => {
    context.fillText(line, node.coordinates.x + node.width / 2, startY + i * lineHeight);
  });
}


// Is called by drawActivity()
// Makes sure text doesn't overflow by wrapping it
function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const metrics = context.measureText(testLine);
    
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);
  return lines;
}


// Is called by drawNodes()
// Calls specific gateway drawing function and then writes gateway text
function drawGateway(node){
  drawDiamond(node);
  if(node.type === 'xorGateway') {
    drawExclusiveGateway(node)
  } else if (node.type === 'andGateway') {
    drawParallelGateway(node)
  } else if (node.type === 'inclusiveGateway') {
    drawInclusiveGateway(node)
  }

  const centerX = node.coordinates.x + node.width / 2;
  const centerY = node.coordinates.y + node.height / 2;
  context.fillStyle = "black";
  context.font = "12px Arial";
  context.textAlign = "center";
  context.fillText(node.name, centerX, centerY + node.height / 2 + 15);
}


// Is called by drawGateway()
// Draws the diamond shape of gateway nodes
function drawDiamond(node) {
  const size = node.width;
  const centerX = node.coordinates.x + size / 2;
  const centerY = node.coordinates.y + size / 2;
  
  context.beginPath();
  context.moveTo(centerX, centerY - size / 2);
  context.lineTo(centerX + size / 2, centerY);
  context.lineTo(centerX, centerY + size / 2);
  context.lineTo(centerX - size / 2, centerY);
  context.closePath();
  context.fill();
  context.stroke();
}


// Is called by drawGateway()
// Draws the inside of XOR node
function drawExclusiveGateway(node) {
  const size = node.width;
  const centerX = node.coordinates.x + size / 2;
  const centerY = node.coordinates.y + size / 2;
  
  context.beginPath();
  context.moveTo(centerX - size / 4, centerY - size / 4);
  context.lineTo(centerX + size / 4, centerY + size / 4);
  context.moveTo(centerX + size / 4, centerY - size / 4);
  context.lineTo(centerX - size / 4, centerY + size / 4);
  context.stroke();
}


// Is called by drawGateway()
// Draws the inside of AND node
function drawParallelGateway(node) {
  const size = node.width;
  const centerX = node.coordinates.x + size / 2;
  const centerY = node.coordinates.y + size / 2;
  
  context.beginPath();
  context.moveTo(centerX - size / 4, centerY);
  context.lineTo(centerX + size / 4, centerY);
  context.moveTo(centerX, centerY - size / 4);
  context.lineTo(centerX, centerY + size / 4);
  context.stroke();
}


// Is called by drawGateway()
// Draws the inside of XOR node
function drawInclusiveGateway(node) {
  const size = node.width;
  const centerX = node.coordinates.x + size / 2;
  const centerY = node.coordinates.y + size / 2;
  
  context.beginPath();
  context.arc(centerX, centerY, size / 5, 0, Math.PI * 2);
  context.stroke();
}


// Is called by drawNodes()
// Calls specific event drawing function
function drawEvent(node) {
  if (node.type === 'startEvent') {
    drawStartEvent(node);
  } else if (node.type === 'endEvent') {
    drawEndEvent(node);
  } else if (node.type === 'intermediateEvent') {
    drawIntermediateEvent(node);
  }
}


// Is called by drawEvent()
// Draws startEvent
function drawStartEvent(node) {
  const radius = node.width / 2;
  const centerX = node.coordinates.x + radius;
  const centerY = node.coordinates.y + radius;
  
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}


// Is called by drawEvent()
// Draws endEvent
function drawEndEvent(node) {
  const radius = node.width / 2;
  const centerX = node.coordinates.x + radius;
  const centerY = node.coordinates.y + radius;
  
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.lineWidth = 5;
  context.fill();
  context.stroke();
  context.lineWidth = 2;
}


// Is called by drawEvent()
// Draws intermediateEvent and adds text
function drawIntermediateEvent(node) {
  const radius = node.width / 2;
  const centerX = node.coordinates.x + radius;
  const centerY = node.coordinates.y + radius;
  
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.beginPath();
  context.arc(centerX, centerY, radius - 4, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "black";
  context.font = "12px Arial";
  context.textAlign = "center";
  context.fillText(node.name, centerX, centerY + node.height / 2 + 15);
}


// Prepares connector information for user held connector then draws it
function drawTemporaryArrow() {
  if (model.connectorRef.connecting && model.connectorRef.startNode) {
    const fromX = model.connectorRef.startNode.coordinates.x + model.connectorRef.startNode.width / 2;
    const fromY = model.connectorRef.startNode.coordinates.y + model.connectorRef.startNode.height / 2;
    const toX = model.connectorRef.tempLineEnd.x;
    const toY = model.connectorRef.tempLineEnd.y;
    
    const headlen = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    drawLine(fromX, fromY, toX, toY);
    drawArrow(toX, toY, headlen, angle);
  }
}




