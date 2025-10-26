// Organised according to drawing order in controller.draw()

// Draws pools from model.currentScenario.pools
function drawPools(pools = []){
  context.strokeStyle = "rgba(99, 99, 99, 1)";
  context.lineWidth = 2;
  context.fillStyle = "black";
  context.font = "14px Arial";
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

// Finds connector coordinates then send it to draw connector line
function connectorCoordinates(connectors = []) {
  
  const allNodes = getNodes()

  for (const connector of connectors) {
    const fromNode = allNodes.find(n => n.nodeId === connector.fromNodeId);
    const toNode = allNodes.find(n => n.nodeId === connector.toNodeId);

    if (fromNode && toNode) {
      const fromX = fromNode.coordinates.x + fromNode.width / 2;
      const fromY = fromNode.coordinates.y + fromNode.height / 2;
      const toX = toNode.coordinates.x + toNode.width / 2;
      const toY = toNode.coordinates.y + toNode.height / 2;
      
      drawLine(fromX, fromY, toX, toY)
      const headlen = 10;
      const dx = toX - fromX;
      const dy = toY - fromY;
      const angle = Math.atan2(dy, dx);
      const middleX = (fromX + toX) / 2
      const middleY = (fromY + toY) / 2
      drawArrow(middleX, middleY, headlen, angle)
    }
  }
}

// Finds connector coordinates for connector being drawn then sends it to be drawn
function drawTemporaryArrow() {
  if (connecting && startNode) {
    const fromX = startNode.coordinates.x + startNode.width / 2;
    const fromY = startNode.coordinates.y + startNode.height / 2;
    const toX = tempLineEnd.x;
    const toY = tempLineEnd.y;
    
    const headlen = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    drawLine(fromX, fromY, toX, toY);
    drawArrow(toX, toY, headlen, angle);
  }
}

// Gets all nodes in use
function getNodes() {
  return allNodes = [
    ...model.currentScenario.staticNodes,
    ...model.currentScenario.dynamicNodesOnCanvas
  ];
}

// Gets all connectors in use
function getConnectors() {
  return allConnectors = [
    ...model.currentScenario.staticConnectors,
    ...model.currentScenario.dynamicConnectors
  ];
}
// Draws connector line
function drawLine(fromX, fromY, toX, toY) {
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.strokeStyle = "blue";
  context.lineWidth = 2;
  context.stroke();
}

// Draws arrow head on connector lines
function drawArrow(x, y, headlen, angle){
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
  context.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fillStyle = "blue";
  context.fill();
}

// Sent here from draw() to find correct drawing method for type of node
function drawNodes(nodes = []) {
  context.strokeStyle = "black";
  context.lineWidth = 2;
  context.font = "14px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const node of nodes){
    if(node.type === "activity"){
      drawActivity(node);
    } else if (node.type.includes('Gateway')) {
      drawGateway(node);
    } else if (node.type.includes('Event')) {
      drawEvent(node)
    }
  }
}

// Draws activities
function drawActivity(node) {
  context.fillStyle = 'white';
  context.fillRect(node.coordinates.x, node.coordinates.y, node.width, node.height);
  context.strokeRect(node.coordinates.x, node.coordinates.y, node.width, node.height);        
  context.fillStyle = 'black';
  context.fillText(node.name,
                  node.coordinates.x + node.width / 2,
                  node.coordinates.y + node.height / 2);
}

// Draws gateways
function drawGateway(node){
  context.fillStyle = 'white';
  drawDiamond(node);
  if(node.type === 'xorGateway') {
    drawExclusiveGateway(node)
  } else if (node.type === 'andGateway') {
    drawParallelGateway(node)
  } else if (node.type === 'incomingAndGateway') {
    drawParallelGateway(node)
  } else if (node.type === 'orGateway') {
    drawInclusiveGateway(node)
  }
}

// GATEWAY-TEGNING I BPMN-STIL 
// Disse funksjonene tegner diamantformede noder (gateways) i canvas.
// Hver gateway-type får et unikt symbol inni diamanten (X, +, eller o).

// Tegner selve diamantformen som gatewayene bygger på
function drawDiamond(node) {
  const size = node.width
  context.beginPath();
  context.moveTo(node.coordinates.x, node.coordinates.y - size / 2);         // topp-punkt
  context.lineTo(node.coordinates.x + size / 2, node.coordinates.y);         // høyre-punkt
  context.lineTo(node.coordinates.x, node.coordinates.y + size / 2);         // bunn-punkt
  context.lineTo(node.coordinates.x - size / 2, node.coordinates.y);         // venstre-punkt
  context.closePath();                // lukker figuren             // fyllfarge inni diamanten
  context.fill();
  context.stroke();
}

// Eksklusiv gateway (XOR) 
// Brukes når bare én vei kan tas (enten/eller)
function drawExclusiveGateway(node) {
  const size = node.width;
  context.beginPath();
  // Tegner en X inni diamanten
  context.moveTo(node.coordinates.x - size / 4, node.coordinates.y - size / 4);
  context.lineTo(node.coordinates.x + size / 4, node.coordinates.y + size / 4);
  context.moveTo(node.coordinates.x + size / 4, node.coordinates.y - size / 4);
  context.lineTo(node.coordinates.x - size / 4, node.coordinates.y + size / 4);
  context.stroke();
}

// Parallell gateway (AND) 
// Brukes når flere flyter skal skje samtidig (alle grener kjøres)
function drawParallelGateway(node) {
  const size = node.width;
  context.beginPath();
  // Tegner et pluss-tegn (+) inni diamanten
  context.moveTo(node.coordinates.x - size / 4, node.coordinates.y);         // horisontal strek
  context.lineTo(node.coordinates.x + size / 4, node.coordinates.y);
  context.moveTo(node.coordinates.x, node.coordinates.y - size / 4);         // vertikal strek
  context.lineTo(node.coordinates.x, node.coordinates.y + size / 4);
  context.stroke();
}

// Inklusiv gateway (OR)
// Brukes når en eller flere flyter kan aktiveres samtidig
function drawInclusiveGateway(node) {
  const size = node.width;
  context.beginPath();
  // Tegner en liten sirkel inni diamanten
  context.arc(node.coordinates.x, node.coordinates.y, size / 5, 0, Math.PI * 2);
  context.stroke();
}

function drawEvent(node) {
  const size = node.width;
  context.beginPath();
  // Tegner en liten sirkel inni diamanten
  context.arc(node.coordinates.x, node.coordinates.y, size / 2, 0, Math.PI * 2);
  context.fillStyle = 'white';
  context.fill(); 
  context.stroke();
}







